export interface RuntimeMetric {
  type: string
  timestamp: number
  data?: Record<string, unknown>
}

const MAX_METRICS = Number.parseInt(process.env.METRICS_BUFFER_SIZE || '200', 10)
const metricsBuffer: RuntimeMetric[] = new Array(Math.max(MAX_METRICS, 1))
let metricsIndex = 0
let metricsSize = 0

export function recordMetric(type: string, data?: Record<string, unknown>): void {
  metricsBuffer[metricsIndex] = {
    type,
    timestamp: Date.now(),
    data
  }
  metricsIndex = (metricsIndex + 1) % metricsBuffer.length
  metricsSize = Math.min(metricsSize + 1, metricsBuffer.length)
}

export function getRecentMetrics(limit = metricsSize): RuntimeMetric[] {
  const size = Math.min(limit, metricsSize)
  const results: RuntimeMetric[] = []
  const start = (metricsIndex - size + metricsBuffer.length) % metricsBuffer.length

  for (let i = 0; i < size; i += 1) {
    const idx = (start + i) % metricsBuffer.length
    const item = metricsBuffer[idx]
    if (item) {
      results.push(item)
    }
  }

  return results
}
