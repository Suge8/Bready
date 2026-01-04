import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useI18n } from '../../contexts/I18nContext'

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
  const { t } = useI18n()
  const [error, setError] = useState<string | null>(null)
  const [helperText, setHelperText] = useState<string>('')

  useEffect(() => {
    validateField()
  }, [value, required, maxLength, placeholder, t])

  const validateField = () => {
    if (required && !value.trim()) {
      setError(t('form.validation.required'))
      setHelperText(t('form.validation.requiredHint'))
      return
    }

    if (value.length > maxLength) {
      setError(t('form.validation.tooLong', { max: maxLength }))
      setHelperText(t('form.validation.count', { count: value.length }))
      return
    }

    setError(null)
    setHelperText(value.length > 0 ? t('form.validation.counter', { count: value.length, max: maxLength }) : placeholder)
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
          focus:outline-none focus:ring-2 focus:ring-black/10
          ${error 
            ? 'border-red-500 focus:border-red-500' 
            : 'border-gray-300 dark:border-gray-600 focus:border-gray-400'
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
  const { t, locale } = useI18n()
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
              className="w-3 h-3 border-2 border-[var(--bready-accent)] border-t-transparent rounded-full mr-2"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
            {t('form.autosave.saving')}
          </>
        ) : lastSaved ? (
          t('form.autosave.savedAt', { time: lastSaved.toLocaleTimeString(locale) })
        ) : (
          t('form.autosave.editing')
        )}
      </div>
    </div>
  )
}
