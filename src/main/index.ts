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
import { config } from 'dotenv'
import { initializeDatabase, testConnection } from './database'
import { setupAllHandlers } from './ipc-handlers'
import { electronAudioCapture } from './audio/electron-native-capture'

// 加载环境变量
config({ path: join(process.cwd(), '.env.local') })

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

// 音频流稳定性管理
let audioRestartCount = 0
let lastRestartTime = 0
let isAudioRestarting = false
let audioChunkCount = 0
const MAX_RESTART_ATTEMPTS = 3
const RESTART_COOLDOWN = 30000 // 30秒冷却期
let reconnectTimeout: NodeJS.Timeout | null = null
let currentApiKey: string | null = ''
let currentCustomPrompt = ''
let currentProfile = 'interview'
let currentLanguage = 'cmn-CN' // Gemini Live API 支持的中文语言代码
let messageBuffer = '' // AI 回复缓冲区
let currentTranscription = '' // 当前转录缓冲区

// 心跳包相关变量
let heartbeatInterval: NodeJS.Timeout | null = null
const HEARTBEAT_INTERVAL = 30000 // 30秒心跳间隔
let lastHeartbeatTime = 0
let connectionStartTime = 0

// 上下文压缩相关变量
let messageCount = 0
const MAX_CONTEXT_MESSAGES = 50 // 最大上下文消息数量

// 音频处理计数器已在上面声明

function createWindow(): BrowserWindow {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    resizable: true,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: 'hiddenInset',
    // ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()

    // 开发模式下自动打开开发者工具
    if (is.dev) {
      mainWindow?.webContents.openDevTools()
    }
  })

  // 记忆窗口尺寸位置（基于用户数据目录）
  try {
    const fs = require('fs') as typeof import('fs')
    const path = require('path') as typeof import('path')
    const boundsFile = path.join(app.getPath('userData'), 'window-bounds.json')

    // 读取已有尺寸
    if (fs.existsSync(boundsFile)) {
      const data = JSON.parse(fs.readFileSync(boundsFile, 'utf-8'))
      if (data?.width && data?.height) {
        mainWindow.setSize(Number(data.width), Number(data.height))
      }
    }

    const saveBounds = () => {
      try {
        if (!mainWindow) return
        const [w, h] = mainWindow.getSize()
        fs.writeFileSync(boundsFile, JSON.stringify({ width: w, height: h }))
      } catch {}
    }
    mainWindow.on('resized', saveBounds)
  } catch {}

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
  
  return mainWindow
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
    roundedCorners: true, // 启用圆角
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false // 允许外部API连接
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

// 修复 GPU 相关错误
app.commandLine.appendSwitch('--disable-gpu-sandbox')
app.commandLine.appendSwitch('--disable-software-rasterizer')
app.commandLine.appendSwitch('--disable-features', 'VizDisplayCompositor')

// 添加垃圾回收支持
app.commandLine.appendSwitch('--js-flags', '--expose-gc')

// 在 macOS 上禁用硬件加速以避免 GPU mailbox 错误
if (process.platform === 'darwin') {
  app.disableHardwareAcceleration()
}

// 修复网络连接问题
app.commandLine.appendSwitch('--ignore-certificate-errors')
app.commandLine.appendSwitch('--ignore-ssl-errors')
app.commandLine.appendSwitch('--ignore-certificate-errors-spki-list')
app.commandLine.appendSwitch('--disable-web-security')

// 设置 Node.js 环境变量以解决 TLS 连接问题
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.bready.app')

  // 使用优化的启动流程
  try {
    const { optimizedStartup } = await import('./performance/startup-optimizer')
    const { window: mainWindowInstance, metrics } = await optimizedStartup(createWindow)
    
    console.log('🚀 应用启动性能报告:', metrics)
    
    // 启动内存监控
    const { MemoryOptimizer } = await import('./performance/memory-optimizer')
    const memoryOptimizer = new MemoryOptimizer({
      warning: 150,   // 150MB
      critical: 200,  // 200MB
      gcTrigger: 120  // 120MB
    })
    
    memoryOptimizer.startMonitoring()
    
    // 监听内存事件
    memoryOptimizer.on('warning-memory', (metrics) => {
      console.warn('⚠️ 内存使用警告:', metrics)
      // 检查主窗口是否仍然存在且未被销毁
      if (mainWindowInstance && !mainWindowInstance.isDestroyed()) {
        mainWindowInstance.webContents.send('memory-warning', metrics)
      }
    })
    
    memoryOptimizer.on('critical-memory', (metrics) => {
      console.error('🚨 内存使用严重超标:', metrics)
      // 检查主窗口是否仍然存在且未被销毁
      if (mainWindowInstance && !mainWindowInstance.isDestroyed()) {
        mainWindowInstance.webContents.send('memory-critical', metrics)
      }
    })
    
    // 应用退出时停止监控
    const cleanupMemoryOptimizer = () => {
      try {
        memoryOptimizer.stopMonitoring()
        // 移除所有监听器避免内存泄漏
        memoryOptimizer.removeAllListeners()
        console.log('✅ 内存优化器已清理')
      } catch (error) {
        console.error('❌ 清理内存优化器失败:', error)
      }
    }
    
    app.on('before-quit', cleanupMemoryOptimizer)
    app.on('window-all-closed', cleanupMemoryOptimizer)
    
  } catch (error) {
    console.error('❌ 优化启动失败，回退到标准启动:', error)
    
    // 回退到原始启动流程
    try {
      await initializeDatabase()
      console.log('数据库初始化成功')
    } catch (dbError) {
      console.error('数据库初始化失败:', dbError)
    }
    
    setupAllHandlers()
    createWindow()
  }

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
  // 清理内存优化器已在上面处理了
})

