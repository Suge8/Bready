import { useState, useCallback, useRef } from 'react'
import { useI18n } from '../../../contexts/I18nContext'
import { useToast } from '../../../contexts/ToastContext'

export interface CollaborationError {
  type: string
  message: string
}

export function useCollaborationState() {
  const { t } = useI18n()
  const { showToast } = useToast()

  const [isConnected, setIsConnected] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)
  const [status, setStatus] = useState(t('collaboration.status.initializing'))
  const [currentError, setCurrentError] = useState<CollaborationError | null>(null)
  const [isExiting, setIsExiting] = useState(false)

  const hasInitialized = useRef(false)
  const sessionReadyRef = useRef(false)
  const audioStartPendingRef = useRef(false)
  const audioStartedRef = useRef(false)
  const isUserExitingRef = useRef(false)

  const startAudioCaptureOnce = useCallback(async () => {
    if (!window.bready || audioStartedRef.current) {
      return
    }
    audioStartPendingRef.current = false
    setStatus(t('collaboration.status.audioStarting'))
    const audioSuccess = await window.bready.startAudioCapture()
    if (audioSuccess) {
      audioStartedRef.current = true
      setStatus(t('collaboration.status.ready'))
      setIsInitializing(false)
      return
    }
    setIsInitializing(false)
    setCurrentError({
      type: 'audio-device-error',
      message: t('collaboration.errors.audioStartFailed'),
    })
    setStatus(t('collaboration.status.audioFailed'))
  }, [t])

  const initialize = useCallback(
    async (onExit: () => void) => {
      if (hasInitialized.current) return
      hasInitialized.current = true

      try {
        sessionReadyRef.current = false
        audioStartPendingRef.current = false
        audioStartedRef.current = false

        const selectedPreparationStr = localStorage.getItem('bready-selected-preparation')
        const customPrompt = selectedPreparationStr || ''
        const language = localStorage.getItem('bready-selected-language') || 'cmn-CN'
        const purpose = localStorage.getItem('bready-selected-purpose') || 'interview'

        setStatus(t('collaboration.status.connecting'))

        const success = await window.bready.initializeAI('', customPrompt, purpose, language)

        if (success) {
          setIsConnected(true)
          setCurrentError(null)
          audioStartPendingRef.current = true
          setStatus(t('collaboration.status.waitingReady'))

          if (sessionReadyRef.current) {
            await startAudioCaptureOnce()
          }
        } else {
          setIsInitializing(false)
          setCurrentError({
            type: 'api-connection-failed',
            message: t('collaboration.errors.connectFailed'),
          })
          setStatus(t('collaboration.status.connectFailed'))
          showToast(t('collaboration.toasts.connectionFailed'), 'error')
          setTimeout(() => onExit(), 800)
        }
      } catch (error) {
        setIsInitializing(false)
        setCurrentError({
          type: 'unknown-error',
          message: `${t('collaboration.status.initFailed')}: ${error instanceof Error ? error.message : String(error)}`,
        })
        setStatus(t('collaboration.status.initFailed'))
        showToast(t('collaboration.toasts.connectionFailed'), 'error')
        setTimeout(() => onExit(), 800)
      }
    },
    [t, showToast, startAudioCaptureOnce],
  )

  const reconnect = useCallback(async () => {
    if (!window.bready) return

    try {
      setStatus(t('collaboration.status.reconnecting'))
      setIsInitializing(true)
      setCurrentError(null)

      const success = await window.bready.manualReconnect()

      if (success) {
        setIsConnected(true)
        setStatus(t('collaboration.status.waitingReady'))
        setCurrentError(null)
        setIsInitializing(false)
        audioStartPendingRef.current = true
        audioStartedRef.current = false
        sessionReadyRef.current = false
      } else {
        setIsConnected(false)
        setStatus(t('collaboration.status.reconnectFailedRetry'))
        setIsInitializing(false)
        setCurrentError({
          type: 'api-connection-failed',
          message: t('collaboration.errors.reconnectFailed'),
        })
      }
    } catch (error) {
      setIsConnected(false)
      setStatus(t('collaboration.status.reconnectFailed'))
      setIsInitializing(false)
      setCurrentError({
        type: 'unknown-error',
        message: `${t('collaboration.status.reconnectFailed')}: ${error instanceof Error ? error.message : String(error)}`,
      })
    }
  }, [t])

  const handleSessionReady = useCallback(async () => {
    sessionReadyRef.current = true
    if (audioStartPendingRef.current && !audioStartedRef.current) {
      await startAudioCaptureOnce()
    }
  }, [startAudioCaptureOnce])

  const handleSessionError = useCallback(
    (error: string) => {
      setIsConnected(false)
      setStatus(`${t('collaboration.errors.unknownError')}: ${error}`)
      setCurrentError({
        type: 'unknown-error',
        message: error,
      })
    },
    [t],
  )

  const handleSessionClosed = useCallback(
    (onExit: () => void) => {
      setIsConnected(false)
      setStatus(t('collaboration.status.disconnected'))
      sessionReadyRef.current = false
      audioStartPendingRef.current = false
      audioStartedRef.current = false

      if (!isUserExitingRef.current) {
        showToast(t('collaboration.toasts.audioInterrupted'), 'error')
        setTimeout(() => onExit(), 1500)
      }
    },
    [t, showToast],
  )

  const prepareExit = useCallback(() => {
    setIsExiting(true)
    isUserExitingRef.current = true
  }, [])

  return {
    isConnected,
    isInitializing,
    status,
    currentError,
    isExiting,
    sessionReadyRef,
    audioStartPendingRef,
    setStatus,
    setIsConnected,
    setCurrentError,
    setIsInitializing,
    initialize,
    reconnect,
    prepareExit,
    handleSessionReady,
    handleSessionError,
    handleSessionClosed,
  }
}
