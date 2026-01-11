import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { cn } from '../../lib/utils'
import MicrophoneSelector from './MicrophoneSelector'
import { useTheme } from '../ui/theme-provider'

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
  const isDarkMode = resolvedTheme === 'dark'
  return (
    <div className="w-full bg-transparent z-50 flex-shrink-0 app-drag pt-[12px]">
      <div className="h-10 w-full flex items-center justify-between app-drag px-4">
        <button
          onClick={onExit}
          className={cn(
            'p-2 text-[var(--bready-text-muted)] hover:text-[var(--bready-text)] transition-all duration-300 hover:bg-[var(--bready-surface)]/80 hover:scale-105 hover:shadow-sm rounded-full cursor-pointer app-no-drag absolute top-[5px]',
            isMac ? 'left-[76px]' : 'left-4',
          )}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex-1 flex flex-col items-center pointer-events-none">
          <h1 className="text-sm font-medium text-[var(--bready-text)] tracking-wide">{title}</h1>
          <div className="flex items-center justify-center space-x-1.5 text-[10px] text-[var(--bready-text-muted)]">
            {isConnected ? (
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            ) : (
              <div className="w-1.5 h-1.5 bg-red-400 rounded-full" />
            )}
            <span className="opacity-70">{status}</span>
          </div>
        </div>

        <div className="flex items-center space-x-2 app-no-drag">
          <div className="relative app-no-drag">
            <button
              onClick={onToggleAudioModeDropdown}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-[var(--bready-surface)]/40 hover:bg-[var(--bready-surface)]/70 text-[var(--bready-text-muted)] hover:text-[var(--bready-text)] rounded-full text-[11px] transition-all duration-300 cursor-pointer border border-transparent hover:border-[var(--bready-border)]/50"
            >
              {audioModeOptions.find((option) => option.value === currentAudioMode)?.icon}
              <span className="font-medium whitespace-nowrap">
                {audioModeOptions.find((option) => option.value === currentAudioMode)?.label}
              </span>
            </button>

            <AnimatePresence>
              {showAudioModeDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={onToggleAudioModeDropdown} />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: -8, filter: 'blur(8px)' }}
                    animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, scale: 0.95, y: -4, filter: 'blur(4px)' }}
                    transition={{ type: 'spring', duration: 0.35, bounce: 0.15 }}
                    className="absolute top-full right-0 mt-2 bg-[var(--bready-surface)] border border-[var(--bready-border)] rounded-2xl shadow-2xl z-50 min-w-72 overflow-hidden"
                  >
                    <div className="p-1.5 space-y-0.5">
                      {audioModeOptions.map((option) => (
                        <div key={option.value} className="relative">
                          <button
                            onClick={() => onAudioModeChange(option.value)}
                            className={cn(
                              'relative w-full px-3 py-2.5 text-left transition-colors duration-200 cursor-pointer rounded-xl flex items-center gap-3 overflow-hidden group',
                              currentAudioMode !== option.value &&
                                'hover:bg-[var(--bready-surface-2)]/50',
                            )}
                          >
                            {currentAudioMode === option.value && (
                              <motion.div
                                layoutId="active-audio-mode"
                                className="absolute inset-0 bg-[var(--bready-surface-2)]"
                                transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                              />
                            )}
                            <div className="relative z-10 text-[var(--bready-text-muted)] group-hover:text-[var(--bready-text)] transition-colors">
                              {option.icon}
                            </div>
                            <div className="relative z-10 flex-1 min-w-0">
                              <div className="text-sm font-medium text-[var(--bready-text)]">
                                {option.label}
                              </div>
                              <div className="text-[11px] text-[var(--bready-text-muted)] mt-0.5 leading-tight opacity-80">
                                {option.description}
                              </div>
                            </div>
                            {currentAudioMode === option.value && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', bounce: 0.4 }}
                                className="relative z-10 w-1.5 h-1.5 bg-emerald-500 rounded-full shrink-0 mr-1"
                              />
                            )}
                          </button>

                          <AnimatePresence>
                            {option.value === 'microphone' && currentAudioMode === 'microphone' && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.25, ease: 'easeInOut' }}
                                className="overflow-hidden"
                              >
                                <div className="px-2 pb-2 pt-1 ml-9">
                                  <div className="text-[10px] font-medium text-[var(--bready-text-muted)] mb-1.5 px-1 uppercase tracking-wider opacity-70">
                                    输入设备
                                  </div>
                                  <MicrophoneSelector
                                    currentDeviceId={currentMicrophoneDeviceId || ''}
                                    isDarkMode={isDarkMode}
                                    onDeviceChange={onMicrophoneDeviceChange}
                                    className="w-full"
                                  />
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CollaborationHeader