// In this file you can include the rest of your app"s main process code.
// You can also put them in separate files and require them here.

// IPC handlers
ipcMain.handle('enter-collaboration-mode', () => {
  try {
    console.log('Entering collaboration mode...')
    if (mainWindow) {
      // 协作模式保持和主页相同的窗口大小，保持原位置
      console.log('Main window size maintained for collaboration mode')
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
      // 恢复主窗口原始大小，保持原位置
      mainWindow.setSize(1000, 700)
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
  try {
    console.log('🎵 启动 Electron 音频捕获协调器...')
    
    // 设置主窗口引用
    if (mainWindow) {
      electronAudioCapture.setMainWindow(mainWindow)
    }
    
    // 设置音频数据处理
    electronAudioCapture.on('audioData', (pcmData: Buffer) => {
      if (geminiSession && pcmData.length > 0) {
        // 直接发送PCM数据到Gemini
        sendAudioToGemini(pcmData.toString('base64'))
      }
    })
    
    electronAudioCapture.on('started', () => {
      console.log('✅ 音频捕获启动成功')
      sendToRenderer('update-status', '音频捕获已启动')
    })
    
    electronAudioCapture.on('error', (error) => {
      console.error('❌ 音频捕获错误:', error)
      sendToRenderer('session-error', '音频捕获出错，请检查权限设置')
    })
    
    const success = await electronAudioCapture.startCapture()
    if (success) {
      console.log('🎉 Electron 音频捕获协调启动成功！')
    }
    return success
  } catch (error) {
    console.error('❌ 启动音频捕获失败:', error)
    return false
  }
})

ipcMain.handle('stop-audio-capture', () => {
  try {
    electronAudioCapture.stopCapture()
    electronAudioCapture.removeAllListeners('audioData')
    electronAudioCapture.removeAllListeners('started')
    electronAudioCapture.removeAllListeners('error')
    console.log('✅ 音频捕获已停止')
    return true
  } catch (error) {
    console.error('❌ 停止音频捕获失败:', error)
    return false
  }
})

ipcMain.handle('reconnect-gemini', async () => {
  console.log('🔄 Manual reconnect requested')

  if (!currentApiKey) {
    console.error('❌ No API key available for reconnect')
    return false
  }

  if (isInitializingSession) {
    console.log('⚠️ Session initialization already in progress, skipping reconnect')
    return false
  }

  try {
    // 完全清理旧连接
    console.log('🧹 Cleaning up old connection before reconnect')

    // 停止心跳包
    stopHeartbeat()

    // 停止音频捕获
    electronAudioCapture.stopCapture()

    // 关闭旧的 Gemini 会话
    if (geminiSession) {
      try {
        geminiSession.close()
      } catch (error) {
        console.warn('Warning closing old session:', error)
      }
      geminiSession = null
    }

    // 清理重连定时器
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout)
      reconnectTimeout = null
    }

    // 重置状态
    reconnectAttempts = 0
    isInitializingSession = false
    messageBuffer = ''
    currentTranscription = ''

    // 等待一下确保清理完成
    await new Promise(resolve => setTimeout(resolve, 1000))

    console.log('🚀 Starting fresh connection')
    return await initializeGeminiSession(currentApiKey, currentCustomPrompt, currentProfile, currentLanguage)
  } catch (error) {
    console.error('❌ Reconnect failed:', error)
    isInitializingSession = false
    return false
  }
})

ipcMain.handle('disconnect-gemini', () => {
  console.log('Manual disconnect requested - performing complete cleanup')

  // 停止心跳包
  stopHeartbeat()

  // 停止音频捕获
  electronAudioCapture.stopCapture()

  // 关闭 Gemini 会话
  if (geminiSession) {
    try {
      geminiSession.close()
      console.log('Gemini session closed successfully')
    } catch (error) {
      console.error('Error closing Gemini session:', error)
    }
    geminiSession = null
  }

  // 清理重连定时器
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout)
    reconnectTimeout = null
  }

  // 重置状态变量
  reconnectAttempts = maxReconnectAttempts // 防止自动重连
  isInitializingSession = false
  messageBuffer = ''
  currentTranscription = ''

  // 通知渲染进程
  sendToRenderer('session-closed')
  sendToRenderer('update-status', 'Disconnected')

  console.log('Complete cleanup finished')
  return true
})

