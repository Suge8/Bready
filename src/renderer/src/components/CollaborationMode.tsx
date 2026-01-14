import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Volume2, Mic, AlertCircle, Check } from 'lucide-react'

import { useI18n } from '../contexts/I18nContext'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { collabSessionService } from '../lib/api-client'

import {
  CollaborationHeader,
  CollaborationSidebar,
  CollaborationMain,
  CollaborationInput,
  ExitConfirmModal,
  InitializingOverlay,
  useCollaborationState,
  useConversation,
  useAudioMode,
  useCollaborationEvents,
  type ConversationEntry,
} from './collaboration'

interface CollaborationModeProps {
  onExit: () => void
}

const pageVariants = {
  initial: { opacity: 0, scale: 0.98, y: 10 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: 'easeOut' as const,
      staggerChildren: 0.1,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    y: -10,
    transition: {
      duration: 0.3,
      ease: 'easeInOut' as const,
    },
  },
}

const CollaborationMode: React.FC<CollaborationModeProps> = ({ onExit }) => {
  const { t } = useI18n()
  const { user } = useAuth()
  const { showToast } = useToast()
  const isMac = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform)

  const [showExitConfirm, setShowExitConfirm] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)

  const collabSessionIdRef = useRef<string | null>(null)
  const expiresAtRef = useRef<number>(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const timeWarningsShownRef = useRef<Set<string>>(new Set())

  const state = useCollaborationState()
  const conversation = useConversation()
  const audio = useAudioMode(state.isConnected)

  const audioModeOptions = useMemo(
    () => [
      {
        value: 'system' as const,
        label: t('collaboration.audioMode.system.label'),
        icon: <Volume2 className="w-4 h-4" />,
        description: t('collaboration.audioMode.system.description'),
      },
      {
        value: 'microphone' as const,
        label: t('collaboration.audioMode.microphone.label'),
        icon: <Mic className="w-4 h-4" />,
        description: t('collaboration.audioMode.microphone.description'),
      },
    ],
    [t],
  )

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (err) {
      console.error('Copy failed:', err)
    }
  }, [])

  const handleSendMessage = useCallback(
    async (messageText: string) => {
      const userMessage: ConversationEntry = {
        type: 'user',
        content: messageText,
        timestamp: new Date(),
        source: 'text',
      }

      conversation.addToHistory(userMessage)
      conversation.pendingUserInputRef.current = { content: messageText, source: 'text' }
      conversation.setIsWaitingForAI(true)
      conversation.lastAIResponseRef.current = ''

      if (!state.isConnected) {
        const errorMessage: ConversationEntry = {
          type: 'ai',
          content: t('collaboration.errors.notConnected'),
          timestamp: new Date(),
          source: 'text',
        }
        conversation.addToHistory(errorMessage)
        conversation.setIsWaitingForAI(false)
        return
      }

      try {
        const result = await window.bready.sendTextMessage(messageText)
        if (!result.success) {
          const errorMessage: ConversationEntry = {
            type: 'ai',
            content: t('collaboration.errors.sendFailed', {
              error: result.error || t('collaboration.errors.tryAgain'),
            }),
            timestamp: new Date(),
            source: 'text',
          }
          conversation.addToHistory(errorMessage)
          conversation.setIsWaitingForAI(false)
        }
      } catch {
        const errorMessage: ConversationEntry = {
          type: 'ai',
          content: t('collaboration.errors.sendError'),
          timestamp: new Date(),
          source: 'text',
        }
        conversation.addToHistory(errorMessage)
        conversation.setIsWaitingForAI(false)
      }
    },
    [state.isConnected, conversation, t],
  )

  const handleExitConfirm = useCallback(async () => {
    setShowExitConfirm(false)
    state.prepareExit()

    await new Promise((resolve) => setTimeout(resolve, 400))

    if (collabSessionIdRef.current) {
      try {
        await collabSessionService.end(collabSessionIdRef.current, 'normal')
      } catch (err) {
        console.error('Failed to end collab session:', err)
      }
    }
    onExit()
  }, [state, onExit])

  const handleAudioModeChange = useCallback(
    (mode: 'system' | 'microphone') => {
      audio.handleAudioModeChange(mode, state.setStatus, state.setCurrentError)
    },
    [audio, state],
  )

  useEffect(() => {
    state.initialize(onExit)
  }, [])

  useEffect(() => {
    if (rootRef.current) {
      rootRef.current.scrollTo({ top: 0, left: 0 })
    }
  }, [])

  useEffect(() => {
    if (!expiresAtRef.current || !state.isConnected) return

    const checkRemainingTime = async () => {
      const remainingMs = expiresAtRef.current - Date.now()
      const remainingMinutes = remainingMs / 60000

      if (remainingMs <= 0 && !timeWarningsShownRef.current.has('expired')) {
        timeWarningsShownRef.current.add('expired')
        showToast(t('collaboration.toasts.timeExpired'), 'error')
        handleExitConfirm()
        return
      }
      if (remainingMinutes <= 0.5 && !timeWarningsShownRef.current.has('30s')) {
        timeWarningsShownRef.current.add('30s')
        showToast(t('collaboration.toasts.timeWarning30s'), 'warning')
      } else if (remainingMinutes <= 5 && !timeWarningsShownRef.current.has('5min')) {
        timeWarningsShownRef.current.add('5min')
        showToast(t('collaboration.toasts.timeWarning5min'), 'warning')
      } else if (remainingMinutes <= 10 && !timeWarningsShownRef.current.has('10min')) {
        timeWarningsShownRef.current.add('10min')
        showToast(t('collaboration.toasts.timeWarning10min'), 'info')
      }

      if (collabSessionIdRef.current) {
        try {
          const result = await collabSessionService.heartbeat(collabSessionIdRef.current)
          if (result.timeUp) {
            showToast(t('collaboration.toasts.timeExpired'), 'error')
            handleExitConfirm()
            return
          }
          expiresAtRef.current = new Date(result.expiresAt).getTime()
        } catch (err) {
          console.error('Heartbeat failed:', err)
        }
      }
    }

    const interval = setInterval(checkRemainingTime, 5000)
    return () => clearInterval(interval)
  }, [state.isConnected, t, showToast, handleExitConfirm])

  const eventHandlers = useMemo(
    () => ({
      onStatus: state.setStatus,
      onTranscription: conversation.updateVoiceInput,
      onTranscriptionComplete: conversation.handleTranscriptionComplete,
      onAIResponseUpdate: conversation.updateAIResponse,
      onAIResponse: conversation.handleAIResponseComplete,
      onSessionInitializing: async (initializing: boolean) => {
        if (!initializing) {
          state.setIsConnected(true)
          state.setCurrentError(null)
          if (user?.id && !collabSessionIdRef.current) {
            try {
              const lease = await collabSessionService.start(user.id)
              collabSessionIdRef.current = lease.sessionId
              expiresAtRef.current = new Date(lease.expiresAt).getTime()
            } catch (err) {
              console.error('Failed to start collab session:', err)
            }
          }
        }
      },
      onSessionReady: state.handleSessionReady,
      onSessionError: state.handleSessionError,
      onSessionClosed: () => state.handleSessionClosed(onExit),
      onAudioDeviceChanged: audio.handleAudioDeviceChanged,
    }),
    [state, conversation, audio, user, onExit],
  )

  useCollaborationEvents(eventHandlers)

  return (
    <motion.div
      ref={rootRef}
      variants={pageVariants}
      initial="initial"
      animate={state.isExiting ? 'exit' : 'animate'}
      exit="exit"
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="h-screen w-screen overflow-hidden bg-[var(--bready-bg)] text-[var(--bready-text)] flex flex-col relative"
    >
      <BackgroundDecoration />
      <CopySuccessToast show={copySuccess} />

      <CollaborationHeader
        isMac={isMac}
        title={t('collaboration.title')}
        status={state.status}
        isConnected={state.isConnected}
        audioModeOptions={audioModeOptions}
        currentAudioMode={audio.currentAudioMode}
        showAudioModeDropdown={audio.showAudioModeDropdown}
        onToggleAudioModeDropdown={audio.toggleDropdown}
        onAudioModeChange={handleAudioModeChange}
        onExit={() => setShowExitConfirm(true)}
        currentMicrophoneDeviceId={audio.currentMicrophoneDeviceId}
        onMicrophoneDeviceChange={audio.handleMicrophoneDeviceChange}
      />

      <div className="flex-1 flex overflow-hidden bg-[var(--bready-bg)]">
        <CollaborationSidebar
          conversationHistory={conversation.conversationHistory}
          copyToClipboard={copyToClipboard}
          t={t}
        />

        <div className="flex-1 flex flex-col min-w-0 relative z-10">
          <ErrorBanner
            error={state.currentError}
            isInitializing={state.isInitializing}
            onReconnect={state.reconnect}
          />

          <CollaborationMain
            conversationHistory={conversation.conversationHistory}
            currentVoiceInput={conversation.currentVoiceInput}
            currentAIResponse={conversation.currentAIResponse}
            isWaitingForAI={conversation.isWaitingForAI}
            isInitialState={conversation.isInitialState}
          />

          <div className="w-full max-w-4xl mx-auto px-6 pb-6 pt-2">
            <CollaborationInput
              onSendMessage={handleSendMessage}
              isWaitingForAI={conversation.isWaitingForAI}
              disabled={!state.isConnected}
            />
          </div>
        </div>
      </div>

      {state.isInitializing && <InitializingOverlay status={state.status} />}

      <AnimatePresence>
        {showExitConfirm && (
          <ExitConfirmModal
            isOpen={showExitConfirm}
            onClose={() => setShowExitConfirm(false)}
            onConfirm={handleExitConfirm}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}

const BackgroundDecoration: React.FC = React.memo(() => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{
          opacity: [0.4, 0.6, 0.4],
          scale: [1, 1.1, 1],
          x: [-20, 0, -20],
          y: [-20, 0, -20],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          repeatType: 'reverse',
          ease: 'easeInOut',
        }}
        className="absolute -top-[10%] -left-[10%] w-[50vw] h-[50vw] bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-transparent rounded-full"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{
          opacity: [0.3, 0.5, 0.3],
          scale: [1, 1.2, 1],
          x: [20, 0, 20],
          y: [20, 0, 20],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          repeatType: 'reverse',
          ease: 'easeInOut',
          delay: 1,
        }}
        className="absolute -bottom-[10%] -right-[10%] w-[45vw] h-[45vw] bg-gradient-to-tl from-blue-500/5 via-cyan-500/5 to-transparent rounded-full"
      />

      <motion.div
        animate={{
          y: [0, -30, 0],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute top-1/4 right-1/3 w-64 h-64 bg-gradient-to-r from-amber-500/5 to-orange-500/5 rounded-full"
      />

      <motion.div
        animate={{
          y: [0, 40, 0],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{
          duration: 7,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 2,
        }}
        className="absolute bottom-1/3 left-1/4 w-96 h-96 bg-gradient-to-r from-emerald-500/5 to-teal-500/5 rounded-full"
      />
    </div>
  )
})

const CopySuccessToast: React.FC<{ show: boolean }> = ({ show }) => {
  const { t } = useI18n()

  if (!show) return null

  return (
    <div className="fixed top-4 right-4 z-[9999] animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-center gap-2 px-4 py-2 bg-[var(--bready-surface)] border border-[var(--bready-border)] rounded-lg shadow-xl">
        <Check className="w-4 h-4 text-emerald-500" />
        <span className="text-sm text-[var(--bready-text)]">{t('collaboration.copySuccess')}</span>
      </div>
    </div>
  )
}

interface ErrorBannerProps {
  error: { type: string; message: string } | null
  isInitializing: boolean
  onReconnect: () => void
}

const ErrorBanner: React.FC<ErrorBannerProps> = ({ error, isInitializing, onReconnect }) => {
  const { t } = useI18n()

  return (
    <AnimatePresence>
      {error && !isInitializing && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.98 }}
          className="absolute top-4 left-4 right-4 z-50"
        >
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200/50 dark:border-red-800/30 rounded-xl p-4 shadow-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-red-800 dark:text-red-300">{error.message}</p>
            </div>
            <button
              onClick={onReconnect}
              className="px-3 py-1.5 bg-white dark:bg-red-900/40 border border-red-200 dark:border-red-800 rounded-lg text-xs font-medium text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/60 transition-colors cursor-pointer"
            >
              {t('collaboration.actions.reconnect')}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default CollaborationMode
