import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, FolderOpen } from 'lucide-react'

interface SmartFormValidationProps {
  value: string
  onChange: (value: string) => void
  name: string
  label: string
  placeholder?: string
  required?: boolean
  maxLength?: number
}

export const SmartFormValidation: React.FC<SmartFormValidationProps> = ({ 
  value, 
  onChange, 
  name, 
  label, 
  placeholder = '',
  required = false,
  maxLength = 50
}) => {
  const [error, setError] = useState<string | null>(null)
  const [helperText, setHelperText] = useState<string>('')

  useEffect(() => {
    validateField()
  }, [value])

  const validateField = () => {
    if (required && !value.trim()) {
      setError('此字段为必填项')
      setHelperText('请输入内容')
      return
    }

    if (value.length > maxLength) {
      setError(`内容不能超过${maxLength}个字符`)
      setHelperText(`当前${value.length}个字符`)
      return
    }

    setError(null)
    setHelperText(value.length > 0 ? `${value.length}/${maxLength} 字符` : placeholder)
  }

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      
      <input
        type="text"
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`
          w-full px-3 py-2 border rounded-lg
          focus:outline-none focus:ring-2 focus:ring-blue-500
          ${error 
            ? 'border-red-500 focus:border-red-500' 
            : 'border-gray-300 dark:border-gray-600 focus:border-blue-500'
          }
          bg-white dark:bg-gray-800 text-black dark:text-white
        `}
        placeholder={placeholder}
      />
      
      <div className={`mt-1 text-xs ${error ? 'text-red-500' : 'text-gray-500'}`}>
        {error || helperText}
      </div>
    </div>
  )
}

interface AutoSaveFormProps {
  formData: Record<string, any>
  onFormChange: (data: Record<string, any>) => void
  children: React.ReactNode
}

export const AutoSaveForm: React.FC<AutoSaveFormProps> = ({ 
  formData, 
  onFormChange,
  children 
}) => {
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsSaving(true)
      // 模拟自动保存草稿
      localStorage.setItem('bready-form-draft', JSON.stringify(formData))
      setLastSaved(new Date())
      setIsSaving(false)
    }, 2000) // 2秒防抖

    return () => clearTimeout(timer)
  }, [formData])

  return (
    <div>
      {children}
      
      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 flex items-center">
        {isSaving ? (
          <>
            <motion.div
              className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full mr-2"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
            保存中...
          </>
        ) : lastSaved ? (
          `草稿已自动保存于 ${lastSaved.toLocaleTimeString()}`
        ) : (
          '正在编辑...'
        )}
      </div>
    </div>
  )
}