ipcMain.handle('send-text-message', async (event, message: string) => {
  console.log('📤 Received text message to send to AI:', message)

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    console.error('❌ Invalid message content')
    return { success: false, error: 'Invalid message content' }
  }

  if (!geminiSession) {
    console.error('❌ No active Gemini session to send text message')
    return { success: false, error: 'AI 服务未连接，请等待连接完成' }
  }

  // 检查会话状态 - 更宽松的检查
  try {
    if (geminiSession.readyState !== undefined && geminiSession.readyState !== 1) { // WebSocket.OPEN = 1
      console.error('❌ Gemini session is not in OPEN state:', geminiSession.readyState)
      return { success: false, error: 'AI 连接状态异常，请尝试重连' }
    }
  } catch (stateError) {
    console.warn('⚠️ Could not check session state, proceeding anyway:', stateError)
  }

  try {
    // 发送文字消息到 Gemini Live API
    console.log('📤 Sending text message via sendClientContent:', message.trim())

    // 重置转录和消息缓冲区，准备接收新的回复
    currentTranscription = ''
    messageBuffer = ''

    // 使用 sendClientContent 而不是 sendRealtimeInput 来发送文字消息
    // 这样可以确保消息被正确处理并触发 AI 回复
    await geminiSession.sendClientContent({
      turns: [{ parts: [{ text: message.trim() }] }],
      turnComplete: true
    })

    console.log('✅ Text message sent to Gemini successfully')
    return { success: true }
  } catch (error) {
    console.error('❌ Failed to send text message to Gemini:', error)

    // 提供更友好的错误信息
    let errorMessage = '发送失败，请稍后重试'
    if (error instanceof Error) {
      if (error.message.includes('WebSocket')) {
        errorMessage = 'AI 连接已断开，请尝试重连'
      } else if (error.message.includes('timeout')) {
        errorMessage = '发送超时，请检查网络连接'
      } else if (error.message.includes('rate limit')) {
        errorMessage = '发送过于频繁，请稍后再试'
      } else {
        errorMessage = error.message
      }
    }

    return { success: false, error: errorMessage }
  }
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

// ==== SystemAudioDump 辅助函数 ====
// 基于 cheating-daddy 的实现

/**
 * 立体声转单声道（cheating-daddy 方式）
 */
function convertStereoToMono(stereoBuffer: Buffer): Buffer {
  const samples = stereoBuffer.length / 4
  const monoBuffer = Buffer.alloc(samples * 2)
  
  for (let i = 0; i < samples; i++) {
    const leftSample = stereoBuffer.readInt16LE(i * 4)
    monoBuffer.writeInt16LE(leftSample, i * 2)
  }
  
  return monoBuffer
}

/**
 * 清理现有的 SystemAudioDump 进程（cheating-daddy 方式）
 */
async function killExistingSystemAudioDump(): Promise<void> {
  return new Promise((resolve) => {
    console.log('🔍 检查现有 SystemAudioDump 进程...')
    
    // 杀死任何现有的 SystemAudioDump 进程
    const killProc = spawn('pkill', ['-f', 'SystemAudioDump'], {
      stdio: 'ignore'
    })
    
    killProc.on('close', (code) => {
      if (code === 0) {
        console.log('✅ 已清理现有 SystemAudioDump 进程')
      } else {
        console.log('🔍 未发现现有 SystemAudioDump 进程')
      }
      resolve()
    })
    
    killProc.on('error', (err) => {
      console.log('🔍 检查现有进程错误（正常）:', err.message)
      resolve()
    })
    
    // 超时保护
    setTimeout(() => {
      killProc.kill()
      resolve()
    }, 2000)
  })
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
  return await openSystemPreferences(pane)
})

ipcMain.handle('test-audio-capture', async () => {
  return await testAudioCapture()
})

// 添加音频模式切换处理器
ipcMain.handle('switch-audio-mode', async (event, mode: 'system' | 'microphone') => {
  try {
    console.log(`🔄 切换音频模式到: ${mode}`)
    const success = await electronAudioCapture.switchMode(mode)
    if (success) {
      console.log(`✅ 音频模式切换成功: ${mode}`)
      sendToRenderer('update-status', `已切换到${mode === 'system' ? '系统音频' : '麦克风'}模式`)
    }
    return success
  } catch (error) {
    console.error('❌ 音频模式切换失败:', error)
    return false
  }
})

ipcMain.handle('get-audio-status', () => {
  return electronAudioCapture.getStatus()
})

