import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Keyboard, Check, X, Loader2 } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useI18n } from '../../contexts/I18nContext'

interface BreadyWindowAPI {
  getShortcut: () => Promise<{ toggleWindow: string }>
  setShortcut: (shortcut: string) => Promise<{ success: boolean; error?: string }>
}

interface ShortcutSettingsProps {
  isDarkMode: boolean
  variants?: any
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform)

const modifierSymbols: Record<string, string> = isMac
  ? {
      Command: '⌘',
      Control: '⌃',
      Option: '⌥',
      Alt: '⌥',
      Shift: '⇧',
      Meta: '⌘',
      CommandOrControl: '⌘',
    }
  : {
      Command: 'Ctrl',
      Control: 'Ctrl',
      Option: 'Alt',
      Alt: 'Alt',
      Shift: 'Shift',
      Meta: 'Win',
      CommandOrControl: 'Ctrl',
    }

const formatShortcut = (shortcut: string): string[] => {
  if (!shortcut) return []
  return shortcut.split('+').map((key) => {
    const cleanKey = key.trim()
    return modifierSymbols[cleanKey] || cleanKey.toUpperCase()
  })
}

export const ShortcutSettings: React.FC<ShortcutSettingsProps> = ({ isDarkMode, variants }) => {
  const { t } = useI18n()
  const [currentShortcut, setCurrentShortcut] = useState<string>('CommandOrControl+G')
  const [isRecording, setIsRecording] = useState(false)
  const [tempShortcut, setTempShortcut] = useState<string[]>([])
  const [pendingElectronString, setPendingElectronString] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchShortcut = async () => {
      try {
        const api = (window as unknown as { bready: BreadyWindowAPI }).bready
        const result = await api.getShortcut()
        if (result && result.toggleWindow) {
          setCurrentShortcut(result.toggleWindow)
        }
      } catch (error) {
        console.error('Failed to get shortcut:', error)
      }
    }
    fetchShortcut()
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node) &&
        isRecording
      ) {
        setIsRecording(false)
        setTempShortcut([])
        setPendingElectronString('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isRecording])

  useEffect(() => {
    if (!isRecording) return

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()

      const parts: string[] = []

      if (e.metaKey) parts.push('Command')
      if (e.ctrlKey) parts.push('Control')
      if (e.altKey) parts.push('Alt')
      if (e.shiftKey) parts.push('Shift')

      const key = e.key.toUpperCase()
      const code = e.code

      const isModifier = ['META', 'CONTROL', 'ALT', 'SHIFT'].includes(key)

      if (!isModifier) {
        let cleanKey = key
        if (code.startsWith('Key')) cleanKey = code.replace('Key', '')
        else if (code.startsWith('Digit')) cleanKey = code.replace('Digit', '')
        else if (key === ' ') cleanKey = 'Space'
        else if (key.length === 1) cleanKey = key
        else cleanKey = code

        parts.push(cleanKey)
      }

      const accelerator = parts.join('+')
      setPendingElectronString(accelerator)
      setTempShortcut(formatShortcut(accelerator))
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isRecording])

  const saveShortcut = async () => {
    if (!pendingElectronString) {
      setIsRecording(false)
      return
    }

    const hasModifier =
      pendingElectronString.includes('Command') ||
      pendingElectronString.includes('Control') ||
      pendingElectronString.includes('Alt') ||
      pendingElectronString.includes('Shift')

    if (!hasModifier && !pendingElectronString.startsWith('F')) {
      return
    }

    setIsLoading(true)
    try {
      const api = (window as unknown as { bready: BreadyWindowAPI }).bready
      const res = await api.setShortcut(pendingElectronString)
      if (res.success) {
        setCurrentShortcut(pendingElectronString)
        setIsRecording(false)
      } else {
        console.error('Failed to set shortcut')
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }

  const cancelRecording = () => {
    setIsRecording(false)
    setTempShortcut([])
    setPendingElectronString('')
  }

  return (
    <motion.div variants={variants} className="flex items-center justify-between">
      <div className="space-y-0.5">
        <div className="flex items-center gap-2">
          <Keyboard className={cn('w-3.5 h-3.5', isDarkMode ? 'text-gray-400' : 'text-gray-500')} />
          <span
            className={cn('text-xs font-medium', isDarkMode ? 'text-gray-200' : 'text-gray-700')}
          >
            {t('profile.shortcut.title')}
          </span>
        </div>
        <p className={cn('text-[10px]', isDarkMode ? 'text-gray-500' : 'text-gray-400')}>
          {t('profile.shortcut.toggleWindow')}
        </p>
      </div>

      <div className="relative" ref={containerRef}>
        <AnimatePresence mode="wait">
          {!isRecording ? (
            <motion.button
              key="display"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={() => setIsRecording(true)}
              className={cn(
                'flex items-center gap-1 px-2 py-1.5 rounded-md border text-xs font-mono transition-all duration-200',
                isDarkMode
                  ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:border-gray-600'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 shadow-sm',
              )}
            >
              {formatShortcut(currentShortcut).map((key, i) => (
                <span key={i} className="flex items-center">
                  {key}
                  {i < formatShortcut(currentShortcut).length - 1 && (
                    <span className="mx-0.5 opacity-30">+</span>
                  )}
                </span>
              ))}
            </motion.button>
          ) : (
            <motion.div
              key="recording"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              className={cn(
                'absolute right-0 top-0 z-50 flex flex-col items-center gap-2 p-3 rounded-xl border shadow-xl min-w-[200px]',
                isDarkMode
                  ? 'bg-gray-900 border-gray-700 shadow-black/50'
                  : 'bg-white border-gray-200 shadow-xl',
              )}
            >
              <span
                className={cn(
                  'text-[10px] font-medium uppercase tracking-wider mb-1',
                  isDarkMode ? 'text-blue-400' : 'text-blue-600',
                )}
              >
                {t('profile.shortcut.recording')}
              </span>

              <div
                className={cn(
                  'flex items-center justify-center gap-1.5 h-8 w-full rounded-lg border bg-opacity-50 px-2',
                  isDarkMode ? 'bg-black border-gray-700' : 'bg-gray-50 border-gray-200',
                )}
              >
                {tempShortcut.length > 0 ? (
                  tempShortcut.map((k, i) => (
                    <span
                      key={i}
                      className={cn(
                        'text-xs font-bold px-1.5 py-0.5 rounded shadow-sm border',
                        isDarkMode
                          ? 'bg-gray-800 border-gray-600 text-white'
                          : 'bg-white border-gray-300 text-gray-800',
                      )}
                    >
                      {k}
                    </span>
                  ))
                ) : (
                  <span
                    className={cn(
                      'text-[10px] italic',
                      isDarkMode ? 'text-gray-600' : 'text-gray-400',
                    )}
                  >
                    {t('profile.shortcut.current')}...
                  </span>
                )}
              </div>

              <div className="flex w-full items-center gap-2 mt-1">
                <button
                  onClick={cancelRecording}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1 py-1 rounded text-[10px] font-medium transition-colors',
                    isDarkMode
                      ? 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900',
                  )}
                >
                  <X className="w-3 h-3" />
                  {t('profile.shortcut.cancel')}
                </button>
                <button
                  onClick={saveShortcut}
                  disabled={tempShortcut.length === 0 || isLoading}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1 py-1 rounded text-[10px] font-medium transition-colors',
                    tempShortcut.length > 0
                      ? isDarkMode
                        ? 'bg-blue-600 text-white hover:bg-blue-500'
                        : 'bg-black text-white hover:bg-gray-800'
                      : 'opacity-50 cursor-not-allowed',
                    isDarkMode ? 'bg-gray-800 text-gray-500' : 'bg-gray-200 text-gray-400',
                  )}
                >
                  {isLoading ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Check className="w-3 h-3" />
                  )}
                  {t('profile.shortcut.save')}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
