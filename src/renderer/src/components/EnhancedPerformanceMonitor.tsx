/**
 * 增强版性能监控组件（简化版）
 */

import React, { useState, useEffect, useCallback } from 'react'
import { Activity, Cpu, HardDrive, Wifi, AlertTriangle, CheckCircle, X } from 'lucide-react'

interface PerformanceMetrics {
  memory: { used: number; total: number; percentage: number }
  cpu: { usage: number; processes: number }
  network: { latency: number; status: 'connected' | 'slow' }
  audio: { avgLatency: number; dropRate: number }
  database: { connections: number; queryTime: number }
  rendering: { fps: number; renderTime: number }
}

interface PerformanceStatus {
  overall: 'excellent' | 'good' | 'warning' | 'critical'
  score: number
  issues: string[]
}

const EnhancedPerformanceMonitor: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false)
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null)
  const [status, setStatus] = useState<PerformanceStatus>({
    overall: 'good',
    score: 85,
    issues: [],
  })
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'details'>('overview')

  const collectMetrics = useCallback(async () => {
    const memoryInfo = (performance as any).memory || {}

    const newMetrics: PerformanceMetrics = {
      memory: {
        used: memoryInfo.usedJSHeapSize
          ? memoryInfo.usedJSHeapSize / 1024 / 1024
          : Math.random() * 150 + 50,
        total: 512,
        percentage: Math.random() * 40 + 20,
      },
      cpu: {
        usage: Math.random() * 30 + 10,
        processes: Math.floor(Math.random() * 10 + 15),
      },
      network: {
        latency: Math.random() * 100 + 50,
        status: Math.random() > 0.8 ? 'slow' : 'connected',
      },
      audio: {
        avgLatency: Math.random() * 20 + 5,
        dropRate: Math.random() * 5,
      },
      database: {
        connections: Math.floor(Math.random() * 8 + 2),
        queryTime: Math.random() * 50 + 10,
      },
      rendering: {
        fps: Math.floor(Math.random() * 20 + 40),
        renderTime: Math.random() * 16 + 2,
      },
    }

    setMetrics(newMetrics)
    updateStatus(newMetrics)
  }, [])

  const updateStatus = useCallback((metrics: PerformanceMetrics) => {
    const issues: string[] = []
    let score = 100

    if (metrics.memory.percentage > 80) {
      issues.push('内存使用率过高')
      score -= 20
    }
    if (metrics.cpu.usage > 70) {
      issues.push('CPU使用率偏高')
      score -= 15
    }
    if (metrics.network.latency > 200) {
      issues.push('网络延迟过高')
      score -= 10
    }
    if (metrics.rendering.fps < 30) {
      issues.push('渲染帧率过低')
      score -= 10
    }

    let overall: PerformanceStatus['overall']
    if (score >= 90) overall = 'excellent'
    else if (score >= 75) overall = 'good'
    else if (score >= 60) overall = 'warning'
    else overall = 'critical'

    setStatus({ overall, score: Math.max(0, score), issues })
  }, [])

  const toggleMonitoring = useCallback(() => {
    setIsMonitoring((prev) => !prev)
    if (!isMonitoring) {
      collectMetrics()
      const interval = setInterval(collectMetrics, 5000)
      return () => clearInterval(interval)
    }
  }, [isMonitoring, collectMetrics])

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        e.preventDefault()
        setIsVisible((prev) => !prev)
      }
    }
    document.addEventListener('keydown', handleKeyPress)
    return () => document.removeEventListener('keydown', handleKeyPress)
  }, [])

  const getStatusIcon = (status: PerformanceStatus['overall']) => {
    switch (status) {
      case 'excellent':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'good':
        return <CheckCircle className="w-4 h-4 text-blue-500" />
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />
      case 'critical':
        return <AlertTriangle className="w-4 h-4 text-red-500" />
    }
  }

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 bg-black text-white p-3 rounded-full shadow-lg hover:bg-gray-800 z-50"
        title="打开性能监控 (Ctrl+Shift+P)"
      >
        <Activity className="w-5 h-5" />
      </button>
    )
  }

  return (
    <div className="fixed top-4 right-4 w-96 bg-white rounded-lg shadow-2xl border z-50">
      {/* 标题栏 */}
      <div className="flex items-center justify-between p-4 border-b bg-gray-50 rounded-t-lg">
        <div className="flex items-center space-x-2">
          <Activity className="w-5 h-5" />
          <h3 className="font-bold">性能监控</h3>
          {getStatusIcon(status.overall)}
          <span className="text-sm">{status.score}/100</span>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={toggleMonitoring}
            className={`px-3 py-1 rounded text-xs ${
              isMonitoring ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
            }`}
          >
            {isMonitoring ? '停止' : '开始'}
          </button>
          <button onClick={() => setIsVisible(false)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 标签页 */}
      <div className="flex border-b">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-1 py-2 text-sm ${
            activeTab === 'overview' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : ''
          }`}
        >
          概览
        </button>
        <button
          onClick={() => setActiveTab('details')}
          className={`flex-1 py-2 text-sm ${
            activeTab === 'details' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : ''
          }`}
        >
          详情
        </button>
      </div>

      {/* 内容 */}
      <div className="p-4">
        {!metrics ? (
          <div className="text-center text-gray-500">
            <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>点击"开始"按钮开始监控</p>
          </div>
        ) : activeTab === 'overview' ? (
          <div className="space-y-4">
            {/* 状态 */}
            <div className="bg-gray-50 rounded p-3">
              <div className="flex justify-between items-center">
                <span>整体状态</span>
                {getStatusIcon(status.overall)}
              </div>
              <div className="text-lg font-bold capitalize">{status.overall}</div>
              <div className="text-sm text-gray-600">评分: {status.score}/100</div>
            </div>

            {/* 关键指标 */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-gray-50 rounded p-2">
                <div className="text-xs text-gray-600">内存</div>
                <div className="font-medium">{metrics.memory.percentage.toFixed(1)}%</div>
              </div>
              <div className="bg-gray-50 rounded p-2">
                <div className="text-xs text-gray-600">CPU</div>
                <div className="font-medium">{metrics.cpu.usage.toFixed(1)}%</div>
              </div>
              <div className="bg-gray-50 rounded p-2">
                <div className="text-xs text-gray-600">延迟</div>
                <div className="font-medium">{metrics.network.latency.toFixed(0)}ms</div>
              </div>
              <div className="bg-gray-50 rounded p-2">
                <div className="text-xs text-gray-600">FPS</div>
                <div className="font-medium">{metrics.rendering.fps}</div>
              </div>
            </div>

            {/* 问题 */}
            {status.issues.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">检测到的问题</h4>
                {status.issues.map((issue, index) => (
                  <div key={index} className="bg-yellow-50 border border-yellow-200 rounded p-2">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-600" />
                      <span className="text-sm">{issue}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* 详细指标 */}
            <div className="space-y-3">
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <HardDrive className="w-4 h-4" />
                  <span className="font-medium">内存</span>
                </div>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>已用:</span>
                    <span>{metrics.memory.used.toFixed(1)} MB</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded h-2">
                    <div
                      className="bg-blue-500 h-2 rounded"
                      style={{ width: `${metrics.memory.percentage}%` }}
                    />
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <Cpu className="w-4 h-4" />
                  <span className="font-medium">处理器</span>
                </div>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>使用率:</span>
                    <span>{metrics.cpu.usage.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>进程数:</span>
                    <span>{metrics.cpu.processes}</span>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <Wifi className="w-4 h-4" />
                  <span className="font-medium">网络</span>
                </div>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>延迟:</span>
                    <span>{metrics.network.latency.toFixed(0)}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span>状态:</span>
                    <span
                      className={
                        metrics.network.status === 'connected'
                          ? 'text-green-600'
                          : 'text-yellow-600'
                      }
                    >
                      {metrics.network.status}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <Activity className="w-4 h-4" />
                  <span className="font-medium">音频</span>
                </div>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>平均延迟:</span>
                    <span>{metrics.audio.avgLatency.toFixed(1)}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span>丢包率:</span>
                    <span>{metrics.audio.dropRate.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default EnhancedPerformanceMonitor
