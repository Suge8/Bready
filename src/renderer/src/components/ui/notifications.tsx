import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { Button } from './button'
import { Modal } from './Modal'

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
          fixed bottom-4 right-4 px-4 py-3 rounded-xl shadow-xl
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
    <Modal isOpen onClose={onCancel} size="sm" title={title}>
      <p className="mb-6 text-[var(--bready-text-muted)]">{message}</p>
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onCancel}>
          {cancelText}
        </Button>
        <Button onClick={onConfirm}>{confirmText}</Button>
      </div>
    </Modal>
  )
}
