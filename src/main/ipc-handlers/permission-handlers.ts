import { ipcMain, systemPreferences, desktopCapturer } from 'electron'
import { exec } from 'child_process'
import { promisify } from 'util'
import { electronAudioCapture } from '../audio/electron-native-capture'
import { checkAiConfigStatus } from '../services/settings-service'
import type { PermissionStatus, SystemPermissions } from '../../shared/ipc'

const debugAudio = process.env.DEBUG_AUDIO === '1'
const execAsync = promisify(exec)

async function checkScreenRecordingPermission(): Promise<PermissionStatus> {
  try {
    const status = systemPreferences.getMediaAccessStatus('screen')

    if (status === 'granted') {
      return {
        granted: true,
        canRequest: false,
        message: '屏幕录制权限已授予',
      }
    } else if (status === 'denied') {
      return {
        granted: false,
        canRequest: false,
        message: '屏幕录制权限被拒绝，请在系统偏好设置中手动授予',
      }
    }

    return {
      granted: false,
      canRequest: true,
      message: '需要屏幕录制权限以捕获系统音频',
    }
  } catch (error) {
    console.error('检查屏幕录制权限时出错:', error)
    return {
      granted: false,
      canRequest: false,
      message: '无法检查屏幕录制权限状态',
    }
  }
}

async function checkMicrophonePermission(): Promise<PermissionStatus> {
  try {
    const status = systemPreferences.getMediaAccessStatus('microphone')

    if (status === 'granted') {
      return {
        granted: true,
        canRequest: false,
        message: '麦克风权限已授予',
      }
    } else if (status === 'denied') {
      return {
        granted: false,
        canRequest: false,
        message: '麦克风权限被拒绝，请在系统偏好设置中手动授予',
      }
    }

    const canRequest = await systemPreferences.askForMediaAccess('microphone')
    return {
      granted: canRequest,
      canRequest: !canRequest,
      message: canRequest ? '麦克风权限已授予' : '需要麦克风权限',
    }
  } catch (error) {
    console.error('检查麦克风权限时出错:', error)
    return {
      granted: false,
      canRequest: false,
      message: '无法检查麦克风权限状态',
    }
  }
}

async function checkApiKeyStatus(): Promise<PermissionStatus> {
  try {
    const status = await checkAiConfigStatus()

    if (status.configured) {
      const providerName = status.provider === 'doubao' ? '豆包' : 'Gemini'
      return {
        granted: true,
        canRequest: false,
        message: `${providerName} API 配置正确`,
      }
    }

    const missingStr = status.missingFields.join(', ')
    return {
      granted: false,
      canRequest: true,
      message: `AI 配置未完成，缺少: ${missingStr}`,
    }
  } catch (error) {
    console.error('检查API密钥时出错:', error)
    return {
      granted: false,
      canRequest: true,
      message: '无法验证API密钥状态',
    }
  }
}

async function checkAudioDeviceStatus(): Promise<PermissionStatus> {
  try {
    const screenStatus = systemPreferences.getMediaAccessStatus('screen')
    const micStatus = systemPreferences.getMediaAccessStatus('microphone')

    if (screenStatus === 'granted' || micStatus === 'granted') {
      return {
        granted: true,
        canRequest: false,
        message: 'Electron 原生音频捕获可用',
      }
    }

    return {
      granted: false,
      canRequest: true,
      message: '需要屏幕录制或麦克风权限以启用音频捕获',
    }
  } catch (error) {
    console.error('检查音频设备时出错:', error)
    return {
      granted: false,
      canRequest: true,
      message: '无法检查音频设备状态',
    }
  }
}

async function getAllPermissionsStatus(): Promise<SystemPermissions> {
  const [screenRecording, microphone, apiKey, audioDevice] = await Promise.all([
    checkScreenRecordingPermission(),
    checkMicrophonePermission(),
    checkApiKeyStatus(),
    checkAudioDeviceStatus(),
  ])

  return {
    screenRecording,
    microphone,
    apiKey,
    audioDevice,
  }
}

async function openSystemPreferences(pane: string): Promise<boolean> {
  try {
    let command: string

    switch (pane) {
      case 'screen-recording':
        command =
          'open "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture"'
        break
      case 'microphone':
        command =
          'open "x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone"'
        break
      case 'privacy':
        command = 'open "x-apple.systempreferences:com.apple.preference.security?Privacy"'
        break
      default:
        command = 'open "x-apple.systempreferences:com.apple.preference.security"'
    }

    await execAsync(command)
    return true
  } catch (error) {
    console.error('打开系统偏好设置失败:', error)
    return false
  }
}

