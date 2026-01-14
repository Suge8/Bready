import { spawn, ChildProcess } from 'child_process'
import { app, BrowserWindow } from 'electron'
import { electronAudioCapture } from './audio/electron-native-capture'
import { saveDebugAudio } from './audioUtils'
import { broadcastToAllWindows } from './window-manager'
import { getAiProvider, getAiService } from './ai-service'
import { log, logSampled } from './utils/logging'
import { recordMetric } from './utils/metrics'
import type { AudioMode, AudioStatus } from '../shared/ipc'

// 状态变量
let systemAudioProc: ChildProcess | null = null
let mainWindow: BrowserWindow | null = null

// 调试标志
const debugAudio = process.env.DEBUG_AUDIO === '1'
const GEMINI_SAMPLE_RATE = 24000
const DOUBAO_SAMPLE_RATE = 16000
const SYSTEM_INPUT_SAMPLE_RATE = 48000

function resolveAiProvider(): 'gemini' | 'doubao' {
  return getAiProvider()
}

function getTargetSampleRate(): number {
  return resolveAiProvider() === 'doubao' ? DOUBAO_SAMPLE_RATE : GEMINI_SAMPLE_RATE
}

function getAudioMimeType(): string {
  return `audio/pcm;rate=${getTargetSampleRate()}`
}

// 音频流稳定性管理
let audioRestartCount = 0
let lastRestartTime = 0
let isAudioRestarting = false
const MAX_RESTART_ATTEMPTS = 3
const RESTART_COOLDOWN = 30000 // 30秒冷却期

function sendToRenderer(channel: string, data?: any): void {
  broadcastToAllWindows(channel, data)
}

let audioSendCount = 0

function sendAudioToAI(base64Data: string, mimeType?: string): void {
  if (!base64Data || typeof base64Data !== 'string') return
  const service = getAiService()

  audioSendCount++

  // 首次调用或每 50 次打印一次日志
  if (audioSendCount === 1 || audioSendCount % 50 === 0) {
    // 检查音频数据质量
    try {
      const buffer = Buffer.from(base64Data, 'base64')
      const sampleCount = Math.floor(buffer.length / 2)
      const view = new Int16Array(buffer.buffer, buffer.byteOffset, sampleCount)

      // 计算 RMS 能量
      let sumOfSquares = 0
      for (let i = 0; i < Math.min(sampleCount, 1000); i += 4) {
        sumOfSquares += view[i] * view[i]
      }
      const rms = Math.sqrt(sumOfSquares / (Math.min(sampleCount, 1000) / 4))

      log(
        'info',
        `📤 audio-manager #${audioSendCount}, provider: ${getAiProvider()}, RMS: ${Math.round(rms)}`,
      )
    } catch (error) {
      log('info', `📤 audio-manager #${audioSendCount}, provider: ${getAiProvider()}`)
    }
  }

  if (!service) {
    if (debugAudio) {
      log('debug', '⚠️ AI 服务未初始化')
    }
    return
  }

  try {
    // 通用 AI 音频发送方法，支持多个渠道（Gemini、豆包等）
    // 让服务内部处理会话状态和重连逻辑
    service.sendAudio(base64Data, mimeType || getAudioMimeType())
  } catch (error) {
    log('error', '发送音频到 AI 服务失败:', error)
  }
}

// 辅助函数
function convertStereoToMono(stereoBuffer: Buffer): Buffer {
  const samples = stereoBuffer.length / 4
  const monoBuffer = Buffer.alloc(samples * 2)

  for (let i = 0; i < samples; i++) {
    const leftSample = stereoBuffer.readInt16LE(i * 4)
    const rightSample = stereoBuffer.readInt16LE(i * 4 + 2)
    // 混合声道：(L + R) / 2
    const mixedSample = Math.floor((leftSample + rightSample) / 2)
    monoBuffer.writeInt16LE(mixedSample, i * 2)
  }

  return monoBuffer
}

