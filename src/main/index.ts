import { app, shell, BrowserWindow, ipcMain, globalShortcut, desktopCapturer, systemPreferences } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
// import icon from '../../resources/icon.png?asset'
import { GoogleGenAI, Modality, EndSensitivity } from '@google/genai'
import { getSystemPrompt } from './prompts'
import { pcmToWav, analyzeAudioBuffer, saveDebugAudio } from './audioUtils'
import { spawn, ChildProcess } from 'child_process'
import { exec } from 'child_process'
import { promisify } from 'util'
import { config } from 'dotenv'
import { initializeDatabase, testConnection } from './database'
import { setupAllHandlers } from './ipc-handlers'
import { electronAudioCapture } from './audio/electron-native-capture'

// 加载环境变量（静默模式）
config({ path: join(process.cwd(), '.env.local'), quiet: true })

const execAsync = promisify(exec)
const debugAudio = process.env.DEBUG_AUDIO === '1'
const debugGemini = process.env.DEBUG_GEMINI === '1'
const debugIpc = process.env.DEBUG_IPC === '1'
const debugStartup = process.env.DEBUG_STARTUP === '1'
const debugApp = process.env.DEBUG_APP === '1'
const enableGeminiHeartbeat = false
const geminiErrorLogCooldownMs = 30000
let lastGeminiError = ''
let lastGeminiErrorAt = 0

function logGeminiFailure(reason: string, error?: unknown) {
  const now = Date.now()
  if (reason === lastGeminiError && now - lastGeminiErrorAt < geminiErrorLogCooldownMs) {
    return
  }
  lastGeminiError = reason
  lastGeminiErrorAt = now
  console.error(`Gemini 错误: ${reason}`)
  if (debugGemini && error) {
    console.error('Gemini 详细错误对象:', error)
  }
}

function formatGeminiReason(reason: string): string {
  if (!reason) return reason
  if (reason.includes('Cannot extract voices from a non-audio request')) {
    return '收到非音频请求，无法提取语音'
  }
  return reason
}

function isRegionNotSupportedError(message: string): boolean {
  if (!message) return false
  return message.includes('User location is not supported')
    || message.includes('location is not supported')
    || message.includes('not supported for the API use')
}

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
let reconnectResetTimer: NodeJS.Timeout | null = null
let currentApiKey: string | null = ''
let currentCustomPrompt = ''
let currentProfile = 'interview'
let currentLanguage = 'cmn-CN' // Gemini Live API 支持的中文语言代码
let messageBuffer = '' // AI 回复缓冲区
let currentTranscription = '' // 当前转录缓冲区
let geminiSessionReady = false
let textClient: GoogleGenAI | null = null
let textSystemPrompt = ''
let lastNoSessionLogAt = 0
const NO_SESSION_LOG_COOLDOWN_MS = 2000

// ===== 文本对话历史 =====
// 用于保存协作模式下的对话上下文
interface ChatMessage {
  role: 'user' | 'model'
  parts: { text: string }[]
}
let textChatHistory: ChatMessage[] = []
const MAX_CHAT_HISTORY = 20 // 最多保留20轮对话（40条消息）

// ===== 转录检测变量 =====
let lastTranscriptionUpdate = 0
let transcriptionDebounceTimer: NodeJS.Timeout | null = null
const TRANSCRIPTION_DEBOUNCE_MS = 800  // 转录 800ms 没更新就触发文本模型 API - 优化响应速度
let isProcessingVoiceInput = false  // 防止重复触发

// ===== 文本回答模型配置 =====
const TEXT_RESPONSE_MODEL = 'gemini-2.5-flash-lite-preview-09-2025'
const TEXT_RESPONSE_THINKING_BUDGET = 0  // 思考预算为0

// ===== API Key 轮询机制 =====
// 支持在 .env.local 中配置多个 API Key，用逗号分隔
// 例如: VITE_GEMINI_API_KEY=key1,key2,key3
let apiKeys: string[] = []
let currentKeyIndex = 0

function initializeApiKeys(): void {
  const envKeys = process.env.VITE_GEMINI_API_KEY || ''
  apiKeys = envKeys.split(',').map(k => k.trim()).filter(k => k.length > 0)
}

function getNextApiKey(): string | null {
  if (apiKeys.length === 0) {
    initializeApiKeys()
  }
  if (apiKeys.length === 0) {
    return null
  }
  currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length
  return apiKeys[currentKeyIndex]
}

function getCurrentApiKeyFromPool(): string | null {
  if (apiKeys.length === 0) {
    initializeApiKeys()
  }
  if (apiKeys.length === 0) {
    return null
  }
  return apiKeys[currentKeyIndex]
}

function handleQuotaExceeded(): string | null {
  const newKey = getNextApiKey()
  if (newKey) {
    // 更新 textClient 使用新的 Key
    textClient = new GoogleGenAI({ apiKey: newKey, apiVersion: 'v1beta' })
  }
  return newKey
}

// 心跳包相关变量
let heartbeatInterval: NodeJS.Timeout | null = null
const HEARTBEAT_INTERVAL = 30000 // 30秒心跳间隔
let lastHeartbeatTime = 0
let connectionStartTime = 0

// 上下文压缩相关变量
let messageCount = 0
const MAX_CONTEXT_MESSAGES = 50 // 最大上下文消息数量

// 音频处理计数器已在上面声明
const MIN_WINDOW_WIDTH = 960
const MIN_WINDOW_HEIGHT = 640

function createWindow(): BrowserWindow {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: MIN_WINDOW_WIDTH,
    minHeight: MIN_WINDOW_HEIGHT,
    resizable: true,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: 'hidden',
    // 恢复默认标题栏
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

    // 开发模式下按需打开开发者工具
    if (is.dev && process.env.DEBUG_DEVTOOLS === '1') {
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
        const width = Math.max(Number(data.width), MIN_WINDOW_WIDTH)
        const height = Math.max(Number(data.height), MIN_WINDOW_HEIGHT)
        mainWindow.setSize(width, height)
      }
    }

    const saveBounds = () => {
      try {
        if (!mainWindow) return
        const [w, h] = mainWindow.getSize()
        fs.writeFileSync(boundsFile, JSON.stringify({ width: w, height: h }))
      } catch { }
    }
    mainWindow.on('resized', saveBounds)
  } catch { }

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
      if (debugApp) {
        console.log('macOS 特定 API 不可用:', error)
      }
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
app.commandLine.appendSwitch('js-flags', '--expose-gc')

