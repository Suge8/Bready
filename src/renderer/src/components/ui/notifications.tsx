import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

interface ToastNotificationProps {
  message: string
  type: 'success' | 'info' | 'warning' | 'error'
  duration?: number
  onClose?: () => void
}

export const ToastNotification: React.FC<ToastNotificationProps> = ({ 
  message, 
  type, 
  duration = 3000,
  onClose
}) => {
  const [visible, setVisible] = useState(true)

  const typeStyles = {
    success: 'bg-green-500 text-white',
    info: 'bg-blue-500 text-white',
    warning: 'bg-yellow-500 text-white',
    error: 'bg-red-500 text-white'
  }

  const typeIcons = {
    success: '✓',
    info: 'ℹ',
    warning: '⚠',
    error: '✗'
  }

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(() => onClose?.(), 300)
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  if (!visible) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.3 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
        className={`
          fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg
          ${typeStyles[type]}
          z-50 flex items-center space-x-2
          max-w-sm
        `}
      >
        <span className="text-lg font-bold">{typeIcons[type]}</span>
        <span className="flex-1 text-sm">{message}</span>
        <button 
          onClick={() => {
            setVisible(false)
            setTimeout(() => onClose?.(), 300)
          }}
          className="ml-2 hover:opacity-75"
        >
          <X className="w-4 h-4" />
        </button>
      </motion.div>
    </AnimatePresence>
  )
}

interface ConfirmationDialogProps {
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
  confirmText?: string
  cancelText?: string
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({ 
  title, 
  message, 
  onConfirm, 
  onCancel,
  confirmText = '确认',
  cancelText = '取消'
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl"
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          {title}
        </h3>
        
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {message}
        </p>
        
        <div className="flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            {cancelText}
          </button>
          
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors dark:bg-white dark:text-black dark:hover:bg-gray-200"
          >
            {confirmText}
          </button>
        </div>
      </motion.div>
    </div>
  )
}