function resamplePcm16(buffer: Buffer, inputRate: number, outputRate: number): Buffer {
  if (inputRate === outputRate) {
    return buffer
  }
  const input = new Int16Array(buffer.buffer, buffer.byteOffset, buffer.length / 2)
  if (input.length === 0) {
    return buffer
  }
  const ratio = inputRate / outputRate
  const outputLength = Math.floor(input.length / ratio)
  const output = new Int16Array(outputLength)

  for (let i = 0; i < outputLength; i++) {
    const pos = i * ratio
    const idx = Math.floor(pos)
    const next = Math.min(idx + 1, input.length - 1)
    const weight = pos - idx
    output[i] = input[idx] + (input[next] - input[idx]) * weight
  }

  return Buffer.from(output.buffer)
}
// 清理现有的 SystemAudioDump 进程
async function killExistingSystemAudioDump(): Promise<void> {
  return new Promise((resolve) => {
    if (debugAudio) {
      log('debug', '🔍 检查现有 SystemAudioDump 进程...')
    }

    // 杀死任何现有的 SystemAudioDump 进程
    const killProc = spawn('pkill', ['-f', 'SystemAudioDump'], {
      stdio: 'ignore',
    })

    killProc.on('close', (code) => {
      if (code === 0) {
        if (debugAudio) {
          log('debug', '✅ 已清理现有 SystemAudioDump 进程')
        }
      } else {
        if (debugAudio) {
          log('debug', '🔍 未发现现有 SystemAudioDump 进程')
        }
      }
      resolve()
    })

    killProc.on('error', (err) => {
      if (debugAudio) {
        log('debug', '🔍 检查现有进程错误（正常）:', err.message)
      }
      resolve()
    })

    // 超时保护
    setTimeout(() => {
      killProc.kill()
      resolve()
    }, 2000)
  })
}

// 设置主窗口引用
function setMainWindow(window: BrowserWindow): void {
  mainWindow = window
  electronAudioCapture.setMainWindow(window)
}

// 启动音频捕获
async function startAudioCapture(): Promise<boolean> {
  try {
    if (debugAudio) {
      log('debug', '🎵 启动音频捕获协调器...')
    }

    // 设置主窗口引用
    if (mainWindow) {
      electronAudioCapture.setMainWindow(mainWindow)
    }

    // 避免重复绑定事件
    electronAudioCapture.removeAllListeners('audioData')
    electronAudioCapture.removeAllListeners('started')
    electronAudioCapture.removeAllListeners('error')

    // 设置音频数据处理
    electronAudioCapture.on('audioData', (pcmData: Buffer) => {
      if (pcmData.length > 0) {
        sendAudioToAI(pcmData.toString('base64'))
      }
    })

    electronAudioCapture.on('started', () => {
      sendToRenderer('update-status', '音频捕获已启动')
      recordMetric('audio.capture.started', { mode: electronAudioCapture.getStatus().mode })
    })

    electronAudioCapture.on('error', (error: Error) => {
      log('error', '❌ 音频捕获错误:', error)
      recordMetric('audio.capture.error', { message: error.message })
      sendToRenderer('session-error', '音频捕获出错，请检查权限设置')
    })

    const success = await electronAudioCapture.startCapture()
    if (success) {
      log('info', '✅ 音频捕获已启动')
      recordMetric('audio.capture.start.success')
    }
    return success
  } catch (error) {
    log('error', '❌ 启动音频捕获失败:', error)
    recordMetric('audio.capture.start.failure', {
      message: error instanceof Error ? error.message : String(error),
    })
    return false
  }
}

// 停止音频捕获
function stopAudioCapture(): boolean {
  try {
    electronAudioCapture.stopCapture()
    electronAudioCapture.removeAllListeners('audioData')
    electronAudioCapture.removeAllListeners('started')
    electronAudioCapture.removeAllListeners('error')
    if (debugAudio) {
      log('debug', '✅ 音频捕获已停止')
    }
    recordMetric('audio.capture.stopped')
    return true
  } catch (error) {
    log('error', '❌ 停止音频捕获失败:', error)
    recordMetric('audio.capture.stop.failure', {
      message: error instanceof Error ? error.message : String(error),
    })
    return false
  }
}

