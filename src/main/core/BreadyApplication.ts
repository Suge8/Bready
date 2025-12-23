import { EventEmitter } from 'events'
import { app, BrowserWindow } from 'electron'
import { WindowManager } from './WindowManager'
import { ServiceManager } from './ServiceManager'
import { ConfigManager } from './ConfigManager'
import { Logger } from '../utils/Logger'
import { ErrorHandler } from '../utils/ErrorHandler'
import { initializePerformanceMonitoring, stopPerformanceMonitoring } from '../performance/integration'

/**
 * Bready应用程序主类
 * 负责协调各个模块的初始化、运行和关闭
 */
export class BreadyApplication extends EventEmitter {
  private static instance: BreadyApplication
  private windowManager: WindowManager
  private serviceManager: ServiceManager
  private configManager: ConfigManager
  private logger: Logger
  private errorHandler: ErrorHandler
  private isInitialized = false
  private isShuttingDown = false

  private constructor() {
    super()
    this.logger = Logger.getInstance()
    this.errorHandler = ErrorHandler.getInstance()
    this.configManager = new ConfigManager()
    this.windowManager = new WindowManager()
    this.serviceManager = new ServiceManager(this.configManager)
  }

  /**
   * 获取应用程序单例实例
   */
  static getInstance(): BreadyApplication {
    if (!this.instance) {
      this.instance = new BreadyApplication()
    }
    return this.instance
  }

  /**
   * 初始化应用程序
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      this.logger.warn('Application already initialized')
      return
    }

    try {
      this.logger.info('🚀 Initializing Bready application...')
      
      // 设置错误处理
      this.setupErrorHandling()
      
      // 初始化性能监控
      initializePerformanceMonitoring()
      
      // 初始化配置管理器
      await this.configManager.initialize()
      this.logger.info('✅ Configuration manager initialized')
      
      // 初始化服务管理器
      await this.serviceManager.initialize()
      this.logger.info('✅ Service manager initialized')
      
      // 初始化窗口管理器
      await this.windowManager.initialize()
      this.logger.info('✅ Window manager initialized')
      
      // 设置应用事件监听
      this.setupAppEventHandlers()
      
      // 设置服务间通信
      this.setupServiceCommunication()
      
      this.isInitialized = true
      this.emit('initialized')
      this.logger.info('🎉 Bready application initialized successfully')
      
    } catch (error) {
      this.logger.error('❌ Failed to initialize application:', error)
      this.errorHandler.handleError(error, 'Application.initialize')
      throw error
    }
  }

  /**
   * 关闭应用程序
   */
  async shutdown(): Promise<void> {
    if (!this.isInitialized || this.isShuttingDown) {
      return
    }

    this.isShuttingDown = true

    try {
      this.logger.info('🔄 Shutting down Bready application...')
      
      // 停止性能监控
      stopPerformanceMonitoring()
      
      // 关闭服务管理器
      await this.serviceManager.shutdown()
      this.logger.info('✅ Service manager shut down')
      
      // 关闭窗口管理器
      await this.windowManager.shutdown()
      this.logger.info('✅ Window manager shut down')
      
      this.isInitialized = false
      this.emit('shutdown')
      this.logger.info('👋 Bready application shut down successfully')
      
    } catch (error) {
      this.logger.error('❌ Error during application shutdown:', error)
      this.errorHandler.handleError(error, 'Application.shutdown')
    } finally {
      this.isShuttingDown = false
    }
  }

  /**
   * 设置错误处理
   */
  private setupErrorHandling(): void {
    // 监听未捕获的异常
    process.on('uncaughtException', (error) => {
      this.logger.error('Uncaught Exception:', error)
      this.errorHandler.handleError(error, 'Process.uncaughtException')
    })

    // 监听未处理的Promise拒绝
    process.on('unhandledRejection', (reason, promise) => {
      this.logger.error('Unhandled Rejection at:', promise, 'reason:', reason)
      this.errorHandler.handleError(reason, 'Process.unhandledRejection')
    })

    // 监听错误处理器的恢复事件
    this.errorHandler.onRecovery('network', (error) => {
      this.logger.info('Attempting network recovery for error:', error.id)
      // 可以在这里实现网络恢复逻辑
    })

    this.errorHandler.onRecovery('api', (error) => {
      this.logger.info('Attempting API recovery for error:', error.id)
      // 可以在这里实现API恢复逻辑
      const geminiService = this.serviceManager.getService('gemini')
      if (geminiService && !geminiService.isReady()) {
        // 尝试重新连接Gemini服务
        geminiService.connect().catch(err => {
          this.logger.error('Failed to recover Gemini service:', err)
        })
      }
    })

    this.errorHandler.onRecovery('audio', (error) => {
      this.logger.info('Attempting audio recovery for error:', error.id)
      // 可以在这里实现音频恢复逻辑
      const audioService = this.serviceManager.getService('audio')
      if (audioService && !audioService.isReady()) {
        // 尝试重新启动音频服务
        audioService.startCapture().catch(err => {
          this.logger.error('Failed to recover audio service:', err)
        })
      }
    })
  }

