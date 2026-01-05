import { ipcMain } from 'electron'
import { startAudioCapture, stopAudioCapture, switchAudioMode, getAudioStatus, startSystemAudioDump, stopSystemAudioDump } from '../audio-manager'
import { electronAudioCapture } from '../audio/electron-native-capture'
import { broadcastToAllWindows } from '../window-manager'
import type { AudioMode } from '../../shared/ipc'

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
  return await switchAudioMode(mode)
})

// 获取音频状态
ipcMain.handle('get-audio-status', () => {
  return getAudioStatus()
})

// 接收渲染进程音频数据的处理器
ipcMain.on('audio-data', (event, audioPacket) => {
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
      console.warn('⚠️ 未知的音频数据格式:', typeof audioPacket)
      return
    }

    // 发送给音频处理器
    electronAudioCapture.onAudioData(buffer)
  } catch (error) {
    console.error('处理音频数据失败:', error)
  }
})

// 处理音频模式降级通知
ipcMain.on('audio-mode-fallback', (event, fallbackInfo) => {
  if (debugAudio) {
    console.log('🔄 音频模式降级:', fallbackInfo)
  }
  const { reason } = fallbackInfo

  // 通知前端显示降级信息
  const message = `系统音频不可用，已自动切换到麦克风模式`
  broadcastToAllWindows('update-status', message)
  broadcastToAllWindows('audio-mode-changed', {
    mode: 'microphone',
    fallback: true,
    reason: reason
  })
})

// SystemAudioDump 相关 IPC 处理器

// 检查 SystemAudioDump 是否可用
ipcMain.handle('check-system-audio-dump-available', async () => {
  try {
    const fs = require('fs')
    const path = require('path')
    const app = require('electron').app

    // 获取 SystemAudioDump 路径
    let systemAudioPath: string
    if (app.isPackaged) {
      systemAudioPath = path.join(process.resourcesPath, 'SystemAudioDump')
    } else {
      systemAudioPath = path.join(__dirname, '../../assets', 'SystemAudioDump')
    }

    // 检查文件是否存在且可执行
    const exists = fs.existsSync(systemAudioPath)
    if (!exists) {
      if (debugAudio) {
        console.log('❌ SystemAudioDump 文件不存在:', systemAudioPath)
      }
      return { available: false, reason: 'SystemAudioDump 文件不存在' }
    }

    // 检查是否为 macOS 平台
    if (process.platform !== 'darwin') {
      if (debugAudio) {
        console.log('❌ SystemAudioDump 仅支持 macOS')
      }
      return { available: false, reason: 'SystemAudioDump 仅支持 macOS' }
    }

    // 检查文件权限
    try {
      fs.accessSync(systemAudioPath, fs.constants.F_OK | fs.constants.X_OK)
      if (debugAudio) {
        console.log('✅ SystemAudioDump 可用:', systemAudioPath)
      }
      return { available: true, path: systemAudioPath }
    } catch (permError) {
      if (debugAudio) {
        console.log('❌ SystemAudioDump 权限不足:', permError)
      }
      return { available: false, reason: 'SystemAudioDump 权限不足' }
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('检查 SystemAudioDump 可用性失败:', errorMessage)
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