// 切换音频模式
async function switchAudioMode(mode: AudioMode): Promise<boolean> {
  try {
    log('info', `🔄 切换音频模式到: ${mode}`)

    // 切换前清理豆包服务的转录状态
    const service = getAiService()
    if (
      service &&
      getAiProvider() === 'doubao' &&
      typeof (service as any).clearTranscriptionState === 'function'
    ) {
      ;(service as any).clearTranscriptionState()
    }

    // 只切换音频捕获模式，保持 WebSocket 连接不变
    const success = await electronAudioCapture.switchMode(mode)

    if (success) {
      log('info', `✅ 音频模式切换成功: ${mode}`)
      sendToRenderer('update-status', `已切换到${mode === 'system' ? '系统音频' : '麦克风'}模式`)
    } else {
      log('error', `❌ 音频模式切换失败: ${mode}`)
    }

    return success
  } catch (error) {
    log('error', '❌ 音频模式切换失败:', error)
    return false
  }
}

// 获取音频状态
function getAudioStatus(): AudioStatus {
  return electronAudioCapture.getStatus() as AudioStatus
}

// 启动 SystemAudioDump 进程
async function startSystemAudioDump(): Promise<{ success: boolean; error?: string; pid?: number }> {
  try {
    if (debugAudio) {
      log('debug', '🚀 启动 SystemAudioDump 音频捕获...')
    }

    // 检查平台
    if (process.platform !== 'darwin') {
      if (debugAudio) {
        log('error', '❌ SystemAudioDump 仅支持 macOS')
      }
      return { success: false, error: 'SystemAudioDump 仅支持 macOS' }
    }

    // 先停止现有进程
    await killExistingSystemAudioDump()

    const path = require('path')

    // 获取 SystemAudioDump 路径
    let systemAudioPath: string
    if (app.isPackaged) {
      systemAudioPath = path.join(process.resourcesPath, 'SystemAudioDump')
    } else {
      systemAudioPath = path.join(__dirname, '../../assets', 'SystemAudioDump')
    }

    if (debugAudio) {
      log('debug', 'SystemAudioDump 路径:', systemAudioPath)
    }

    // 设置 spawn 选项
    const spawnOptions = {
      stdio: ['ignore', 'pipe', 'pipe'] as ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        PROCESS_NAME: 'AudioService',
        APP_NAME: 'System Audio Service',
      },
      detached: false,
    }

    // 启动 SystemAudioDump 进程
    systemAudioProc = spawn(systemAudioPath, [], spawnOptions)

    if (!systemAudioProc || !systemAudioProc.pid) {
      if (debugAudio) {
        log('error', '❌ 启动 SystemAudioDump 失败')
      }
      systemAudioProc = null
      recordMetric('audio.system_dump.start.failure')
      return { success: false, error: '启动 SystemAudioDump 进程失败' }
    }

    if (debugAudio) {
      log('info', '✅ SystemAudioDump 启动成功，PID:', systemAudioProc.pid)
    }
    recordMetric('audio.system_dump.started', { pid: systemAudioProc.pid })

    // 设置音频处理参数
    const CHANNELS = 2
    const targetSampleRate = getTargetSampleRate()
    const audioMimeType = `audio/pcm;rate=${targetSampleRate}`
    const samplesPerChunk = Math.floor(targetSampleRate * 0.1)
    const bytesPerChunk = samplesPerChunk * 2
    let pendingPcm = Buffer.alloc(0)

    if (systemAudioProc.stdout) {
      let audioRemainder = Buffer.alloc(0)

      systemAudioProc.stdout.on('data', (data: Buffer) => {
        // 保留 0-3 字节的尾部对齐，避免 16-bit 采样读越界
        const combined = audioRemainder.length ? Buffer.concat([audioRemainder, data]) : data
        const alignedLength = combined.length - (combined.length % 4)
        const alignedBuffer =
          alignedLength > 0 ? combined.subarray(0, alignedLength) : Buffer.alloc(0)
        audioRemainder =
          alignedLength < combined.length ? combined.subarray(alignedLength) : Buffer.alloc(0)

        if (alignedBuffer.length === 0) return

        const monoChunk = CHANNELS === 2 ? convertStereoToMono(alignedBuffer) : alignedBuffer
        const resampledChunk = resamplePcm16(monoChunk, SYSTEM_INPUT_SAMPLE_RATE, targetSampleRate)
        if (resampledChunk.length === 0) return

        pendingPcm = pendingPcm.length
          ? Buffer.concat([pendingPcm, resampledChunk])
          : resampledChunk

        while (pendingPcm.length >= bytesPerChunk) {
          const chunk = pendingPcm.subarray(0, bytesPerChunk)
          pendingPcm = pendingPcm.subarray(bytesPerChunk)

          // bigmodel_async 模式：服务端 VAD 自动判停，不需要客户端静音检测
          sendAudioToAI(chunk.toString('base64'), audioMimeType)

          if (process.env.DEBUG_AUDIO) {
            saveDebugAudio(chunk, 'system_audio')
          }
        }
      })
    }

    if (systemAudioProc.stderr) {
      systemAudioProc.stderr.on('data', (data: Buffer) => {
        if (debugAudio) {
          logSampled('warn', 0.2, 'SystemAudioDump 错误输出:', data.toString())
        }

        const errorMsg = data.toString()
        if (
          errorMsg.includes('系统已停止流播放') ||
          errorMsg.includes('Stream stopped with error') ||
          errorMsg.includes('SCStreamErrorDomain')
        ) {
          if (debugAudio) {
            log('warn', '🚨 macOS 停止了系统音频流')
          }
          recordMetric('audio.stream.interrupted')

          if (shouldAttemptAudioRestart()) {
            if (debugAudio) {
              log('info', '🔄 尝试重启音频捕获...')
            }
            recordMetric('audio.system_dump.restart.scheduled', { attempt: audioRestartCount + 1 })

            sendToRenderer('audio-stream-interrupted')

            const delay = Math.min(2000 * Math.pow(2, audioRestartCount), 10000)
            setTimeout(async () => {
              await restartSystemAudioDumpWithBackoff()
            }, delay)
          } else {
            if (debugAudio) {
              log('warn', '❌ 重启次数过多，停止自动重启')
            }
            recordMetric('audio.system_dump.restart.exhausted', { attempts: audioRestartCount })
            sendToRenderer('session-error', '音频流多次中断，请检查系统权限或手动重连')
          }
        }
      })
    }

    systemAudioProc.on('close', (code: number | null) => {
      if (debugAudio) {
        log('info', 'SystemAudioDump 进程关闭，退出码:', code)
      }

      const geminiService = getAiService()
      const shouldRestart = !!geminiService?.isSessionReady?.()

      if (code !== 0 && code !== null && shouldRestart) {
        if (debugAudio) {
          log('warn', '🚨 SystemAudioDump 异常退出，尝试重启...')
        }
        recordMetric('audio.system_dump.exited', { code })
        sendToRenderer('audio-stream-interrupted')

        setTimeout(async () => {
          if (debugAudio) {
            log('info', '🔄 异常退出后尝试重启音频捕获...')
          }
          await restartSystemAudioDump()
        }, 3000)
      }

      systemAudioProc = null
    })

    systemAudioProc.on('error', (err: Error) => {
      if (debugAudio) {
        log('error', 'SystemAudioDump 进程错误:', err)
      }
      systemAudioProc = null
    })

    await new Promise((resolve) => setTimeout(resolve, 1000))

    resetAudioRestartCounter()

    return { success: true, pid: systemAudioProc?.pid || 0 }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    if (debugAudio) {
      log('error', '启动 SystemAudioDump 失败:', errorMessage)
    }
    recordMetric('audio.system_dump.start.failure', { message: errorMessage })
    return { success: false, error: errorMessage }
  }
}

