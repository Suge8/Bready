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

const typeConfig = {
  success: {
    icon: CheckCircle,
    bgLight: 'bg-white/70 backdrop-blur-xl border-emerald-200/60',
    bgDark: 'bg-emerald-950/80 backdrop-blur-xl border-emerald-700/60',
    iconColor: 'text-emerald-600',
    iconColorDark: 'text-emerald-400',
    textColor: 'text-neutral-800',
    textColorDark: 'text-neutral-100',
  },
  info: {
    icon: Info,
    bgLight: 'bg-white/70 backdrop-blur-xl border-sky-200/60',
    bgDark: 'bg-sky-950/80 backdrop-blur-xl border-sky-700/60',
    iconColor: 'text-sky-600',
    iconColorDark: 'text-sky-400',
    textColor: 'text-neutral-800',
    textColorDark: 'text-neutral-100',
  },
  warning: {
    icon: AlertTriangle,
    bgLight: 'bg-white/70 backdrop-blur-xl border-amber-200/60',
    bgDark: 'bg-amber-950/80 backdrop-blur-xl border-amber-700/60',
    iconColor: 'text-amber-600',
    iconColorDark: 'text-amber-400',
    textColor: 'text-neutral-800',
    textColorDark: 'text-neutral-100',
  },
  error: {
    icon: AlertCircle,
    bgLight: 'bg-white/70 backdrop-blur-xl border-red-200/60',
    bgDark: 'bg-red-950/80 backdrop-blur-xl border-red-700/60',
    iconColor: 'text-red-600',
    iconColorDark: 'text-red-400',
    textColor: 'text-neutral-800',
    textColorDark: 'text-neutral-100',
  },
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
  const [progress, setProgress] = useState(100)
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    setMounted(true)
    const checkDark = () => {
      setIsDark(document.documentElement.classList.contains('dark'))
    }
    checkDark()
    const observer = new MutationObserver(checkDark)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => {
      setMounted(false)
      observer.disconnect()
    }
  }, [])

  useEffect(() => {
    const startTime = Date.now()
    const animate = () => {
      const elapsed = Date.now() - startTime
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100)
      setProgress(remaining)
      if (remaining > 0) {
        requestAnimationFrame(animate)
      }
    }
    const animationId = requestAnimationFrame(animate)

    const timer = setTimeout(() => {
      setVisible(false)
    }, duration)

    return () => {
      clearTimeout(timer)
      cancelAnimationFrame(animationId)
    }
  }, [duration])

  const config = typeConfig[type]
  const TypeIcon = config.icon
  const bgClass = isDark ? config.bgDark : config.bgLight
  const iconColorClass = isDark ? config.iconColorDark : config.iconColor
  const textColorClass = isDark ? config.textColorDark : config.textColor

  if (!mounted) return null

  const content = (
    <AnimatePresence onExitComplete={onClose}>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -32, scale: 0.92, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -24, scale: 0.95, filter: 'blur(4px)' }}
          transition={{
            type: 'spring',
            stiffness: 380,
            damping: 30,
            mass: 0.8,
          }}
          className={cn(
            attachToBody && 'fixed top-5 left-1/2 -translate-x-1/2',
            !attachToBody && 'relative',
            'px-4 py-3 rounded-2xl',
            'shadow-xl border',
            bgClass,
            'z-[9999] flex items-center gap-3',
            'w-auto max-w-[420px] min-w-[280px]',
            'overflow-hidden',
            className,
          )}
        >
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 25, delay: 0.1 }}
            className={cn('flex-shrink-0', iconColorClass)}
          >
            <TypeIcon className="w-5 h-5" strokeWidth={2.5} />
          </motion.div>

          <motion.span
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
            className={cn('flex-1 text-sm font-medium leading-snug', textColorClass)}
          >
            {message}
          </motion.span>

          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setVisible(false)}
            className={cn(
              'flex-shrink-0 p-1.5 -mr-1 rounded-xl',
              'text-neutral-400 dark:text-neutral-500',
              'hover:text-neutral-600 dark:hover:text-neutral-300',
              'hover:bg-black/5 dark:hover:bg-white/10',
              'transition-colors duration-200 cursor-pointer',
            )}
          >
            <X className="w-4 h-4" />
          </motion.button>

          <motion.div
            className={cn(
              'absolute bottom-0 left-0 h-[3px] rounded-full',
              type === 'success' && (isDark ? 'bg-emerald-400' : 'bg-emerald-500'),
              type === 'info' && (isDark ? 'bg-sky-400' : 'bg-sky-500'),
              type === 'warning' && (isDark ? 'bg-amber-400' : 'bg-amber-500'),
              type === 'error' && (isDark ? 'bg-red-400' : 'bg-red-500'),
            )}
            style={{ width: `${progress}%` }}
            transition={{ duration: 0.1 }}
          />
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
