import React, { useState } from 'react'

// 更新 Button 组件以支持暗黑模式
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: React.ReactNode
  iconPosition?: 'left' | 'right'
  fullWidth?: boolean
}

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
    primary: 'bg-black hover:bg-gray-800 text-white focus:ring-black shadow-sm hover:shadow-md dark:bg-white dark:hover:bg-gray-200 dark:text-black dark:focus:ring-white',
    secondary: 'bg-gray-600 hover:bg-gray-700 text-white focus:ring-gray-500 shadow-sm hover:shadow-md dark:bg-gray-700 dark:hover:bg-gray-600',
    outline: 'border-2 border-black text-black hover:bg-black hover:text-white focus:ring-black dark:border-white dark:text-white dark:hover:bg-white dark:hover:text-black dark:focus:ring-white',
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
      return (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )
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
    <button
      className={buttonClasses}
      disabled={disabled || loading}
      {...props}
    >
      {renderContent()}
    </button>
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
    primary: 'bg-black hover:bg-gray-800 text-white dark:bg-white dark:hover:bg-gray-200 dark:text-black',
    secondary: 'bg-gray-600 hover:bg-gray-700 text-white dark:bg-gray-700 dark:hover:bg-gray-600',
    ghost: 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
  }

  return (
    <button
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
    </button>
  )
}