/**
 * 全局错误处理器
 * 统一捕获和处理未处理的异常
 */

import { app } from 'electron'
import { createLogger } from './logging'
import { recordMetric } from './metrics'
import { getErrorRecoveryManager, ErrorType } from './error-recovery'

const logger = createLogger('error-handler')
const recoveryManager = getErrorRecoveryManager()

interface ErrorReport {
  type: string
  message: string
  stack?: string
  timestamp: number
  context?: Record<string, any>
}

class GlobalErrorHandler {
  private errorCount = 0
  private criticalErrors: ErrorReport[] = []
  private readonly maxCriticalErrors = 10

  /**
   * 初始化全局错误处理
   */
  initialize(): void {
    // 捕获未处理的 Promise 拒绝
    process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
      this.handleUnhandledRejection(reason, promise)
    })

    // 捕获未捕获的异常
    process.on('uncaughtException', (error: Error) => {
      this.handleUncaughtException(error)
    })

    // Electron 应用错误
    app.on('render-process-gone', (event, webContents, details) => {
      void event
      void webContents
      this.handleRenderProcessGone(details)
    })

    logger.info('全局错误处理器已初始化')
  }

  /**
   * 处理未处理的 Promise 拒绝
   */
  private async handleUnhandledRejection(reason: any, promise: Promise<any>): Promise<void> {
    void promise
    this.errorCount++
    const errorMessage = reason?.message || String(reason)

    logger.error('未处理的 Promise 拒绝', {
      reason: errorMessage,
      errorCount: this.errorCount
    })

    recordMetric('error.unhandled_rejection', {
      message: errorMessage,
      count: this.errorCount
    })

    // 尝试恢复
    const errorType = recoveryManager.classifyError(reason)
    if (errorType !== ErrorType.UNKNOWN) {
      await recoveryManager.handleError({
        type: errorType,
        message: errorMessage,
        originalError: reason
      })
    }

    this.recordCriticalError({
      type: 'UnhandledRejection',
      message: errorMessage,
      stack: reason?.stack,
      timestamp: Date.now()
    })
  }

  /**
   * 处理未捕获的异常
   */
  private handleUncaughtException(error: Error): void {
    this.errorCount++

    logger.error('未捕获的异常', {
      message: error.message,
      stack: error.stack,
      errorCount: this.errorCount
    })

    recordMetric('error.uncaught_exception', {
      message: error.message,
      count: this.errorCount
    })

    this.recordCriticalError({
      type: 'UncaughtException',
      message: error.message,
      stack: error.stack,
      timestamp: Date.now()
    })

    // 严重错误可能导致应用不稳定
    if (this.isCritical(error)) {
      logger.error('检测到严重错误，建议重启应用')
      // 不直接退出，给用户保存数据的机会
    }
  }

  /**
   * 处理渲染进程崩溃
   */
  private handleRenderProcessGone(details: any): void {
    logger.error('渲染进程崩溃', {
      reason: details.reason,
      exitCode: details.exitCode
    })

    recordMetric('error.render_process_gone', {
      reason: details.reason,
      exitCode: details.exitCode
    })

    this.recordCriticalError({
      type: 'RenderProcessGone',
      message: `渲染进程崩溃: ${details.reason}`,
      timestamp: Date.now(),
      context: details
    })
  }

  /**
   * 判断是否为严重错误
   */
  private isCritical(error: Error): boolean {
    const criticalPatterns = [
      'ENOSPC',           // 磁盘空间不足
      'ENOMEM',           // 内存不足
      'FATAL',            // 致命错误
      'Segmentation fault' // 段错误
    ]

    return criticalPatterns.some(pattern =>
      error.message.includes(pattern) || error.stack?.includes(pattern)
    )
  }

  /**
   * 记录严重错误
   */
  private recordCriticalError(report: ErrorReport): void {
    this.criticalErrors.push(report)

    // 保留最近的错误
    if (this.criticalErrors.length > this.maxCriticalErrors) {
      this.criticalErrors.shift()
    }
  }

  /**
   * 获取错误统计
   */
  getStats() {
    return {
      totalErrors: this.errorCount,
      criticalErrors: this.criticalErrors.length,
      recentCritical: this.criticalErrors.slice(-5)
    }
  }

  /**
   * 获取完整错误报告
   */
  getErrorReport(): ErrorReport[] {
    return [...this.criticalErrors]
  }

  /**
   * 清理错误记录
   */
  clearErrors(): void {
    this.errorCount = 0
    this.criticalErrors = []
    logger.info('错误记录已清理')
  }
}

// 单例实例
let errorHandler: GlobalErrorHandler | null = null

export function initializeErrorHandler(): GlobalErrorHandler {
  if (!errorHandler) {
    errorHandler = new GlobalErrorHandler()
    errorHandler.initialize()
  }
  return errorHandler
}

export function getErrorHandler(): GlobalErrorHandler | null {
  return errorHandler
}
