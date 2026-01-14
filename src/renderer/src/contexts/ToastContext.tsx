import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  useEffect,
} from 'react'
import { createPortal } from 'react-dom'
import { ToastNotification } from '../components/ui/notifications'

type ToastType = 'success' | 'info' | 'warning' | 'error'

interface Toast {
  id: string
  message: string
  type: ToastType
  duration?: number
}

interface ToastContextType {
  showToast: (message: string, type: ToastType, duration?: number) => void
  toast: (message: string, type: ToastType, duration?: number) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

const fallbackToast = (message: string, type: ToastType) => {
  console.warn(`Toast (${type}): ${message} - ToastProvider not available`)
}

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext)
  if (!context) {
    return {
      showToast: fallbackToast,
      toast: fallbackToast,
    }
  }
  return context
}

interface ToastProviderProps {
  children: ReactNode
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const showToast = useCallback((message: string, type: ToastType, duration?: number) => {
    const id = Math.random().toString(36).substring(2, 9)
    const effectiveDuration = duration ?? (type === 'error' ? 5000 : 3000)

    setToasts((prev) => {
      const hasSameToast = prev.some((t) => t.message === message && t.type === type)
      if (hasSameToast) return prev
      return [...prev, { id, message, type, duration: effectiveDuration }]
    })
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toastContainer = mounted
    ? createPortal(
        <div className="fixed top-6 left-0 right-0 z-[9999] flex flex-col items-center gap-3 pointer-events-none">
          {toasts.map((t) => (
            <ToastNotification
              key={t.id}
              message={t.message}
              type={t.type}
              duration={t.duration}
              onClose={() => removeToast(t.id)}
              attachToBody={false}
              className="pointer-events-auto"
            />
          ))}
        </div>,
        document.body,
      )
    : null

  return (
    <ToastContext.Provider value={{ showToast, toast: showToast }}>
      {children}
      {toastContainer}
    </ToastContext.Provider>
  )
}
