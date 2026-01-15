import { app, BrowserWindow } from 'electron'
import { join } from 'path'
import { electronApp } from '@electron-toolkit/utils'
import { config } from 'dotenv'
import { setupAllHandlers } from './ipc-handlers'
import { createWindow, setMainWindow, broadcastToAllWindows } from './window-manager'
import { initializeAiService } from './ai-service'
import {
  setMainWindow as setAudioManagerWindow,
  stopSystemAudioCapture as stopSystemAudioCaptureFromAudioManager,
} from './audio-manager'
import { registerCleanup, runCleanup } from './utils/cleanup'
import { shortcutService } from './services/shortcut-service'
import { getFloatingWindow } from './window-manager'
import { createLogger } from './utils/logging'

const logger = createLogger('main')

// 加载环境变量（支持开发和生产环境）
const envPaths = [
  join(__dirname, '../../.env.local'), // 生产环境：打包后的应用资源目录
  join(process.cwd(), '.env.local'), // 开发环境：项目根目录
  join(app.getPath('userData'), '.env.local'), // 备用：用户数据目录
]

for (const envPath of envPaths) {
  const result = config({ path: envPath, override: false })
  if (result.parsed) {
    logger.info('成功加载环境变量', { path: envPath })
    break // 找到第一个就停止
  }
}

// 调试标志
const debugStartup = process.env.DEBUG_STARTUP === '1'

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

registerCleanup(() => stopSystemAudioCaptureFromAudioManager())

// 初始化 AI 服务
function initializeAiServices() {
  const service = initializeAiService((event, data) => {
    broadcastToAllWindows(event, data)
  })
  registerCleanup(() => {
    service.disconnectGemini()
  })
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
      logger.debug('应用启动性能报告', { metrics })
    }

    // 设置主窗口引用到音频管理器
    if (mainWindowInstance) {
      setMainWindow(mainWindowInstance)
      setAudioManagerWindow(mainWindowInstance)
    }

    // 初始化 AI 服务
    initializeAiServices()

    // 启动内存监控
    const { MemoryOptimizer } = await import('./performance/memory-optimizer')
    const memoryOptimizer = new MemoryOptimizer({
      warning: 150, // 150MB
      critical: 200, // 200MB
      gcTrigger: 120, // 120MB
    })
    const shouldLogMemory = process.env.DEBUG_MEMORY === '1'

    memoryOptimizer.startMonitoring()

    // 监听内存事件
    memoryOptimizer.on('warning-memory', (metrics) => {
      if (shouldLogMemory) {
        logger.warn('内存使用警告', { metrics })
      }
      // 检查主窗口是否仍然存在且未被销毁
      if (mainWindowInstance && !mainWindowInstance.isDestroyed()) {
        mainWindowInstance.webContents.send('memory-warning', metrics)
      }
    })

    memoryOptimizer.on('critical-memory', (metrics) => {
      if (shouldLogMemory) {
        logger.error('内存使用严重超标', { metrics })
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
          logger.info('内存优化器已清理')
        }
      } catch (error) {
        logger.error('清理内存优化器失败', { error })
      }
    }

    registerCleanup(cleanupMemoryOptimizer)
  } catch (error) {
    logger.error('优化启动失败，回退到标准启动', { error })

    // 创建主窗口
    const mainWindow = createWindow()
    setMainWindow(mainWindow)
    setAudioManagerWindow(mainWindow)

    // 初始化 AI 服务
    initializeAiServices()
  }

  // 注册所有 IPC 处理器
  await setupAllHandlers()

  // 初始化快捷键服务
  shortcutService.setToggleWindowCallback(() => {
    const floatingWindow = getFloatingWindow()
    if (floatingWindow && !floatingWindow.isDestroyed()) {
      if (floatingWindow.isVisible()) {
        floatingWindow.hide()
      } else {
        floatingWindow.show()
      }
    }
  })
  shortcutService.registerShortcuts()
  registerCleanup(() => shortcutService.cleanup())

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      const mainWindow = createWindow()
      setMainWindow(mainWindow)
      setAudioManagerWindow(mainWindow)
    }
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  void runCleanup('window-all-closed')
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  void runCleanup('before-quit')
  // 清理内存优化器已在上面处理了
})
