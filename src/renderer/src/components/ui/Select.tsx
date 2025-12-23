import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
  icon?: React.ReactNode
}

export interface SelectProps {
  options: SelectOption[]
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  label?: string
  error?: string
  disabled?: boolean
  searchable?: boolean
  multiple?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

/**
 * 选择器组件
 * 支持搜索、多选、自定义样式
 */
export const Select: React.FC<SelectProps> = ({
  options,
  value,
  onChange,
  placeholder = '请选择...',
  label,
  error,
  disabled = false,
  searchable = false,
  multiple = false,
  size = 'md',
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedValues, setSelectedValues] = useState<string[]>(
    multiple ? (Array.isArray(value) ? value : []) : (value ? [value] : [])
  )
  
  const selectRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-4 py-3 text-base'
  }

  // 过滤选项
  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // 获取选中选项的显示文本
  const getDisplayText = () => {
    if (selectedValues.length === 0) return placeholder
    
    if (multiple) {
      if (selectedValues.length === 1) {
        const option = options.find(opt => opt.value === selectedValues[0])
        return option?.label || selectedValues[0]
      }
      return `已选择 ${selectedValues.length} 项`
    } else {
      const option = options.find(opt => opt.value === selectedValues[0])
      return option?.label || selectedValues[0]
    }
  }

  // 处理选项点击
  const handleOptionClick = (optionValue: string) => {
    if (multiple) {
      const newValues = selectedValues.includes(optionValue)
        ? selectedValues.filter(v => v !== optionValue)
        : [...selectedValues, optionValue]
      
      setSelectedValues(newValues)
      onChange(newValues as any)
    } else {
      setSelectedValues([optionValue])
      onChange(optionValue)
      setIsOpen(false)
    }
  }

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearchTerm('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 键盘导航
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isOpen, searchable])

  const toggleOpen = () => {
    if (!disabled) {
      setIsOpen(!isOpen)
      if (!isOpen) {
        setSearchTerm('')
      }
    }
  }

  return (
    <div className={`relative w-full ${className}`} ref={selectRef}>
      {/* 标签 */}
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {label}
        </label>
      )}

      {/* 选择器触发器 */}
      <button
        type="button"
        onClick={toggleOpen}
        disabled={disabled}
        className={`
          w-full text-left rounded-lg border transition-all duration-200
          ${error 
            ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
            : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
          }
          ${disabled 
            ? 'bg-gray-100 dark:bg-gray-700 cursor-not-allowed opacity-50' 
            : 'bg-white dark:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-500'
          }
          ${sizeClasses[size]}
        `}
      >
        <div className="flex items-center justify-between">
          <span className={`
            ${selectedValues.length === 0 
              ? 'text-gray-500 dark:text-gray-400' 
              : 'text-gray-900 dark:text-white'
            }
          `}>
            {getDisplayText()}
          </span>
          <motion.svg
            className="w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </motion.svg>
        </div>
      </button>

      {/* 下拉选项 */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-hidden"
          >
            {/* 搜索框 */}
            {searchable && (
              <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="搜索选项..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:border-blue-500"
                />
              </div>
            )}

            {/* 选项列表 */}
            <div className="max-h-48 overflow-y-auto">
              {filteredOptions.length === 0 ? (
                <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center">
                  {searchTerm ? '未找到匹配选项' : '暂无选项'}
                </div>
              ) : (
                filteredOptions.map((option) => {
                  const isSelected = selectedValues.includes(option.value)
                  
                  return (
                    <motion.button
                      key={option.value}
                      type="button"
                      onClick={() => handleOptionClick(option.value)}
                      disabled={option.disabled}
                      whileHover={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}
                      className={`
                        w-full px-4 py-3 text-left text-sm transition-colors
                        ${isSelected 
                          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' 
                          : 'text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
                        }
                        ${option.disabled 
                          ? 'opacity-50 cursor-not-allowed' 
                          : 'cursor-pointer'
                        }
                      `}
                    >
                      <div className="flex items-center">
                        {option.icon && (
                          <span className="mr-3 flex-shrink-0">
                            {option.icon}
                          </span>
                        )}
                        <span className="flex-1">{option.label}</span>
                        {multiple && isSelected && (
                          <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </motion.button>
                  )
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 错误信息 */}
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 text-sm text-red-600 dark:text-red-400"
        >
          {error}
        </motion.p>
      )}
    </div>
  )
}

// 简单选择器组件
export const SimpleSelect: React.FC<{
  options: { value: string; label: string }[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}> = ({ options, value, onChange, placeholder, className = '' }) => {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`
        w-full px-4 py-2.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600
        bg-white dark:bg-gray-800 text-gray-900 dark:text-white
        focus:border-blue-500 focus:ring-1 focus:ring-blue-500
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}