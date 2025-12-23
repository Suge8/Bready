import React, { useState } from 'react'

// 更新 Toggle 组件以支持暗黑模式
export interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export const Toggle: React.FC<ToggleProps> = ({ 
  checked, 
  onChange, 
  disabled = false,
  className = '',
  size = 'md'
}) => {
  const sizeClasses = {
    sm: 'w-8 h-4',
    md: 'w-10 h-5',
    lg: 'w-12 h-6'
  }

  const thumbSizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  }

  const translateClasses = {
    sm: 'translate-x-4',
    md: 'translate-x-5',
    lg: 'translate-x-6'
  }

  return (
    <button
      type="button"
      className={`
        ${sizeClasses[size]}
        ${checked ? 'bg-black dark:bg-white' : 'bg-gray-200 dark:bg-gray-700'}
        rounded-full
        relative
        inline-flex
        items-center
        transition-colors
        focus:outline-none
        focus:ring-2
        focus:ring-black/50
        dark:focus:ring-white/50
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
      disabled={disabled}
      onClick={() => onChange(!checked)}
    >
      <span
        className={`
          ${thumbSizeClasses[size]}
          ${checked ? translateClasses[size] : 'translate-x-0.5'}
          inline-block
          bg-white
          rounded-full
          transition-transform
          duration-200
          ease-in-out
        `}
      />
    </button>
  )
}