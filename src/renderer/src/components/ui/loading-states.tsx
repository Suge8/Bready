import React from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, FolderOpen } from 'lucide-react'

interface SkeletonLoaderProps {
  type: 'card' | 'list' | 'detail'
  className?: string
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ type, className = '' }) => {
  return (
    <div className={`animate-pulse ${className}`}>
      {type === 'card' && (
        <div className="bg-gray-200 dark:bg-gray-700 rounded-lg p-4 space-y-3">
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
          <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded"></div>
          <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-5/6"></div>
        </div>
      )}

      {type === 'list' && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-200 dark:bg-gray-700 rounded-lg p-3 space-y-2">
              <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
              <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      )}

      {type === 'detail' && (
        <div className="bg-gray-200 dark:bg-gray-700 rounded-lg p-6 space-y-4">
          <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-2/3"></div>
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-5/6"></div>
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-4/6"></div>
        </div>
      )}
    </div>
  )
}

interface ProgressBarProps {
  progress: number
  className?: string
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ progress, className = '' }) => {
  return (
    <div className={`w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 ${className}`}>
      <motion.div
        className="bg-blue-500 h-2 rounded-full"
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.3 }}
      />
    </div>
  )
}

interface FriendlyErrorPageProps {
  error: Error
  onRetry?: () => void
  onGoBack?: () => void
}

export const FriendlyErrorPage: React.FC<FriendlyErrorPageProps> = ({
  error,
  onRetry,
  onGoBack,
}) => {
  return (
    <div className="h-screen w-screen overflow-hidden bg-[var(--bready-bg)] flex flex-col">
      <div className="flex-1 overflow-y-auto w-full p-4">
        <div className="min-h-full flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="w-24 h-24 mx-auto mb-6 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-12 h-12 text-red-500 dark:text-red-400" />
            </div>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              出现了一些问题
            </h2>

            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {error.message || '应用遇到了意外错误，请稍后重试'}
            </p>

            <div className="space-y-3">
              <button
                onClick={onRetry || (() => window.location.reload())}
                className="w-full px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors dark:bg-white dark:text-black dark:hover:bg-gray-200"
              >
                重新加载页面
              </button>

              {onGoBack && (
                <button
                  onClick={onGoBack}
                  className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  返回上一页
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface EmptyStateProps {
  title: string
  description: string
  action?: {
    text: string
    onClick: () => void
  }
  icon?: React.ReactNode
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  action,
  icon = <FolderOpen className="w-8 h-8 text-gray-400" />,
}) => {
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
        {icon}
      </div>

      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">{title}</h3>

      <p className="text-gray-500 dark:text-gray-400 mb-6">{description}</p>

      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors dark:bg-white dark:text-black dark:hover:bg-gray-200"
        >
          {action.text}
        </button>
      )}
    </div>
  )
}
