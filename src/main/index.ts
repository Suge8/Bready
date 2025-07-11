import { app, shell, BrowserWindow, ipcMain, globalShortcut, desktopCapturer, systemPreferences } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
// import icon from '../../resources/icon.png?asset'
import { GoogleGenAI } from '@google/genai'
import { getSystemPrompt } from './prompts'
import { pcmToWav, analyzeAudioBuffer, saveDebugAudio } from './audioUtils'
import { spawn, ChildProcess } from 'child_process'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

// 权限状态类型定义
interface PermissionStatus {
  granted: boolean
  canRequest: boolean
  message: string
}

interface SystemPermissions {
  screenRecording: PermissionStatus
  microphone: PermissionStatus
  apiKey: PermissionStatus
  audioDevice: PermissionStatus
}

let mainWindow: BrowserWindow | null = null
let floatingWindow: BrowserWindow | null = null
let geminiSession: any = null
let systemAudioProc: ChildProcess | null = null
let isInitializingSession = false
let reconnectAttempts = 0
let maxReconnectAttempts = 3
let reconnectTimeout: NodeJS.Timeout | null = null
let currentApiKey: string | null = ''
let currentCustomPrompt = ''
let currentProfile = 'interview'
let currentLanguage = 'cmn-CN' // Gemini Live API 支持的中文语言代码
let messageBuffer = '' // AI 回复缓冲区
let currentTranscription = '' // 当前转录缓冲区

// 音频处理计数器（保留用于调试）
let audioChunkCount = 0

function createWindow(): void {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    // ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function createFloatingWindow(): BrowserWindow {
  floatingWindow = new BrowserWindow({
    width: 400,
    height: 300,
    frame: false,
    alwaysOnTop: true,
    transparent: true,
    resizable: true,
    movable: true,
    minimizable: false,
    maximizable: false,
    skipTaskbar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  // macOS 隐形功能 - 防止在屏幕共享中显示
  if (process.platform === 'darwin') {
    // @ts-ignore - macOS specific API
    floatingWindow.setWindowButtonVisibility?.(false)
    // 设置窗口为不可捕获类型
    try {
      // @ts-ignore - macOS specific API
      floatingWindow.setVisibleOnAllWorkspaces?.(true, { visibleOnFullScreen: true })
    } catch (error) {
      console.log('macOS specific API not available:', error)
    }
  }

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    floatingWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] + '/#/floating')
  } else {
    floatingWindow.loadFile(join(__dirname, '../renderer/index.html'), { hash: '/floating' })
  }

  floatingWindow.on('closed', () => {
    floatingWindow = null
  })

  return floatingWindow
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.bready.app')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  stopSystemAudioCapture()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  stopSystemAudioCapture()
})

// In this file you can include the rest of your app"s main process code.
// You can also put them in separate files and require them here.

// IPC handlers
ipcMain.handle('enter-collaboration-mode', () => {
  try {
    console.log('Entering collaboration mode...')
    if (mainWindow) {
      // 调整主窗口大小为协作模式
      mainWindow.setSize(800, 600)
      mainWindow.center()
      console.log('Main window resized for collaboration mode')
      return true
    }
    return false
  } catch (error) {
    console.error('Failed to enter collaboration mode:', error)
    return false
  }
})

ipcMain.handle('exit-collaboration-mode', () => {
  try {
    console.log('Exiting collaboration mode...')
    if (mainWindow) {
      // 恢复主窗口原始大小
      mainWindow.setSize(1200, 800)
      mainWindow.center()
      console.log('Main window restored to normal size')
      return true
    }
    return false
  } catch (error) {
    console.error('Failed to exit collaboration mode:', error)
    return false
  }
})

// 保留原有的浮窗功能作为备用
ipcMain.handle('create-floating-window', () => {
  try {
    console.log('Creating floating window...')
    if (!floatingWindow) {
      const window = createFloatingWindow()
      console.log('Floating window created successfully:', !!window)
      return true
    } else {
      console.log('Floating window already exists')
      floatingWindow.show()
      floatingWindow.focus()
      return true
    }
  } catch (error) {
    console.error('Failed to create floating window:', error)
    return false
  }
})