// 停止 SystemAudioDump 进程
async function stopSystemAudioDump(): Promise<{ success: boolean; error?: string }> {
  try {
    if (systemAudioProc) {
      if (debugAudio) {
        log('debug', '⏹️ 停止 SystemAudioDump...')
      }
      systemAudioProc.kill('SIGTERM')
      systemAudioProc = null
      if (debugAudio) {
        log('info', '✅ SystemAudioDump 已停止')
      }
    }
    recordMetric('audio.system_dump.stopped')
    return { success: true }
  } catch (error) {
    log('error', '停止 SystemAudioDump 失败:', error)
    recordMetric('audio.system_dump.stop.failure', {
      message: error instanceof Error ? error.message : String(error),
    })
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

// 检查是否应该尝试重启音频
function shouldAttemptAudioRestart(): boolean {
  const now = Date.now()

  if (isAudioRestarting) {
    return false
  }

  if (now - lastRestartTime < RESTART_COOLDOWN) {
    return false
  }

  if (audioRestartCount >= MAX_RESTART_ATTEMPTS) {
    return false
  }

  return true
}

// 重启音频捕获函数（带指数退避）
async function restartSystemAudioDumpWithBackoff() {
  if (isAudioRestarting) {
    if (debugAudio) {
      log('debug', '音频重启进行中，跳过本次尝试')
    }
    return
  }

  isAudioRestarting = true
  audioRestartCount++
  lastRestartTime = Date.now()

  try {
    if (debugAudio) {
      log('info', `🔄 正在重启音频捕获 (${audioRestartCount}/${MAX_RESTART_ATTEMPTS})...`)
    }
    recordMetric('audio.system_dump.restart.attempt', { attempt: audioRestartCount })

    await stopSystemAudioDump()
    await new Promise((resolve) => setTimeout(resolve, 3000))

    const result = await startSystemAudioDump()

    if (result.success) {
      if (debugAudio) {
        log('info', '✅ 音频捕获重启成功')
      }
      recordMetric('audio.system_dump.restart.success', { attempt: audioRestartCount })
      audioRestartCount = 0
      sendToRenderer('audio-stream-restored')
      sendToRenderer('update-status', '音频流已恢复')
    } else {
      if (debugAudio) {
        log('error', '❌ 音频捕获重启失败')
      }
      recordMetric('audio.system_dump.restart.failure', { attempt: audioRestartCount })
      if (audioRestartCount >= MAX_RESTART_ATTEMPTS) {
        sendToRenderer('session-error', '音频流多次重启失败，请检查系统权限或手动重连')
      } else {
        sendToRenderer(
          'session-error',
          `音频流重启失败 (${audioRestartCount}/${MAX_RESTART_ATTEMPTS})，将自动重试`,
        )
      }
    }
  } catch (error) {
    if (debugAudio) {
      log('error', '❌ 音频捕获重启出错:', error)
    }
    recordMetric('audio.system_dump.restart.error', {
      message: error instanceof Error ? error.message : String(error),
    })
    sendToRenderer('session-error', '音频流重启出错，请手动重连')
  } finally {
    isAudioRestarting = false
  }
}

// 重启音频捕获函数（保持向后兼容）
async function restartSystemAudioDump() {
  return await restartSystemAudioDumpWithBackoff()
}

// 重置音频重启计数器
function resetAudioRestartCounter() {
  audioRestartCount = 0
  lastRestartTime = 0
  isAudioRestarting = false
  if (debugAudio) {
    log('debug', '🔄 音频重启计数已重置')
  }
}

// 停止系统音频捕获
export function stopSystemAudioCapture(): void {
  stopAudioCapture()
  stopSystemAudioDump()
}

export {
  setMainWindow,
  startAudioCapture,
  stopAudioCapture,
  switchAudioMode,
  getAudioStatus,
  startSystemAudioDump,
  stopSystemAudioDump,
  killExistingSystemAudioDump,
}
