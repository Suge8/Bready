import React, { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../../lib/utils'
import { Button } from './button'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  closeOnOverlayClick?: boolean
  closeOnEscape?: boolean
  showCloseButton?: boolean
  className?: string
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  closeOnOverlayClick = true,
  closeOnEscape = true,
  showCloseButton = false,
  className,
}) => {
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-[calc(100%-2rem)]',
  }

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && closeOnEscape) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, closeOnEscape, onClose])

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'unset'
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const handleOverlayClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget && closeOnOverlayClick) {
      onClose()
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm cursor-pointer"
            onClick={handleOverlayClick}
          />

          <motion.div
            data-modal
            initial={{ opacity: 0, scale: 0.98, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={cn(
              'relative w-full flex flex-col rounded-2xl border border-[var(--bready-border)] bg-[var(--bready-surface)] shadow-2xl cursor-auto p-6 max-h-[90vh]',
              sizeClasses[size],
              className,
            )}
          >
            {(title || showCloseButton) && (
              <div className="mb-6 flex items-start justify-between gap-4 flex-shrink-0">
                {title && (
                  <h2 className="text-xl font-semibold text-[var(--bready-text)]">{title}</h2>
                )}
                {showCloseButton && (
                  <button
                    onClick={onClose}
                    className="text-[var(--bready-text-muted)] hover:text-[var(--bready-text)] transition-colors"
                    aria-label="关闭"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}
              </div>
            )}

            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export const ConfirmDialog: React.FC<{
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: 'info' | 'warning' | 'danger'
}> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = '确认',
  cancelText = '取消',
  type = 'info',
}) => {
  const typeStyles = {
    info: {
      icon: '💡',
      confirmClass: 'bg-black text-white hover:bg-black/90',
    },
    warning: {
      icon: '⚠️',
      confirmClass: 'bg-amber-500 text-white hover:bg-amber-600',
    },
    danger: {
      icon: '⚠️',
      confirmClass: 'bg-red-600 text-white hover:bg-red-700',
    },
  }

  const handleConfirm = () => {
    onConfirm()
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" title={title}>
      <div className="text-center">
        <div className="mb-4 text-4xl">{typeStyles[type].icon}</div>
        <p className="mb-6 text-[var(--bready-text-muted)]">{message}</p>
        <div className="flex justify-center gap-3">
          <Button variant="outline" onClick={onClose}>
            {cancelText}
          </Button>
          <Button className={typeStyles[type].confirmClass} onClick={handleConfirm}>
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export const Drawer: React.FC<{
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  position?: 'left' | 'right'
  size?: 'sm' | 'md' | 'lg'
}> = ({ isOpen, onClose, title, children, position = 'right', size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-80',
    md: 'w-96',
    lg: 'w-1/2',
  }

  const positionClasses = {
    left: 'left-0',
    right: 'right-0',
  }

  const slideDirection = position === 'left' ? -100 : 100

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50"
            onClick={onClose}
          />

          <motion.div
            initial={{ x: slideDirection }}
            animate={{ x: 0 }}
            exit={{ x: slideDirection }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className={cn(
              'fixed top-0 h-full bg-[var(--bready-surface)] border-l border-[var(--bready-border)] shadow-xl flex flex-col',
              positionClasses[position],
              sizeClasses[size],
            )}
          >
            {title && (
              <div className="flex items-center justify-between border-b border-[var(--bready-border)] p-4">
                <h2 className="text-lg font-semibold text-[var(--bready-text)]">{title}</h2>
                <button
                  onClick={onClose}
                  className="text-[var(--bready-text-muted)] hover:text-[var(--bready-text)]"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-4">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