// 在 macOS 上禁用硬件加速以避免 GPU mailbox 错误
if (process.platform === 'darwin') {
  app.disableHardwareAcceleration()
}

// 修复网络连接问题
app.commandLine.appendSwitch('--ignore-certificate-errors')
app.commandLine.appendSwitch('--ignore-ssl-errors')
app.commandLine.appendSwitch('--ignore-certificate-errors-spki-list')
app.commandLine.appendSwitch('--disable-web-security')

// 仅在明确允许时才禁用 TLS 校验（避免不安全默认值）
if (process.env.ALLOW_INSECURE_TLS === '1') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
}

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

    if (debugStartup) {
      console.log('🚀 应用启动性能报告:', metrics)
    }

    // 启动内存监控
    const { MemoryOptimizer } = await import('./performance/memory-optimizer')
    const memoryOptimizer = new MemoryOptimizer({
      warning: 150,   // 150MB
      critical: 200,  // 200MB
      gcTrigger: 120  // 120MB
    })
    const shouldLogMemory = process.env.DEBUG_MEMORY === '1'

    memoryOptimizer.startMonitoring()

    // 监听内存事件
    memoryOptimizer.on('warning-memory', (metrics) => {
      if (shouldLogMemory) {
        console.warn('⚠️ 内存使用警告:', metrics)
      }
      // 检查主窗口是否仍然存在且未被销毁
      if (mainWindowInstance && !mainWindowInstance.isDestroyed()) {
        mainWindowInstance.webContents.send('memory-warning', metrics)
      }
    })

    memoryOptimizer.on('critical-memory', (metrics) => {
      if (shouldLogMemory) {
        console.error('🚨 内存使用严重超标:', metrics)
      }
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
        if (process.env.DEBUG_MEMORY === '1') {
          console.log('✅ 内存优化器已清理')
        }
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
      if (debugStartup) {
        console.log('数据库初始化成功')
      }
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
    if (debugApp) {
      console.log('进入协作模式...')
    }
    if (mainWindow) {
      // 协作模式保持和主页相同的窗口大小，保持原位置
      if (debugApp) {
        console.log('协作模式保持主窗口尺寸')
      }
      return true
    }
    return false
  } catch (error) {
    console.error('进入协作模式失败:', error)
    return false
  }
})

ipcMain.handle('exit-collaboration-mode', () => {
  try {
    if (debugApp) {
      console.log('退出协作模式...')
    }
    if (mainWindow) {
      // 恢复主窗口原始大小，保持原位置
      mainWindow.setSize(1000, 700)
      if (debugApp) {
        console.log('主窗口已恢复到默认尺寸')
      }
      return true
    }
    return false
  } catch (error) {
    console.error('退出协作模式失败:', error)
    return false
  }
})

// 保留原有的浮窗功能作为备用
ipcMain.handle('create-floating-window', () => {
  try {
    if (debugApp) {
      console.log('正在创建浮窗...')
    }
    if (!floatingWindow) {
      const window = createFloatingWindow()
      if (debugApp) {
        console.log('浮窗创建结果:', !!window)
      }
      return true
    } else {
      if (debugApp) {
        console.log('浮窗已存在')
      }
      floatingWindow.show()
      floatingWindow.focus()
      return true
    }
  } catch (error) {
    console.error('创建浮窗失败:', error)
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
  console.log('📥 收到 initialize-gemini 请求，参数:', {
    apiKeyLength: apiKey?.length || 0,
    customPromptLength: customPrompt?.length || 0,
    profile,
    language
  })

  // 如果传入的 apiKey 包含逗号，说明是多个 Key，初始化 Key 池
  if (apiKey && apiKey.includes(',')) {
    apiKeys = apiKey.split(',').map(k => k.trim()).filter(k => k.length > 0)
    currentKeyIndex = 0
    // 使用第一个 Key
    apiKey = apiKeys[0]
  } else if (apiKey) {
    // 单个 Key，也放入池中
    apiKeys = [apiKey]
    currentKeyIndex = 0
  }

  return await initializeGeminiSession(apiKey, customPrompt, profile, language)
})

ipcMain.handle('start-audio-capture', async () => {
  try {
    if (debugAudio) {
      console.log('🎵 启动音频捕获协调器...')
    }

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
      sendToRenderer('update-status', '音频捕获已启动')
    })

    electronAudioCapture.on('error', (error) => {
      console.error('❌ 音频捕获错误:', error)
      sendToRenderer('session-error', '音频捕获出错，请检查权限设置')
    })

    const success = await electronAudioCapture.startCapture()
    if (success) {
      console.log('✅ 音频捕获已启动')
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
    if (debugAudio) {
      console.log('✅ 音频捕获已停止')
    }
    return true
  } catch (error) {
    console.error('❌ 停止音频捕获失败:', error)
    return false
  }
})