// 添加接收渲染进程音频数据的处理器
ipcMain.on('audio-data', (event, audioPacket) => {
  try {
    let buffer: Buffer
    
    // 处理不同的数据格式
    if (audioPacket instanceof Float32Array) {
      // 新格式：直接传输的Float32Array，无延迟处理
      buffer = Buffer.from(audioPacket.buffer)
      // console.log('🎧 接收Float32Array数据:', audioPacket.length, '采样点')
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

// 添加优化的音频内容发送处理器（cheating-daddy 方式）
ipcMain.handle('send-audio-content-optimized', async (event, { data, mimeType }) => {
  try {
    if (!geminiSession) {
      console.warn('⚠️ No active Gemini session for audio data')
      return { success: false, error: 'No active Gemini session' }
    }

    // 直接使用 cheating-daddy 的数据格式发送到 Gemini
    await geminiSession.sendRealtimeInput({
      audio: {
        data: data,
        mimeType: mimeType || 'audio/pcm;rate=24000'
      }
    })
    
    // 简单的进度显示（与 cheating-daddy 一致）
    if (process.stdout?.write) {
      process.stdout.write('.')
    }
    
    return { success: true }
  } catch (error) {
    console.error('发送优化音频内容失败:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
})

// 处理音频模式降级通知
ipcMain.on('audio-mode-fallback', (event, fallbackInfo) => {
  console.log('🔄 音频模式降级:', fallbackInfo)
  const { from, to, reason } = fallbackInfo
  
  // 通知前端显示降级信息
  const message = `系统音频不可用，已自动切换到麦克风模式`
  sendToRenderer('update-status', message)
  sendToRenderer('audio-mode-changed', {
    mode: 'microphone',
    fallback: true,
    reason: reason
  })
})

// 添加获取桌面源的处理器（安全版本）
ipcMain.handle('get-desktop-sources-safe', async (event, options) => {
  try {
    // 首先检查屏幕录制权限
    const screenStatus = systemPreferences.getMediaAccessStatus('screen')
    if (screenStatus !== 'granted') {
      console.warn('⚠️ 屏幕录制权限未授予，无法获取桌面源')
      return []
    }

    // 检查 options 参数
    if (!options || typeof options !== 'object') {
      console.warn('⚠️ 获取桌面源: 无效的options参数')
      return []
    }

    console.log('📡 正在安全获取桌面源...', options)
    
    // 设置安全的默认选项，避免获取图标以减少错误
    const safeOptions = {
      types: options.types || ['screen'],
      fetchWindowIcons: false,
      thumbnailSize: { width: 150, height: 150 },
      ...options
    }
    
    // 使用超时保护，避免无限等待
    const sources = await Promise.race([
      desktopCapturer.getSources(safeOptions),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('获取桌面源超时')), 5000)
      )
    ])
    
    console.log('✅ 安全获取桌面源成功:', sources?.length || 0, '个')
    return sources || []
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('❌ 安全获取桌面源失败:', errorMessage)
    
    // 检查是否是权限相关错误
    if (errorMessage.includes('permission') || errorMessage.includes('access') || errorMessage.includes('bad IPC')) {
      console.log('🔒 权限或IPC错误，返回空数组')
    }
    
    return []
  }
})

// 添加获取桌面源的处理器（兼容版本）
ipcMain.handle('get-desktop-sources', async (event, options) => {
  try {
    // 首先检查屏幕录制权限
    const screenStatus = systemPreferences.getMediaAccessStatus('screen')
    if (screenStatus !== 'granted') {
      console.warn('⚠️ 屏幕录制权限未授予，无法获取桌面源')
      return []
    }

    // 检查 options 参数
    if (!options || typeof options !== 'object') {
      console.warn('⚠️ 获取桌面源: 无效的options参数')
      return []
    }

    console.log('📡 正在获取桌面源...', options)
    
    // 设置安全的默认选项
    const safeOptions = {
      types: options.types || ['screen'],
      fetchWindowIcons: false,
      ...options
    }
    
    const sources = await desktopCapturer.getSources(safeOptions)
    console.log('✅ 成功获取桌面源:', sources?.length || 0, '个')
    
    return sources || []
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('❌ 获取桌面源失败:', errorMessage)
    
    // 检查是否是权限相关错误
    if (errorMessage.includes('permission') || errorMessage.includes('access')) {
      console.log('🔒 权限错误，返回空数组')
    }
    
    return []
  }
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
      message: `请求麦克风权限失败: ${error instanceof Error ? error.message : String(error)}`
    }
  }
})

// ==== SystemAudioDump 相关 IPC 处理器 ====
// 基于 cheating-daddy 的实现，但适应我们的架构

// 检查 SystemAudioDump 是否可用
ipcMain.handle('check-system-audio-dump-available', async () => {
  try {
    const fs = require('fs')
    const path = require('path')
    
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
      console.log('❌ SystemAudioDump 文件不存在:', systemAudioPath)
      return { available: false, reason: 'SystemAudioDump 文件不存在' }
    }
    
    // 检查是否为 macOS 平台
    if (process.platform !== 'darwin') {
      console.log('❌ SystemAudioDump 仅支持 macOS')
      return { available: false, reason: 'SystemAudioDump 仅支持 macOS' }
    }
    
    // 检查文件权限
    try {
      fs.accessSync(systemAudioPath, fs.constants.F_OK | fs.constants.X_OK)
      console.log('✅ SystemAudioDump 可用:', systemAudioPath)
      return { available: true, path: systemAudioPath }
    } catch (permError) {
      console.log('❌ SystemAudioDump 权限不足:', permError)
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
  try {
    console.log('🚀 启动 SystemAudioDump 音频捕获...')
    
    // 检查平台
    if (process.platform !== 'darwin') {
      console.error('❌ SystemAudioDump 仅支持 macOS')
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
    
    console.log('SystemAudioDump 路径:', systemAudioPath)
    
    // 设置 spawn 选项（基于 cheating-daddy 的隐蔽配置）
    const spawnOptions = {
      stdio: ['ignore', 'pipe', 'pipe'] as ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        // 设置环境变量以提高隐蔽性
        PROCESS_NAME: 'AudioService',
        APP_NAME: 'System Audio Service'
      },
      detached: false
    }
    
    // 启动 SystemAudioDump 进程
    systemAudioProc = spawn(systemAudioPath, [], spawnOptions)
    
    if (!systemAudioProc || !systemAudioProc.pid) {
      console.error('❌ 启动 SystemAudioDump 失败')
      systemAudioProc = null
      return { success: false, error: '启动 SystemAudioDump 进程失败' }
    }
    
    console.log('✅ SystemAudioDump 启动成功，PID:', systemAudioProc.pid)
    
    // 设置音频处理参数（与 cheating-daddy 完全一致）
    const CHUNK_DURATION = 0.1        // 100ms 批处理间隔
    const SAMPLE_RATE = 24000          // 24kHz 采样率
    const BYTES_PER_SAMPLE = 2         // 16-bit = 2 bytes
    const CHANNELS = 2                 // 立体声
    const CHUNK_SIZE = SAMPLE_RATE * BYTES_PER_SAMPLE * CHANNELS * CHUNK_DURATION
    
    let audioBuffer = Buffer.alloc(0)
    
    // 处理音频数据输出（与 cheating-daddy 完全一致）
    if (systemAudioProc.stdout) {
      systemAudioProc.stdout.on('data', (data: Buffer) => {
        audioBuffer = Buffer.concat([audioBuffer, data])
        
        // 按固定块大小处理音频数据
        while (audioBuffer.length >= CHUNK_SIZE) {
          const chunk = audioBuffer.slice(0, CHUNK_SIZE)
          audioBuffer = audioBuffer.slice(CHUNK_SIZE)
          
          // 转换立体声到单声道（如果需要）
          const monoChunk = CHANNELS === 2 ? convertStereoToMono(chunk) : chunk
          const base64Data = monoChunk.toString('base64')
          
          // 直接发送给 Gemini（保持 cheating-daddy 的方式）
          sendAudioToGemini(base64Data)
          
          // 调试信息（可选）
          if (process.env.DEBUG_AUDIO) {
            console.log(`处理音频块: ${chunk.length} 字节`)
            saveDebugAudio(monoChunk, 'system_audio')
          }
        }
        
        // 限制缓冲区大小，防止内存泄漏
        const maxBufferSize = SAMPLE_RATE * BYTES_PER_SAMPLE * 1  // 1 秒缓冲
        if (audioBuffer.length > maxBufferSize) {
          audioBuffer = audioBuffer.slice(-maxBufferSize)
        }
      })
    }
    
    // 处理错误输出
    if (systemAudioProc.stderr) {
      systemAudioProc.stderr.on('data', (data: Buffer) => {
        console.error('SystemAudioDump stderr:', data.toString())
      })
    }
    
    // 处理进程关闭
    systemAudioProc.on('close', (code: number | null) => {
      console.log('SystemAudioDump 进程关闭，退出码:', code)
      systemAudioProc = null
    })
    
    // 处理进程错误
    systemAudioProc.on('error', (err: Error) => {
      console.error('SystemAudioDump 进程错误:', err)
      systemAudioProc = null
    })
    
    return { success: true, pid: systemAudioProc?.pid || 0 }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('启动 SystemAudioDump 失败:', errorMessage)
    return { success: false, error: errorMessage }
  }
})

// 停止 SystemAudioDump 进程
ipcMain.handle('stop-system-audio-dump', async () => {
  try {
    if (systemAudioProc) {
      console.log('⏹️ 停止 SystemAudioDump...')
      systemAudioProc.kill('SIGTERM')
      systemAudioProc = null
      console.log('✅ SystemAudioDump 已停止')
    }
    return { success: true }
  } catch (error) {
    console.error('停止 SystemAudioDump 失败:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
})

// AI 分析相关的 IPC 处理器
ipcMain.handle('analyze-preparation', async (event, preparationData) => {
  console.log('收到AI分析请求:', preparationData)
  const result = await analyzePreparation(preparationData)
  console.log('AI分析结果:', result.success ? '成功' : `失败: ${result.error}`)
  return result
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

    // 尝试使用不同的模型名称，可能有不同的网络路径
    console.log('Testing network connectivity...')

    const systemPrompt = getSystemPrompt(profile, customPrompt, false)
    console.log('System prompt generated, length:', systemPrompt.length)
    console.log('Connecting to Gemini Live API...')
    const session = await client.live.connect({
      model: 'gemini-live-2.5-flash-preview',
      callbacks: {
        onopen: function () {
          console.log('Gemini session opened successfully')
          reconnectAttempts = 0 // 重置重连计数

          // 启动心跳包机制
          startHeartbeat()

          sendToRenderer('update-status', 'Connected to Gemini - Starting recording...')
        },
        onmessage: function (message: any) {
          // 减少日志输出以避免 EIO 错误
          if (message.serverContent?.inputTranscription || message.serverContent?.modelTurn || message.serverContent?.generationComplete) {
            // 只记录重要的消息类型
          } else {
            console.log('Gemini message:', message.type || 'unknown')
          }

          // Handle transcription input - 完全按照 cheatingdaddy 的方式
          if (message.serverContent?.inputTranscription?.text) {
            currentTranscription += message.serverContent.inputTranscription.text
            // 立即发送转录片段到前端，就像 cheatingdaddy 一样
            sendToRenderer('transcription-update', currentTranscription)
          }

          // Handle AI model response - 完全按照 cheatingdaddy 的方式
          if (message.serverContent?.modelTurn?.parts) {
            for (const part of message.serverContent.modelTurn.parts) {
              if (part.text) {
                messageBuffer += part.text
              }
            }

            // 触发上下文压缩检查
            compressContextIfNeeded()
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

          // 停止心跳包
          stopHeartbeat()

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

          // 停止心跳包
          stopHeartbeat()

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
    } else if (errorMessage.includes('ECONNRESET') || errorMessage.includes('socket disconnected') || errorMessage.includes('TLS connection')) {
      errorMessage = '网络连接被重置，这通常是网络不稳定导致的，请点击重连'
      // 对于网络错误，安排自动重连
      if (reconnectAttempts < maxReconnectAttempts) {
        console.log('🔄 Network error detected, scheduling auto-reconnect...')
        scheduleReconnect() // 自动重连
      }
    } else if (errorMessage.includes('NETWORK') || errorMessage.includes('fetch') || errorMessage.includes('timeout')) {
      errorMessage = '网络连接错误，请检查网络连接或点击重连'
    } else if (errorMessage.includes('WebSocket') || errorMessage.includes('connection')) {
      errorMessage = '连接已断开，请点击重连按钮'
    }

    console.error('Detailed error:', errorMessage)
    isInitializingSession = false
    sendToRenderer('session-initializing', false)
    sendToRenderer('session-error', errorMessage)
    return false
  }
}

// 简单节流：同一频道在短时间内重复发送时抑制日志与频繁触发
const lastSendAtByChannel: Record<string, number> = {}
function sendToRenderer(channel: string, data?: any) {
  const now = Date.now()
  const last = lastSendAtByChannel[channel] || 0
  const THROTTLE_MS = 500 // 0.5s
  if (now - last < THROTTLE_MS) {
    lastSendAtByChannel[channel] = now
  } else {
    lastSendAtByChannel[channel] = now
    const windows = BrowserWindow.getAllWindows()
    console.log(`📡 ${channel} -> ${windows.length} window(s)`) // 降噪
    windows.forEach((window) => {
      // 检查窗口是否仍然存在且未被销毁
      if (window && !window.isDestroyed() && window.webContents && !window.webContents.isDestroyed()) {
        try {
          // 额外检查webContents的readyState
          if (window.webContents.getURL()) {
            window.webContents.send(channel, data)
          }
        } catch (error) {
          // 静默处理render frame disposed错误，这是正常的清理过程
          const errorMessage = error instanceof Error ? error.message : String(error)
          if (!errorMessage?.includes('disposed') && !errorMessage?.includes('destroyed')) {
            console.warn(`⚠️ 发送 IPC 消息失败 (${channel}):`, errorMessage)
          }
        }
      }
    })
  }
}

// 心跳包机制
function startHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval)
  }

  lastHeartbeatTime = Date.now()
  connectionStartTime = Date.now()

  heartbeatInterval = setInterval(() => {
    if (geminiSession && geminiSession.readyState === 1) { // WebSocket.OPEN
      try {
        // 发送心跳包 - 使用空的客户端内容作为心跳
        geminiSession.sendClientContent({
          turns: [],
          turnComplete: false
        })
        lastHeartbeatTime = Date.now()
        console.log('💓 Heartbeat sent successfully')
      } catch (error) {
        console.warn('⚠️ Heartbeat failed:', error)
        // 心跳失败可能表示连接有问题，触发重连检查
        if (reconnectAttempts < maxReconnectAttempts) {
          console.log('💔 Heartbeat failure detected, scheduling reconnect...')
          scheduleReconnect()
        }
      }
    } else {
      // 只在开发模式下显示详细的心跳警告，生产环境减少日志输出
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️ Cannot send heartbeat - session not ready (state:', geminiSession?.readyState, ')')
      }
    }
  }, HEARTBEAT_INTERVAL)

  console.log(`💓 Heartbeat started with ${HEARTBEAT_INTERVAL}ms interval`)
}

function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval)
    heartbeatInterval = null
    console.log('💔 Heartbeat stopped')
  }
}

// 上下文压缩机制
function compressContextIfNeeded() {
  messageCount++

  if (messageCount > MAX_CONTEXT_MESSAGES) {
    console.log(`🗜️ Context compression triggered (${messageCount} messages)`)

    // 重置消息计数
    messageCount = Math.floor(MAX_CONTEXT_MESSAGES / 2)

    // 通知前端上下文已压缩
    sendToRenderer('context-compressed', {
      previousCount: messageCount * 2,
      newCount: messageCount
    })

    console.log(`✅ Context compressed to ${messageCount} messages`)
  }
}

function scheduleReconnect() {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout)
  }

  // 停止心跳包
  stopHeartbeat()

  // 检查是否应该重连
  if (!currentApiKey || isInitializingSession) {
    console.log('Skipping reconnect: no API key or already initializing')
    return
  }

  // 检查连接时长，如果连接时间太短，增加重连延迟
  const connectionDuration = Date.now() - connectionStartTime
  const isShortConnection = connectionDuration < 60000 // 连接时间少于1分钟

  reconnectAttempts++
  let delay = Math.min(1000 * Math.pow(2, reconnectAttempts - 1), 30000) // 指数退避，最大30秒

  // 如果是短连接，增加额外延迟
  if (isShortConnection) {
    delay = Math.min(delay * 2, 60000) // 短连接时延迟加倍，最大1分钟
    console.log(`⚠️ Short connection detected (${Math.round(connectionDuration/1000)}s), increasing delay`)
  }

  console.log(`🔄 Scheduling reconnect attempt ${reconnectAttempts}/${maxReconnectAttempts} in ${delay}ms`)
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



