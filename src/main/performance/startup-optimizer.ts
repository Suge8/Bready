/**
 * 启动性能优化器
 * 实现应用启动的异步加载和性能监控
 */

import { BrowserWindow } from 'electron'

const debugStartup = process.env.DEBUG_STARTUP === '1'

interface StartupMetrics {
  appReadyTime: number
  windowCreateTime: number
  databaseInitTime: number
  ipcSetupTime: number
  totalStartupTime: number
}

export class StartupOptimizer {
  private startTime = Date.now()
  private metrics: Partial<StartupMetrics> = {}

  /**
   * 记录启动指标
   */
  recordMetric(key: keyof StartupMetrics, value?: number) {
    this.metrics[key] = value || Date.now() - this.startTime
    if (debugStartup) {
      console.log(`🚀 启动指标: ${key} = ${this.metrics[key]}ms`)
    }
  }

  /**
   * 异步初始化数据库
   * 不阻塞窗口创建
   */
  async initializeDatabaseAsync() {
    const startTime = Date.now()
    try {
      // 动态导入数据库模块，减少初始加载时间
      const { initializeDatabase, testConnection } = await import('../database')
      
      // 先测试连接，如果失败则跳过初始化
      const isConnected = await testConnection()
      if (isConnected) {
        await initializeDatabase()
        if (debugStartup) {
          console.log('✅ 数据库异步初始化成功')
        }
      } else {
        if (debugStartup) {
          console.warn('⚠️ 数据库连接失败，跳过初始化')
        }
      }
    } catch (error) {
      console.error('❌ 数据库异步初始化失败:', error)
      // 不阻塞应用启动
    } finally {
      this.recordMetric('databaseInitTime', Date.now() - startTime)
    }
  }

  /**
   * 延迟加载非关键模块
   */
  async lazyLoadNonCriticalModules() {
    // 延迟 1 秒后加载，不阻塞启动
    setTimeout(async () => {
      const modules = [
        () => import('../audioUtils'),
        () => import('../prompts'),
        () => import('./PerformanceMonitor'),
        () => import('../utils/metrics'),
        () => import('../utils/cleanup')
      ]

      await Promise.allSettled(modules.map(loader => loader()))
      if (debugStartup) {
        console.log('✅ 非关键模块延迟加载完成')
      }
    }, 1000)
  }

  /**
   * 预连接外部服务
   */
  async warmupConnections() {
    // 异步预热，不阻塞启动
    setTimeout(async () => {
      try {
        // DNS 预解析
        const domains = [
          'generativelanguage.googleapis.com',
          // 其他可能用到的域名
        ]

        await Promise.allSettled(
          domains.map(domain =>
            fetch(`https://${domain}`, { method: 'HEAD' }).catch(() => {})
          )
        )

        if (debugStartup) {
          console.log('✅ 外部服务预热完成')
        }
      } catch (error) {
        // 预热失败不影响应用
      }
    }, 2000)
  }

  /**
   * 获取启动性能报告
   */
  getPerformanceReport(): StartupMetrics {
    this.recordMetric('totalStartupTime')
    return this.metrics as StartupMetrics
  }

  /**
   * 检查是否满足性能目标
   */
  validatePerformanceTargets(): boolean {
    const { totalStartupTime } = this.metrics
    const TARGET_STARTUP_TIME = 3000 // 3秒目标

    if (totalStartupTime && totalStartupTime > TARGET_STARTUP_TIME) {
      if (debugStartup) {
        console.warn(`⚠️ 启动时间超过目标: ${totalStartupTime}ms > ${TARGET_STARTUP_TIME}ms`)
      }
      return false
    }

    if (debugStartup) {
      console.log(`✅ 启动时间符合目标: ${totalStartupTime}ms`)
    }
    return true
  }
}

/**
 * 优化的应用启动流程
 */
export async function optimizedStartup(createWindow: () => BrowserWindow) {
  const optimizer = new StartupOptimizer()

  // 1. 立即创建窗口（不等待其他初始化）
  optimizer.recordMetric('appReadyTime')
  const window = createWindow()
  optimizer.recordMetric('windowCreateTime')

  // 2. 异步初始化数据库
  await optimizer.initializeDatabaseAsync()

  // 3. 启动后台优化任务（不阻塞）
  optimizer.lazyLoadNonCriticalModules()
  optimizer.warmupConnections()

  // 4. 报告性能指标
  const report = optimizer.getPerformanceReport()
  optimizer.validatePerformanceTargets()

  return { window, metrics: report }
}