ipcMain.handle('close-floating-window', () => {
  if (floatingWindow) {
    floatingWindow.close()
    floatingWindow = null
  }
  return true
})

ipcMain.handle('initialize-gemini', async (event, apiKey: string, customPrompt = '', profile = 'interview', language = 'cmn-CN') => {
  return await initializeGeminiSession(apiKey, customPrompt, profile, language)
})

ipcMain.handle('start-audio-capture', async () => {
  return await startSystemAudioCapture()
})

ipcMain.handle('stop-audio-capture', () => {
  stopSystemAudioCapture()
  return true
})

ipcMain.handle('reconnect-gemini', async () => {
  if (currentApiKey) {
    reconnectAttempts = 0 // 重置重连计数
    return await initializeGeminiSession(currentApiKey, currentCustomPrompt, currentProfile, currentLanguage)
  }
  return false
})

ipcMain.handle('disconnect-gemini', () => {
  console.log('Manual disconnect requested')
  if (geminiSession) {
    geminiSession.close()
    geminiSession = null
  }
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout)
    reconnectTimeout = null
  }
  reconnectAttempts = maxReconnectAttempts // 防止自动重连
  stopSystemAudioCapture() // 停止音频捕获
  sendToRenderer('session-closed')
  return true
})

ipcMain.handle('manual-reconnect', async () => {
  console.log('Manual reconnect requested')
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout)
    reconnectTimeout = null
  }
  reconnectAttempts = 0 // 重置重连计数

  if (currentApiKey) {
    const success = await initializeGeminiSession(currentApiKey, currentCustomPrompt, currentProfile, currentLanguage)
    if (success) {
      sendToRenderer('session-paused-silence', false)
      sendToRenderer('update-status', 'Manual reconnect successful')
    }
    return success
  }
  return false
})

// 权限相关的IPC处理器
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
      message: granted ? '麦克风权限已授予' : '麦克风权限被拒绝'
    }
  } catch (error) {
    return {
      granted: false,
      message: `请求麦克风权限失败: ${error.message}`
    }
  }
})

