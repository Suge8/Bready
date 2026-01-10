import { app, BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { log } from './utils/logging'
import { getIPCBatcher } from './utils/ipc-batcher'

const MIN_WINDOW_WIDTH = 960
const MIN_WINDOW_HEIGHT = 640
const debugIpc = process.env.DEBUG_IPC === '1'
const batcher = getIPCBatcher()

let mainWindow: BrowserWindow | null = null
let floatingWindow: BrowserWindow | null = null

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
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
    },
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()

    // 开发模式或设置了 DEBUG_DEVTOOLS 环境变量时打开开发者工具
    if (is.dev && process.env.DEBUG_DEVTOOLS === '1') {
      mainWindow?.webContents.openDevTools()
    }

    // 生产环境调试：按 Cmd/Ctrl + Shift + D 打开 DevTools
    if (!is.dev) {
      mainWindow?.webContents.on('before-input-event', (event, input) => {
        if (
          input.type === 'keyDown' &&
          input.key === 'D' &&
          (input.meta || input.control) &&
          input.shift
        ) {
          mainWindow?.webContents.toggleDevTools()
        }
      })
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
      webSecurity: false, // 允许外部API连接
    },
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
      console.log('macOS 特定 API 不可用:', error)
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

function setMainWindow(window: BrowserWindow | null): void {
  mainWindow = window
}

function getMainWindow(): BrowserWindow | null {
  return mainWindow
}

function getFloatingWindow(): BrowserWindow | null {
  return floatingWindow
}

function broadcastToAllWindows(channel: string, data?: any): void {
  const windows = BrowserWindow.getAllWindows()
  if (debugIpc) {
    log('debug', `📡 ${channel} -> ${windows.length} 个窗口`)
  }

  windows.forEach((window) => {
    if (
      window &&
      !window.isDestroyed() &&
      window.webContents &&
      !window.webContents.isDestroyed()
    ) {
      try {
        if (window.webContents.getURL()) {
          batcher.send(window, channel, data)
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        if (!errorMessage?.includes('disposed') && !errorMessage?.includes('destroyed')) {
          log('warn', `⚠️ 发送 IPC 消息失败 (${channel}):`, errorMessage)
        }
      }
    }
  })
}

export {
  createWindow,
  createFloatingWindow,
  setMainWindow,
  getMainWindow,
  getFloatingWindow,
  broadcastToAllWindows,
}