ipcMain.handle('reconnect-gemini', async () => {

  if (!currentApiKey) {
    return false
  }

  if (isInitializingSession) {
    return false
  }

  try {
    // 完全清理旧连接

    // 停止心跳包
    stopHeartbeat()

    // 停止音频捕获
    electronAudioCapture.stopCapture()

    // 关闭旧的 Gemini 会话
    if (geminiSession) {
      try {
        geminiSession.close()
      } catch (error) {
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
    textChatHistory = [] // 清空对话历史

    // 等待一下确保清理完成
    await new Promise(resolve => setTimeout(resolve, 1000))

    return await initializeGeminiSession(currentApiKey, currentCustomPrompt, currentProfile, currentLanguage)
  } catch (error) {
    isInitializingSession = false
    return false
  }
})

ipcMain.handle('disconnect-gemini', () => {

  // 停止心跳包
  stopHeartbeat()

  // 停止音频捕获
  electronAudioCapture.stopCapture()

  // 关闭 Gemini 会话
  if (geminiSession) {
    try {
      geminiSession.close()
    } catch (error) {
    }
    geminiSession = null
  }
  geminiSessionReady = false

  if (reconnectResetTimer) {
    clearTimeout(reconnectResetTimer)
    reconnectResetTimer = null
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
  textClient = null
  textSystemPrompt = ''
  textChatHistory = [] // 清空对话历史

  // 通知渲染进程
  sendToRenderer('session-closed')
  sendToRenderer('update-status', '已断开连接')

  console.log('清理流程已完成')
  return true
})

ipcMain.handle('send-text-message', async (event, message: string) => {
  console.log('📤 收到要发送给 AI 的文本:', message)

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    console.error('❌ 无效的消息内容')
    return { success: false, error: '无效的消息内容' }
  }

  // 使用文本模型生成回答
  return await generateTextResponse(message.trim())
})

// 使用文本模型生成回答（用于打字输入和语音转录后的回答）- 流式版本
async function generateTextResponse(userMessage: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!textClient) {
      console.error('❌ textClient 未初始化')
      return { success: false, error: 'AI 服务未初始化，请先连接' }
    }

    console.log('📨 正在使用文本模型生成流式回答...')
    sendToRenderer('update-status', '正在思考...')

    // 将用户消息添加到历史记录
    textChatHistory.push({
      role: 'user',
      parts: [{ text: userMessage }]
    })

    // 构建包含历史记录的 contents
    const contents = textChatHistory.map(msg => ({
      role: msg.role,
      parts: msg.parts
    }))

    // 使用流式 API
    const streamResponse = await textClient.models.generateContentStream({
      model: TEXT_RESPONSE_MODEL,
      contents: contents,
      config: {
        systemInstruction: textSystemPrompt,
        temperature: 1.0,
        maxOutputTokens: 2048,
        thinkingConfig: {
          thinkingBudget: TEXT_RESPONSE_THINKING_BUDGET
        }
      }
    })

    // 累积完整回复文本
    let fullResponseText = ''
    let chunkCount = 0

    // 逐块处理流式响应
    for await (const chunk of streamResponse) {
      const chunkText = chunk.text
      if (chunkText) {
        fullResponseText += chunkText
        chunkCount++

        // 每收到一个 chunk 就发送当前累积的文本到前端
        sendToRenderer('ai-response-update', fullResponseText)

        // 第一个 chunk 时更新状态
        if (chunkCount === 1) {
          sendToRenderer('update-status', '正在回复...')
        }
      }
    }

    // 流式响应完成后，发送最终完整回复
    if (fullResponseText) {
      console.log('✅ 文本模型流式回答完成，共', chunkCount, '个块，总长度:', fullResponseText.length)
      
      // 将 AI 回复添加到历史记录
      textChatHistory.push({
        role: 'model',
        parts: [{ text: fullResponseText }]
      })

      // 限制历史记录长度，保留最近的对话
      if (textChatHistory.length > MAX_CHAT_HISTORY * 2) {
        textChatHistory = textChatHistory.slice(-MAX_CHAT_HISTORY * 2)
        console.log('📝 对话历史已压缩，当前保留', textChatHistory.length, '条消息')
      }

      sendToRenderer('ai-response', fullResponseText)
      sendToRenderer('update-status', '正在聆听...')
    } else {
      console.warn('⚠️ 文本模型返回空回答')
      // 如果回复为空，移除刚才添加的用户消息
      textChatHistory.pop()
      sendToRenderer('update-status', '正在聆听...')
    }

    return { success: true }

  } catch (error: any) {
    const errorMessage = error?.message || String(error)
    console.error('❌ 文本模型流式生成失败:', errorMessage)

    // 发生错误时，移除刚才添加的用户消息
    if (textChatHistory.length > 0 && textChatHistory[textChatHistory.length - 1].role === 'user') {
      textChatHistory.pop()
    }

    // 检查是否是配额超限错误
    if (errorMessage.includes('429') || errorMessage.includes('quota')) {
      const newKey = handleQuotaExceeded()
      if (newKey) {
        // 重试一次
        return await generateTextResponse(userMessage)
      }
    }

    sendToRenderer('update-status', '正在聆听...')
    return { success: false, error: errorMessage }
  }
}

ipcMain.handle('manual-reconnect', async () => {
  console.log('收到手动重连请求')
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout)
    reconnectTimeout = null
  }
  reconnectAttempts = 0 // 重置重连计数

  if (currentApiKey) {
    const success = await initializeGeminiSession(currentApiKey, currentCustomPrompt, currentProfile, currentLanguage)
    if (success) {
      sendToRenderer('session-paused-silence', false)
      sendToRenderer('update-status', '手动重连成功')
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
    const rightSample = stereoBuffer.readInt16LE(i * 4 + 2)
    // 混合声道：(L + R) / 2
    const mixedSample = Math.floor((leftSample + rightSample) / 2)
    monoBuffer.writeInt16LE(mixedSample, i * 2)
  }

  return monoBuffer
}

/**
 * 清理现有的 SystemAudioDump 进程（cheating-daddy 方式）
 */
