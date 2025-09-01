import { BrowserWindow, app } from 'electron'
import * as os from 'os'

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export interface PerformanceMetrics {
  timestamp: number
  memory: {
    system: {
      total: number
      free: number
      used: number
    }
    process: NodeJS.MemoryUsage
  }
  cpu: {
    usage: NodeJS.CpuUsage
    loadAverage: number[]
  }
  app: {
    version: string
    uptime: number
  }
  audio?: {
    chunksProcessed: number
    totalProcessingTime: number
    bufferOverflows: number
    averageProcessingTime: number
  }
}

export class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map()
  private startTimes: Map<string, number> = new Map()
  private intervalId: NodeJS.Timeout | null = null
  private isRunning = false

  startTimer(label: string): void {
    this.startTimes.set(label, performance.now())
  }

  endTimer(label: string): number {
    const startTime = this.startTimes.get(label)
    if (startTime) {
      const duration = performance.now() - startTime
      if (!this.metrics.has(label)) {
        this.metrics.set(label, [])
      }
      this.metrics.get(label)!.push(duration)
      this.startTimes.delete(label)
      return duration
    }
    return 0
  }

  getAverageTime(label: string): number {
    const times = this.metrics.get(label) || []
    return times.length > 0 ? times.reduce((a, b) => a + b) / times.length : 0
  }

  getMetrics(): Record<string, any> {
    const result: Record<string, any> = {}
    for (const [label, times] of this.metrics) {
      result[label] = {
        count: times.length,
        average: this.getAverageTime(label),
        min: Math.min(...times),
        max: Math.max(...times),
        latest: times[times.length - 1] || 0
      }
    }
    return result
  }

  startSystemMonitoring(interval: number = 5000): void {
    if (this.isRunning) return

    this.isRunning = true
    this.intervalId = setInterval(() => {
      this.collectSystemMetrics()
    }, interval)

    console.log(`🔍 Performance monitoring started with ${interval}ms interval`)
  }

  stopSystemMonitoring(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
      this.isRunning = false
      console.log('🔍 Performance monitoring stopped')
    }
  }

  private async collectSystemMetrics(): Promise<void> {
    try {
      const metrics: PerformanceMetrics = {
        timestamp: Date.now(),
        memory: {
          system: {
            total: os.totalmem(),
            free: os.freemem(),
            used: os.totalmem() - os.freemem()
          },
          process: process.memoryUsage()
        },
        cpu: {
          usage: process.cpuUsage(),
          loadAverage: os.loadavg()
        },
        app: {
          version: app.getVersion(),
          uptime: process.uptime()
        }
      }

      // 检查内存使用情况
      this.checkMemoryThreshold(metrics.memory.process)

      // 发送到渲染进程
      this.sendMetricsToRenderer(metrics)

    } catch (error) {
      console.error('Error collecting system metrics:', error)
    }
  }

  private checkMemoryThreshold(memoryUsage: NodeJS.MemoryUsage): void {
    const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024
    const thresholdMB = 500 // 500MB阈值

    if (heapUsedMB > thresholdMB) {
      console.warn(`⚠️ High memory usage detected: ${heapUsedMB.toFixed(2)}MB`)
      
      // 触发垃圾回收（如果可用）
      if (global.gc) {
        global.gc()
        console.log('🗑️ Garbage collection triggered')
      }
    }
  }

  private sendMetricsToRenderer(metrics: PerformanceMetrics): void {
    const windows = BrowserWindow.getAllWindows()
    windows.forEach(window => {
      try {
        window.webContents.send('performance-metrics', metrics)
      } catch (error) {
        // 忽略发送错误，避免影响性能监控
      }
    })
  }

  // 清理旧的性能数据，避免内存泄漏
  cleanupOldMetrics(maxEntries: number = 1000): void {
    for (const [label, times] of this.metrics) {
      if (times.length > maxEntries) {
        // 保留最新的数据
        this.metrics.set(label, times.slice(-maxEntries))
      }
    }
  }

  // 获取性能报告
  getPerformanceReport(): string {
    const metrics = this.getMetrics()
    const memoryUsage = process.memoryUsage()
    
    let report = '📊 Performance Report\n'
    report += '===================\n\n'
    
    report += `Memory Usage:\n`
    report += `  Heap Used: ${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB\n`
    report += `  Heap Total: ${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)} MB\n`
    report += `  RSS: ${(memoryUsage.rss / 1024 / 1024).toFixed(2)} MB\n\n`
    
    report += `Timing Metrics:\n`
    for (const [label, data] of Object.entries(metrics)) {
      report += `  ${label}:\n`
      report += `    Count: ${data.count}\n`
      report += `    Average: ${data.average.toFixed(2)}ms\n`
      report += `    Min: ${data.min.toFixed(2)}ms\n`
      report += `    Max: ${data.max.toFixed(2)}ms\n\n`
    }
    
    return report
  }
}

// 音频性能监控器
export class AudioPerformanceMonitor {
  private audioMetrics = {
    chunksProcessed: 0,
    totalProcessingTime: 0,
    bufferOverflows: 0,
    lastProcessTime: 0,
    totalDataProcessed: 0
  }

