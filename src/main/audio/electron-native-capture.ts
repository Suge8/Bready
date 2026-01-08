/**
 * Electron 音频捕获协调器
 * 主进程端负责权限检查和状态管理，实际音频捕获在渲染进程中进行
 */

import { systemPreferences } from 'electron'
import { EventEmitter } from 'events'
import type { AudioCaptureOptions, AudioMode, AudioStatus } from '../../shared/ipc'

const debugAudio = process.env.DEBUG_AUDIO === '1'
const GEMINI_SAMPLE_RATE = 24000
const DOUBAO_SAMPLE_RATE = 16000

function resolveAiProvider(): 'gemini' | 'doubao' {
  const provider = (process.env.AI_PROVIDER || 'gemini').toLowerCase()
  return provider === 'doubao' ? 'doubao' : 'gemini'
}

function getCaptureSampleRate(): number {
  return resolveAiProvider() === 'doubao' ? DOUBAO_SAMPLE_RATE : GEMINI_SAMPLE_RATE
}

export type { AudioCaptureOptions } from '../../shared/ipc'

export class ElectronNativeAudioCapture extends EventEmitter {
  private isCapturing = false
  private options: AudioCaptureOptions
  private mainWindow: Electron.BrowserWindow | null = null

  constructor(options: Partial<AudioCaptureOptions> = {}) {
    super()
    this.options = {
      sampleRate: getCaptureSampleRate(),
      channels: 1,
      bitDepth: 16,
      mode: 'system',
      ...options
    }
  }

  /**
   * 设置主窗口引用，用于与渲染进程通信
   */
  setMainWindow(window: Electron.BrowserWindow) {
    this.mainWindow = window
  }

  /**
   * 启动音频捕获 - 协调渲染进程中的实际捕获
   */
  async startCapture(): Promise<boolean> {
    if (this.isCapturing) {
      if (debugAudio) {
        console.log('🎵 音频捕获已在运行')
      }
      return true
    }

    try {
      if (debugAudio) {
        console.log('🚀 启动音频捕获协调器...')
      }

      // 检查权限
      const hasPermission = await this.checkPermissions()
      if (!hasPermission) {
        throw new Error('缺少必要的音频捕获权限')
      }

      this.options.sampleRate = getCaptureSampleRate()

      // 通知渲染进程开始音频捕获
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        const eventData = {
          mode: this.options.mode,
          options: this.options
        }
        if (debugAudio) {
          console.log('📡 主进程发送音频捕获启动事件到渲染进程:', eventData)
        }
        this.mainWindow.webContents.send('audio-capture-start', eventData)
        if (debugAudio) {
          console.log('📡 音频捕获启动事件已发送')
        }
      } else {
        console.error('❌ 主窗口不可用，无法发送音频捕获事件')
        throw new Error('主窗口不可用')
      }

      this.isCapturing = true
      this.emit('started')

      return true

    } catch (error) {
      console.error('❌ 音频捕获启动失败:', error)
      this.emit('error', error)
      return false
    }
  }

  /**
   * 检查所需权限
   */
  private async checkPermissions(): Promise<boolean> {
    try {
      if (debugAudio) {
        console.log(`🔐 检查 ${this.options.mode} 模式所需权限...`)
      }

      if (this.options.mode === 'system') {
        // 检查屏幕录制权限
        const screenPermission = systemPreferences.getMediaAccessStatus('screen')
        if (debugAudio) {
          console.log(`🔐 屏幕录制权限状态: ${screenPermission}`)
        }
        if (screenPermission !== 'granted') {
          if (debugAudio) {
            console.log('🔐 需要屏幕录制权限用于系统音频捕获')
          }
          // 在实际应用中，这里会触发权限请求
          return false
        }
      } else {
        // 检查麦克风权限
        const micPermission = systemPreferences.getMediaAccessStatus('microphone')
        if (debugAudio) {
          console.log(`🔐 麦克风权限状态: ${micPermission}`)
        }
        if (micPermission !== 'granted') {
          if (debugAudio) {
            console.log('🔐 请求麦克风权限...')
          }
          const granted = await systemPreferences.askForMediaAccess('microphone')
          if (debugAudio) {
            console.log(`🔐 麦克风权限请求结果: ${granted ? '已授予' : '被拒绝'}`)
          }
          return granted
        }
        if (debugAudio) {
          console.log('✅ 麦克风权限已授予')
        }
      }
      return true
    } catch (error) {
      console.error('权限检查失败:', error)
      return false
    }
  }

  /**
   * 处理来自渲染进程的音频数据
   */
  onAudioData(data: Buffer) {
    if (this.isCapturing) {
      this.emit('audioData', data)
    }
  }

  /**
   * 停止音频捕获
   */
  stopCapture(): void {
    if (debugAudio) {
      console.log('⏹️ 停止音频捕获...')
      console.log('📊 当前模式:', this.options.mode)
    }

    // 发送停止事件到渲染进程
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      if (debugAudio) {
        console.log('📡 主进程发送音频捕获停止事件到渲染进程')
      }
      this.mainWindow.webContents.send('audio-capture-stop')
      if (debugAudio) {
        console.log('📡 音频捕获停止事件已发送')
      }
    } else {
      if (debugAudio) {
        console.warn('⚠️ 主窗口不可用，无法发送音频捕获停止事件')
      }
    }

    this.isCapturing = false
    this.emit('stopped')
    if (debugAudio) {
      console.log('✅ 音频捕获已停止')
    }
  }

  /**
   * 切换音频模式
   */
  async switchMode(mode: AudioMode): Promise<boolean> {
    if (this.options.mode === mode) {
      if (debugAudio) {
        console.log(`🔄 已经是 ${mode} 模式，无需切换`)
      }
      return true
    }

    if (debugAudio) {
      console.log(`🔄 切换音频模式: ${this.options.mode} → ${mode}`)
      console.log(`🔄 当前捕获状态: ${this.isCapturing ? '运行中' : '已停止'}`)
    }

    const wasCapturing = this.isCapturing
    if (wasCapturing) {
      if (debugAudio) {
        console.log('⏸️ 暂停当前音频捕获...')
      }
      this.stopCapture()
      // 等待一小段时间确保停止完成
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    this.options.mode = mode
    if (debugAudio) {
      console.log(`✅ 音频模式已更新为: ${mode}`)
    }

    if (wasCapturing) {
      if (debugAudio) {
        console.log('▶️ 重新启动音频捕获...')
      }
      const result = await this.startCapture()
      if (debugAudio) {
        console.log(`🔄 重新启动结果: ${result ? '成功' : '失败'}`)
      }
      return result
    }

    return true
  }

  /**
   * 获取当前状态
   */
  getStatus(): AudioStatus {
    return {
      capturing: this.isCapturing,
      mode: this.options.mode,
      options: { ...this.options }
    }
  }
}

// 创建全局单例
export const electronAudioCapture = new ElectronNativeAudioCapture()
