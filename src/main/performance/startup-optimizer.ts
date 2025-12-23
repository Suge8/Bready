/**
 * 启动性能优化器
 * 实现应用启动的异步加载和性能监控
 */

import { app, BrowserWindow } from 'electron'

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
   * 异步设置IPC处理器
   */
  async setupIPCAsync() {
    const startTime = Date.now()
    try {
      const { setupAllHandlers } = await import('../ipc-handlers')
      setupAllHandlers()
      if (debugStartup) {
        console.log('✅ IPC处理器异步设置完成')
      }
    } catch (error) {
      console.error('❌ IPC处理器设置失败:', error)
    } finally {
      this.recordMetric('ipcSetupTime', Date.now() - startTime)
    }
  }

  /**
   * 预加载关键模块
   */
  async preloadCriticalModules() {
    const modules = [
      () => import('../audioUtils'),
      () => import('../prompts'),
      () => import('./PerformanceMonitor')
    ]

    // 并行预加载
    await Promise.allSettled(modules.map(loader => loader()))
    if (debugStartup) {
      console.log('✅ 关键模块预加载完成')
    }
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

  // 2. 异步初始化其他组件
  const initTasks = [
    optimizer.initializeDatabaseAsync(),
    optimizer.setupIPCAsync(),
    optimizer.preloadCriticalModules()
  ]

  // 3. 等待所有初始化完成
  await Promise.allSettled(initTasks)

  // 4. 报告性能指标
  const report = optimizer.getPerformanceReport()
  optimizer.validatePerformanceTargets()

  return { window, metrics: report }
}