async function killExistingSystemAudioDump(): Promise<void> {
  return new Promise((resolve) => {
    if (debugAudio) {
      console.log('🔍 检查现有 SystemAudioDump 进程...')
    }

    // 杀死任何现有的 SystemAudioDump 进程
    const killProc = spawn('pkill', ['-f', 'SystemAudioDump'], {
      stdio: 'ignore'
    })

    killProc.on('close', (code) => {
      if (code === 0) {
        if (debugAudio) {
          console.log('✅ 已清理现有 SystemAudioDump 进程')
        }
      } else {
        if (debugAudio) {
          console.log('🔍 未发现现有 SystemAudioDump 进程')
        }
      }
      resolve()
    })

    killProc.on('error', (err) => {
      if (debugAudio) {
        console.log('🔍 检查现有进程错误（正常）:', err.message)
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
    if (debugAudio) {
      console.log(`🔄 切换音频模式到: ${mode}`)
    }
    const success = await electronAudioCapture.switchMode(mode)
    if (success) {
      if (debugAudio) {
        console.log(`✅ 音频模式切换成功: ${mode}`)
      }
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
    if (!geminiSession || !geminiSessionReady) {
      return { success: false, error: '没有活跃的 Gemini 会话' }
    }

    if (!data || typeof data !== 'string') {
      return { success: false, error: '无效的音频数据' }
    }

    // 直接使用 cheating-daddy 的数据格式发送到 Gemini
    await geminiSession.sendRealtimeInput({
      audio: {
        data: data,
        mimeType: mimeType || 'audio/pcm;rate=24000'
      }
    })

    // 简单的进度显示（与 cheating-daddy 一致）
    if (debugAudio && process.stdout?.write) {
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
  if (debugAudio) {
    console.log('🔄 音频模式降级:', fallbackInfo)
  }
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
      if (debugAudio) {
        console.warn('⚠️ 屏幕录制权限未授予，无法获取桌面源')
      }
      return []
    }

    // 检查 options 参数
    if (!options || typeof options !== 'object') {
      if (debugAudio) {
        console.warn('⚠️ 获取桌面源: 无效的 options 参数')
      }
      return []
    }

    if (debugAudio) {
      console.log('📡 正在安全获取桌面源...', options)
    }

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

    if (debugAudio) {
      console.log('✅ 安全获取桌面源成功:', sources?.length || 0, '个')
    }
    return sources || []

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    if (debugAudio) {
      console.error('❌ 安全获取桌面源失败:', errorMessage)
    }

    // 检查是否是权限相关错误
    if (errorMessage.includes('permission') || errorMessage.includes('access') || errorMessage.includes('bad IPC')) {
      if (debugAudio) {
        console.log('🔒 权限或IPC错误，返回空数组')
      }
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
      if (debugAudio) {
        console.warn('⚠️ 屏幕录制权限未授予，无法获取桌面源')
      }
      return []
    }

    // 检查 options 参数
    if (!options || typeof options !== 'object') {
      if (debugAudio) {
        console.warn('⚠️ 获取桌面源: 无效的 options 参数')
      }
      return []
    }

    if (debugAudio) {
      console.log('📡 正在获取桌面源...', options)
    }

    // 设置安全的默认选项
    const safeOptions = {
      types: options.types || ['screen'],
      fetchWindowIcons: false,
      ...options
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

    // 检查是否是权限相关错误
    if (errorMessage.includes('permission') || errorMessage.includes('access')) {
      if (debugAudio) {
        console.log('🔒 权限错误，返回空数组')
      }
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
  try {
    if (debugAudio) {
      console.log('🚀 启动 SystemAudioDump 音频捕获...')
    }

    // 检查平台
    if (process.platform !== 'darwin') {
      if (debugAudio) {
        console.error('❌ SystemAudioDump 仅支持 macOS')
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
      console.log('SystemAudioDump 路径:', systemAudioPath)
    }

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
      if (debugAudio) {
        console.error('❌ 启动 SystemAudioDump 失败')
      }
      systemAudioProc = null
      return { success: false, error: '启动 SystemAudioDump 进程失败' }
    }

    if (debugAudio) {
      console.log('✅ SystemAudioDump 启动成功，PID:', systemAudioProc.pid)
    }

    // 设置音频处理参数（与 cheating-daddy 完全一致）
    // 设置音频处理参数（与 cheating-daddy 完全一致）
    const CHUNK_DURATION = 0.05        // 50ms 批处理间隔 - 极低延迟优化
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
        if (debugAudio) {
          console.log('SystemAudioDump 错误输出:', data.toString())
        }
      })
    }

    // 处理进程关闭
    systemAudioProc.on('close', (code: number | null) => {
      if (debugAudio) {
        console.log('SystemAudioDump 进程关闭，退出码:', code)
      }
      systemAudioProc = null
    })

    // 处理进程错误
    systemAudioProc.on('error', (err: Error) => {
      if (debugAudio) {
        console.error('SystemAudioDump 进程错误:', err)
      }
      systemAudioProc = null
    })

    return { success: true, pid: systemAudioProc?.pid || 0 }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    if (debugAudio) {
      console.error('启动 SystemAudioDump 失败:', errorMessage)
    }
    return { success: false, error: errorMessage }
  }
})

// 停止 SystemAudioDump 进程
ipcMain.handle('stop-system-audio-dump', async () => {
  try {
    if (systemAudioProc) {
      if (debugAudio) {
        console.log('⏹️ 停止 SystemAudioDump...')
      }
      systemAudioProc.kill('SIGTERM')
      systemAudioProc = null
      if (debugAudio) {
        console.log('✅ SystemAudioDump 已停止')
      }
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

// 文件内容提取 IPC 处理器
ipcMain.handle('extract-file-content', async (event, fileData: { fileName: string, fileType: string, base64Data: string }) => {
  console.log('收到文件内容提取请求:', fileData.fileName, fileData.fileType)
  const result = await extractFileContent(fileData)
  console.log('文件内容提取结果:', result.success ? '成功' : `失败: ${result.error}`)
  return result
})

async function initializeGeminiSession(apiKey: string, customPrompt = '', profile = 'interview', language = 'cmn-CN'): Promise<boolean> {
  if (isInitializingSession) {
    return false
  }

  // 验证API密钥
  if (!apiKey || apiKey.trim() === '') {
    console.error('API 密钥无效或为空')
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
    const client = new GoogleGenAI({
      apiKey,
      apiVersion: 'v1beta',
    })

    // 尝试使用不同的模型名称，可能有不同的网络路径

    const systemPrompt = getSystemPrompt(profile, customPrompt, false, language)
    console.log('📝 生成的系统提示词 (前500字符):', systemPrompt.substring(0, 500))
    console.log('📝 系统提示词参数:', { profile, language, customPromptLength: customPrompt.length })
    textClient = client
    textSystemPrompt = systemPrompt
    // Native Audio 模型 - 只支持音频输入/输出
    const responseModalities = [Modality.AUDIO]
    const connectPromise = client.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-12-2025',
      callbacks: {
        onopen: function () {
          console.log('Gemini 会话已打开')
          geminiSessionReady = false
          connectionStartTime = Date.now()
          if (reconnectResetTimer) {
            clearTimeout(reconnectResetTimer)
          }
          reconnectResetTimer = setTimeout(() => {
            if (geminiSessionReady) {
              reconnectAttempts = 0
            }
          }, 10000)

          sendToRenderer('update-status', '已连接 Gemini - 正在启动录音...')
        },
        onmessage: function (message: any) {
          // 只打印关键消息，跳过音频数据包
          const hasAudioData = message.serverContent?.modelTurn?.parts?.some((p: any) => p.inlineData)

          if (message.serverContent?.outputTranscription) {
            // 日志在下面 outputTranscription 处理时打印
          } else if (message.serverContent?.modelTurn && !hasAudioData) {
            const parts = message.serverContent.modelTurn.parts || []
            const hasThought = parts.some((p: any) => p.thought)
            if (hasThought) {
              console.log('🤔 思考中...')
            }
          } else if (message.setupComplete) {
            console.log('📨 Gemini: setupComplete')
          } else if (message.serverContent?.turnComplete) {
            console.log('📨 Gemini: turnComplete')
          }
          // 音频数据包不打印日志

          if (message.setupComplete) {
            geminiSessionReady = true
            sendToRenderer('session-ready')
          }

          const inputTranscription = message.serverContent?.inputTranscription
          const transcriptionChunk = inputTranscription?.text
            || (Array.isArray(inputTranscription?.results)
              ? inputTranscription.results.map((result: any) => result?.transcript || '').join('')
              : '')
          if (transcriptionChunk) {
            currentTranscription += transcriptionChunk
            lastTranscriptionUpdate = Date.now()
            // 立即发送转录片段到前端
            console.log('📝 [后端] 发送转录:', currentTranscription.substring(0, 30))
            sendToRenderer('transcription-update', currentTranscription)

            // 使用 Debounce 机制：转录停止后触发文本模型生成回答
            if (transcriptionDebounceTimer) {
              clearTimeout(transcriptionDebounceTimer)
            }
            transcriptionDebounceTimer = setTimeout(async () => {
              if (currentTranscription.trim() && !isProcessingVoiceInput) {
                isProcessingVoiceInput = true
                const transcribedText = currentTranscription.trim()
                console.log('🎤 语音转录完成，调用文本模型:', transcribedText.substring(0, 50))

                // 清空转录缓冲区
                currentTranscription = ''

                // 先通知前端转录已完成，前端可以立即将用户消息添加到历史记录
                sendToRenderer('transcription-complete', transcribedText)

                // 使用文本模型生成回答
                await generateTextResponse(transcribedText)
                isProcessingVoiceInput = false
              }
            }, TRANSCRIPTION_DEBOUNCE_MS)
          }

          // 忽略 Live API 的输出转录（AI 语音的文字版本）
          // 因为我们现在使用文本模型生成回答，不需要 Live API 的自动回复
          // const outputTranscription = message.serverContent?.outputTranscription

          // 忽略 Live API 的文本回复（modelTurn）
          // 因为我们现在使用文本模型生成回答
          // const modelTurn = message.serverContent?.modelTurn

          if (message.serverContent?.turnComplete) {
            // Live API 的 turnComplete 现在只用于标记转录结束
            // 回答由文本模型通过 debounce 机制生成
            console.log('📨 Gemini Live: turnComplete (仅转录)')
            sendToRenderer('update-status', '正在聆听...')
          }
        },
        onerror: function (error: any) {
          const errorMessage = error.message || error.toString() || 'Unknown error'
          logGeminiFailure(`会话错误：${errorMessage}`, error)

          // 停止心跳包
          stopHeartbeat()
          geminiSessionReady = false

          // 简化错误处理，直接报告错误
          sendToRenderer('session-error', `Gemini API 连接错误: ${errorMessage}`)

          if (isRegionNotSupportedError(errorMessage)) {
            currentApiKey = null
            reconnectAttempts = maxReconnectAttempts
            textClient = null
            textSystemPrompt = ''
            if (reconnectTimeout) {
              clearTimeout(reconnectTimeout)
              reconnectTimeout = null
            }
            electronAudioCapture.stopCapture()
            return
          }

          // 检查是否是认证错误，如果是则停止重连
          if (errorMessage.includes('API key') || errorMessage.includes('authentication') || errorMessage.includes('unauthorized')) {
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
          const reason = formatGeminiReason(e?.reason || '')
          console.log('Gemini 会话已关闭:', reason || '未知原因')

          // 停止心跳包
          stopHeartbeat()

          geminiSession = null
          geminiSessionReady = false
          if (reconnectResetTimer) {
            clearTimeout(reconnectResetTimer)
            reconnectResetTimer = null
          }
          sendToRenderer('session-closed')

          // 检查是否是配置错误（语言、认证等）
          if (reason.includes('language') || reason.includes('API key') || reason.includes('authentication') || reason.includes('unauthorized')) {
            console.log('会话因配置错误关闭:', reason)
            currentApiKey = null
            reconnectAttempts = maxReconnectAttempts
            sendToRenderer('session-error', `配置错误: ${reason}`)
            return
          }

          if (isRegionNotSupportedError(reason)) {
            currentApiKey = null
            reconnectAttempts = maxReconnectAttempts
            sendToRenderer('session-error', '当前地区不支持 Gemini API，请更换支持地区或改用 Vertex AI')
            textClient = null
            textSystemPrompt = ''
            if (reconnectTimeout) {
              clearTimeout(reconnectTimeout)
              reconnectTimeout = null
            }
            electronAudioCapture.stopCapture()
            return
          }

          // 其他情况尝试重连
          if (reconnectAttempts < maxReconnectAttempts && currentApiKey && !isInitializingSession) {
            scheduleReconnect()
          } else {
            sendToRenderer('update-status', '会话已关闭')
          }
        }
      },
      config: {
        responseModalities,
        inputAudioTranscription: {},
        outputAudioTranscription: {},  // 启用输出音频转录，获取文本
        contextWindowCompression: { slidingWindow: {} },
        // VAD 配置：使用激进设置加快响应速度（禁用 VAD 会导致语音输入无法被转录）
        realtimeInputConfig: {
          automaticActivityDetection: {
            disabled: false,  // 必须为 false 才能启用语音转录
            silenceDurationMs: 200,  // 200ms 静音就认为说完
            endOfSpeechSensitivity: EndSensitivity.END_SENSITIVITY_HIGH,
          }
        },
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
        thinkingConfig: {
          thinkingBudget: 0,
          includeThoughts: false
        },
      },
    })
    const session = await Promise.race([
      connectPromise,
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('连接超时，请检查网络或 API 状态')), 7000)
      })
    ])

    geminiSession = session
    console.log('Gemini 会话初始化成功')

    startHeartbeat(session)
    isInitializingSession = false
    sendToRenderer('session-initializing', false)

    return true
  } catch (error: any) {

    // 打印完整的错误信息用于调试

    let errorMessage = 'Unknown error'
    if (error.message) {
      errorMessage = error.message
    } else if (typeof error === 'string') {
      errorMessage = error
    } else if (error.toString) {
      errorMessage = error.toString()
    }

    // 检查常见错误类型
    if (errorMessage.includes('not found') || errorMessage.includes('not supported') || errorMessage.includes('model')) {
      errorMessage = `模型不可用: ${errorMessage}\n\n建议尝试以下模型之一:\n- gemini-2.0-flash-exp\n- models/gemini-2.0-flash-exp`
    } else if (errorMessage.includes('API_KEY_INVALID') || errorMessage.includes('401') || errorMessage.includes('API key')) {
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
        scheduleReconnect() // 自动重连
      }
    } else if (errorMessage.includes('NETWORK') || errorMessage.includes('fetch') || errorMessage.includes('timeout')) {
      errorMessage = '网络连接错误，请检查网络连接或点击重连'
    } else if (errorMessage.includes('WebSocket') || errorMessage.includes('connection')) {
      errorMessage = '连接已断开，请点击重连按钮'
    }

    logGeminiFailure(`初始化失败：${errorMessage}`, error)
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
  // 不节流的频道：转录更新、AI 回复更新、AI 回复完成
  const noThrottleChannels = ['transcription-update', 'ai-response-update', 'ai-response']
  const THROTTLE_MS = noThrottleChannels.includes(channel) ? 0 : 500
  if (now - last < THROTTLE_MS) {
    lastSendAtByChannel[channel] = now
  } else {
    lastSendAtByChannel[channel] = now
    const windows = BrowserWindow.getAllWindows()
    if (debugIpc) {
      console.log(`📡 ${channel} -> ${windows.length} 个窗口`)
    }
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
function startHeartbeat(session: any) {
  if (!enableGeminiHeartbeat) {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval)
      heartbeatInterval = null
    }
    return
  }
  if (!session) {
    return
  }
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval)
  }

  lastHeartbeatTime = Date.now()
  connectionStartTime = Date.now()

  heartbeatInterval = setInterval(() => {
    if (session && session.readyState === 1) { // WebSocket.OPEN
      try {
        // 发送心跳包 - 使用空的客户端内容作为心跳
        session.sendClientContent({
          turns: [],
          turnComplete: false
        })
        lastHeartbeatTime = Date.now()
      } catch (error) {
        // 心跳失败可能表示连接有问题，触发重连检查
        if (reconnectAttempts < maxReconnectAttempts) {
          scheduleReconnect()
        }
      }
    } else {
    }
  }, HEARTBEAT_INTERVAL)
}

function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval)
    heartbeatInterval = null
  }
}

