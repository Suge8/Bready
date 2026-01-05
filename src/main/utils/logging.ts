export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const levelOrder: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
}

const configuredLevel = (process.env.LOG_LEVEL || (process.env.NODE_ENV === 'development' ? 'debug' : 'info')) as LogLevel

const sampleRateByLevel: Record<LogLevel, number> = {
  debug: Number.parseFloat(process.env.LOG_SAMPLE_DEBUG || process.env.LOG_SAMPLE_RATE || '1'),
  info: Number.parseFloat(process.env.LOG_SAMPLE_INFO || '1'),
  warn: Number.parseFloat(process.env.LOG_SAMPLE_WARN || '1'),
  error: Number.parseFloat(process.env.LOG_SAMPLE_ERROR || '1')
}

const lastLogAtByKey: Record<string, number> = {}

function shouldLog(level: LogLevel): boolean {
  return levelOrder[level] >= levelOrder[configuredLevel]
}

function shouldSample(level: LogLevel, rateOverride?: number): boolean {
  const rate = typeof rateOverride === 'number' ? rateOverride : sampleRateByLevel[level]
  if (Number.isNaN(rate) || rate >= 1) return true
  if (rate <= 0) return false
  return Math.random() < rate
}

export function log(level: LogLevel, message: string, ...args: unknown[]): void {
  if (!shouldLog(level)) return
  if (!shouldSample(level)) return

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

export function logSampled(level: LogLevel, rate: number, message: string, ...args: unknown[]): void {
  if (!shouldLog(level)) return
  if (!shouldSample(level, rate)) return
  log(level, message, ...args)
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
