/**
 * 性能追踪器
 * 提供轻量级的性能监控和分析
 */

import { recordMetric } from './metrics'
import { createLogger } from './logging'

const logger = createLogger('performance')

interface PerformanceSnapshot {
  memory: {
    heapUsed: number
    heapTotal: number
    external: number
    rss: number
  }
  cpu: {
    user: number
    system: number
  }
  timestamp: number
}

interface OperationMetrics {
  name: string
  count: number
  totalTime: number
  minTime: number
  maxTime: number
  avgTime: number
}

export class PerformanceTracker {
  private snapshots: PerformanceSnapshot[] = []
  private operations = new Map<string, number[]>()
  private readonly maxSnapshots = 60 // 保留最近 60 个快照
  private snapshotInterval: NodeJS.Timeout | null = null

  /**
   * 启动性能快照采集
   */
  startMonitoring(intervalMs = 10000): void {
    if (this.snapshotInterval) {
      return
    }

    this.takeSnapshot()

    this.snapshotInterval = setInterval(() => {
      this.takeSnapshot()
      this.analyzePerformance()
    }, intervalMs)

    logger.info('性能监控已启动', { interval: intervalMs })
  }

  /**
   * 停止性能监控
   */
  stopMonitoring(): void {
    if (this.snapshotInterval) {
      clearInterval(this.snapshotInterval)
      this.snapshotInterval = null
      logger.info('性能监控已停止')
    }
  }

  /**
   * 获取性能快照
   */
  private takeSnapshot(): void {
    const memUsage = process.memoryUsage()
    const cpuUsage = process.cpuUsage()

    const snapshot: PerformanceSnapshot = {
      memory: {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external,
        rss: memUsage.rss
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      timestamp: Date.now()
    }

    this.snapshots.push(snapshot)

    // 保留最近的快照
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift()
    }
  }

  /**
   * 分析性能趋势
   */
  private analyzePerformance(): void {
    if (this.snapshots.length < 2) return

    const latest = this.snapshots[this.snapshots.length - 1]
    const previous = this.snapshots[this.snapshots.length - 2]

    // 内存增长检测
    const memoryGrowth = latest.memory.heapUsed - previous.memory.heapUsed
    const memoryGrowthPercent = (memoryGrowth / previous.memory.heapUsed) * 100

    if (memoryGrowthPercent > 10) {
      logger.warn('内存快速增长', {
        growth: `${(memoryGrowth / 1024 / 1024).toFixed(2)}MB`,
        percent: `${memoryGrowthPercent.toFixed(1)}%`
      })

      recordMetric('performance.memory.rapid_growth', {
        growthMB: memoryGrowth / 1024 / 1024,
        percent: memoryGrowthPercent
      })
    }

    // CPU 使用率
    const cpuDelta = latest.cpu.user - previous.cpu.user
    const timeDelta = latest.timestamp - previous.timestamp
    const cpuPercent = (cpuDelta / (timeDelta * 1000)) * 100

    if (cpuPercent > 80) {
      logger.warn('CPU 使用率过高', {
        percent: `${cpuPercent.toFixed(1)}%`
      })

      recordMetric('performance.cpu.high_usage', {
        percent: cpuPercent
      })
    }
  }

  /**
   * 追踪操作性能
   */
  trackOperation(name: string, durationMs: number): void {
    if (!this.operations.has(name)) {
      this.operations.set(name, [])
    }

    const times = this.operations.get(name)!
    times.push(durationMs)

    // 保留最近 100 次
    if (times.length > 100) {
      times.shift()
    }
  }

  /**
   * 测量操作耗时
   */
  measure<T>(name: string, operation: () => T): T {
    const start = performance.now()
    try {
      const result = operation()
      const duration = performance.now() - start
      this.trackOperation(name, duration)
      return result
    } catch (error) {
      const duration = performance.now() - start
      this.trackOperation(name, duration)
      throw error
    }
  }