// 上下文压缩机制
function compressContextIfNeeded() {
  messageCount++

  if (messageCount > MAX_CONTEXT_MESSAGES) {
    // 重置消息计数
    messageCount = Math.floor(MAX_CONTEXT_MESSAGES / 2)

    // 通知前端上下文已压缩
    sendToRenderer('context-compressed', {
      previousCount: messageCount * 2,
      newCount: messageCount
    })
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
  }

  sendToRenderer('update-status', `连接丢失，${Math.ceil(delay / 1000)}秒后重连... (${reconnectAttempts}/${maxReconnectAttempts})`)

  reconnectTimeout = setTimeout(async () => {
    if (reconnectAttempts > maxReconnectAttempts) {
      sendToRenderer('session-error', '达到最大重连次数，重连失败')
      return
    }

    sendToRenderer('update-status', '正在重连...')

    try {
      if (!currentApiKey) return
      const success = await initializeGeminiSession(currentApiKey, currentCustomPrompt, currentProfile, currentLanguage)
      if (!success) {
        if (reconnectAttempts < maxReconnectAttempts) {
          scheduleReconnect()
        } else {
          sendToRenderer('session-error', '达到最大重连次数，重连失败')
        }
      }
    } catch (error) {
      console.error('重连过程中出错:', error)
      if (reconnectAttempts < maxReconnectAttempts) {
        scheduleReconnect()
      } else {
        sendToRenderer('session-error', '达到最大重连次数，重连失败')
      }
    }
  }, delay)
}

