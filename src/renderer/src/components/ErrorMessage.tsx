import React from 'react'
import { AlertTriangle, Wifi, Key, Volume2, Settings } from 'lucide-react'

export type ErrorType = 
  | 'permissions-not-set'
  | 'api-connection-failed'
  | 'audio-device-error'
  | 'network-error'
  | 'unknown-error'

interface ErrorMessageProps {
  type: ErrorType
  message: string
  onFix?: () => void
  onDismiss?: () => void
}

type ErrorColor = 'yellow' | 'red'

interface ErrorConfig {
  icon: React.ReactNode
  title: string
  color: ErrorColor
  fixText: string
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ type, message, onFix, onDismiss }) => {
  const getErrorConfig = (errorType: ErrorType): ErrorConfig => {
    switch (errorType) {
      case 'permissions-not-set':
        return {
          icon: <Settings className="w-6 h-6" />,
          title: '权限未设置',
          color: 'yellow',
          fixText: '设置权限'
        }
      case 'api-connection-failed':
        return {
          icon: <Key className="w-6 h-6" />,
          title: 'API 连接失败',
          color: 'red',
          fixText: '检查 API 密钥'
        }
      case 'audio-device-error':
        return {
          icon: <Volume2 className="w-6 h-6" />,
          title: '音频设备错误',
          color: 'red',
          fixText: '测试音频设备'
        }
      case 'network-error':
        return {
          icon: <Wifi className="w-6 h-6" />,
          title: '网络连接错误',
          color: 'red',
          fixText: '检查网络'
        }
      default:
        return {
          icon: <AlertTriangle className="w-6 h-6" />,
          title: '未知错误',
          color: 'red',
          fixText: '重试'
        }
    }
  }

  const config = getErrorConfig(type)
  
  const colorClasses = {
    yellow: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      icon: 'text-yellow-600',
      title: 'text-yellow-800',
      message: 'text-yellow-700',
      button: 'bg-yellow-600 hover:bg-yellow-700 text-white'
    },
    red: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: 'text-red-600',
      title: 'text-red-800',
      message: 'text-red-700',
      button: 'bg-red-600 hover:bg-red-700 text-white'
    }
  }

  const colors = colorClasses[config.color]

  return (
    <div className={`${colors.bg} ${colors.border} border rounded-lg p-4 mb-4`}>
      <div className="flex items-start space-x-3">
        <div className={`${colors.icon} flex-shrink-0 mt-0.5`}>
          {config.icon}
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className={`${colors.title} font-medium text-sm`}>
            {config.title}
          </h3>
          <p className={`${colors.message} text-sm mt-1`}>
            {message}
          </p>
        </div>
        
        <div className="flex-shrink-0 flex space-x-2">
          {onFix && (
            <button
              onClick={onFix}
              className={`${colors.button} px-3 py-1 rounded text-sm font-medium transition-colors`}
            >
              {config.fixText}
            </button>
          )}
          
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default ErrorMessage