  recordAudioProcessing(processingTime: number, bufferSize: number): void {
    this.audioMetrics.chunksProcessed++
    this.audioMetrics.totalProcessingTime += processingTime
    this.audioMetrics.lastProcessTime = processingTime
    this.audioMetrics.totalDataProcessed += bufferSize

    // 检测缓冲区溢出（处理时间过长）
    const threshold = 50 // 50ms阈值
    if (processingTime > threshold) {
      this.audioMetrics.bufferOverflows++
      console.warn(`🎵 Audio processing slow: ${processingTime.toFixed(2)}ms for ${bufferSize} bytes`)
    }
  }

  getAudioMetrics() {
    return {
      ...this.audioMetrics,
      averageProcessingTime: this.audioMetrics.totalProcessingTime / this.audioMetrics.chunksProcessed || 0,
      averageChunkSize: this.audioMetrics.totalDataProcessed / this.audioMetrics.chunksProcessed || 0
    }
  }

  resetMetrics(): void {
    this.audioMetrics = {
      chunksProcessed: 0,
      totalProcessingTime: 0,
      bufferOverflows: 0,
      lastProcessTime: 0,
      totalDataProcessed: 0
    }
    console.log('🎵 Audio metrics reset')
  }

  getPerformanceStatus(): 'good' | 'warning' | 'critical' {
    const avgTime = this.audioMetrics.totalProcessingTime / this.audioMetrics.chunksProcessed || 0
    const overflowRate = this.audioMetrics.bufferOverflows / this.audioMetrics.chunksProcessed || 0

    if (avgTime > 100 || overflowRate > 0.1) {
      return 'critical'
    } else if (avgTime > 50 || overflowRate > 0.05) {
      return 'warning'
    } else {
      return 'good'
    }
  }
}

// 结构化日志记录器
export class Logger {
  private level: LogLevel
  private logFile: string | null = null

  constructor(level: LogLevel = LogLevel.INFO, logFile?: string) {
    this.level = level
    this.logFile = logFile
  }

  private log(level: LogLevel, message: string, data?: any): void {
    if (level < this.level) return

    const timestamp = new Date().toISOString()
    const levelName = LogLevel[level]
    const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024

    const logEntry = {
      timestamp,
      level: levelName,
      message,
      data,
      pid: process.pid,
      memory: `${memoryUsage.toFixed(2)}MB`
    }

    // 格式化输出
    const formattedMessage = `[${timestamp}] ${levelName}: ${message}`
    
    switch (level) {
      case LogLevel.ERROR:
        console.error(formattedMessage, data || '')
        break
      case LogLevel.WARN:
        console.warn(formattedMessage, data || '')
        break
      case LogLevel.INFO:
        console.info(formattedMessage, data || '')
        break
      case LogLevel.DEBUG:
        console.debug(formattedMessage, data || '')
        break
    }

    // 文件输出（如果配置了）
    if (this.logFile) {
      this.writeToFile(logEntry)
    }
  }

  debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, data)
  }

  info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data)
  }

  warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data)
  }

  error(message: string, data?: any): void {
    this.log(LogLevel.ERROR, message, data)
  }

  private writeToFile(logEntry: any): void {
    // TODO: 实现日志文件写入
    // 可以使用fs.appendFile或者winston等日志库
  }
}

// 崩溃报告器
export class CrashReporter {
  private static logger = new Logger(LogLevel.ERROR)

  static init(): void {
    // 未捕获异常处理
    process.on('uncaughtException', (error) => {
      this.logger.error('Uncaught Exception', {
        message: error.message,
        stack: error.stack,
        name: error.name
      })
      this.reportCrash('uncaughtException', error)
    })

    // 未处理的Promise拒绝
    process.on('unhandledRejection', (reason, promise) => {
      this.logger.error('Unhandled Rejection', {
        reason: reason,
        promise: promise.toString()
      })
      this.reportCrash('unhandledRejection', reason)
    })

    console.log('💥 Crash reporter initialized')
  }

  private static reportCrash(type: string, error: any): void {
    const crashReport = {
      timestamp: Date.now(),
      type,
      error: {
        message: error?.message || 'Unknown error',
        stack: error?.stack || 'No stack trace',
        name: error?.name || 'Unknown'
      },
      system: {
        platform: process.platform,
        arch: process.arch,
        version: process.version,
        memory: process.memoryUsage(),
        uptime: process.uptime()
      },
      app: {
        version: app.getVersion(),
        uptime: process.uptime()
      }
    }

    // 发送崩溃报告到渲染进程
    const windows = BrowserWindow.getAllWindows()
    windows.forEach(window => {
      try {
        window.webContents.send('crash-report', crashReport)
      } catch (err) {
        // 忽略发送错误
      }
    })

    console.error('💥 Crash report generated:', crashReport)
  }
}

// 单例实例
export const performanceMonitor = new PerformanceMonitor()
export const audioPerformanceMonitor = new AudioPerformanceMonitor()
export const logger = new Logger(LogLevel.INFO)