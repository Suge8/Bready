/**
 * 内存管理优化器
 * 监控内存使用并自动进行优化
 */

import { EventEmitter } from 'events'
import { app } from 'electron'

interface MemoryMetrics {
  used: number
  total: number
  external: number
  heapUsed: number
  heapTotal: number
  rss: number
  timestamp: number
}

interface MemoryThresholds {
  warning: number    // 警告阈值（MB）
  critical: number   // 关键阈值（MB）
  gcTrigger: number  // GC触发阈值（MB）
}

export class MemoryOptimizer extends EventEmitter {
  private monitoringInterval: NodeJS.Timeout | null = null
  private metrics: MemoryMetrics[] = []
  private readonly maxMetricsHistory = 100
  private readonly debugMemory = process.env.DEBUG_MEMORY === '1'

  private lastLevel: 'normal' | 'gc' | 'warning' | 'critical' = 'normal'
  private lastLogAt = 0
  private lastGcAt = 0
  private lastOptimizeAt = 0
  private lastEmergencyAt = 0
  private gcWarned = false
  private readonly logCooldownMs = 60000
  private readonly gcCooldownMs = 30000
  private readonly optimizeCooldownMs = 60000
  private readonly emergencyCooldownMs = 120000
  
  private thresholds: MemoryThresholds = {
    warning: 150,   // 150MB
    critical: 200,  // 200MB  
    gcTrigger: 120  // 120MB
  }

  constructor(customThresholds?: Partial<MemoryThresholds>) {
    super()
    
    if (customThresholds) {
      this.thresholds = { ...this.thresholds, ...customThresholds }
    }
  }

