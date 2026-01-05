export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogEntry {
  timestamp: number
  level: LogLevel
  module: string
  message: string
  metadata?: Record<string, any>
  traceId?: string
}

const levelOrder: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
}

const isDev = process.env.NODE_ENV === 'development'
const configuredLevel = (process.env.LOG_LEVEL || (isDev ? 'debug' : 'info')) as LogLevel

// 优化的默认采样率：生产环境降低 debug/info 日志量
const sampleRateByLevel: Record<LogLevel, number> = {
  debug: Number.parseFloat(process.env.LOG_SAMPLE_DEBUG || (isDev ? '1' : '0.1')),
  info: Number.parseFloat(process.env.LOG_SAMPLE_INFO || (isDev ? '1' : '0.5')),
  warn: Number.parseFloat(process.env.LOG_SAMPLE_WARN || '1'),
  error: Number.parseFloat(process.env.LOG_SAMPLE_ERROR || '1')
}

const lastLogAtByKey: Record<string, number> = {}
const logStats: Record<LogLevel, { total: number; sampled: number }> = {
  debug: { total: 0, sampled: 0 },
  info: { total: 0, sampled: 0 },
  warn: { total: 0, sampled: 0 },
  error: { total: 0, sampled: 0 }
}

function shouldLog(level: LogLevel): boolean {
  return levelOrder[level] >= levelOrder[configuredLevel]
}

function shouldSample(level: LogLevel, rateOverride?: number): boolean {
  logStats[level].total++

  const rate = typeof rateOverride === 'number' ? rateOverride : sampleRateByLevel[level]
  if (Number.isNaN(rate) || rate >= 1) {
    logStats[level].sampled++
    return true
  }
  if (rate <= 0) return false

  const sampled = Math.random() < rate
  if (sampled) {
    logStats[level].sampled++
  }
  return sampled
}

function emit(level: LogLevel, message: string, ...args: unknown[]): void {
  switch (level) {
    case 'debug':
      console.debug(message, ...args)
      break
    case 'info':
      console.info(message, ...args)
      break
    case 'warn':
      console.warn(message, ...args)
      break
    case 'error':
      console.error(message, ...args)
      break
  }
}

export function log(level: LogLevel, message: string, ...args: unknown[]): void {
  if (!shouldLog(level)) return
  if (!shouldSample(level)) return

  emit(level, message, ...args)
}

export function logSampled(level: LogLevel, rate: number, message: string, ...args: unknown[]): void {
  if (!shouldLog(level)) return
  if (!shouldSample(level, rate)) return
  emit(level, message, ...args)
}

export function logRateLimited(
  key: string,
  intervalMs: number,
  level: LogLevel,
  message: string,
  ...args: unknown[]
): void {
  if (!shouldLog(level)) return

  const now = Date.now()
  const last = lastLogAtByKey[key] || 0
  if (now - last < intervalMs) return
  lastLogAtByKey[key] = now

  log(level, message, ...args)
}

/**
 * 获取日志统计信息
 */
export function getLogStats() {
  const stats = Object.entries(logStats).map(([level, counts]) => ({
    level,
    total: counts.total,
    sampled: counts.sampled,
    sampleRate: counts.total > 0 ? (counts.sampled / counts.total * 100).toFixed(1) + '%' : '0%'
  }))

  return {
    levels: stats,
    summary: {
      total: stats.reduce((sum, s) => sum + s.total, 0),
      sampled: stats.reduce((sum, s) => sum + s.sampled, 0)
    }
  }
}

/**
 * 重置日志统计
 */
export function resetLogStats() {
  Object.keys(logStats).forEach(level => {
    logStats[level as LogLevel] = { total: 0, sampled: 0 }
  })
}

/**
 * 结构化日志记录
 */
export function logStructured(entry: LogEntry): void {
  if (!shouldLog(entry.level)) return
  if (!shouldSample(entry.level)) return

  const structured = {
    ...entry,
    timestamp: entry.timestamp || Date.now(),
    env: process.env.NODE_ENV || 'production'
  }

  // JSON 格式输出便于分析
  if (process.env.LOG_FORMAT === 'json') {
    console.log(JSON.stringify(structured))
    return
  }

  // 人类可读格式
  const time = new Date(structured.timestamp).toISOString()
  const prefix = `[${time}] [${structured.level.toUpperCase()}] [${structured.module}]`
  const meta = structured.metadata ? ` ${JSON.stringify(structured.metadata)}` : ''
  const trace = structured.traceId ? ` [trace:${structured.traceId}]` : ''

  emit(entry.level, `${prefix} ${structured.message}${meta}${trace}`)
}

/**
 * 模块级日志记录器
 */
export class Logger {
  constructor(private module: string, private traceId?: string) {}

  debug(message: string, metadata?: Record<string, any>): void {
    logStructured({
      timestamp: Date.now(),
      level: 'debug',
      module: this.module,
      message,
      metadata,
      traceId: this.traceId
    })
  }

  info(message: string, metadata?: Record<string, any>): void {
    logStructured({
      timestamp: Date.now(),
      level: 'info',
      module: this.module,
      message,
      metadata,
      traceId: this.traceId
    })
  }

  warn(message: string, metadata?: Record<string, any>): void {
    logStructured({
      timestamp: Date.now(),
      level: 'warn',
      module: this.module,
      message,
      metadata,
      traceId: this.traceId
    })
  }

  error(message: string, metadata?: Record<string, any>): void {
    logStructured({
      timestamp: Date.now(),
      level: 'error',
      module: this.module,
      message,
      metadata,
      traceId: this.traceId
    })
  }

  withTrace(traceId: string): Logger {
    return new Logger(this.module, traceId)
  }
}

/**
 * 创建模块日志记录器
 */
export function createLogger(module: string): Logger {
  return new Logger(module)
}
