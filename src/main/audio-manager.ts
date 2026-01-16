import { BrowserWindow } from 'electron'
import { electronAudioCapture } from './audio/electron-native-capture'
import { saveDebugAudio } from './audioUtils'
import { broadcastToAllWindows } from './window-manager'
import { getAiProvider, getAiService } from './ai-service'
import { log, logSampled } from './utils/logging'
import { recordMetric } from './utils/metrics'
import {
  createAudioCaptureProvider,
  disposeAudioCaptureProvider,
  type AudioCaptureProvider,
} from './audio'
import type { AudioMode, AudioStatus } from '../shared/ipc'

let mainWindow: BrowserWindow | null = null
let systemAudioProvider: AudioCaptureProvider | null = null

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

let audioRestartCount = 0
let lastRestartTime = 0
let isAudioRestarting = false
const MAX_RESTART_ATTEMPTS = 3
const RESTART_COOLDOWN = 30000

function sendToRenderer(channel: string, data?: any): void {
  broadcastToAllWindows(channel, data)
}

let audioSendCount = 0

function sendAudioToAI(base64Data: string, mimeType?: string): void {
  if (!base64Data || typeof base64Data !== 'string') return
  const service = getAiService()

  audioSendCount++

  if (audioSendCount === 1 || audioSendCount % 50 === 0) {
    try {
      const buffer = Buffer.from(base64Data, 'base64')
      const sampleCount = Math.floor(buffer.length / 2)
      const view = new Int16Array(buffer.buffer, buffer.byteOffset, sampleCount)

      let sumOfSquares = 0
      for (let i = 0; i < Math.min(sampleCount, 1000); i += 4) {
        sumOfSquares += view[i] * view[i]
      }
      const rms = Math.sqrt(sumOfSquares / (Math.min(sampleCount, 1000) / 4))

      log(
        'info',
        `📤 audio-manager #${audioSendCount}, provider: ${getAiProvider()}, RMS: ${Math.round(rms)}`,
      )
    } catch {
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
    service.sendAudio(base64Data, mimeType || getAudioMimeType())
  } catch (error) {
    log('error', '发送音频到 AI 服务失败:', error)
  }
}

function convertStereoToMono(stereoBuffer: Buffer): Buffer {
  const samples = stereoBuffer.length / 4
  const monoBuffer = Buffer.alloc(samples * 2)

  for (let i = 0; i < samples; i++) {
    const leftSample = stereoBuffer.readInt16LE(i * 4)
    const rightSample = stereoBuffer.readInt16LE(i * 4 + 2)
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

function setMainWindow(window: BrowserWindow): void {
  mainWindow = window
  electronAudioCapture.setMainWindow(window)
}

async function startAudioCapture(): Promise<boolean> {
  try {
    if (debugAudio) {
      log('debug', '🎵 启动音频捕获协调器...')
    }

    if (mainWindow) {
      electronAudioCapture.setMainWindow(mainWindow)
    }

    electronAudioCapture.removeAllListeners('audioData')
    electronAudioCapture.removeAllListeners('started')
    electronAudioCapture.removeAllListeners('error')

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

async function switchAudioMode(mode: AudioMode): Promise<boolean> {
  try {
    log('info', `🔄 切换音频模式到: ${mode}`)

    const service = getAiService()
    if (
      service &&
      getAiProvider() === 'doubao' &&
      typeof (service as any).clearTranscriptionState === 'function'
    ) {
      ;(service as any).clearTranscriptionState()
    }

    const success = await electronAudioCapture.switchMode(mode)

    if (success) {
      log('info', `✅ 音频模式切换成功: ${mode}`)
      sendToRenderer('update-status', `已切换到${mode === 'system' ? '系统音频' : '麦克风'}模式`)
      sendToRenderer('audio-mode-changed', { mode })
    } else {
      log('error', `❌ 音频模式切换失败: ${mode}`)
    }

    return success
  } catch (error) {
    log('error', '❌ 音频模式切换失败:', error)
    return false
  }
}

function getAudioStatus(): AudioStatus {
  return electronAudioCapture.getStatus() as AudioStatus
}

async function startSystemAudioDump(): Promise<{ success: boolean; error?: string; pid?: number }> {
  try {
    if (debugAudio) {
      log('debug', `🚀 启动系统音频捕获 (${process.platform})...`)
    }

    systemAudioProvider = createAudioCaptureProvider()

    const available = await systemAudioProvider.isAvailable()
    if (!available) {
      const platformName = process.platform === 'darwin' ? 'SystemAudioDump' : 'WindowsAudioDump'
      return { success: false, error: `${platformName} 不可用` }
    }

    const CHANNELS = 2
    const targetSampleRate = getTargetSampleRate()
    const audioMimeType = `audio/pcm;rate=${targetSampleRate}`
    const samplesPerChunk = Math.floor(targetSampleRate * 0.1)
    const bytesPerChunk = samplesPerChunk * 2
    let pendingPcm = Buffer.alloc(0)

    systemAudioProvider.onData((data: Buffer) => {
      const monoChunk = CHANNELS === 2 ? convertStereoToMono(data) : data
      const resampledChunk = resamplePcm16(monoChunk, SYSTEM_INPUT_SAMPLE_RATE, targetSampleRate)
      if (resampledChunk.length === 0) return

      pendingPcm = pendingPcm.length ? Buffer.concat([pendingPcm, resampledChunk]) : resampledChunk

      while (pendingPcm.length >= bytesPerChunk) {
        const chunk = pendingPcm.subarray(0, bytesPerChunk)
        pendingPcm = pendingPcm.subarray(bytesPerChunk)

        sendAudioToAI(chunk.toString('base64'), audioMimeType)

        if (process.env.DEBUG_AUDIO) {
          saveDebugAudio(chunk, 'system_audio')
        }
      }
    })

    systemAudioProvider.onError((error: Error) => {
      if (debugAudio) {
        logSampled('warn', 0.2, '系统音频错误:', error.message)
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
    })

    systemAudioProvider.on('close', (code: number | null) => {
      if (debugAudio) {
        log('info', '系统音频进程关闭，退出码:', code)
      }

      const aiService = getAiService()
      const shouldRestart = !!aiService?.isSessionReady?.()

      if (code !== 0 && code !== null && shouldRestart) {
        if (debugAudio) {
          log('warn', '🚨 系统音频异常退出，尝试重启...')
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
    })

    const result = await systemAudioProvider.start()

    if (result.success) {
      if (debugAudio) {
        log('info', '✅ 系统音频启动成功，PID:', result.pid)
      }
      recordMetric('audio.system_dump.started', { pid: result.pid })
      resetAudioRestartCounter()
    } else {
      recordMetric('audio.system_dump.start.failure')
    }

    return result
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    if (debugAudio) {
      log('error', '启动系统音频失败:', errorMessage)
    }
    recordMetric('audio.system_dump.start.failure', { message: errorMessage })
    return { success: false, error: errorMessage }
  }
}

async function stopSystemAudioDump(): Promise<{ success: boolean; error?: string }> {
  try {
    if (systemAudioProvider) {
      if (debugAudio) {
        log('debug', '⏹️ 停止系统音频...')
      }
      const result = await systemAudioProvider.stop()
      systemAudioProvider.removeAllListeners()
      systemAudioProvider = null
      if (debugAudio) {
        log('info', '✅ 系统音频已停止')
      }
      recordMetric('audio.system_dump.stopped')
      return result
    }
    return { success: true }
  } catch (error) {
    log('error', '停止系统音频失败:', error)
    recordMetric('audio.system_dump.stop.failure', {
      message: error instanceof Error ? error.message : String(error),
    })
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

async function killExistingSystemAudioDump(): Promise<void> {
  if (systemAudioProvider) {
    await systemAudioProvider.stop()
    systemAudioProvider = null
  }
}

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

async function restartSystemAudioDump() {
  return await restartSystemAudioDumpWithBackoff()
}

function resetAudioRestartCounter() {
  audioRestartCount = 0
  lastRestartTime = 0
  isAudioRestarting = false
  if (debugAudio) {
    log('debug', '🔄 音频重启计数已重置')
  }
}

export function stopSystemAudioCapture(): void {
  stopAudioCapture()
  stopSystemAudioDump()
  disposeAudioCaptureProvider()
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
