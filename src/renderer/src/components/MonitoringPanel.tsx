import React, { useState, useEffect } from 'react'
import { Card } from './ui/Card'
import { Button } from './ui/Button'

interface MonitoringData {
  isRunning: boolean
  metrics: {
    total: number
    latest: Array<{
      name: string
      value: number
      unit: string
      timestamp: number
    }>
  }
  errors: {
    total: number
    recent: Array<{
      id: string
      message: string
      timestamp: number
    }>
  }
  userActions: {
    total: number
    recent: Array<{
      action: string
      timestamp: number
    }>
  }
}

/**
 * 监控面板组件
 * 显示应用性能和错误统计信息
 */
export const MonitoringPanel: React.FC = () => {
  const [data, setData] = useState<MonitoringData | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // 监听快捷键 Ctrl+Shift+M 打开监控面板
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'M') {
        setIsVisible(!isVisible)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isVisible])

  useEffect(() => {
    if (!isVisible) return

    const loadData = async () => {
      try {
        const monitoringData = await window.electronAPI?.getMonitoringData()
        setData(monitoringData)
      } catch (error) {
        console.error('加载监控数据失败:', error)
      }
    }

    loadData()
    const interval = setInterval(loadData, 2000)
    return () => clearInterval(interval)
  }, [isVisible])

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">系统监控面板</h2>
          <Button
            variant="outline"
            onClick={() => setIsVisible(false)}
          >
            关闭
          </Button>
        </div>

        {!data ? (
          <div className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p>加载监控数据中...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 系统状态 */}
            <Card className="p-4">
              <h3 className="text-lg font-semibold mb-4">系统状态</h3>
              <div className="flex items-center space-x-4">
                <div className={`w-3 h-3 rounded-full ${data.isRunning ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm">
                  监控系统: {data.isRunning ? '运行中' : '已停止'}
                </span>
              </div>
            </Card>

            {/* 性能指标 */}
            <Card className="p-4">
              <h3 className="text-lg font-semibold mb-4">性能指标 (总计: {data.metrics.total})</h3>
              <div className="space-y-2">
                {data.metrics.latest.map((metric, index) => (
                  <div key={index} className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                    <span className="text-sm font-medium">{metric.name}</span>
                    <span className="text-sm">
                      {typeof metric.value === 'number' ? metric.value.toFixed(2) : metric.value}
                      {metric.unit && ` ${metric.unit}`}
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            {/* 错误统计 */}
            <Card className="p-4">
              <h3 className="text-lg font-semibold mb-4">错误统计 (总计: {data.errors.total})</h3>
              {data.errors.recent.length === 0 ? (
                <p className="text-sm text-gray-500">暂无错误记录</p>
              ) : (
                <div className="space-y-2">
                  {data.errors.recent.map((error, index) => (
                    <div key={index} className="p-3 bg-red-50 dark:bg-red-900/20 rounded border-l-4 border-red-500">
                      <div className="text-sm font-medium text-red-800 dark:text-red-200">
                        {error.message}
                      </div>
                      <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                        {new Date(error.timestamp).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* 用户行为 */}
            <Card className="p-4">
              <h3 className="text-lg font-semibold mb-4">用户行为 (总计: {data.userActions.total})</h3>
              {data.userActions.recent.length === 0 ? (
                <p className="text-sm text-gray-500">暂无行为记录</p>
              ) : (
                <div className="space-y-2">
                  {data.userActions.recent.map((action, index) => (
                    <div key={index} className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                      <span className="text-sm">{action.action}</span>
                      <span className="text-xs text-gray-500">
                        {new Date(action.timestamp).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            按 Ctrl+Shift+M 可随时打开/关闭监控面板
          </p>
        </div>
      </div>
    </div>
  )
}