async function testAudioCapture(): Promise<{
  success: boolean
  message: string
  audioData?: number
  silencePercentage?: number
  recommendation?: string
}> {
  try {
    console.log('🧪 测试 Electron 原生音频捕获...')

    const status = electronAudioCapture.getStatus()

    if (status.capturing) {
      return {
        success: true,
        message: '音频捕获已在运行，工作正常',
        recommendation: '音频捕获功能正常，可以使用协作模式',
      }
    }

    return new Promise((resolve) => {
      let audioDataSize = 0

      const testListener = (data: Buffer) => {
        audioDataSize += data.length
      }

      electronAudioCapture.on('audioData', testListener)

      electronAudioCapture
        .startCapture()
        .then((started) => {
          if (!started) {
            electronAudioCapture.removeListener('audioData', testListener)
            resolve({
              success: false,
              message: '音频捕获启动失败',
              recommendation: '请检查系统权限设置',
            })
            return
          }

          setTimeout(() => {
            try {
              electronAudioCapture.stopCapture()
              electronAudioCapture.removeListener('audioData', testListener)

              if (audioDataSize === 0) {
                resolve({
                  success: false,
                  message: '没有捕获到音频数据',
                  audioData: 0,
                  silencePercentage: 100,
                  recommendation: '请检查麦克风或屏幕录制权限，并确保有音频正在播放',
                })
              } else {
                resolve({
                  success: true,
                  message: `Electron 原生音频捕获正常！捕获了 ${audioDataSize} 字节数据`,
                  audioData: audioDataSize,
                  silencePercentage: 0,
                  recommendation: '音频捕获工作正常，可以使用协作模式',
                })
              }
            } catch (error) {
              console.error('音频测试清理错误:', error)
              resolve({
                success: false,
                message: '音频测试清理失败',
                recommendation: '请重试或检查系统状态',
              })
            }
          }, 3000)
        })
        .catch((error) => {
          console.error('音频测试启动失败:', error)
          electronAudioCapture.removeListener('audioData', testListener)
          resolve({
            success: false,
            message: '音频捕获启动异常',
            recommendation: '请检查系统权限和设备状态',
          })
        })
    })
  } catch (error: any) {
    return {
      success: false,
      message: `音频捕获测试出错: ${error.message}`,
      recommendation: '请检查系统权限和网络连接',
    }
  }
}

ipcMain.handle('check-permissions', async () => {
  return await getAllPermissionsStatus()
})

ipcMain.handle('check-screen-recording-permission', async () => {
  return await checkScreenRecordingPermission()
})

ipcMain.handle('check-microphone-permission', async () => {
  return await checkMicrophonePermission()
})

ipcMain.handle('check-api-key-status', async () => {
  return await checkApiKeyStatus()
})

ipcMain.handle('check-audio-device-status', async () => {
  return await checkAudioDeviceStatus()
})

ipcMain.handle('open-system-preferences', async (event, pane: string) => {
  void event
  return await openSystemPreferences(pane)
})

ipcMain.handle('test-audio-capture', async () => {
  return await testAudioCapture()
})

ipcMain.handle('request-microphone-permission', async () => {
  try {
    const granted = await systemPreferences.askForMediaAccess('microphone')
    return {
      granted,
      message: granted ? '麦克风权限已授予' : '麦克风权限被拒绝',
    }
  } catch (error) {
    return {
      granted: false,
      message: `请求麦克风权限失败: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
})

ipcMain.handle('get-desktop-sources-safe', async (event, options) => {
  void event
  try {
    const screenStatus = systemPreferences.getMediaAccessStatus('screen')
    if (screenStatus !== 'granted') {
      if (debugAudio) {
        console.warn('⚠️ 屏幕录制权限未授予，无法获取桌面源')
      }
      return []
    }

    if (!options || typeof options !== 'object') {
      if (debugAudio) {
        console.warn('⚠️ 获取桌面源: 无效的 options 参数')
      }
      return []
    }

    if (debugAudio) {
      console.log('📡 正在安全获取桌面源...', options)
    }

    const safeOptions = {
      types: options.types || ['screen'],
      fetchWindowIcons: false,
      thumbnailSize: { width: 150, height: 150 },
      ...options,
    }

    const sources = await Promise.race([
      desktopCapturer.getSources(safeOptions),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('获取桌面源超时')), 5000),
      ),
    ])

    if (debugAudio) {
      console.log('✅ 安全获取桌面源成功:', sources?.length || 0, '个')
    }
    return sources || []
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    if (debugAudio) {
      console.error('❌ 安全获取桌面源失败:', errorMessage)
    }

    if (
      errorMessage.includes('permission') ||
      errorMessage.includes('access') ||
      errorMessage.includes('bad IPC')
    ) {
      if (debugAudio) {
        console.log('🔒 权限或IPC错误，返回空数组')
      }
    }

    return []
  }
})

ipcMain.handle('get-desktop-sources', async (event, options) => {
  void event
  try {
    const screenStatus = systemPreferences.getMediaAccessStatus('screen')
    if (screenStatus !== 'granted') {
      if (debugAudio) {
        console.warn('⚠️ 屏幕录制权限未授予，无法获取桌面源')
      }
      return []
    }

    if (!options || typeof options !== 'object') {
      if (debugAudio) {
        console.warn('⚠️ 获取桌面源: 无效的 options 参数')
      }
      return []
    }

    if (debugAudio) {
      console.log('📡 正在获取桌面源...', options)
    }

    const safeOptions = {
      types: options.types || ['screen'],
      fetchWindowIcons: false,
      ...options,
    }

    const sources = await desktopCapturer.getSources(safeOptions)
    if (debugAudio) {
      console.log('✅ 成功获取桌面源:', sources?.length || 0, '个')
    }

    return sources || []
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    if (debugAudio) {
      console.error('❌ 获取桌面源失败:', errorMessage)
    }

    if (errorMessage.includes('permission') || errorMessage.includes('access')) {
      if (debugAudio) {
        console.log('🔒 权限错误，返回空数组')
      }
    }

    return []
  }
})