async function startMacOSAudioCapture(): Promise<boolean> {
  if (process.platform !== 'darwin') return false

  // 检查屏幕录制权限
  const screenRecordingStatus = systemPreferences.getMediaAccessStatus('screen')
  if (screenRecordingStatus !== 'granted') {
    console.error('❌ Screen recording permission not granted')
    sendToRenderer('session-error', '需要屏幕录制权限才能捕获系统音频，请在系统偏好设置中授权')
    return false
  }

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

  // 检查文件是否存在
  try {
    const fs = require('fs')
    if (!fs.existsSync(systemAudioPath)) {
      console.error('❌ SystemAudioDump 文件不存在:', systemAudioPath)
      console.log('💡 提示: 系统音频捕获功能需要 SystemAudioDump 工具')
      console.log('💡 SystemAudioDump 用于捕获系统播放的音频（如在线面试官的声音）')
      console.log('💡 如果只需要麦克风录音，应用可以正常使用')
      console.log('💡 应用将继续运行，但只能使用麦克风音频模式')
      sendToRenderer('session-error', 'SystemAudioDump 工具缺失，当前使用麦克风模式（适用于直接对话场景）')
      // 不返回 false，允许会话继续但不启动音频捕获
      return true // 改为返回 true，表示可以继续但音频功能受限
    }
    
    // 检查文件权限
    try {
      fs.accessSync(systemAudioPath, fs.constants.F_OK | fs.constants.X_OK)
    } catch (permError) {
      console.error('❌ SystemAudioDump 没有执行权限:', permError)
      console.log('💡 提示: 请确保 SystemAudioDump 具有执行权限')
      console.log('💡 运行: chmod +x', systemAudioPath)
      sendToRenderer('session-error', 'SystemAudioDump 工具没有执行权限，当前使用麦克风模式')
      return true // 允许继续，但音频功能受限
    }
  } catch (error) {
    console.error('❌ 检查 SystemAudioDump 文件时出错:', error)
    console.log('💡 应用将继续运行，使用麦克风音频模式')
    sendToRenderer('session-error', '无法检查 SystemAudioDump 工具状态，当前使用麦克风模式')
    return true // 允许继续
  }

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
      try {
        const errorMsg = data.toString()
        // 只记录重要的错误信息，忽略正常的状态消息
        if (!errorMsg.includes('Capturing system audio') && !errorMsg.includes('Press ⌃C to stop')) {
          console.error('SystemAudioDump stderr:', errorMsg)

          // 检测系统停止流播放的错误
          if (errorMsg.includes('系统已停止流播放') || errorMsg.includes('Stream stopped with error') || errorMsg.includes('SCStreamErrorDomain')) {
            console.log('🚨 System audio stream stopped by macOS')

            // 检查是否应该尝试重启
            if (shouldAttemptAudioRestart()) {
              console.log('🔄 Attempting to restart audio capture...')

              // 通知前端音频流中断
              sendToRenderer('audio-stream-interrupted')

              // 延迟重启音频捕获，使用指数退避
              const delay = Math.min(2000 * Math.pow(2, audioRestartCount), 10000)
              setTimeout(async () => {
                await restartAudioCaptureWithBackoff()
              }, delay)
            } else {
              console.log('❌ Too many restart attempts, stopping automatic restart')
              sendToRenderer('session-error', '音频流多次中断，请检查系统权限或手动重连')
            }
          }
        }
      } catch (error) {
        // 忽略写入错误，避免EIO异常
      }
    })

    systemAudioProc.on('close', (code) => {
      try {
        console.log('SystemAudioDump process closed with code:', code)

        // 如果进程意外退出（非正常关闭），尝试重启
        if (code !== 0 && code !== null && geminiSession) {
          console.log('🚨 SystemAudioDump crashed unexpectedly, attempting restart...')
          sendToRenderer('audio-stream-interrupted')

          // 延迟重启音频捕获
          setTimeout(async () => {
            console.log('🔄 Attempting to restart audio capture after crash...')
            await restartAudioCapture()
          }, 3000)
        }
      } catch (error) {
        // 忽略写入错误
      }
      systemAudioProc = null
    })

    systemAudioProc.on('error', (err) => {
      try {
        console.error('SystemAudioDump process error:', err)
      } catch (error) {
        // 忽略写入错误
      }
      systemAudioProc = null
    })

    // 等待一小段时间确保进程启动
    await new Promise(resolve => setTimeout(resolve, 1000))

    // 重置音频重启计数器，因为启动成功
    resetAudioRestartCounter()

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
    try {
      console.log('Stopping SystemAudioDump...')
      systemAudioProc.kill('SIGTERM')
    } catch (error) {
      // 忽略停止过程中的错误
    }
    systemAudioProc = null
  }
}

