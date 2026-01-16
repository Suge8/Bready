import { ipcMain } from 'electron'
import {
  startAudioCapture,
  stopAudioCapture,
  switchAudioMode,
  getAudioStatus,
  startSystemAudioDump,
  stopSystemAudioDump,
} from '../audio-manager'
import { createAudioCaptureProvider } from '../audio'
import { electronAudioCapture } from '../audio/electron-native-capture'
import { broadcastToAllWindows } from '../window-manager'
import { createLogger } from '../utils/logging'
import type { AudioMode } from '../../shared/ipc'

const logger = createLogger('audio-handlers')
const debugAudio = process.env.DEBUG_AUDIO === '1'

// 音频捕获处理
ipcMain.handle('start-audio-capture', async () => {
  return await startAudioCapture()
})

ipcMain.handle('stop-audio-capture', () => {
  return stopAudioCapture()
})

// 音频模式切换处理器
ipcMain.handle('switch-audio-mode', async (event, mode: AudioMode) => {
  void event
  return await switchAudioMode(mode)
})

// 获取音频状态
ipcMain.handle('get-audio-status', () => {
  return getAudioStatus()
})

// 接收渲染进程音频数据的处理器
ipcMain.on('audio-data', (event, audioPacket) => {
  void event
  try {
    let buffer: Buffer

    // 处理不同的数据格式
    if (audioPacket instanceof Float32Array) {
      // 新格式：直接传输的Float32Array，无延迟处理
      buffer = Buffer.from(audioPacket.buffer)
    } else if (audioPacket && audioPacket.type === 'audio' && audioPacket.data) {
      // 旧格式：Base64编码数据
      const binaryString = atob(audioPacket.data)
      buffer = Buffer.from(binaryString, 'binary')
    } else if (audioPacket instanceof ArrayBuffer || Buffer.isBuffer(audioPacket)) {
      // 兼容格式：ArrayBuffer或Buffer
      buffer = Buffer.from(audioPacket)
    } else {
      logger.warn('⚠️ 未知的音频数据格式', { type: typeof audioPacket })
      return
    }

    // 发送给音频处理器
    electronAudioCapture.onAudioData(buffer)
  } catch (error) {
    logger.error('处理音频数据失败', {
      error:
        error instanceof Error ? { message: error.message, stack: error.stack } : String(error),
    })
  }
})

// 处理音频模式降级通知
ipcMain.on('audio-mode-fallback', (event, fallbackInfo) => {
  void event
  if (debugAudio) {
    logger.debug('🔄 音频模式降级', { fallbackInfo })
  }
  const { reason } = fallbackInfo

  // 通知前端显示降级信息
  const message = `系统音频不可用，已自动切换到麦克风模式`
  broadcastToAllWindows('update-status', message)
  broadcastToAllWindows('audio-mode-changed', {
    mode: 'microphone',
    fallback: true,
    reason: reason,
  })
})

// 转发渲染进程的设备变更事件给所有窗口
ipcMain.on('audio-device-changed', (event, deviceInfo) => {
  void event
  broadcastToAllWindows('audio-device-changed', deviceInfo)
})

// SystemAudioDump 相关 IPC 处理器

ipcMain.handle('check-system-audio-dump-available', async () => {
  try {
    const provider = createAudioCaptureProvider()
    const available = await provider.isAvailable()

    if (!available) {
      const platformName = process.platform === 'darwin' ? 'SystemAudioDump' : 'WindowsAudioDump'
      if (debugAudio) {
        logger.warn(`❌ ${platformName} 不可用`)
      }
      return { available: false, reason: `${platformName} 不可用` }
    }

    if (debugAudio) {
      logger.info('✅ 系统音频捕获可用', { platform: process.platform })
    }
    return { available: true, platform: process.platform }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error('检查系统音频可用性失败', { error: errorMessage })
    return { available: false, reason: errorMessage }
  }
})

// 启动 SystemAudioDump 进程
ipcMain.handle('start-system-audio-dump', async () => {
  return await startSystemAudioDump()
})

// 停止 SystemAudioDump 进程
ipcMain.handle('stop-system-audio-dump', async () => {
  return await stopSystemAudioDump()
})

export {}
