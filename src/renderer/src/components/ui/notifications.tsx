import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { Button } from './button'
import { Modal } from './Modal'
import { cn } from '../../lib/utils'

export interface ToastNotificationProps {
  message: string
  type: 'success' | 'info' | 'warning' | 'error'
  duration?: number
  onClose?: () => void
  attachToBody?: boolean
  className?: string
}

export const ToastNotification: React.FC<ToastNotificationProps> = ({
  message,
  type,
  duration = 3000,
  onClose,
  attachToBody = true,
  className,
}) => {
  const [visible, setVisible] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
    }, duration)

    return () => clearTimeout(timer)
  }, [duration])

  const handleAnimationComplete = () => {
    if (!visible) {
      onClose?.()
    }
  }

  const typeStyles = {
    success: 'text-emerald-500',
    info: 'text-blue-500',
    warning: 'text-amber-500',
    error: 'text-red-500',
  }

  const TypeIcon = {
    success: CheckCircle,
    info: Info,
    warning: AlertTriangle,
    error: AlertCircle,
  }[type]

  if (!mounted) return null

  const content = (
    <AnimatePresence onExitComplete={onClose}>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          onAnimationComplete={handleAnimationComplete}
          className={cn(
            'fixed top-6 left-1/2 -translate-x-1/2 px-4 py-3 rounded-xl shadow-2xl',
            'bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md',
            'border border-neutral-200 dark:border-neutral-800',
            'z-[9999] flex items-start gap-3',
            'w-auto max-w-sm md:max-w-md min-w-[300px]',
            className,
          )}
        >
          <div className={`mt-0.5 ${typeStyles[type]}`}>
            <TypeIcon className="w-5 h-5" />
          </div>
          <div className="flex-1 flex flex-col gap-1">
            <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100 leading-snug break-words">
              {message}
            </span>
          </div>
          <button
            onClick={() => setVisible(false)}
            className="p-1 -mr-1 -mt-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )

  if (attachToBody) {
    return createPortal(content, document.body)
  }

  return content
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
  cancelText = '取消',
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