  /**
   * 设置应用程序事件监听器
   */
  private setupAppEventHandlers(): void {
    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        this.shutdown().then(() => app.quit())
      }
    })

    app.on('before-quit', () => {
      this.shutdown()
    })

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.windowManager.createMainWindow()
      }
    })

    // 监听系统睡眠和唤醒事件
    app.on('browser-window-blur', () => {
      this.logger.debug('Application lost focus')
    })

    app.on('browser-window-focus', () => {
      this.logger.debug('Application gained focus')
    })
  }

  /**
   * 设置服务间通信
   */
  private setupServiceCommunication(): void {
    const audioService = this.serviceManager.getService('audio')
    const geminiService = this.serviceManager.getService('gemini')
    const databaseService = this.serviceManager.getService('database')
    
    if (audioService && geminiService) {
      // 音频数据流向Gemini服务
      audioService.on('audioData', (data: Buffer) => {
        if (geminiService.isConnectedToAPI()) {
          geminiService.processAudioData(data)
        }
      })

      // 音频捕获状态变化
      audioService.on('captureStarted', () => {
        this.windowManager.broadcastToRenderers('audio-capture-started')
      })

      audioService.on('captureStopped', () => {
        this.windowManager.broadcastToRenderers('audio-capture-stopped')
      })

      // Gemini响应发送到渲染进程
      geminiService.on('transcription', (text: string) => {
        this.windowManager.broadcastToRenderers('transcription-update', text)
      })

      geminiService.on('partialResponse', (response: string) => {
        this.windowManager.broadcastToRenderers('ai-partial-response', response)
      })

      geminiService.on('responseComplete', () => {
        this.windowManager.broadcastToRenderers('ai-response-complete')
      })

      // Gemini连接状态变化
      geminiService.on('connected', () => {
        this.windowManager.broadcastToRenderers('gemini-connected')
      })

      geminiService.on('disconnected', () => {
        this.windowManager.broadcastToRenderers('gemini-disconnected')
      })
    }

    // 服务错误处理
    this.serviceManager.on('serviceError', (serviceName: string, error: Error) => {
      this.logger.error(`Service ${serviceName} error:`, error)
      
      const appError = this.errorHandler.handleError(error, `Service.${serviceName}`)
      
      this.windowManager.broadcastToRenderers('service-error', {
        service: serviceName,
        error: {
          type: appError.type,
          message: appError.message,
          severity: appError.severity
        }
      })
    })

    // 数据库连接状态
    if (databaseService) {
      databaseService.on('connected', () => {
        this.windowManager.broadcastToRenderers('database-connected')
      })

      databaseService.on('disconnected', () => {
        this.windowManager.broadcastToRenderers('database-disconnected')
      })
    }
  }

  /**
   * 获取窗口管理器
   */
  getWindowManager(): WindowManager {
    return this.windowManager
  }

  /**
   * 获取服务管理器
   */
  getServiceManager(): ServiceManager {
    return this.serviceManager
  }

  /**
   * 获取配置管理器
   */
  getConfigManager(): ConfigManager {
    return this.configManager
  }

  /**
   * 获取错误处理器
   */
  getErrorHandler(): ErrorHandler {
    return this.errorHandler
  }

  /**
   * 检查应用程序是否已初始化
   */
  isAppInitialized(): boolean {
    return this.isInitialized
  }

  /**
   * 检查应用程序是否正在关闭
   */
  isAppShuttingDown(): boolean {
    return this.isShuttingDown
  }

  /**
   * 获取应用程序状态
   */
  getApplicationStatus(): {
    initialized: boolean
    shuttingDown: boolean
    services: Record<string, boolean>
  } {
    return {
      initialized: this.isInitialized,
      shuttingDown: this.isShuttingDown,
      services: this.serviceManager.getAllServicesStatus()
    }
  }

  /**
   * 重启应用程序
   */
  async restart(): Promise<void> {
    this.logger.info('🔄 Restarting Bready application...')
    
    await this.shutdown()
    
    // 等待一小段时间确保清理完成
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    await this.initialize()
    
    this.logger.info('✅ Bready application restarted successfully')
  }

  /**
   * 获取应用程序健康状态
   */
  getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy'
    services: Record<string, 'healthy' | 'unhealthy'>
    errors: number
  } {
    const services = this.serviceManager.getAllServicesStatus()
    const serviceHealth: Record<string, 'healthy' | 'unhealthy'> = {}
    
    let healthyServices = 0
    let totalServices = 0
    
    for (const [name, isReady] of Object.entries(services)) {
      serviceHealth[name] = isReady ? 'healthy' : 'unhealthy'
      if (isReady) healthyServices++
      totalServices++
    }
    
    const errorCount = this.errorHandler.getErrorHistory().length
    
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy'
    if (healthyServices === totalServices && errorCount < 5) {
      overallStatus = 'healthy'
    } else if (healthyServices > totalServices / 2) {
      overallStatus = 'degraded'
    } else {
      overallStatus = 'unhealthy'
    }
    
    return {
      status: overallStatus,
      services: serviceHealth,
      errors: errorCount
    }
  }
}