async function startSystemAudioCapture(): Promise<boolean> {
  if (process.platform === 'darwin') {
    return await startMacOSAudioCapture()
  } else {
    if (debugAudio) {
      console.log('当前平台未实现系统音频捕获')
    }
    sendToRenderer('session-error', '当前平台不支持系统音频捕获')
    return false
  }
}



async function startMacOSAudioCapture(): Promise<boolean> {
  if (process.platform !== 'darwin') return false

  // 检查屏幕录制权限
  const screenRecordingStatus = systemPreferences.getMediaAccessStatus('screen')
  if (screenRecordingStatus !== 'granted') {
    if (debugAudio) {
      console.error('❌ 屏幕录制权限未授予')
    }
    sendToRenderer('session-error', '需要屏幕录制权限才能捕获系统音频，请在系统偏好设置中授权')
    return false
  }

  // Kill any existing SystemAudioDump processes first
  await killExistingSystemAudioDump()

  if (debugAudio) {
    console.log('开始使用 SystemAudioDump 进行 macOS 音频捕获...')
  }

  let systemAudioPath: string
  if (app.isPackaged) {
    systemAudioPath = join(process.resourcesPath, 'SystemAudioDump')
  } else {
    // 在开发环境中，我们需要提供 SystemAudioDump 的路径
    systemAudioPath = join(__dirname, '../../assets/SystemAudioDump')
  }

  if (debugAudio) {
    console.log('SystemAudioDump 路径:', systemAudioPath)
  }

  // 检查文件是否存在
  try {
    const fs = require('fs')
    if (!fs.existsSync(systemAudioPath)) {
      if (debugAudio) {
        console.error('❌ SystemAudioDump 文件不存在:', systemAudioPath)
        console.log('💡 提示: 系统音频捕获功能需要 SystemAudioDump 工具')
        console.log('💡 SystemAudioDump 用于捕获系统播放的音频（如在线面试官的声音）')
        console.log('💡 如果只需要麦克风录音，应用可以正常使用')
        console.log('💡 应用将继续运行，但只能使用麦克风音频模式')
      }
      sendToRenderer('session-error', 'SystemAudioDump 工具缺失，当前使用麦克风模式（适用于直接对话场景）')
      // 不返回 false，允许会话继续但不启动音频捕获
      return true // 改为返回 true，表示可以继续但音频功能受限
    }

    // 检查文件权限
    try {
      fs.accessSync(systemAudioPath, fs.constants.F_OK | fs.constants.X_OK)
    } catch (permError) {
      if (debugAudio) {
        console.error('❌ SystemAudioDump 没有执行权限:', permError)
        console.log('💡 提示: 请确保 SystemAudioDump 具有执行权限')
        console.log('💡 运行: chmod +x', systemAudioPath)
      }
      sendToRenderer('session-error', 'SystemAudioDump 工具没有执行权限，当前使用麦克风模式')
      return true // 允许继续，但音频功能受限
    }
  } catch (error) {
    if (debugAudio) {
      console.error('❌ 检查 SystemAudioDump 文件时出错:', error)
      console.log('💡 应用将继续运行，使用麦克风音频模式')
    }
    sendToRenderer('session-error', '无法检查 SystemAudioDump 工具状态，当前使用麦克风模式')
    return true // 允许继续
  }

  try {
    // SystemAudioDump 不支持命令行参数，直接启动
    systemAudioProc = spawn(systemAudioPath, [], {
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    if (!systemAudioProc.pid) {
      if (debugAudio) {
        console.error('SystemAudioDump 启动失败')
      }
      return false
    }

    if (debugAudio) {
      console.log('SystemAudioDump 已启动，PID:', systemAudioProc.pid)
    }

    // 音频参数配置
    const CHUNK_DURATION = 0.05 // 50ms chunks - 极低延迟优化
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
          if (debugAudio) {
            console.error('SystemAudioDump 输出错误:', errorMsg)
          }

          // 检测系统停止流播放的错误
          if (errorMsg.includes('系统已停止流播放') || errorMsg.includes('Stream stopped with error') || errorMsg.includes('SCStreamErrorDomain')) {
            if (debugAudio) {
              console.log('🚨 macOS 停止了系统音频流')
            }

            // 检查是否应该尝试重启
            if (shouldAttemptAudioRestart()) {
              if (debugAudio) {
                console.log('🔄 尝试重启音频捕获...')
              }

              // 通知前端音频流中断
              sendToRenderer('audio-stream-interrupted')

              // 延迟重启音频捕获，使用指数退避
              const delay = Math.min(2000 * Math.pow(2, audioRestartCount), 10000)
              setTimeout(async () => {
                await restartAudioCaptureWithBackoff()
              }, delay)
            } else {
              if (debugAudio) {
                console.log('❌ 重启次数过多，停止自动重启')
              }
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
        if (debugAudio) {
          console.log('SystemAudioDump 进程已退出，退出码:', code)
        }

        // 如果进程意外退出（非正常关闭），尝试重启
        if (code !== 0 && code !== null && geminiSession) {
          if (debugAudio) {
            console.log('🚨 SystemAudioDump 异常退出，尝试重启...')
          }
          sendToRenderer('audio-stream-interrupted')

          // 延迟重启音频捕获
          setTimeout(async () => {
            if (debugAudio) {
              console.log('🔄 异常退出后尝试重启音频捕获...')
            }
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
        if (debugAudio) {
          console.error('SystemAudioDump 进程错误:', err)
        }
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
  } catch (error: any) {
    if (debugAudio) {
      console.error('启动 macOS 音频捕获失败:', error)
    }
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
      if (debugAudio) {
        console.log('正在停止 SystemAudioDump...')
      }
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
    if (debugAudio) {
      console.log('音频重启进行中，跳过本次尝试')
    }
    return
  }

  isAudioRestarting = true
  audioRestartCount++
  lastRestartTime = Date.now()

  try {
    if (debugAudio) {
      console.log(`🔄 正在重启音频捕获 (${audioRestartCount}/${MAX_RESTART_ATTEMPTS})...`)
    }

    // 先停止现有的音频捕获
    stopSystemAudioCapture()

    // 等待更长时间确保进程完全停止和系统稳定
    await new Promise(resolve => setTimeout(resolve, 3000))

    // 重新启动音频捕获
    const success = await startSystemAudioCapture()

    if (success) {
      if (debugAudio) {
        console.log('✅ 音频捕获重启成功')
      }
      // 重置重启计数器
      audioRestartCount = 0
      sendToRenderer('audio-stream-restored')
      sendToRenderer('update-status', '音频流已恢复')
    } else {
      if (debugAudio) {
        console.error('❌ 音频捕获重启失败')
      }
      if (audioRestartCount >= MAX_RESTART_ATTEMPTS) {
        sendToRenderer('session-error', '音频流多次重启失败，请检查系统权限或手动重连')
      } else {
        sendToRenderer('session-error', `音频流重启失败 (${audioRestartCount}/${MAX_RESTART_ATTEMPTS})，将自动重试`)
      }
    }
  } catch (error) {
    if (debugAudio) {
      console.error('❌ 音频捕获重启出错:', error)
    }
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
  if (debugAudio) {
    console.log('🔄 音频重启计数已重置')
  }
}

// 简化的音频处理 - 完全按照 cheatingdaddy 的方式

async function sendAudioToGemini(base64Data: string) {
  if (!geminiSession || !geminiSessionReady) return
  if (!base64Data || typeof base64Data !== 'string') return

  try {
    // 直接发送，不使用队列和批处理 - 完全按照 cheatingdaddy 的方式
    await geminiSession.sendRealtimeInput({
      audio: {
        data: base64Data,
        mimeType: 'audio/pcm;rate=24000',
      },
    })
  } catch (error) {
    console.error('发送音频到 Gemini 失败:', error)
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

// AI 分析功能 - 使用 gemini-3-flash-preview 进行严格评估
const ANALYSIS_MODEL = 'gemini-3-flash-preview'

async function analyzePreparation(preparationData: {
  name: string
  jobDescription: string
  resume?: string
}): Promise<{
  success: boolean
  analysis?: {
    matchScore: number
    jobRequirements: string[]
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

    if (!apiKey) {
      console.error('AI分析失败: API密钥未配置')
      return {
        success: false,
        error: 'Gemini API 密钥未配置'
      }
    }

    const client = new GoogleGenAI({ apiKey })

    const analysisPrompt = `
你是一位资深的人力资源专家和面试官，拥有15年以上的招聘经验，曾在多家顶级互联网公司担任招聘总监。请以极其严格、专业、客观的标准分析以下面试准备信息。

**极其严格的评分原则（必须严格遵守）：**
- 评分必须严格遵循 0-100 分制
- 50分以下：明显不匹配，缺乏多项关键技能或经验，不建议面试
- 50-60分：勉强匹配，存在较多短板，需要大量准备
- 60-70分：基本匹配，具备部分要求但有明显不足
- 70-80分：较好匹配，具备大部分要求，有一定竞争力
- 80-90分：优秀匹配，几乎完全符合要求（仅限经验丰富且高度契合的候选人）
- 90分以上：极度罕见，仅限于完美契合且有突出亮点的情况
- **如果没有提供简历，评分直接为0分，无法进行任何有效评估**
- **即使简历优秀，也要严格对照岗位要求逐条评估，不要轻易给高分**

**准备名称：** ${preparationData.name}

**岗位描述（JD）：**
${preparationData.jobDescription}

${preparationData.resume ? `**个人简历：**\n${preparationData.resume}` : '**警告：** 未提供个人简历，无法进行任何有效评估，评分将直接为0分'}

请严格按照以下要求分析并返回JSON：

1. **matchScore** (必填，0-100整数)：严格的综合匹配度评分，请逐条对照岗位要求评估

2. **jobRequirements** (必填，数组，5-6项)：从岗位描述JD中提炼出最核心的关键要求，包括：
   - 必备技能要求
   - 经验年限要求  
   - 学历要求
   - 核心能力素质
   每条15-20字，要具体明确

3. **strengths** (必填，数组，4-5项)：候选人的核心竞争优势，每条20-30字，要具体说明为什么是优势

4. **weaknesses** (必填，数组，3-4项)：候选人需要改进的方面，每条20-30字，要指出具体的差距和改进方向

5. **suggestions** (必填，数组，4-5项)：针对性的面试准备建议，每条25-35字，要包含具体的准备方法或可能被问到的问题

6. **systemPrompt** (必填，字符串)：为AI面试助手生成的系统提示词

返回格式（所有字段必填，字段名必须完全一致）：
{
  "matchScore": 65,
  "jobRequirements": ["要求1详细描述", "要求2详细描述", "要求3详细描述", "要求4详细描述", "要求5详细描述"],
  "strengths": ["优势1：具体说明为什么是优势", "优势2：具体说明", "优势3：具体说明", "优势4：具体说明"],
  "weaknesses": ["改进1：指出差距和改进方向", "改进2：指出差距", "改进3：指出差距"],
  "suggestions": ["建议1：具体准备方法", "建议2：可能被问的问题", "建议3：回答策略", "建议4：注意事项"],
  "systemPrompt": "你是一名专业的面试助手..."
}
`

    const response = await client.models.generateContent({
      model: ANALYSIS_MODEL,
      contents: analysisPrompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.7,
        maxOutputTokens: 3000
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
      console.log('========== AI分析原始返回 ==========')
      console.log(JSON.stringify(analysis, null, 2))
      console.log('所有字段:', Object.keys(analysis))
      console.log('=====================================')
      
      if (analysis.matchScore > 100) analysis.matchScore = 100
      if (analysis.matchScore < 0) analysis.matchScore = 0
      if (!preparationData.resume) {
        analysis.matchScore = 0
      }
      
      // 兼容不同的字段名
      if (!analysis.jobRequirements) {
        // 尝试其他可能的字段名
        analysis.jobRequirements = analysis.job_requirements 
          || analysis.requirements 
          || analysis.岗位需求 
          || analysis.岗位要求
          || []
      }
      if (!analysis.strengths) {
        analysis.strengths = analysis.核心优势 || []
      }
      if (!analysis.weaknesses) {
        analysis.weaknesses = analysis.改进空间 || analysis.劣势 || []
      }
      if (!analysis.suggestions) {
        analysis.suggestions = analysis.面试建议 || analysis.建议 || []
      }
      
      console.log('处理后 jobRequirements:', analysis.jobRequirements)
      
      return {
        success: true,
        analysis
      }
    } catch (parseError) {
      console.error('Failed to parse AI analysis result:', parseError)
      console.error('原始文本:', analysisText)
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

// 文件内容提取功能
async function extractFileContent(fileData: {
  fileName: string
  fileType: string
  base64Data: string
}): Promise<{
  success: boolean
  content?: string
  error?: string
}> {
  try {
    const apiKey = process.env.VITE_GEMINI_API_KEY
    console.log('文件内容提取 - API密钥状态:', apiKey ? `存在，长度: ${apiKey.length}` : '未找到')

    if (!apiKey) {
      console.error('文件内容提取失败: API密钥未配置')
      return {
        success: false,
        error: 'Gemini API 密钥未配置'
      }
    }

    const client = new GoogleGenAI({ apiKey })

    // 确定 MIME 类型
    let mimeType = fileData.fileType
    if (!mimeType || mimeType === 'application/octet-stream') {
      const ext = fileData.fileName.toLowerCase().split('.').pop()
      switch (ext) {
        case 'pdf':
          mimeType = 'application/pdf'
          break
        case 'png':
          mimeType = 'image/png'
          break
        case 'jpg':
        case 'jpeg':
          mimeType = 'image/jpeg'
          break
        case 'webp':
          mimeType = 'image/webp'
          break
        default:
          mimeType = 'application/octet-stream'
      }
    }

    console.log('文件内容提取 - 文件类型:', mimeType)

    // 构建提取提示词
    const extractionPrompt = `请仔细阅读并提取这份文档中的所有文字内容。

要求：
1. 完整提取所有文字，保持原有的结构和格式
2. 如果是简历，请按照以下格式整理：
   - 个人信息（姓名、联系方式等）
   - 教育背景
   - 工作经历
   - 技能特长
   - 项目经验
   - 其他信息
3. 如果是其他类型的文档，保持原有的段落结构
4. 只返回提取的文字内容，不要添加任何额外的说明或评论

请直接输出提取的内容：`

    const response = await client.models.generateContent({
      model: TEXT_RESPONSE_MODEL,
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: mimeType,
                data: fileData.base64Data
              }
            },
            {
              text: extractionPrompt
            }
          ]
        }
      ],
      config: {
        temperature: 0.1,
        maxOutputTokens: 8000
      }
    })

    const extractedText = response.text
    if (!extractedText) {
      return {
        success: false,
        error: '文件内容提取返回空结果'
      }
    }

    return {
      success: true,
      content: extractedText.trim()
    }

  } catch (error: any) {
    console.error('File content extraction failed:', error)
    return {
      success: false,
      error: `文件内容提取失败: ${error.message || error}`
    }
  }
}
