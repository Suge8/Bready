import React, { useState, forwardRef } from 'react'
import { motion } from 'framer-motion'

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string
  error?: string
  helperText?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'outline' | 'filled'
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  loading?: boolean
}

/**
 * 输入框组件
 * 支持多种样式、图标和状态
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  helperText,
  size = 'md',
  variant = 'outline',
  leftIcon,
  rightIcon,
  loading = false,
  className = '',
  disabled,
  ...props
}, ref) => {
  const [isFocused, setIsFocused] = useState(false)

  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-4 py-3 text-base'
  }

  const variantClasses = {
    outline: `
      border border-gray-300 dark:border-gray-600 
      bg-white dark:bg-gray-800
      focus:border-blue-500 focus:ring-1 focus:ring-blue-500
    `,
    filled: `
      border-0 bg-gray-100 dark:bg-gray-700
      focus:bg-white dark:focus:bg-gray-800
      focus:ring-2 focus:ring-blue-500
    `
  }

  const baseClasses = `
    w-full rounded-lg transition-all duration-200
    text-gray-900 dark:text-white
    placeholder-gray-500 dark:placeholder-gray-400
    disabled:opacity-50 disabled:cursor-not-allowed
    ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
    ${sizeClasses[size]}
    ${variantClasses[variant]}
    ${leftIcon ? 'pl-10' : ''}
    ${rightIcon || loading ? 'pr-10' : ''}
    ${className}
  `.trim()

  return (
    <div className="w-full">
      {/* 标签 */}
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {label}
        </label>
      )}

      {/* 输入框容器 */}
      <div className="relative">
        {/* 左侧图标 */}
        {leftIcon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            {leftIcon}
          </div>
        )}

        {/* 输入框 */}
        <motion.input
          ref={ref}
          className={baseClasses}
          disabled={disabled || loading}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          animate={{
            scale: isFocused ? 1.01 : 1,
          }}
          transition={{ duration: 0.1 }}
          {...props}
        />

        {/* 右侧图标或加载状态 */}
        {(rightIcon || loading) && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            {loading ? (
              <motion.div
                className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
            ) : (
              rightIcon
            )}
          </div>
        )}
      </div>

      {/* 错误信息或帮助文本 */}
      {(error || helperText) && (
        <motion.p
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mt-2 text-sm ${
            error 
              ? 'text-red-600 dark:text-red-400' 
              : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          {error || helperText}
        </motion.p>
      )}
    </div>
  )
})

Input.displayName = 'Input'

// 文本域组件
export const Textarea = forwardRef<HTMLTextAreaElement, {
  label?: string
  error?: string
  helperText?: string
  rows?: number
  resize?: 'none' | 'vertical' | 'horizontal' | 'both'
  className?: string
} & React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({
  label,
  error,
  helperText,
  rows = 4,
  resize = 'vertical',
  className = '',
  ...props
}, ref) => {
  const resizeClasses = {
    none: 'resize-none',
    vertical: 'resize-y',
    horizontal: 'resize-x',
    both: 'resize'
  }

  const baseClasses = `
    w-full px-4 py-2.5 text-sm rounded-lg
    border border-gray-300 dark:border-gray-600
    bg-white dark:bg-gray-800
    text-gray-900 dark:text-white
    placeholder-gray-500 dark:placeholder-gray-400
    focus:border-blue-500 focus:ring-1 focus:ring-blue-500
    disabled:opacity-50 disabled:cursor-not-allowed
    transition-all duration-200
    ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
    ${resizeClasses[resize]}
    ${className}
  `.trim()

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {label}
        </label>
      )}

      <textarea
        ref={ref}
        rows={rows}
        className={baseClasses}
        {...props}
      />

      {(error || helperText) && (
        <motion.p
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mt-2 text-sm ${
            error 
              ? 'text-red-600 dark:text-red-400' 
              : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          {error || helperText}
        </motion.p>
      )}
    </div>
  )
})

Textarea.displayName = 'Textarea'

// 搜索框组件
export const SearchInput: React.FC<{
  value: string
  onChange: (value: string) => void
  placeholder?: string
  onSearch?: (value: string) => void
  loading?: boolean
  className?: string
}> = ({
  value,
  onChange,
  placeholder = '搜索...',
  onSearch,
  loading = false,
  className = ''
}) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && onSearch) {
      onSearch(value)
    }
  }

  const handleClear = () => {
    onChange('')
  }

  return (
    <div className={`relative ${className}`}>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        loading={loading}
        leftIcon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        }
        rightIcon={
          value && !loading ? (
            <button
              onClick={handleClear}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          ) : undefined
        }
      />
    </div>
  )
}