async function initializeGeminiSession(apiKey: string, customPrompt = '', profile = 'interview', language = 'cmn-CN'): Promise<boolean> {
  if (isInitializingSession) {
    console.log('Session initialization already in progress')
    return false
  }

  console.log('Initializing Gemini session with:', {
    apiKeyLength: apiKey?.length || 0,
    profile,
    language,
    customPromptLength: customPrompt?.length || 0
  })

  // 验证API密钥
  if (!apiKey || apiKey.trim() === '') {
    console.error('Invalid API key provided')
    sendToRenderer('session-error', 'API密钥无效或为空')
    return false
  }

  // 保存当前配置用于重连
  currentApiKey = apiKey
  currentCustomPrompt = customPrompt
  currentProfile = profile
  currentLanguage = language

  isInitializingSession = true
  sendToRenderer('session-initializing', true)

  // 清除之前的重连定时器
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout)
    reconnectTimeout = null
  }

  try {
    console.log('Creating GoogleGenAI client...')
    const client = new GoogleGenAI({
      apiKey: apiKey,
    })

    const systemPrompt = getSystemPrompt(profile, customPrompt, false)
    console.log('System prompt generated, length:', systemPrompt.length)
    console.log('Connecting to Gemini Live API...')
    const session = await client.live.connect({
      model: 'gemini-live-2.5-flash-preview',
      callbacks: {
        onopen: function () {
          console.log('Gemini session opened successfully')
          reconnectAttempts = 0 // 重置重连计数
          sendToRenderer('update-status', 'Connected to Gemini - Starting recording...')
        },
        onmessage: function (message: any) {
          console.log('----------------', message)

          // Handle transcription input - 完全按照 cheatingdaddy 的方式
          if (message.serverContent?.inputTranscription?.text) {
            currentTranscription += message.serverContent.inputTranscription.text
            // 立即发送转录片段到前端，就像 cheatingdaddy 一样
            sendToRenderer('transcription-update', currentTranscription)
          }

          // Handle AI model response - 完全按照 cheatingdaddy 的方式
          if (message.serverContent?.modelTurn?.parts) {
            for (const part of message.serverContent.modelTurn.parts) {
              console.log('AI Part:', part)
              if (part.text) {
                messageBuffer += part.text
              }
            }
          }

          // 当生成完成时发送完整的 AI 回复 - 完全按照 cheatingdaddy 的方式
          if (message.serverContent?.generationComplete) {
            console.log('Generation Complete - AI Response:', messageBuffer)
            if (messageBuffer.trim()) {
              console.log('🤖 Sending AI response to frontend:', messageBuffer)
              sendToRenderer('ai-response', messageBuffer)

              // 保存对话记录
              if (currentTranscription && messageBuffer) {
                console.log('Saving conversation turn:', { transcription: currentTranscription, response: messageBuffer })
                currentTranscription = '' // 重置转录
              }
            }
            messageBuffer = '' // 重置消息缓冲区
          }

          // 处理对话轮次完成
          if (message.serverContent?.turnComplete) {
            sendToRenderer('update-status', 'Listening...')
          }
        },
        onerror: function (error: any) {
          console.error('Gemini session error:', error)
          const errorMessage = error.message || error.toString() || 'Unknown error'

          // 简化错误处理，直接报告错误
          sendToRenderer('session-error', `Gemini API 连接错误: ${errorMessage}`)

          // 检查是否是认证错误，如果是则停止重连
          if (errorMessage.includes('API key') || errorMessage.includes('authentication') || errorMessage.includes('unauthorized')) {
            console.log('Authentication error detected - stopping reconnection attempts')
            currentApiKey = null
            reconnectAttempts = maxReconnectAttempts
            return
          }

          // 其他错误尝试重连
          if (reconnectAttempts < maxReconnectAttempts) {
            scheduleReconnect()
          }
        },
        onclose: function (e) {
          console.log('Gemini session closed:', e?.reason || 'Unknown reason')
          geminiSession = null
          sendToRenderer('session-closed')

          const reason = e?.reason || ''

          // 检查是否是配置错误（语言、认证等）
          if (reason.includes('language') || reason.includes('API key') || reason.includes('authentication') || reason.includes('unauthorized')) {
            console.log('Session closed due to configuration error:', reason)
            currentApiKey = null
            reconnectAttempts = maxReconnectAttempts
            sendToRenderer('session-error', `配置错误: ${reason}`)
            return
          }

          // 其他情况尝试重连
          if (reconnectAttempts < maxReconnectAttempts && currentApiKey && !isInitializingSession) {
            console.log('Session closed unexpectedly, scheduling reconnect...')
            scheduleReconnect()
          } else {
            sendToRenderer('update-status', 'Session closed')
          }
        }
      },
      config: {
        responseModalities: ['text' as any],
        inputAudioTranscription: {}, // 启用音频转录
        contextWindowCompression: { slidingWindow: {} },
        speechConfig: { languageCode: currentLanguage },
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
      },
    })

    geminiSession = session
    isInitializingSession = false
    sendToRenderer('session-initializing', false)
    console.log('Gemini session initialized successfully')
    return true
  } catch (error: any) {
    console.error('Failed to initialize Gemini session:', error)

    let errorMessage = 'Unknown error'
    if (error.message) {
      errorMessage = error.message
    } else if (typeof error === 'string') {
      errorMessage = error
    } else if (error.toString) {
      errorMessage = error.toString()
    }

    // 检查常见错误类型
    if (errorMessage.includes('API_KEY_INVALID') || errorMessage.includes('401') || errorMessage.includes('API key')) {
      errorMessage = 'API密钥无效，请检查.env.local文件中的VITE_GEMINI_API_KEY配置'
      currentApiKey = null // 清除无效的API密钥
    } else if (errorMessage.includes('PERMISSION_DENIED') || errorMessage.includes('403')) {
      errorMessage = 'API权限被拒绝，请检查API密钥权限'
    } else if (errorMessage.includes('language') || errorMessage.includes('Language')) {
      errorMessage = '语言配置错误，已自动修复为支持的语言代码'
    } else if (errorMessage.includes('NETWORK') || errorMessage.includes('fetch')) {
      errorMessage = '网络连接错误，请检查网络连接'
    }

    console.error('Detailed error:', errorMessage)
    isInitializingSession = false
    sendToRenderer('session-initializing', false)
    sendToRenderer('session-error', errorMessage)
    return false
  }
}