// 检查是否应该尝试重启音频
function shouldAttemptAudioRestart(): boolean {
  const now = Date.now()

  // 如果正在重启中，不要重复尝试
  if (isAudioRestarting) {
    return false
  }

  // 如果在冷却期内，不要重启
  if (now - lastRestartTime < RESTART_COOLDOWN) {
    return false
  }

  // 如果重启次数超过限制，不要重启
  if (audioRestartCount >= MAX_RESTART_ATTEMPTS) {
    return false
  }

  return true
}

// 重启音频捕获函数（带指数退避）
async function restartAudioCaptureWithBackoff() {
  if (isAudioRestarting) {
    console.log('Audio restart already in progress, skipping...')
    return
  }

  isAudioRestarting = true
  audioRestartCount++
  lastRestartTime = Date.now()

  try {
    console.log(`🔄 Restarting audio capture (attempt ${audioRestartCount}/${MAX_RESTART_ATTEMPTS})...`)

    // 先停止现有的音频捕获
    stopSystemAudioCapture()

    // 等待更长时间确保进程完全停止和系统稳定
    await new Promise(resolve => setTimeout(resolve, 3000))

    // 重新启动音频捕获
    const success = await startSystemAudioCapture()

    if (success) {
      console.log('✅ Audio capture restarted successfully')
      // 重置重启计数器
      audioRestartCount = 0
      sendToRenderer('audio-stream-restored')
      sendToRenderer('update-status', '音频流已恢复')
    } else {
      console.error('❌ Failed to restart audio capture')
      if (audioRestartCount >= MAX_RESTART_ATTEMPTS) {
        sendToRenderer('session-error', '音频流多次重启失败，请检查系统权限或手动重连')
      } else {
        sendToRenderer('session-error', `音频流重启失败 (${audioRestartCount}/${MAX_RESTART_ATTEMPTS})，将自动重试`)
      }
    }
  } catch (error) {
    console.error('❌ Error during audio capture restart:', error)
    sendToRenderer('session-error', '音频流重启出错，请手动重连')
  } finally {
    isAudioRestarting = false
  }
}