  /**
   * 开始内存监控
   */
  startMonitoring(intervalMs = 10000) {
    if (this.monitoringInterval) {
      this.stopMonitoring()
    }

    if (this.debugMemory) {
      console.log('🧠 启动内存监控...')
    }
    
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics()
    }, intervalMs)

    // 立即收集一次指标
    this.collectMetrics()
  }

  /**
   * 停止内存监控
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
      if (this.debugMemory) {
        console.log('🛑 内存监控已停止')
      }
    }
  }

  /**
   * 收集内存指标
   */
  private collectMetrics() {
    const memoryUsage = process.memoryUsage()
    const systemMemory = process.getSystemMemoryInfo?.() || { 
      total: 0, 
      free: 0,
      swapTotal: 0,
      swapFree: 0
    }

    const metrics: MemoryMetrics = {
      used: memoryUsage.heapUsed / 1024 / 1024, // MB
      total: memoryUsage.heapTotal / 1024 / 1024, // MB
      external: memoryUsage.external / 1024 / 1024, // MB
      heapUsed: memoryUsage.heapUsed / 1024 / 1024, // MB
      heapTotal: memoryUsage.heapTotal / 1024 / 1024, // MB
      rss: memoryUsage.rss / 1024 / 1024, // MB
      timestamp: Date.now()
    }

    // 保存指标历史
    this.metrics.push(metrics)
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics.shift()
    }

    // 检查阈值
    this.checkThresholds(metrics)

    // 发出指标事件
    this.emit('metrics', metrics)
  }

  /**
   * 检查内存阈值
   */
  private checkThresholds(metrics: MemoryMetrics) {
    const usedMB = metrics.heapUsed
    const now = Date.now()

    const level: 'normal' | 'gc' | 'warning' | 'critical' =
      usedMB > this.thresholds.critical ? 'critical' :
      usedMB > this.thresholds.warning ? 'warning' :
      usedMB > this.thresholds.gcTrigger ? 'gc' : 'normal'

    const levelChanged = level !== this.lastLevel
    if (levelChanged) {
      this.lastLevel = level
    }

    const allowLog = levelChanged || (this.debugMemory && now - this.lastLogAt > this.logCooldownMs)

    if (level === 'critical') {
      if (allowLog && this.debugMemory) {
        console.error(`🚨 内存使用严重超标: ${usedMB.toFixed(1)}MB > ${this.thresholds.critical}MB`)
      }
      if (allowLog) {
        this.lastLogAt = now
      }
      this.emit('critical-memory', metrics)
      if (levelChanged || now - this.lastEmergencyAt > this.emergencyCooldownMs) {
        this.lastEmergencyAt = now
        this.performEmergencyCleanup()
      }
    } else if (level === 'warning') {
      if (allowLog && this.debugMemory) {
        console.warn(`⚠️ 内存使用警告: ${usedMB.toFixed(1)}MB > ${this.thresholds.warning}MB`)
      }
      if (allowLog) {
        this.lastLogAt = now
      }
      this.emit('warning-memory', metrics)
      if (levelChanged || now - this.lastOptimizeAt > this.optimizeCooldownMs) {
        this.lastOptimizeAt = now
        this.performOptimization()
      }
    } else if (level === 'gc') {
      this.triggerGarbageCollection()
    }
  }

  /**
   * 执行常规优化
   */
  private performOptimization() {
    if (this.debugMemory) {
      console.log('🔧 执行内存优化...')
    }
    
    // 1. 触发垃圾回收
    this.triggerGarbageCollection()
    
    // 2. 清理旧的指标数据
    if (this.metrics.length > 50) {
      this.metrics.splice(0, this.metrics.length - 50)
    }
    
    // 3. 通知应用清理缓存
    this.emit('optimize-memory')
    
    if (this.debugMemory) {
      console.log('✅ 内存优化完成')
    }
  }

  /**
   * 紧急清理
   */
  private performEmergencyCleanup() {
    if (this.debugMemory) {
      console.log('🆘 执行紧急内存清理...')
    }
    
    // 1. 强制垃圾回收
    this.triggerGarbageCollection(true)
    
    // 2. 清理所有历史数据
    this.metrics.length = 0
    
    // 3. 通知应用清理所有缓存
    this.emit('emergency-cleanup')
    
    // 4. 等待一段时间后再次检查
    setTimeout(() => {
      const newMetrics = this.getCurrentMetrics()
      if (newMetrics.heapUsed > this.thresholds.critical) {
        if (this.debugMemory) {
          console.error('🚨 紧急清理后内存仍然过高，建议重启应用')
        }
        this.emit('restart-recommended')
      }
    }, 5000)
    
    if (this.debugMemory) {
      console.log('✅ 紧急清理完成')
    }
  }

  /**
   * 触发垃圾回收
   */
  private triggerGarbageCollection(force = false) {
    try {
      const now = Date.now()
      if (!force && now - this.lastGcAt < this.gcCooldownMs) {
        return
      }

      if (!global.gc) {
        if (this.debugMemory && process.env.NODE_ENV === 'development' && !this.gcWarned) {
          console.warn('⚠️ 垃圾回收不可用（需要--expose-gc标志）')
          this.gcWarned = true
        }
        return
      }

      this.lastGcAt = now
      if (this.debugMemory) {
        console.log('🗑️ 执行垃圾回收...')
      }
      global.gc()
      if (this.debugMemory) {
        console.log('✅ 垃圾回收完成')
      }
    } catch (error) {
      console.error('❌ 垃圾回收执行失败:', error)
    }
  }

  /**
   * 获取当前内存指标
   */
  getCurrentMetrics(): MemoryMetrics {
    const memoryUsage = process.memoryUsage()
    
    return {
      used: memoryUsage.heapUsed / 1024 / 1024,
      total: memoryUsage.heapTotal / 1024 / 1024,
      external: memoryUsage.external / 1024 / 1024,
      heapUsed: memoryUsage.heapUsed / 1024 / 1024,
      heapTotal: memoryUsage.heapTotal / 1024 / 1024,
      rss: memoryUsage.rss / 1024 / 1024,
      timestamp: Date.now()
    }
  }

  /**
   * 获取内存使用趋势
   */
  getMemoryTrend(minutes = 5): {
    trend: 'increasing' | 'decreasing' | 'stable'
    rate: number // MB/min
    confidence: number // 0-1
  } {
    const cutoffTime = Date.now() - minutes * 60 * 1000
    const recentMetrics = this.metrics.filter(m => m.timestamp > cutoffTime)
    
    if (recentMetrics.length < 2) {
      return { trend: 'stable', rate: 0, confidence: 0 }
    }
    
    // 线性回归计算趋势
    const n = recentMetrics.length
    const sumX = recentMetrics.reduce((sum, _, i) => sum + i, 0)
    const sumY = recentMetrics.reduce((sum, m) => sum + m.heapUsed, 0)
    const sumXY = recentMetrics.reduce((sum, m, i) => sum + i * m.heapUsed, 0)
    const sumX2 = recentMetrics.reduce((sum, _, i) => sum + i * i, 0)
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
    const timeSpanMinutes = (recentMetrics[n-1].timestamp - recentMetrics[0].timestamp) / 60000
    const ratePerMinute = slope * (n - 1) / timeSpanMinutes
    
    const trend = Math.abs(ratePerMinute) < 0.1 ? 'stable' :
                  ratePerMinute > 0 ? 'increasing' : 'decreasing'
    
    const confidence = Math.min(1, n / 10) // 样本数越多，置信度越高
    
    return { trend, rate: ratePerMinute, confidence }
  }

  /**
   * 生成内存报告
   */
  generateReport(): {
    current: MemoryMetrics
    trend: ReturnType<MemoryOptimizer['getMemoryTrend']>
    thresholds: MemoryThresholds
    recommendations: string[]
  } {
    const current = this.getCurrentMetrics()
    const trend = this.getMemoryTrend()
    const recommendations: string[] = []
    
    // 生成建议
    if (current.heapUsed > this.thresholds.warning) {
      recommendations.push('内存使用偏高，建议清理缓存')
    }
    
    if (trend.trend === 'increasing' && trend.rate > 1) {
      recommendations.push('内存使用呈上升趋势，建议检查内存泄漏')
    }
    
    if (current.external > 50) {
      recommendations.push('外部内存使用较高，检查大型资源文件')
    }
    
    if (recommendations.length === 0) {
      recommendations.push('内存使用正常')
    }
    
    return {
      current,
      trend,
      thresholds: this.thresholds,
      recommendations
    }
  }

  /**
   * 设置新的阈值
   */
  updateThresholds(newThresholds: Partial<MemoryThresholds>) {
    this.thresholds = { ...this.thresholds, ...newThresholds }
    if (this.debugMemory) {
      console.log('🔧 内存阈值已更新:', this.thresholds)
    }
  }
}
