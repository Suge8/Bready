import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ChevronDown, Check } from 'lucide-react'
import { cn } from '../../lib/utils'
import MicrophoneSelector from './MicrophoneSelector'
import { useTheme } from '../ui/theme-provider'
import { useI18n } from '../../contexts/I18nContext'

interface AudioModeOption {
  value: 'system' | 'microphone'
  label: string
  icon: React.ReactNode
  description: string
}

interface CollaborationHeaderProps {
  isMac: boolean
  title: string
  status: string
  isConnected: boolean
  audioModeOptions: AudioModeOption[]
  currentAudioMode: 'system' | 'microphone'
  showAudioModeDropdown: boolean
  onToggleAudioModeDropdown: () => void
  onAudioModeChange: (mode: 'system' | 'microphone') => void
  onExit: () => void
  currentMicrophoneDeviceId?: string
  onMicrophoneDeviceChange?: (deviceId: string, label: string) => void
}

const CollaborationHeader: React.FC<CollaborationHeaderProps> = ({
  isMac,
  title,
  status,
  isConnected,
  audioModeOptions,
  currentAudioMode,
  showAudioModeDropdown,
  onToggleAudioModeDropdown,
  onAudioModeChange,
  onExit,
  currentMicrophoneDeviceId,
  onMicrophoneDeviceChange,
}) => {
  const { resolvedTheme } = useTheme()
  const { t } = useI18n()
  const isDarkMode = resolvedTheme === 'dark'

  const currentOption = audioModeOptions.find((opt) => opt.value === currentAudioMode)

  return (
    <div className="w-full z-50 flex-shrink-0 app-drag pt-2 pb-2 relative">
      {isMac && (
        <motion.button
          onClick={onExit}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="absolute left-[72px] top-[6px] p-1.5 rounded-full text-[var(--bready-text-muted)] hover:text-[var(--bready-text)] hover:bg-[var(--bready-surface)] cursor-pointer app-no-drag transition-colors z-10"
        >
          <ArrowLeft className="w-4 h-4" />
        </motion.button>
      )}

      <div className="w-full flex items-center justify-center px-4 relative">
        {!isMac && (
          <motion.button
            onClick={onExit}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="absolute left-4 p-2 rounded-full text-[var(--bready-text-muted)] hover:text-[var(--bready-text)] hover:bg-[var(--bready-surface)] cursor-pointer app-no-drag transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </motion.button>
        )}

        <div className="flex flex-col items-center justify-center pointer-events-none select-none">
          <motion.h1
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm font-semibold text-[var(--bready-text)] tracking-wide leading-tight"
          >
            {title}
          </motion.h1>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="flex items-center gap-1.5 mt-0.5"
          >
            <div className="relative flex items-center justify-center w-2 h-2">
              <motion.div
                animate={{
                  scale: isConnected ? [1, 1.5, 1] : 1,
                  opacity: isConnected ? [0.5, 0, 0.5] : 0,
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className={cn(
                  'absolute inset-0 rounded-full',
                  isConnected ? 'bg-emerald-500' : 'bg-red-500',
                )}
              />
              <div
                className={cn(
                  'w-1.5 h-1.5 rounded-full relative z-10 shadow-sm',
                  isConnected ? 'bg-emerald-500' : 'bg-red-500',
                )}
              />
            </div>
            <span className="text-[10px] font-medium text-[var(--bready-text-muted)] uppercase tracking-wider opacity-80">
              {status}
            </span>
          </motion.div>
        </div>

        <div className="absolute right-4 app-no-drag z-50">
          <motion.button
            onClick={onToggleAudioModeDropdown}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              'flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-full cursor-pointer border transition-all duration-300 group',
              showAudioModeDropdown
                ? 'bg-[var(--bready-surface)] border-[var(--bready-border)] shadow-md'
                : 'bg-[var(--bready-surface)]/50 border-transparent hover:bg-[var(--bready-surface)] hover:border-[var(--bready-border)]/50 hover:shadow-sm',
            )}
          >
            <span className="text-[var(--bready-text)] opacity-90 group-hover:opacity-100 transition-opacity">
              {currentOption?.icon}
            </span>
            <span className="text-xs font-medium text-[var(--bready-text)] group-hover:text-[var(--bready-text)] transition-colors">
              {currentOption?.label}
            </span>
            <motion.div
              animate={{ rotate: showAudioModeDropdown ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="w-3.5 h-3.5 text-[var(--bready-text-muted)]" />
            </motion.div>
          </motion.button>

          <AnimatePresence>
            {showAudioModeDropdown && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-40 bg-black/5"
                  onClick={onToggleAudioModeDropdown}
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -8 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  style={{ transformOrigin: 'top right' }}
                  className="absolute top-full right-0 mt-2 w-72 bg-[var(--bready-surface)] border border-[var(--bready-border)] rounded-2xl shadow-2xl overflow-hidden z-50"
                >
                  <div className="p-2 flex flex-col gap-1">
                    {audioModeOptions.map((option) => {
                      const isActive = currentAudioMode === option.value
                      return (
                        <div key={option.value} className="relative">
                          <button
                            onClick={() => onAudioModeChange(option.value)}
                            className={cn(
                              'relative w-full text-left px-3 py-2.5 rounded-xl flex items-start gap-3 transition-colors cursor-pointer outline-none group',
                              !isActive && 'hover:bg-[var(--bready-text-muted)]/5',
                            )}
                          >
                            {isActive && (
                              <div className="absolute inset-0 bg-[var(--bready-accent)]/10 border border-[var(--bready-accent)]/20 rounded-xl" />
                            )}

                            <div
                              className={cn(
                                'relative z-10 mt-0.5 transition-colors duration-300',
                                isActive
                                  ? 'text-[var(--bready-accent)]'
                                  : 'text-[var(--bready-text-muted)] group-hover:text-[var(--bready-text)]',
                              )}
                            >
                              {option.icon}
                            </div>

                            <div className="relative z-10 flex-1">
                              <div
                                className={cn(
                                  'text-sm font-medium transition-colors',
                                  isActive
                                    ? 'text-[var(--bready-text)]'
                                    : 'text-[var(--bready-text)]',
                                )}
                              >
                                {option.label}
                              </div>
                              <div className="text-[10px] text-[var(--bready-text-muted)] mt-0.5 leading-tight opacity-80">
                                {option.description}
                              </div>
                            </div>

                            {isActive && (
                              <div className="relative z-10 mt-1">
                                <Check className="w-4 h-4 text-[var(--bready-accent)]" />
                              </div>
                            )}
                          </button>

                          {option.value === 'microphone' && isActive && (
                            <div className="overflow-hidden">
                              <div className="pl-11 pr-3 pb-3 pt-0">
                                <div className="h-px w-full bg-[var(--bready-border)]/50 mb-2" />
                                <div className="text-[10px] font-medium text-[var(--bready-text-muted)] mb-2 uppercase tracking-wider opacity-70 px-1">
                                  {t('collaboration.header.inputDevice')}
                                </div>
                                <MicrophoneSelector
                                  currentDeviceId={currentMicrophoneDeviceId || ''}
                                  isDarkMode={isDarkMode}
                                  onDeviceChange={onMicrophoneDeviceChange}
                                  className="w-full"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

export default CollaborationHeader
