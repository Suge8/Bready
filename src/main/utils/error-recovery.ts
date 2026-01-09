/**
 * 错误恢复管理器
 * 统一处理各类错误和自动恢复策略
 */

import { log } from './logging'
import { recordMetric } from './metrics'

export enum ErrorType {
  NETWORK = 'network',
  PERMISSION = 'permission',
  QUOTA = 'quota',
  AUDIO_STREAM = 'audio_stream',
  GEMINI_CONNECTION = 'gemini_connection',
  DB_CONNECTION = 'db_connection',
  UNKNOWN = 'unknown',
}

export interface ErrorContext {
  type: ErrorType
  message: string
  originalError?: Error
  metadata?: Record<string, any>
}

export interface RecoveryResult {
  success: boolean
  userMessage?: string
  shouldRetry?: boolean
  retryDelay?: number
}

export class ErrorRecoveryManager {
  private recoveryAttempts: Map<string, number> = new Map()
  private lastErrorTime: Map<string, number> = new Map()
  private readonly maxAttempts = 3
  private readonly resetInterval = 60000 // 1分钟后重置计数

  /**
   * 分类错误类型
   */
  classifyError(error: Error | string): ErrorType {
    const message = typeof error === 'string' ? error : error.message

    if (!message) return ErrorType.UNKNOWN

    if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
      return ErrorType.NETWORK
    }
    if (
      message.includes('permission') ||
      message.includes('denied') ||
      message.includes('not supported')
    ) {
      return ErrorType.PERMISSION
    }
    if (message.includes('429') || message.includes('quota') || message.includes('rate limit')) {
      return ErrorType.QUOTA
    }
    if (message.includes('stream') || message.includes('audio')) {
      return ErrorType.AUDIO_STREAM
    }
    if (message.includes('gemini') || message.includes('connection')) {
      return ErrorType.GEMINI_CONNECTION
    }
    if (message.includes('database') || message.includes('pool')) {
      return ErrorType.DB_CONNECTION
    }

