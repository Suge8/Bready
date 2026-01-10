import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, Settings, X } from 'lucide-react'
import { cn } from '../lib/utils'
import { Button } from './ui/button'

interface AiConfigAlertProps {
  isAdmin: boolean
  onClose?: () => void
  onGoToSettings?: () => void
}

export const AiConfigAlert: React.FC<AiConfigAlertProps> = ({
  isAdmin,
  onClose,
  onGoToSettings,
}) => {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    if (!isAdmin) {
      const timer = setTimeout(() => {
        handleClose()
      }, 8000)
      return () => clearTimeout(timer)
    }
    return () => {}
  }, [isAdmin])

  const handleClose = () => {
    setIsVisible(false)
    if (onClose) {
      setTimeout(onClose, 400)
    }
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, x: 50, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
          exit={{ opacity: 0, x: 20, scale: 0.9 }}
          transition={{
            type: 'spring',
            stiffness: 400,
            damping: 30,
          }}
          className={cn(
            'fixed top-6 right-6 z-50 w-full max-w-sm',
            'overflow-hidden rounded-xl',
            'bg-zinc-950/80 dark:bg-black/80 backdrop-blur-xl',
            'border border-zinc-200/20 dark:border-white/10',
            'shadow-2xl shadow-black/20',
            'flex flex-col',
          )}
        >
          <div className="relative p-4 flex gap-3">
            <div className="flex-shrink-0 pt-0.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500/10 text-orange-500 ring-1 ring-orange-500/20">
                <AlertCircle className="h-4 w-4" />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-1">
                AI 配置提醒
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                {isAdmin
                  ? 'AI 服务尚未配置，请前往设置页面完成配置'
                  : 'AI 服务暂未配置，请联系管理员处理'}
              </p>

              {isAdmin && onGoToSettings && (
                <div className="mt-3">
                  <Button
                    size="sm"
                    className="bg-orange-600 hover:bg-orange-700 text-white border-none h-8 px-4 text-xs shadow-lg shadow-orange-500/20 w-auto"
                    onClick={onGoToSettings}
                    icon={<Settings className="h-3 w-3" />}
                  >
                    前往配置
                  </Button>
                </div>
              )}
            </div>

            <button
              onClick={handleClose}
              className="absolute top-2 right-2 p-1.5 rounded-full text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {!isAdmin && (
            <div className="h-0.5 w-full bg-zinc-200/20 dark:bg-white/5">
              <motion.div
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: 8, ease: 'linear' }}
                className="h-full bg-orange-500/50"
              />
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
