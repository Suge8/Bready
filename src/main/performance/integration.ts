// 性能监控集成文件
// 用于在主进程中集成性能监控功能

import { ipcMain } from 'electron'
import { 
  performanceMonitor, 
  audioPerformanceMonitor, 
  logger, 
  CrashReporter 
} from './PerformanceMonitor'

// 初始化性能监控系统
export function initializePerformanceMonitoring() {
  logger.info('Initializing performance monitoring system')

  // 初始化崩溃报告器
  CrashReporter.init()

  // 启动系统性能监控
  performanceMonitor.startSystemMonitoring(5000) // 每5秒收集一次

  // 定期清理旧的性能数据
  setInterval(() => {
    performanceMonitor.cleanupOldMetrics(1000)
  }, 60000) // 每分钟清理一次

  // 设置IPC处理器
  setupPerformanceIPC()

  logger.info('Performance monitoring system initialized successfully')
}

// 设置性能监控相关的IPC处理器
function setupPerformanceIPC() {
  // 获取性能报告
  ipcMain.handle('performance:get-report', () => {
    return performanceMonitor.getPerformanceReport()
  })

  // 获取音频性能指标
  ipcMain.handle('performance:get-audio-metrics', () => {
    return audioPerformanceMonitor.getAudioMetrics()
  })

  // 重置音频性能指标
  ipcMain.handle('performance:reset-audio-metrics', () => {
    audioPerformanceMonitor.resetMetrics()
    return true
  })

  // 获取性能指标
  ipcMain.handle('performance:get-metrics', () => {
    return performanceMonitor.getMetrics()
  })

  // 手动触发垃圾回收（如果可用）
  ipcMain.handle('performance:trigger-gc', () => {
    if (global.gc) {
      global.gc()
      logger.info('Manual garbage collection triggered')
      return true
    } else {
      logger.warn('Garbage collection not available')
      return false
    }
  })
}

// 停止性能监控
export function stopPerformanceMonitoring() {
  logger.info('Stopping performance monitoring system')
  performanceMonitor.stopSystemMonitoring()
  logger.info('Performance monitoring system stopped')
}

// 记录音频处理性能
export function recordAudioProcessing(processingTime: number, bufferSize: number) {
  audioPerformanceMonitor.recordAudioProcessing(processingTime, bufferSize)
}

// 记录性能计时
export function startPerformanceTimer(label: string) {
  performanceMonitor.startTimer(label)
}

export function endPerformanceTimer(label: string): number {
  return performanceMonitor.endTimer(label)
}

// 导出日志记录器供其他模块使用
export { logger }