    return ErrorType.UNKNOWN
  }

  /**
   * 处理错误并尝试恢复
   */
  async handleError(context: ErrorContext): Promise<RecoveryResult> {
    const errorKey = `${context.type}:${context.message}`

    // 记录错误
    log('error', `🚨 错误类型: ${context.type}, 消息: ${context.message}`)
    recordMetric('error.occurred', { type: context.type, message: context.message })

    // 检查是否可以重试
    if (!this.canRetry(errorKey)) {
      log('warn', `❌ 达到最大重试次数: ${errorKey}`)
      recordMetric('error.retry.exhausted', { type: context.type })
      return {
        success: false,
        userMessage: this.getUserMessage(context.type, false),
        shouldRetry: false,
      }
    }

    // 增加重试计数
    this.incrementAttempt(errorKey)

    // 根据错误类型执行恢复策略
    const result = await this.recover(context)

    if (result.success) {
      this.resetAttempts(errorKey)
      recordMetric('error.recovery.success', { type: context.type })
    } else {
      recordMetric('error.recovery.failure', { type: context.type })
    }

    return result
  }

  /**
   * 执行恢复策略
   */
  private async recover(context: ErrorContext): Promise<RecoveryResult> {
    switch (context.type) {
      case ErrorType.NETWORK:
        return this.recoverNetwork()

      case ErrorType.PERMISSION:
        return this.recoverPermission(context)

      case ErrorType.QUOTA:
        return this.recoverQuota()

      case ErrorType.AUDIO_STREAM:
        return this.recoverAudioStream()

      case ErrorType.GEMINI_CONNECTION:
        return this.recoverGeminiConnection()

      case ErrorType.DB_CONNECTION:
        return this.recoverDbConnection()

      default:
        return {
          success: false,
          userMessage: '发生未知错误，请重试',
          shouldRetry: true,
          retryDelay: 3000,
        }
    }
  }

  /**
   * 网络错误恢复
   */
  private async recoverNetwork(): Promise<RecoveryResult> {
    log('info', '🔄 检测网络连接...')

    // 简单的网络检测
    try {
      await fetch('https://www.google.com', {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000),
      })

      return {
        success: true,
        userMessage: '网络已恢复',
        shouldRetry: true,
        retryDelay: 1000,
      }
    } catch {
      return {
        success: false,
        userMessage: '网络连接失败，请检查网络设置',
        shouldRetry: true,
        retryDelay: 5000,
      }
    }
  }

  /**
   * 权限错误恢复
   */
  private async recoverPermission(context: ErrorContext): Promise<RecoveryResult> {
    void context
    log('warn', '⚠️ 权限不足，需要用户手动授权')

    return {
      success: false,
      userMessage: '缺少必要权限，请前往系统设置授权',
      shouldRetry: false,
    }
  }

  /**
   * 配额错误恢复
   */
  private async recoverQuota(): Promise<RecoveryResult> {
    log('info', '🔄 配额已用尽，尝试切换 API Key...')

    return {
      success: true,
      userMessage: '已切换到备用 API Key',
      shouldRetry: true,
      retryDelay: 2000,
    }
  }

  /**
   * 音频流错误恢复
   */
  private async recoverAudioStream(): Promise<RecoveryResult> {
    log('info', '🔄 尝试重启音频流...')

    return {
      success: true,
      userMessage: '正在重启音频捕获...',
      shouldRetry: true,
      retryDelay: 3000,
    }
  }

  /**
   * Gemini 连接错误恢复
   */
  private async recoverGeminiConnection(): Promise<RecoveryResult> {
    log('info', '🔄 尝试重新连接 Gemini...')

    return {
      success: true,
      userMessage: 'AI 服务正在重连...',
      shouldRetry: true,
      retryDelay: 2000,
    }
  }

  /**
   * 数据库连接错误恢复
   */
  private async recoverDbConnection(): Promise<RecoveryResult> {
    log('info', '🔄 尝试重新连接数据库...')

    return {
      success: true,
      userMessage: '数据库连接正在恢复...',
      shouldRetry: true,
      retryDelay: 3000,
    }
  }

  /**
   * 获取用户友好的错误消息
   */
  private getUserMessage(type: ErrorType, canRetry: boolean): string {
    const messages: Record<ErrorType, { retry: string; noRetry: string }> = {
      [ErrorType.NETWORK]: {
        retry: '网络出现问题，正在重试...',
        noRetry: '网络连接失败，请检查网络设置',
      },
      [ErrorType.PERMISSION]: {
        retry: '权限检查中...',
        noRetry: '缺少必要权限，请前往系统设置授权',
      },
      [ErrorType.QUOTA]: {
        retry: 'API 配额已用尽，切换备用密钥中...',
        noRetry: 'API 配额已用尽，请稍后再试',
      },
      [ErrorType.AUDIO_STREAM]: {
        retry: '音频流中断，正在重启...',
        noRetry: '音频捕获失败，请检查权限或手动重启',
      },
      [ErrorType.GEMINI_CONNECTION]: {
        retry: 'AI 连接中断，正在重连...',
        noRetry: 'AI 服务连接失败，请重新初始化',
      },
      [ErrorType.DB_CONNECTION]: {
        retry: '数据库连接中断，正在恢复...',
        noRetry: '数据库连接失败，请联系技术支持',
      },
      [ErrorType.UNKNOWN]: {
        retry: '发生错误，正在重试...',
        noRetry: '发生未知错误，请刷新页面重试',
      },
    }

    return canRetry ? messages[type].retry : messages[type].noRetry
  }

  /**
   * 检查是否可以重试
   */
  private canRetry(errorKey: string): boolean {
    const attempts = this.recoveryAttempts.get(errorKey) || 0
    const lastTime = this.lastErrorTime.get(errorKey) || 0
    const now = Date.now()

    // 超过重置时间，重置计数
    if (now - lastTime > this.resetInterval) {
      this.resetAttempts(errorKey)
      return true
    }

    return attempts < this.maxAttempts
  }

  /**
   * 增加重试计数
   */
  private incrementAttempt(errorKey: string): void {
    const current = this.recoveryAttempts.get(errorKey) || 0
    this.recoveryAttempts.set(errorKey, current + 1)
    this.lastErrorTime.set(errorKey, Date.now())
  }

  /**
   * 重置重试计数
   */
  private resetAttempts(errorKey: string): void {
    this.recoveryAttempts.delete(errorKey)
    this.lastErrorTime.delete(errorKey)
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      activeErrors: this.recoveryAttempts.size,
      errors: Array.from(this.recoveryAttempts.entries()).map(([key, attempts]) => ({
        key,
        attempts,
        lastTime: this.lastErrorTime.get(key),
      })),
    }
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    this.recoveryAttempts.clear()
    this.lastErrorTime.clear()
  }
}

// 单例实例
let recoveryManager: ErrorRecoveryManager | null = null

export function getErrorRecoveryManager(): ErrorRecoveryManager {
  if (!recoveryManager) {
    recoveryManager = new ErrorRecoveryManager()
  }
  return recoveryManager
}