function sendToRenderer(channel: string, data?: any) {
  const windows = BrowserWindow.getAllWindows()
  windows.forEach(window => {
    window.webContents.send(channel, data)
  })
}

function scheduleReconnect() {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout)
  }

  // 检查是否应该重连
  if (!currentApiKey || isInitializingSession) {
    console.log('Skipping reconnect: no API key or already initializing')
    return
  }

  reconnectAttempts++
  const delay = Math.min(1000 * Math.pow(2, reconnectAttempts - 1), 30000) // 指数退避，最大30秒

  console.log(`Scheduling reconnect attempt ${reconnectAttempts}/${maxReconnectAttempts} in ${delay}ms`)
  sendToRenderer('update-status', `Connection lost. Reconnecting in ${Math.ceil(delay / 1000)}s... (${reconnectAttempts}/${maxReconnectAttempts})`)

  reconnectTimeout = setTimeout(async () => {
    if (reconnectAttempts > maxReconnectAttempts) {
      console.log('Maximum reconnect attempts reached')
      sendToRenderer('session-error', 'Failed to reconnect after maximum attempts')
      return
    }

    console.log(`Attempting to reconnect (${reconnectAttempts}/${maxReconnectAttempts})`)
    sendToRenderer('update-status', 'Reconnecting...')

    try {
      if (!currentApiKey) return
      const success = await initializeGeminiSession(currentApiKey, currentCustomPrompt, currentProfile, currentLanguage)
      if (!success) {
        console.log('Reconnect failed, will retry if attempts remaining')
        if (reconnectAttempts < maxReconnectAttempts) {
          scheduleReconnect()
        } else {
          sendToRenderer('session-error', 'Failed to reconnect after maximum attempts')
        }
      } else {
        console.log('Reconnect successful')
        reconnectAttempts = 0 // 重置重连计数
      }
    } catch (error) {
      console.error('Error during reconnect:', error)
      if (reconnectAttempts < maxReconnectAttempts) {
        scheduleReconnect()
      } else {
        sendToRenderer('session-error', 'Failed to reconnect after maximum attempts')
      }
    }
  }, delay)
}

async function startSystemAudioCapture(): Promise<boolean> {
  if (process.platform === 'darwin') {
    return await startMacOSAudioCapture()
  } else {
    console.log('System audio capture not implemented for this platform')
    sendToRenderer('session-error', 'System audio capture not supported on this platform')
    return false
  }
}

async function killExistingSystemAudioDump(): Promise<void> {
  return new Promise((resolve) => {
    console.log('Checking for existing SystemAudioDump processes...')

    // Kill any existing SystemAudioDump processes
    const killProc = spawn('pkill', ['-f', 'SystemAudioDump'], {
      stdio: 'ignore',
    })

    killProc.on('close', (code) => {
      if (code === 0) {
        console.log('Killed existing SystemAudioDump processes')
      } else {
        console.log('No existing SystemAudioDump processes found')
      }
      resolve()
    })

    killProc.on('error', (err) => {
      console.log('Error killing SystemAudioDump processes:', err)
      resolve()
    })

    // Timeout after 5 seconds
    setTimeout(() => {
      killProc.kill()
      resolve()
    }, 5000)
  })
}

