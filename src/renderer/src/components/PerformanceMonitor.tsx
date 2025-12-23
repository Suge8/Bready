import React, { useState, useEffect } from 'react'
import { X, Activity, Cpu, HardDrive, Wifi } from 'lucide-react'

interface PerformanceMetrics {
  timestamp: number
  memory: {
    system: {
      total: number
      free: number
      used: number
    }
    process: NodeJS.MemoryUsage
  }
  cpu: {
    usage: NodeJS.CpuUsage
    loadAverage: number[]
  }
  app: {
    version: string
    uptime: number
  }
  audio?: {
    chunksProcessed: number
    totalProcessingTime: number
    bufferOverflows: number
    averageProcessingTime: number
  }
}

interface CrashReport {
  timestamp: number
  type: string
  error: {
    message: string
    stack: string
    name: string
  }
  system: any
  app: any
}

export const PerformanceMonitor: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false)
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null)
  const [crashReports, setCrashReports] = useState<CrashReport[]>([])
  const [activeTab, setActiveTab] = useState<'metrics' | 'crashes'>('metrics')

  useEffect(() => {
    // 检查是否在 Electron 环境中
    if (!window.bready) {
      console.log('Performance monitor not available in browser mode')
      return
    }

    // 监听性能指标
    const handlePerformanceMetrics = (data: PerformanceMetrics) => {
      setMetrics(data)
    }

    // 监听崩溃报告
    const handleCrashReport = (report: CrashReport) => {
      setCrashReports(prev => [...prev, report].slice(-10)) // 只保留最近10个报告
    }

    // 设置事件监听器
    const removeMetricsListener = window.bready.onPerformanceMetrics?.(handlePerformanceMetrics) || (() => {})
    const removeCrashListener = window.bready.onCrashReport?.(handleCrashReport) || (() => {})

    // 键盘快捷键：Ctrl+Shift+P 打开性能监控
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        e.preventDefault()
        setIsVisible(prev => !prev)
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      removeMetricsListener()
      removeCrashListener()
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatUptime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    return `${hours}h ${minutes}m ${secs}s`
  }

  const getPerformanceStatus = (metrics: PerformanceMetrics): 'good' | 'warning' | 'critical' => {
    const memoryUsagePercent = (metrics.memory.process.heapUsed / metrics.memory.system.total) * 100
    const cpuLoad = metrics.cpu.loadAverage[0]

    if (memoryUsagePercent > 80 || cpuLoad > 2.0) {
      return 'critical'
    } else if (memoryUsagePercent > 60 || cpuLoad > 1.0) {
      return 'warning'
    } else {
      return 'good'
    }
  }

  const getStatusColor = (status: 'good' | 'warning' | 'critical'): string => {
    switch (status) {
      case 'good': return 'text-green-600 bg-green-50 border-green-200'
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'critical': return 'text-red-600 bg-red-50 border-red-200'
    }
  }

  if (!isVisible || !metrics) return null

  const status = getPerformanceStatus(metrics)
  const statusColor = getStatusColor(status)

  return (
    <div className="fixed top-4 right-4 w-96 bg-white rounded-lg shadow-2xl border border-gray-200 z-50 font-mono text-xs">
      {/* 标题栏 */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <div className="flex items-center space-x-2">
          <Activity className="w-4 h-4 text-gray-600" />
          <h3 className="font-bold text-gray-800">性能监控</h3>
          <div className={`px-2 py-1 rounded-full text-xs font-medium border ${statusColor}`}>
            {status === 'good' ? '正常' : status === 'warning' ? '警告' : '严重'}
          </div>
        </div>
        <button 
          onClick={() => setIsVisible(false)}
          className="text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded p-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 标签页 */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('metrics')}
          className={`flex-1 px-3 py-2 text-xs font-medium ${
            activeTab === 'metrics' 
              ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' 
              : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
          }`}
        >
          性能指标
        </button>
        <button
          onClick={() => setActiveTab('crashes')}
          className={`flex-1 px-3 py-2 text-xs font-medium ${
            activeTab === 'crashes' 
              ? 'bg-red-50 text-red-600 border-b-2 border-red-600' 
              : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
          }`}
        >
          错误报告 {crashReports.length > 0 && `(${crashReports.length})`}
        </button>
      </div>

      {/* 内容区域 */}
      <div className="p-3 max-h-96 overflow-y-auto">
        {activeTab === 'metrics' ? (
          <div className="space-y-4">
            {/* 内存使用情况 */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <HardDrive className="w-3 h-3 text-gray-500" />
                <span className="font-semibold text-gray-700">内存使用</span>
              </div>
              <div className="space-y-1 pl-5">
                <div className="flex justify-between">
                  <span className="text-gray-600">进程堆内存:</span>
                  <span className="font-medium">{formatBytes(metrics.memory.process.heapUsed)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">总堆内存:</span>
                  <span className="font-medium">{formatBytes(metrics.memory.process.heapTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">RSS:</span>
                  <span className="font-medium">{formatBytes(metrics.memory.process.rss)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">系统可用:</span>
                  <span className="font-medium">{formatBytes(metrics.memory.system.free)}</span>
                </div>
                
                {/* 内存使用率进度条 */}
                <div className="mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        (metrics.memory.process.heapUsed / metrics.memory.system.total) * 100 > 80 
                          ? 'bg-red-500' 
                          : (metrics.memory.process.heapUsed / metrics.memory.system.total) * 100 > 60 
                            ? 'bg-yellow-500' 
                            : 'bg-green-500'
                      }`}
                      style={{ 
                        width: `${Math.min((metrics.memory.process.heapUsed / metrics.memory.system.total) * 100, 100)}%` 
                      }}
                    />
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {((metrics.memory.process.heapUsed / metrics.memory.system.total) * 100).toFixed(1)}% 系统内存使用率
                  </div>
                </div>
              </div>
            </div>

            {/* CPU 使用情况 */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Cpu className="w-3 h-3 text-gray-500" />
                <span className="font-semibold text-gray-700">CPU 负载</span>
              </div>
              <div className="space-y-1 pl-5">
                <div className="flex justify-between">
                  <span className="text-gray-600">1分钟平均:</span>
                  <span className="font-medium">{metrics.cpu.loadAverage[0].toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">5分钟平均:</span>
                  <span className="font-medium">{metrics.cpu.loadAverage[1].toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">15分钟平均:</span>
                  <span className="font-medium">{metrics.cpu.loadAverage[2].toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* 音频性能 */}
            {metrics.audio && (
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Wifi className="w-3 h-3 text-gray-500" />
                  <span className="font-semibold text-gray-700">音频处理</span>
                </div>
                <div className="space-y-1 pl-5">
                  <div className="flex justify-between">
                    <span className="text-gray-600">处理块数:</span>
                    <span className="font-medium">{metrics.audio.chunksProcessed}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">平均处理时间:</span>
                    <span className="font-medium">{metrics.audio.averageProcessingTime.toFixed(2)}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">缓冲溢出:</span>
                    <span className={`font-medium ${metrics.audio.bufferOverflows > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {metrics.audio.bufferOverflows}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 应用信息 */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Activity className="w-3 h-3 text-gray-500" />
                <span className="font-semibold text-gray-700">应用信息</span>
              </div>
              <div className="space-y-1 pl-5">
                <div className="flex justify-between">
                  <span className="text-gray-600">版本:</span>
                  <span className="font-medium">{metrics.app.version}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">运行时间:</span>
                  <span className="font-medium">{formatUptime(metrics.app.uptime)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">更新时间:</span>
                  <span className="font-medium">{new Date(metrics.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {crashReports.length === 0 ? (
              <div className="text-center text-gray-500 py-4">
                <p>暂无错误报告</p>
              </div>
            ) : (
              crashReports.slice().reverse().map((report, index) => (
                <div key={index} className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-red-700">{report.type}</span>
                    <span className="text-xs text-red-600">
                      {new Date(report.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-xs text-red-800 mb-2">
                    <strong>{report.error.name}:</strong> {report.error.message}
                  </div>
                  {report.error.stack && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-red-600 hover:text-red-800">
                        查看堆栈跟踪
                      </summary>
                      <pre className="mt-2 p-2 bg-red-100 rounded text-xs overflow-x-auto whitespace-pre-wrap">
                        {report.error.stack}
                      </pre>
                    </details>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* 底部提示 */}
      <div className="px-3 py-2 bg-gray-50 rounded-b-lg border-t border-gray-200">
        <p className="text-xs text-gray-500">
          快捷键: Ctrl+Shift+P 切换显示
        </p>
      </div>
    </div>
  )
}

export default PerformanceMonitor