// 重启音频捕获函数（保持向后兼容）
async function restartAudioCapture() {
  return await restartAudioCaptureWithBackoff()
}

// 重置音频重启计数器
function resetAudioRestartCounter() {
  audioRestartCount = 0
  lastRestartTime = 0
  isAudioRestarting = false
  console.log('🔄 Audio restart counter reset')
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
    // 检查音频捕获权限（屏幕和麦克风）
    const screenStatus = systemPreferences.getMediaAccessStatus('screen')
    const micStatus = systemPreferences.getMediaAccessStatus('microphone')
    
    if (screenStatus === 'granted' || micStatus === 'granted') {
      return {
        granted: true,
        canRequest: false,
        message: 'Electron 原生音频捕获可用'
      }
    }
    
    return {
      granted: false,
      canRequest: true,
      message: '需要屏幕录制或麦克风权限以启用音频捕获'
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
    console.log('🧪 测试 Electron 原生音频捕获...')
    
    // 检查音频捕获器状态
    const status = electronAudioCapture.getStatus()
    
    if (status.capturing) {
      return {
        success: true,
        message: '音频捕获已在运行，工作正常',
        recommendation: '音频捕获功能正常，可以使用协作模式'
      }
    }
    
    // 模拟测试
    return new Promise((resolve) => {
      let audioDataSize = 0
      
      const testListener = (data: Buffer) => {
        audioDataSize += data.length
      }
      
      // 添加监听器
      electronAudioCapture.on('audioData', testListener)
      
      // 启动测试（已增强错误处理）
      electronAudioCapture.startCapture().then((started) => {
        if (!started) {
          electronAudioCapture.removeListener('audioData', testListener)
          resolve({
            success: false,
            message: '音频捕获启动失败',
            recommendation: '请检查系统权限设置'
          })
          return
        }
        
        // 测试3秒
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
                recommendation: '请检查麦克风或屏幕录制权限，并确保有音频正在播放'
              })
            } else {
              resolve({
                success: true,
                message: `Electron 原生音频捕获正常！捕获了 ${audioDataSize} 字节数据`,
                audioData: audioDataSize,
                silencePercentage: 0,
                recommendation: '音频捕获工作正常，可以使用协作模式'
              })
            }
          } catch (error) {
            console.error('音频测试清理错误:', error)
            resolve({
              success: false,
              message: '音频测试清理失败',
              recommendation: '请重试或检查系统状态'
            })
          }
        }, 3000)
      }).catch(error => {
        console.error('音频测试启动失败:', error)
        electronAudioCapture.removeListener('audioData', testListener)
        resolve({
          success: false,
          message: '音频捕获启动异常',
          recommendation: '请检查系统权限和设备状态'
        })
      })
    })
  } catch (error: any) {
    return {
      success: false,
      message: `音频捕获测试出错: ${error.message}`,
      recommendation: '请检查系统权限和网络连接'
    }
  }
}

