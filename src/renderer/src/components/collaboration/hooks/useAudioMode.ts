import { useState, useCallback, useRef, useEffect } from 'react'
import { useI18n } from '../../../contexts/I18nContext'
import { useToast } from '../../../contexts/ToastContext'

export function useAudioMode(isConnected: boolean) {
  const { t } = useI18n()
  const { showToast } = useToast()

  const [currentAudioMode, setCurrentAudioMode] = useState<'system' | 'microphone'>('system')
  const [showAudioModeDropdown, setShowAudioModeDropdown] = useState(false)
  const [currentMicrophoneDeviceId, setCurrentMicrophoneDeviceId] = useState('')

  const currentMicrophoneDeviceIdRef = useRef('')

  const handleAudioModeChange = useCallback(
    async (
      newMode: 'system' | 'microphone',
      setStatus: (status: string) => void,
      setCurrentError: (error: { type: string; message: string } | null) => void,
    ) => {
      const modeLabel =
        newMode === 'system'
          ? t('collaboration.audioMode.system.label')
          : t('collaboration.audioMode.microphone.label')

      if (newMode === currentAudioMode) return

      setCurrentAudioMode(newMode)

      if (!isConnected) return

      try {
        setStatus(t('collaboration.status.switchingAudio'))
        const success = await window.bready.switchAudioMode(newMode)

        if (success) {
          setStatus(t('collaboration.status.switched', { mode: modeLabel }))
          setTimeout(() => {
            if (isConnected) {
              setStatus(t('collaboration.status.ready'))
            }
          }, 2000)
        } else {
          setStatus(t('collaboration.status.switchFailed'))
          setCurrentError({
            type: 'audio-device-error',
            message: t('collaboration.errors.audioSwitchFailed', { mode: modeLabel }),
          })
        }
      } catch {
        setStatus(t('collaboration.status.switchFailed'))
        setCurrentError({
          type: 'audio-device-error',
          message: t('collaboration.errors.audioSwitchError'),
        })
      }
    },
    [currentAudioMode, isConnected, t],
  )

  useEffect(() => {
    if (!window.bready?.onAudioModeChanged) return

    return window.bready.onAudioModeChanged((modeInfo) => {
      if (modeInfo?.mode && modeInfo.mode !== currentAudioMode) {
        setCurrentAudioMode(modeInfo.mode)
      }
    })
  }, [currentAudioMode])

  const handleMicrophoneDeviceChange = useCallback(
    async (deviceId: string, label: string) => {
      const previousDeviceId = currentMicrophoneDeviceIdRef.current
      setCurrentMicrophoneDeviceId(deviceId)
      currentMicrophoneDeviceIdRef.current = deviceId

      let switchSuccess = true
      try {
        const capture = (window as any).rendererAudioCapture
        if (capture?.setMicrophoneDevice) {
          switchSuccess = await capture.setMicrophoneDevice(deviceId)
        }
      } catch {
        switchSuccess = false
      }

      if (!switchSuccess) {
        if (previousDeviceId) {
          setCurrentMicrophoneDeviceId(previousDeviceId)
          currentMicrophoneDeviceIdRef.current = previousDeviceId
        }
        showToast(t('collaboration.errors.audioSwitchError'), 'error')
        return
      }

      if (window.bready && isConnected && currentAudioMode === 'microphone') {
        showToast(t('collaboration.toasts.deviceSwitched', { device: label }), 'success')
      }
    },
    [currentAudioMode, isConnected, t, showToast],
  )

  const handleAudioDeviceChanged = useCallback(
    (data: { deviceId?: string; deviceLabel?: string }) => {
      const nextId = data.deviceId || ''
      const nextLabel = data.deviceLabel || nextId

      if (!nextId) return

      const previousId = currentMicrophoneDeviceIdRef.current

      currentMicrophoneDeviceIdRef.current = nextId
      setCurrentMicrophoneDeviceId(nextId)

      if (previousId && previousId !== nextId && nextLabel) {
        showToast(t('collaboration.toasts.deviceSwitched', { device: nextLabel }), 'info')
      }
    },
    [t, showToast],
  )

  const toggleDropdown = useCallback(() => {
    setShowAudioModeDropdown((prev) => !prev)
  }, [])

  const closeDropdown = useCallback(() => {
    setShowAudioModeDropdown(false)
  }, [])

  return {
    currentAudioMode,
    showAudioModeDropdown,
    currentMicrophoneDeviceId,
    currentMicrophoneDeviceIdRef,
    handleAudioModeChange,
    handleMicrophoneDeviceChange,
    handleAudioDeviceChanged,
    toggleDropdown,
    closeDropdown,
  }
}