  /**
   * 测量异步操作耗时
   */
  async measureAsync<T>(name: string, operation: () => Promise<T>): Promise<T> {
    const start = performance.now()
    try {
      const result = await operation()
      const duration = performance.now() - start
      this.trackOperation(name, duration)
      return result
    } catch (error) {
      const duration = performance.now() - start
      this.trackOperation(name, duration)
      throw error
    }
  }

  /**
   * 获取操作统计
   */
  getOperationStats(name: string): OperationMetrics | null {
    const times = this.operations.get(name)
    if (!times || times.length === 0) {
      return null
    }

    return {
      name,
      count: times.length,
      totalTime: times.reduce((sum, t) => sum + t, 0),
      minTime: Math.min(...times),
      maxTime: Math.max(...times),
      avgTime: times.reduce((sum, t) => sum + t, 0) / times.length
    }
  }

  /**
   * 获取所有操作统计
   */
  getAllOperationStats(): OperationMetrics[] {
    const stats: OperationMetrics[] = []

    for (const name of this.operations.keys()) {
      const stat = this.getOperationStats(name)
      if (stat) {
        stats.push(stat)
      }
    }

    return stats.sort((a, b) => b.avgTime - a.avgTime)
  }

  /**
   * 获取当前性能快照
   */
  getCurrentSnapshot(): PerformanceSnapshot | null {
    return this.snapshots[this.snapshots.length - 1] || null
  }

  /**
   * 获取性能摘要
   */
  getSummary() {
    const current = this.getCurrentSnapshot()
    if (!current) {
      return null
    }

    const slowOperations = this.getAllOperationStats()
      .filter(op => op.avgTime > 100)
      .slice(0, 5)

    return {
      memory: {
        heapUsedMB: (current.memory.heapUsed / 1024 / 1024).toFixed(2),
        heapTotalMB: (current.memory.heapTotal / 1024 / 1024).toFixed(2),
        externalMB: (current.memory.external / 1024 / 1024).toFixed(2),
        rssMB: (current.memory.rss / 1024 / 1024).toFixed(2)
      },
      slowOperations: slowOperations.map(op => ({
        name: op.name,
        avgTime: `${op.avgTime.toFixed(2)}ms`,
        count: op.count
      })),
      snapshotCount: this.snapshots.length,
      operationCount: this.operations.size
    }
  }

  /**
   * 导出性能数据
   */
  exportData() {
    return {
      snapshots: this.snapshots,
      operations: Array.from(this.operations.entries()).map(([name, times]) => ({
        name,
        times
      })),
      summary: this.getSummary()
    }
  }

  /**
   * 重置统计
   */
  reset(): void {
    this.snapshots = []
    this.operations.clear()
    logger.info('性能统计已重置')
  }
}

// 单例实例
let tracker: PerformanceTracker | null = null

export function getPerformanceTracker(): PerformanceTracker {
  if (!tracker) {
    tracker = new PerformanceTracker()
  }
  return tracker
}

/**
 * 便捷的性能测量装饰器
 */
export function measure(name: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    void target
    const originalMethod = descriptor.value
    const tracker = getPerformanceTracker()

    descriptor.value = function (...args: any[]) {
      const start = performance.now()
      try {
        const result = originalMethod.apply(this, args)
        if (result && typeof result.then === 'function') {
          return result
            .then((value: any) => {
              tracker.trackOperation(`${name}.${propertyKey}`, performance.now() - start)
              return value
            })
            .catch((error: any) => {
              tracker.trackOperation(`${name}.${propertyKey}`, performance.now() - start)
              throw error
            })
        }
        tracker.trackOperation(`${name}.${propertyKey}`, performance.now() - start)
        return result
      } catch (error) {
        tracker.trackOperation(`${name}.${propertyKey}`, performance.now() - start)
        throw error
      }
    }

    return descriptor
  }
}