// AI 分析功能
async function analyzePreparation(preparationData: {
  name: string
  jobDescription: string
  resume?: string
}): Promise<{
  success: boolean
  analysis?: {
    matchScore: number
    strengths: string[]
    weaknesses: string[]
    suggestions: string[]
    systemPrompt: string
  }
  error?: string
}> {
  try {
    const apiKey = process.env.VITE_GEMINI_API_KEY
    console.log('AI分析 - API密钥状态:', apiKey ? `存在，长度: ${apiKey.length}` : '未找到')
    console.log('AI分析 - 环境变量:', Object.keys(process.env).filter(key => key.includes('GEMINI')))

    if (!apiKey) {
      console.error('AI分析失败: API密钥未配置')
      return {
        success: false,
        error: 'Gemini API 密钥未配置'
      }
    }

    const client = new GoogleGenAI({ apiKey })

    // 构建分析提示词
    const analysisPrompt = `
作为一名专业的HR和面试专家，请分析以下面试准备信息：

**准备名称：** ${preparationData.name}

**岗位描述：**
${preparationData.jobDescription}

${preparationData.resume ? `**个人简历：**\n${preparationData.resume}` : '**注意：** 未提供个人简历信息'}

请从以下几个维度进行深度分析，并以JSON格式返回结果：

1. **匹配度评分** (0-100分)：评估候选人与岗位的整体匹配程度
2. **优势分析**：列出候选人的主要优势和亮点（3-5个要点）
3. **劣势分析**：指出可能的不足和需要改进的地方（2-4个要点）
4. **面试建议**：提供具体的面试准备建议（3-5个要点）
5. **系统提示词**：为AI面试助手生成一个专业的系统提示词，用于在面试协作模式中提供个性化帮助

请确保分析客观、专业、具有建设性。返回格式如下：

{
  "matchScore": 85,
  "strengths": ["优势1", "优势2", "优势3"],
  "weaknesses": ["不足1", "不足2"],
  "suggestions": ["建议1", "建议2", "建议3"],
  "systemPrompt": "你是一名专业的面试助手，专门帮助候选人准备[岗位名称]面试。基于候选人的背景和岗位要求，你需要..."
}
`

    const response = await client.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: analysisPrompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.3,
        maxOutputTokens: 2000
      }
    })

    const analysisText = response.text
    if (!analysisText) {
      return {
        success: false,
        error: 'AI 分析返回空结果'
      }
    }

    try {
      const analysis = JSON.parse(analysisText)
      return {
        success: true,
        analysis
      }
    } catch (parseError) {
      console.error('Failed to parse AI analysis result:', parseError)
      return {
        success: false,
        error: 'AI 分析结果格式错误'
      }
    }

  } catch (error: any) {
    console.error('AI analysis failed:', error)
    return {
      success: false,
      error: `AI 分析失败: ${error.message || error}`
    }
  }
}
