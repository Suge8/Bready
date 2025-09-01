import React from 'react'
import { motion } from 'framer-motion'

export interface CardProps {
  children: React.ReactNode
  className?: string
  padding?: 'none' | 'sm' | 'md' | 'lg'
  shadow?: 'none' | 'sm' | 'md' | 'lg'
  border?: boolean
  hover?: boolean
  onClick?: () => void
}

/**
 * 卡片组件
 * 提供统一的卡片样式和交互效果
 */
export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  padding = 'md',
  shadow = 'sm',
  border = true,
  hover = false,
  onClick
}) => {
  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6'
  }

  const shadowClasses = {
    none: '',
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg'
  }

  const baseClasses = `
    bg-white dark:bg-gray-800 rounded-lg
    ${border ? 'border border-gray-200 dark:border-gray-700' : ''}
    ${shadowClasses[shadow]}
    ${paddingClasses[padding]}
    ${onClick ? 'cursor-pointer' : ''}
    ${className}
  `.trim()

  const hoverProps = hover ? {
    whileHover: {
      scale: 1.02,
      y: -2,
      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)'
    },
    transition: { duration: 0.2 }
  } : {}

  if (onClick) {
    return (
      <motion.div
        className={baseClasses}
        onClick={onClick}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        transition={{ duration: 0.1 }}
        {...hoverProps}
      >
        {children}
      </motion.div>
    )
  }

  return (
    <motion.div
      className={baseClasses}
      {...hoverProps}
    >
      {children}
    </motion.div>
  )
}

// 卡片头部组件
export const CardHeader: React.FC<{
  title?: string
  subtitle?: string
  action?: React.ReactNode
  className?: string
  children?: React.ReactNode
}> = ({ title, subtitle, action, className = '', children }) => {
  if (children) {
    return (
      <div className={`mb-4 ${className}`}>
        {children}
      </div>
    )
  }

  return (
    <div className={`flex items-center justify-between mb-4 ${className}`}>
      <div>
        {title && (
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {title}
          </h3>
        )}
        {subtitle && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {subtitle}
          </p>
        )}
      </div>
      {action && (
        <div className="flex-shrink-0">
          {action}
        </div>
      )}
    </div>
  )
}

// 卡片标题组件
export const CardTitle: React.FC<{
  children: React.ReactNode
  className?: string
}> = ({ children, className = '' }) => {
  return (
    <h3 className={`text-lg font-semibold text-gray-900 dark:text-white ${className}`}>
      {children}
    </h3>
  )
}

// 卡片描述组件
export const CardDescription: React.FC<{
  children: React.ReactNode
  className?: string
}> = ({ children, className = '' }) => {
  return (
    <p className={`text-sm text-gray-500 dark:text-gray-400 ${className}`}>
      {children}
    </p>
  )
}

// 卡片内容组件
export const CardContent: React.FC<{
  children: React.ReactNode
  className?: string
}> = ({ children, className = '' }) => {
  return (
    <div className={`text-gray-700 dark:text-gray-300 ${className}`}>
      {children}
    </div>
  )
}

// 卡片底部组件
export const CardFooter: React.FC<{
  children: React.ReactNode
  className?: string
  justify?: 'start' | 'center' | 'end' | 'between'
}> = ({ children, className = '', justify = 'end' }) => {
  const justifyClasses = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between'
  }

  return (
    <div className={`flex items-center mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 ${justifyClasses[justify]} ${className}`}>
      {children}
    </div>
  )
}

// 统计卡片组件
export const StatCard: React.FC<{
  title: string
  value: string | number
  change?: {
    value: number
    type: 'increase' | 'decrease'
  }
  icon?: React.ReactNode
  className?: string
}> = ({ title, value, change, icon, className = '' }) => {
  return (
    <Card className={`${className}`} hover>
      <div className="flex items-center">
        {icon && (
          <div className="flex-shrink-0 p-3 bg-blue-100 dark:bg-blue-900 rounded-lg mr-4">
            <div className="text-blue-600 dark:text-blue-400">
              {icon}
            </div>
          </div>
        )}
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {title}
          </p>
          <div className="flex items-baseline">
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">
              {value}
            </p>
            {change && (
              <span className={`
                ml-2 text-sm font-medium
                ${change.type === 'increase' 
                  ? 'text-green-600 dark:text-green-400' 
                  : 'text-red-600 dark:text-red-400'
                }
              `}>
                {change.type === 'increase' ? '+' : '-'}{Math.abs(change.value)}%
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}