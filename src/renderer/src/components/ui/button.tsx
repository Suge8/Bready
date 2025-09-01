import React from 'react'
import { motion } from 'framer-motion'
import { SpinnerLoader } from './LoadingStates'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: React.ReactNode
  iconPosition?: 'left' | 'right'
  fullWidth?: boolean
}

/**
 * 通用按钮组件
 * 支持多种样式变体、尺寸和状态
 */
export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  disabled,
  className = '',
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'
  
  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500 shadow-sm hover:shadow-md',
    secondary: 'bg-gray-600 hover:bg-gray-700 text-white focus:ring-gray-500 shadow-sm hover:shadow-md',
    outline: 'border-2 border-blue-600 text-blue-600 hover:bg-blue-50 focus:ring-blue-500 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-900/20',
    ghost: 'text-gray-700 hover:bg-gray-100 focus:ring-gray-500 dark:text-gray-300 dark:hover:bg-gray-800',
    danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 shadow-sm hover:shadow-md'
  }
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  }
  
  const widthClass = fullWidth ? 'w-full' : ''
  
  const buttonClasses = `
    ${baseClasses}
    ${variantClasses[variant]}
    ${sizeClasses[size]}
    ${widthClass}
    ${className}
  `.trim()

  const renderIcon = () => {
    if (loading) {
      return <SpinnerLoader size="sm" className="text-current" />
    }
    return icon
  }

  const renderContent = () => {
    const iconElement = renderIcon()
    
    if (!iconElement) {
      return children
    }
    
    if (iconPosition === 'left') {
      return (
        <>
          <span className="mr-2">{iconElement}</span>
          {children}
        </>
      )
    } else {
      return (
        <>
          {children}
          <span className="ml-2">{iconElement}</span>
        </>
      )
    }
  }

  return (
    <motion.button
      whileHover={{ scale: disabled || loading ? 1 : 1.02 }}
      whileTap={{ scale: disabled || loading ? 1 : 0.98 }}
      transition={{ duration: 0.1 }}
      className={buttonClasses}
      disabled={disabled || loading}
      {...props}
    >
      {renderContent()}
    </motion.button>
  )
}

// 按钮组组件
export const ButtonGroup: React.FC<{
  children: React.ReactNode
  className?: string
  orientation?: 'horizontal' | 'vertical'
}> = ({ children, className = '', orientation = 'horizontal' }) => {
  const orientationClasses = {
    horizontal: 'flex flex-row space-x-2',
    vertical: 'flex flex-col space-y-2'
  }

  return (
    <div className={`${orientationClasses[orientation]} ${className}`}>
      {children}
    </div>
  )
}

// 图标按钮组件
export const IconButton: React.FC<{
  icon: React.ReactNode
  onClick?: () => void
  size?: 'sm' | 'md' | 'lg'
  variant?: 'primary' | 'secondary' | 'ghost'
  className?: string
  disabled?: boolean
  tooltip?: string
}> = ({ 
  icon, 
  onClick, 
  size = 'md', 
  variant = 'ghost',
  className = '',
  disabled = false,
  tooltip
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg'
  }

  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'bg-gray-600 hover:bg-gray-700 text-white',
    ghost: 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
  }

  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.05 }}
      whileTap={{ scale: disabled ? 1 : 0.95 }}
      onClick={onClick}
      disabled={disabled}
      title={tooltip}
      className={`
        inline-flex items-center justify-center rounded-lg
        transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        ${className}
      `}
    >
      {icon}
    </motion.button>
  )
}