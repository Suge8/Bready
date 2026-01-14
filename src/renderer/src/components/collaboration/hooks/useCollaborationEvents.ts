import { useEffect, useRef } from 'react'

interface EventHandlers {
  onStatus: (status: string) => void
  onTranscription: (text: string) => void
  onTranscriptionComplete: (transcription: string) => void
  onAIResponseUpdate: (response: string) => void
  onAIResponse: (response: string) => void
  onSessionInitializing: (initializing: boolean) => void
  onSessionReady: () => void
  onSessionError: (error: string) => void
  onSessionClosed: () => void
  onAudioDeviceChanged: (data: { deviceId?: string; deviceLabel?: string }) => void
}

export function useCollaborationEvents(handlers: EventHandlers) {
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  useEffect(() => {
    const removeStatusListener = window.bready.onStatusUpdate((status) =>
      handlersRef.current.onStatus(status),
    )
    const removeTranscriptionListener = window.bready.onTranscriptionUpdate((text) =>
      handlersRef.current.onTranscription(text),
    )
    const removeTranscriptionCompleteListener = window.bready.onTranscriptionComplete?.(
      (transcription) => handlersRef.current.onTranscriptionComplete(transcription),
    )
    const removeAIResponseUpdateListener = window.bready.onAIResponseUpdate((response) =>
      handlersRef.current.onAIResponseUpdate(response),
    )
    const removeAIResponseListener = window.bready.onAIResponse((response) =>
      handlersRef.current.onAIResponse(response),
    )
    const removeSessionInitializingListener = window.bready.onSessionInitializing((initializing) =>
      handlersRef.current.onSessionInitializing(initializing),
    )
    const removeSessionReadyListener = window.bready.onSessionReady(() =>
      handlersRef.current.onSessionReady(),
    )
    const removeSessionErrorListener = window.bready.onSessionError((error) =>
      handlersRef.current.onSessionError(error),
    )
    const removeSessionClosedListener = window.bready.onSessionClosed(() =>
      handlersRef.current.onSessionClosed(),
    )
    const removeAudioDeviceChangedListener = window.bready.onAudioDeviceChanged?.((data) =>
      handlersRef.current.onAudioDeviceChanged(data),
    )

    return () => {
      removeStatusListener()
      removeTranscriptionListener()
      removeTranscriptionCompleteListener?.()
      removeAIResponseUpdateListener()
      removeAIResponseListener()
      removeSessionInitializingListener()
      removeSessionReadyListener()
      removeSessionErrorListener()
      removeSessionClosedListener()
      removeAudioDeviceChangedListener?.()
      window.bready?.stopAudioCapture?.()
    }
  }, [])
}
