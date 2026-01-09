import { EventEmitter } from 'events'
import { performance } from 'perf_hooks'
import { createLogger } from '../utils/logging'

const toErrorMetadata = (error: unknown): Record<string, any> => ({
  error: error instanceof Error ? { message: error.message, stack: error.stack } : String(error),
})

/**
 * 统一监控系统
 * 集成性能监控、错误追踪、用户行为分析
 */
export class MonitoringSystem extends EventEmitter {
  private readonly logger = createLogger('monitoring-system')
  private isRunning = false
  private metrics: Map<string, any> = new Map()
  private errors: any[] = []
  private userActions: any[] = []

  constructor() {
    super()
    this.setupGlobalHandlers()
  }

  /**
   * 启动监控系统
   */
  async start(): Promise<void> {
    if (this.isRunning) return

    this.isRunning = true
    this.logger.info('🚀 监控系统已启动')

    // 记录启动时间
    this.recordMetric('app.startup.time', performance.now())

    // 开始定期收集系统指标
    this.startSystemMonitoring()

    this.emit('started')
  }

  /**
   * 停止监控系统
   */
  stop(): void {
    if (!this.isRunning) return

    this.isRunning = false
    this.logger.info('⏹️ 监控系统已停止')
    this.emit('stopped')
  }

  /**
   * 记录性能指标
   */
  recordMetric(name: string, value: number, unit: string = ''): void {
    const metric = {
      name,
      value,
      unit,
      timestamp: Date.now(),
    }

    this.metrics.set(name, metric)
    this.emit('metric', metric)

    this.logger.debug(`📊 性能指标: ${name} = ${value}${unit}`)
  }

  /**
   * 记录错误
   */
  captureError(error: Error | string, context: any = {}): string {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const errorInfo = {
      id: errorId,
      message: typeof error === 'string' ? error : error.message,
      stack: typeof error === 'object' ? error.stack : undefined,
      context,
      timestamp: Date.now(),
    }

    this.errors.push(errorInfo)
    this.emit('error', errorInfo)

    this.logger.error(`🚨 错误记录 [${errorId}]: ${errorInfo.message}`)

    return errorId
  }

  /**
   * 记录用户行为
   */
  trackUserAction(action: string, data: any = {}): void {
    const actionInfo = {
      action,
      data,
      timestamp: Date.now(),
    }

    this.userActions.push(actionInfo)
    this.emit('userAction', actionInfo)

    this.logger.debug(`👤 用户行为: ${action}`)
  }

  /**
   * 获取监控摘要
   */
  getSummary(): {
    isRunning: boolean
    metrics: any
    errors: any
    userActions: any
  } {
    return {
      isRunning: this.isRunning,
      metrics: {
        total: this.metrics.size,
        latest: Array.from(this.metrics.values()).slice(-10),
      },
      errors: {
        total: this.errors.length,
        recent: this.errors.slice(-5),
      },
      userActions: {
        total: this.userActions.length,
        recent: this.userActions.slice(-10),
      },
    }
  }

  /**
   * 设置全局错误处理器
   */
  private setupGlobalHandlers(): void {
    // 捕获未处理的异常
    process.on('uncaughtException', (error) => {
      this.captureError(error, { source: 'uncaughtException' })
    })

    // 捕获未处理的Promise拒绝
    process.on('unhandledRejection', (reason) => {
      const error = reason instanceof Error ? reason : new Error(String(reason))
      this.captureError(error, { source: 'unhandledRejection' })
    })
  }

  /**
   * 开始系统监控
   */
  private startSystemMonitoring(): void {
    const collectMetrics = () => {
      if (!this.isRunning) return

      try {
        // 内存使用情况
        const memUsage = process.memoryUsage()
        this.recordMetric('process.memory.heapUsed', memUsage.heapUsed, 'bytes')
        this.recordMetric('process.memory.heapTotal', memUsage.heapTotal, 'bytes')
        this.recordMetric('process.memory.rss', memUsage.rss, 'bytes')

        // CPU使用情况（简化）
        const cpuUsage = process.cpuUsage()
        this.recordMetric('process.cpu.user', cpuUsage.user, 'microseconds')
        this.recordMetric('process.cpu.system', cpuUsage.system, 'microseconds')
      } catch (error) {
        this.logger.error('收集系统指标失败:', toErrorMetadata(error))
      }

      // 每5秒收集一次
      setTimeout(collectMetrics, 5000)
    }

    collectMetrics()
  }
}

// 导出单例实例
export const monitoringSystem = new MonitoringSystem()
