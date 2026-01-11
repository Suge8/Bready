import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, X, Loader2, Eye } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useI18n } from '../../contexts/I18nContext'

interface BreadyWindowAPI {
  getShortcut: () => Promise<{ toggleWindow: string }>
  setShortcut: (shortcut: string) => Promise<{ success: boolean; error?: string }>
}

interface ShortcutSettingsProps {
  isDarkMode: boolean
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

export const ShortcutSettings: React.FC<ShortcutSettingsProps> = ({ isDarkMode }) => {
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
        if (api?.getShortcut) {
          const result = await api.getShortcut()
          if (result?.toggleWindow) {
            setCurrentShortcut(result.toggleWindow)
          }
        }
      } catch (error) {
        console.error('Failed to get shortcut:', error)
      }
    }
    fetchShortcut()
  }, [])

  useEffect(() => {
    if (!isRecording) return

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
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
      if (e.ctrlKey && !e.metaKey) parts.push('Control')
      if (e.altKey) parts.push('Alt')
      if (e.shiftKey) parts.push('Shift')

      const key = e.key.toUpperCase()
      const code = e.code
      const isModifier = ['META', 'CONTROL', 'ALT', 'SHIFT'].includes(key)

      if (!isModifier && parts.length > 0) {
        let cleanKey = key
        if (code.startsWith('Key')) cleanKey = code.replace('Key', '')
        else if (code.startsWith('Digit')) cleanKey = code.replace('Digit', '')
        else if (key === ' ') cleanKey = 'Space'
        else if (key.length === 1) cleanKey = key
        else cleanKey = code

        parts.push(cleanKey)

        const accelerator = parts.join('+')
        setPendingElectronString(accelerator)
        setTempShortcut(formatShortcut(accelerator))
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [isRecording])

  const saveShortcut = useCallback(async () => {
    if (!pendingElectronString || tempShortcut.length === 0) {
      setIsRecording(false)
      return
    }

    setIsLoading(true)
    try {
      const api = (window as unknown as { bready: BreadyWindowAPI }).bready
      if (api?.setShortcut) {
        const res = await api.setShortcut(pendingElectronString)
        if (res.success) {
          setCurrentShortcut(pendingElectronString)
          setIsRecording(false)
          setTempShortcut([])
          setPendingElectronString('')
        } else {
          console.error('Failed to set shortcut:', res.error)
        }
      }
    } catch (e) {
      console.error('Failed to save shortcut:', e)
    } finally {
      setIsLoading(false)
    }
  }, [pendingElectronString, tempShortcut.length])

  const cancelRecording = useCallback(() => {
    setIsRecording(false)
    setTempShortcut([])
    setPendingElectronString('')
  }, [])

  const startRecording = useCallback(() => {
    setIsRecording(true)
    setTempShortcut([])
    setPendingElectronString('')
  }, [])

  const canSave = tempShortcut.length > 0 && !isLoading

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    await saveShortcut()
  }

  const handleCancel = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    cancelRecording()
  }

  return (
    <div ref={containerRef} className="relative h-10 flex items-center">
      <AnimatePresence mode="wait">
        {!isRecording ? (
          <motion.button
            key="display"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={startRecording}
            className={cn(
              'h-full w-full flex items-center justify-between gap-2 px-2.5 rounded-lg border text-xs transition-all duration-200 cursor-pointer',
              isDarkMode
                ? 'bg-gray-900/50 border-gray-800 text-gray-300 hover:bg-gray-800 hover:border-gray-700'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300',
            )}
          >
            <div className="flex items-center gap-1.5">
              <Eye className={cn('w-3.5 h-3.5', isDarkMode ? 'text-gray-400' : 'text-gray-500')} />
              <span
                className={cn(
                  'text-xs font-medium',
                  isDarkMode ? 'text-gray-200' : 'text-gray-700',
                )}
              >
                {t('profile.shortcut.toggleWindow')}
              </span>
            </div>
            <span
              className={cn(
                'flex items-center gap-1 font-mono text-sm font-semibold px-2.5 py-0.5 rounded-lg',
                isDarkMode ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-700',
              )}
            >
              {formatShortcut(currentShortcut).map((key, i) => (
                <span key={i} className="flex items-center">
                  {key}
                  {i < formatShortcut(currentShortcut).length - 1 && (
                    <span className="mx-0.5 opacity-40">+</span>
                  )}
                </span>
              ))}
            </span>
          </motion.button>
        ) : (
          <motion.div
            key="recording"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={cn(
              'h-full w-full flex items-center gap-2 px-2 rounded-lg border',
              isDarkMode ? 'bg-gray-900 border-blue-500/50' : 'bg-white border-blue-500/50',
            )}
          >
            <div className="flex-1 flex items-center justify-center gap-1 min-w-0">
              {tempShortcut.length > 0 ? (
                tempShortcut.map((k, i) => (
                  <span
                    key={i}
                    className={cn(
                      'text-[10px] font-bold px-1 py-0.5 rounded border',
                      isDarkMode
                        ? 'bg-gray-800 border-gray-600 text-white'
                        : 'bg-gray-100 border-gray-300 text-gray-800',
                    )}
                  >
                    {k}
                  </span>
                ))
              ) : (
                <span
                  className={cn(
                    'text-[10px] animate-pulse',
                    isDarkMode ? 'text-blue-400' : 'text-blue-600',
                  )}
                >
                  {t('profile.shortcut.recording')}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={handleCancel}
                className={cn(
                  'p-1 rounded transition-colors cursor-pointer',
                  isDarkMode
                    ? 'hover:bg-gray-800 text-gray-400 hover:text-white'
                    : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900',
                )}
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleSave}
                disabled={!canSave}
                className={cn(
                  'p-1 rounded transition-colors cursor-pointer',
                  canSave
                    ? isDarkMode
                      ? 'bg-blue-600 text-white hover:bg-blue-500'
                      : 'bg-black text-white hover:bg-gray-800'
                    : isDarkMode
                      ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed',
                )}
              >
                {isLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