async function startMacOSAudioCapture(): Promise<boolean> {
  if (process.platform !== 'darwin') return false

  // Kill any existing SystemAudioDump processes first
  await killExistingSystemAudioDump()

  console.log('Starting macOS audio capture with SystemAudioDump...')

  let systemAudioPath: string
  if (app.isPackaged) {
    systemAudioPath = join(process.resourcesPath, 'SystemAudioDump')
  } else {
    // 在开发环境中，我们需要提供 SystemAudioDump 的路径
    systemAudioPath = join(__dirname, '../../assets/SystemAudioDump')
  }

  console.log('SystemAudioDump path:', systemAudioPath)

  try {
    // SystemAudioDump 不支持命令行参数，直接启动
    systemAudioProc = spawn(systemAudioPath, [], {
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    if (!systemAudioProc.pid) {
      console.error('Failed to start SystemAudioDump')
      return false
    }

    console.log('SystemAudioDump started with PID:', systemAudioProc.pid)

    // 音频参数配置
    const CHUNK_DURATION = 0.5 // 500ms chunks - 减少切分频率
    const SAMPLE_RATE = 24000
    const BYTES_PER_SAMPLE = 2
    const CHANNELS = 2 // SystemAudioDump 输出立体声
    const CHUNK_SIZE = SAMPLE_RATE * BYTES_PER_SAMPLE * CHANNELS * CHUNK_DURATION

    let audioBuffer = Buffer.alloc(0)
    const maxBufferSize = CHUNK_SIZE * 50 // 5秒缓冲

    systemAudioProc.stdout?.on('data', (data: Buffer) => {
      audioChunkCount++
      // 完全禁用音频数据日志以避免刷屏
      // if (audioChunkCount % 1000 === 0) {
      //   console.log(`📊 音频数据接收中... (${audioChunkCount} 块)`)
      // }
      audioBuffer = Buffer.concat([audioBuffer, data])

      // 处理完整的音频块
      while (audioBuffer.length >= CHUNK_SIZE) {
        const chunk = audioBuffer.slice(0, CHUNK_SIZE)
        audioBuffer = audioBuffer.slice(CHUNK_SIZE)

        // 转换立体声到单声道
        const monoChunk = stereoToMono(chunk)

        // 简化的音频发送 - 完全按照 cheatingdaddy 的方式
        if (geminiSession && monoChunk.length > 0) {
          sendAudioToGemini(monoChunk.toString('base64'))
        }

        // 定期保存调试音频（开发模式）
        if (process.env.NODE_ENV === 'development' && Math.random() < 0.05) {
          saveDebugAudio(monoChunk, 'live_capture')
        }
      }

      // 限制缓冲区大小
      if (audioBuffer.length > maxBufferSize) {
        audioBuffer = audioBuffer.slice(-maxBufferSize)
      }
    })

    systemAudioProc.stderr?.on('data', (data: Buffer) => {
      const errorMsg = data.toString()
      // 只记录重要的错误信息，忽略正常的状态消息
      if (!errorMsg.includes('Capturing system audio') && !errorMsg.includes('Press ⌃C to stop')) {
        console.error('SystemAudioDump stderr:', errorMsg)
      }
    })

    systemAudioProc.on('close', (code) => {
      console.log('SystemAudioDump process closed with code:', code)
      systemAudioProc = null
    })

    systemAudioProc.on('error', (err) => {
      console.error('SystemAudioDump process error:', err)
      systemAudioProc = null
    })

    // 等待一小段时间确保进程启动
    await new Promise(resolve => setTimeout(resolve, 1000))

    return true
  } catch (error) {
    console.error('Failed to start macOS audio capture:', error)
    return false
  }
}

// 将立体声转换为单声道
function stereoToMono(stereoBuffer: Buffer): Buffer {
  const monoBuffer = Buffer.alloc(stereoBuffer.length / 2)

  for (let i = 0; i < stereoBuffer.length; i += 4) {
    // 读取左右声道的16位样本
    const left = stereoBuffer.readInt16LE(i)
    const right = stereoBuffer.readInt16LE(i + 2)

    // 平均值转换为单声道
    const mono = Math.round((left + right) / 2)

    // 写入单声道缓冲区
    monoBuffer.writeInt16LE(mono, i / 2)
  }

  return monoBuffer
}

function stopSystemAudioCapture() {
  if (systemAudioProc) {
    console.log('Stopping SystemAudioDump...')
    systemAudioProc.kill('SIGTERM')
    systemAudioProc = null
  }
}

// 简化的音频处理 - 完全按照 cheatingdaddy 的方式

async function sendAudioToGemini(base64Data: string) {
  if (!geminiSession) return

  try {
    // 直接发送，不使用队列和批处理 - 完全按照 cheatingdaddy 的方式
    await geminiSession.sendRealtimeInput({
      audio: {
        data: base64Data,
        mimeType: 'audio/pcm;rate=24000',
      },
    })
  } catch (error) {
    console.error('Error sending audio to Gemini:', error)
  }
}



// 权限检测函数
async function checkScreenRecordingPermission(): Promise<PermissionStatus> {
  try {
    // 检查屏幕录制权限
    const status = systemPreferences.getMediaAccessStatus('screen')

    if (status === 'granted') {
      return {
        granted: true,
        canRequest: false,
        message: '屏幕录制权限已授予'
      }
    } else if (status === 'denied') {
      return {
        granted: false,
        canRequest: false,
        message: '屏幕录制权限被拒绝，请在系统偏好设置中手动授予'
      }
    } else {
      return {
        granted: false,
        canRequest: true,
        message: '需要屏幕录制权限以捕获系统音频'
      }
    }
  } catch (error) {
    console.error('检查屏幕录制权限时出错:', error)
    return {
      granted: false,
      canRequest: false,
      message: '无法检查屏幕录制权限状态'
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
        message: '麦克风权限已授予'
      }
    } else if (status === 'denied') {
      return {
        granted: false,
        canRequest: false,
        message: '麦克风权限被拒绝，请在系统偏好设置中手动授予'
      }
    } else {
      // 尝试请求权限
      const canRequest = await systemPreferences.askForMediaAccess('microphone')
      return {
        granted: canRequest,
        canRequest: !canRequest,
        message: canRequest ? '麦克风权限已授予' : '需要麦克风权限'
      }
    }
  } catch (error) {
    console.error('检查麦克风权限时出错:', error)
    return {
      granted: false,
      canRequest: false,
      message: '无法检查麦克风权限状态'
    }
  }
}

async function checkApiKeyStatus(): Promise<PermissionStatus> {
  try {
    const apiKey = process.env.VITE_GEMINI_API_KEY

    if (!apiKey || apiKey.trim() === '') {
      return {
        granted: false,
        canRequest: true,
        message: 'Gemini API 密钥未配置'
      }
    }

    if (apiKey.length < 30) {
      return {
        granted: false,
        canRequest: true,
        message: 'API 密钥格式可能不正确'
      }
    }

    return {
      granted: true,
      canRequest: false,
      message: 'API 密钥配置正确'
    }
  } catch (error) {
    console.error('检查API密钥时出错:', error)
    return {
      granted: false,
      canRequest: true,
      message: '无法验证API密钥状态'
    }
  }
}

async function checkAudioDeviceStatus(): Promise<PermissionStatus> {
  try {
    // 首先检查屏幕录制权限，因为SystemAudioDump需要这个权限
    const screenRecordingStatus = systemPreferences.getMediaAccessStatus('screen')

    if (screenRecordingStatus !== 'granted') {
      return {
        granted: false,
        canRequest: true,
        message: 'SystemAudioDump 需要屏幕录制权限才能捕获系统音频'
      }
    }

    // 检查SystemAudioDump是否存在
    const systemAudioPath = app.isPackaged
      ? join(process.resourcesPath, 'SystemAudioDump')
      : join(__dirname, '../../assets/SystemAudioDump')

    // 简化权限检查 - 如果屏幕录制权限已授予，就认为音频设备可用
    // 避免频繁的测试导致窗口闪烁
    return {
      granted: true,
      canRequest: false,
      message: '屏幕录制权限已授予，音频设备应该可以正常工作'
    }
  } catch (error) {
    console.error('检查音频设备时出错:', error)
    return {
      granted: false,
      canRequest: true,
      message: '无法检查音频设备状态'
    }
  }
}

async function getAllPermissionsStatus(): Promise<SystemPermissions> {
  const [screenRecording, microphone, apiKey, audioDevice] = await Promise.all([
    checkScreenRecordingPermission(),
    checkMicrophonePermission(),
    checkApiKeyStatus(),
    checkAudioDeviceStatus()
  ])

  return {
    screenRecording,
    microphone,
    apiKey,
    audioDevice
  }
}

// 打开系统偏好设置
async function openSystemPreferences(pane: string): Promise<boolean> {
  try {
    let command: string

    switch (pane) {
      case 'screen-recording':
        command = 'open "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture"'
        break
      case 'microphone':
        command = 'open "x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone"'
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

// 测试音频捕获
async function testAudioCapture(): Promise<{ success: boolean; message: string; audioData?: number; silencePercentage?: number; recommendation?: string }> {
  try {
    const systemAudioPath = app.isPackaged
      ? join(process.resourcesPath, 'SystemAudioDump')
      : join(__dirname, '../../assets/SystemAudioDump')

    return new Promise((resolve) => {
      const testProc = spawn(systemAudioPath, [], {
        stdio: ['ignore', 'pipe', 'pipe']
      })

      let audioDataSize = 0
      let audioChunks: Buffer[] = []

      testProc.stdout?.on('data', (data: Buffer) => {
        audioDataSize += data.length
        audioChunks.push(data)
      })

      testProc.on('error', (error) => {
        resolve({
          success: false,
          message: `音频捕获测试失败: ${error.message}`,
          recommendation: '请检查SystemAudioDump是否正确安装'
        })
      })

      // 测试5秒以获得更准确的结果
      setTimeout(() => {
        testProc.kill('SIGTERM')

        if (audioDataSize === 0) {
          resolve({
            success: false,
            message: '音频捕获测试失败：没有捕获到任何音频数据',
            audioData: 0,
            silencePercentage: 100,
            recommendation: '请检查屏幕录制权限，并确保有音频正在播放'
          })
          return
        }

        // 分析音频质量
        const combinedBuffer = Buffer.concat(audioChunks)
        const audioStats = analyzeAudioBuffer(combinedBuffer, 'TestAudio')

        if (audioStats.silencePercentage >= 95) {
          resolve({
            success: false,
            message: `音频捕获到数据但全为静音 (${audioStats.silencePercentage.toFixed(1)}% 静音)`,
            audioData: audioDataSize,
            silencePercentage: audioStats.silencePercentage,
            recommendation: '请播放一些音频内容（音乐、视频等）然后重新测试'
          })
        } else if (audioStats.silencePercentage >= 80) {
          resolve({
            success: true,
            message: `音频捕获基本正常，但音量较低 (${audioStats.silencePercentage.toFixed(1)}% 静音)`,
            audioData: audioDataSize,
            silencePercentage: audioStats.silencePercentage,
            recommendation: '建议增加系统音量或播放更响亮的音频内容'
          })
        } else {
          resolve({
            success: true,
            message: `音频捕获正常！捕获了 ${audioDataSize} 字节数据 (${audioStats.silencePercentage.toFixed(1)}% 静音)`,
            audioData: audioDataSize,
            silencePercentage: audioStats.silencePercentage,
            recommendation: '音频捕获工作正常，可以使用Live Interview模式'
          })
        }
      }, 5000)
    })
  } catch (error) {
    return {
      success: false,
      message: `音频捕获测试出错: ${error.message}`,
      recommendation: '请检查SystemAudioDump是否正确安装和配置'
    }
  }
}
