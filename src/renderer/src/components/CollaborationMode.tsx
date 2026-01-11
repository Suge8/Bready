import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Send,
  RefreshCw,
  Mic,
  Volume2,
  X,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  Wifi,
  WifiOff,
  Check,
  DoorOpen,
  User,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Button } from './ui/button'
import { ConfirmationDialog } from './ui/notifications'

import 'highlight.js/styles/github.css'
import { useI18n } from '../contexts/I18nContext'
import { useToast } from '../contexts/ToastContext'
import { Modal } from './ui/Modal'
import CollaborationHeader from './collaboration/CollaborationHeader'
import CollaborationSidebar from './collaboration/CollaborationSidebar'
import { usageRecordService } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const getDynamicFontSize = (textLength: number, isInput: boolean = false) => {
  if (isInput) {
    if (textLength < 50) return 'text-lg md:text-xl'
    if (textLength < 150) return 'text-base md:text-lg'
    return 'text-sm md:text-base'
  }
  if (textLength < 50) return 'text-xl md:text-2xl'
  if (textLength < 150) return 'text-lg md:text-xl'
  if (textLength < 300) return 'text-base md:text-lg'
  return 'text-sm md:text-base'
}

const StreamingText: React.FC<{
  text: string
  className?: string
  isInput?: boolean
}> = ({ text, className = '', isInput = false }) => {
  const [renderedChars, setRenderedChars] = useState<{ char: string; id: number }[]>([])
  const idCounterRef = useRef(0)
  const prevLengthRef = useRef(0)

  useEffect(() => {
    const prevLength = prevLengthRef.current
    const newLength = text.length

    if (
      newLength > prevLength &&
      text.slice(0, prevLength) ===
        renderedChars
          .map((c) => c.char)
          .join('')
          .slice(0, prevLength)
    ) {
      const newChars = text
        .slice(prevLength)
        .split('')
        .map((char) => ({
          char,
          id: idCounterRef.current++,
        }))
      setRenderedChars((prev) => [...prev, ...newChars])
    } else if (newLength !== prevLength) {
      idCounterRef.current = 0
      setRenderedChars(
        text.split('').map((char) => ({
          char,
          id: idCounterRef.current++,
        })),
      )
    }
    prevLengthRef.current = newLength
  }, [text])

  const dynamicSize = getDynamicFontSize(text.length, isInput)

  return (
    <span
      className={`${className} ${dynamicSize}`}
      style={{ transition: 'font-size 0.3s ease-out' }}
    >
      {renderedChars.map(({ char, id }) => (
        <span
          key={id}
          className="inline-block animate-char-in"
          style={{ whiteSpace: char === ' ' ? 'pre' : 'normal' }}
        >
          {char}
        </span>
      ))}
    </span>
  )
}

const StreamingMarkdown: React.FC<{
  text: string
  className?: string
  isStreaming?: boolean
}> = ({ text, className = '', isStreaming = false }) => {
  const [chars, setChars] = useState<{ char: string; id: number }[]>([])
  const idCounterRef = useRef(0)
  const prevTextRef = useRef('')

  const dynamicSize = getDynamicFontSize(text.length, false)

  useEffect(() => {
    const prevText = prevTextRef.current
    const isAppending = text.startsWith(prevText) && text.length > prevText.length

    if (isAppending) {
      const newChars = text
        .slice(prevText.length)
        .split('')
        .map((char) => ({
          char,
          id: idCounterRef.current++,
        }))
      setChars((prev) => [...prev, ...newChars])
    } else if (text !== prevText) {
      idCounterRef.current = 0
      setChars(
        text.split('').map((char) => ({
          char,
          id: idCounterRef.current++,
        })),
      )
    }

    prevTextRef.current = text
  }, [text])

  if (!isStreaming) {
    return (
      <div
        className={`${className} ${dynamicSize} prose dark:prose-invert max-w-none`}
        style={{ transition: 'font-size 0.3s ease-out' }}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
      </div>
    )
  }

  return (
    <div
      className={`${className} ${dynamicSize}`}
      style={{ transition: 'font-size 0.3s ease-out' }}
    >
      {chars.map(({ char, id }) => (
        <span
          key={id}
          className="char-fade"
          style={{ whiteSpace: char === ' ' ? 'pre' : 'normal' }}
        >
          {char}
        </span>
      ))}
    </div>
  )
}

interface CollaborationModeProps {
  onExit: () => void
}

const CollaborationMode: React.FC<CollaborationModeProps> = ({ onExit }) => {
  const { t } = useI18n()
  const { user } = useAuth()
  const isMac = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform)
  // 状态管理
  const [inputText, setInputText] = useState('')
  const [status, setStatus] = useState(t('collaboration.status.initializing'))
  const [isConnected, setIsConnected] = useState(false)
  const [conversationHistory, setConversationHistory] = useState<
    Array<{ type: 'user' | 'ai'; content: string; timestamp: Date; source: 'voice' | 'text' }>
  >([])

  const MAX_HISTORY_LENGTH = 100
  const addToHistory = useCallback(
    (entry: {
      type: 'user' | 'ai'
      content: string
      timestamp: Date
      source: 'voice' | 'text'
    }) => {
      setConversationHistory((prev) => {
        const next = [...prev, entry]
        return next.length > MAX_HISTORY_LENGTH ? next.slice(-MAX_HISTORY_LENGTH) : next
      })
    },
    [],
  )

  const [isWaitingForAI, setIsWaitingForAI] = useState(false)
  const [currentVoiceInput, setCurrentVoiceInput] = useState('')
  const [currentAIResponse, setCurrentAIResponse] = useState('')
  const [isComposing, setIsComposing] = useState(false)
  const [showExitConfirm, setShowExitConfirm] = useState(false)
  const [isExiting, setIsExiting] = useState(false)
  const [currentAudioMode, setCurrentAudioMode] = useState<'system' | 'microphone'>('system')
  const [showAudioModeDropdown, setShowAudioModeDropdown] = useState(false)
  const [currentError, setCurrentError] = useState<{ type: string; message: string } | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)
  const { showToast } = useToast()
  const [showConfirmationDialog, setShowConfirmationDialog] = useState<{
    title: string
    message: string
    onConfirm: () => void
  } | null>(null)
  const [showPermissionsModal, setShowPermissionsModal] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)
  const [currentMicrophoneDeviceId, setCurrentMicrophoneDeviceId] = useState<string>('')

  const sessionRecordIdRef = useRef<string | null>(null)
  const sessionStartTimeRef = useRef<Date | null>(null)

  const isInitialState =
    conversationHistory.length === 0 && !currentVoiceInput && !currentAIResponse && !isWaitingForAI

  // 复制文本到剪贴板
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (err) {
      console.error('复制失败:', err)
    }
  }

  // 使用 ref 防止 React StrictMode 导致的重复初始化
  const hasInitialized = useRef(false)
  const sessionReadyRef = useRef(false)
  const audioStartPendingRef = useRef(false)
  const audioStartedRef = useRef(false)
  const pendingUserInputRef = useRef<{ content: string; source: 'text' } | null>(null)
  const currentVoiceInputRef = useRef('')
  const currentAIResponseRef = useRef('')
  const lastAIResponseRef = useRef('')

  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const currentMicrophoneDeviceIdRef = useRef('')

  // 权限状态
  const [systemPermissions, setSystemPermissions] = useState({
    screenRecording: { granted: false, canRequest: true, message: '' },
    microphone: { granted: false, canRequest: true, message: '' },
    apiKey: { granted: false, canRequest: true, message: '' },
    audioDevice: { granted: false, canRequest: true, message: '' },
  })

  // 音频模式选项
  const audioModeOptions = [
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
  ]

  // 状态图标
  const getStatusIcon = (status: any) => {
    if (status.granted) {
      return <CheckCircle className="w-5 h-5 text-green-500" />
    } else if (status.canRequest) {
      return <AlertCircle className="w-5 h-5 text-yellow-500" />
    } else {
      return <XCircle className="w-5 h-5 text-red-500" />
    }
  }

  const handleAudioModeChange = async (newMode: 'system' | 'microphone') => {
    console.log('🎧 切换音频模式:', currentAudioMode, '->', newMode)
    const modeLabel =
      newMode === 'system'
        ? t('collaboration.audioMode.system.label')
        : t('collaboration.audioMode.microphone.label')

    if (newMode === currentAudioMode) {
      return
    }

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
    } catch (error) {
      console.error('音频模式切换失败:', error)
      setStatus(t('collaboration.status.switchFailed'))
      setCurrentError({
        type: 'audio-device-error',
        message: t('collaboration.errors.audioSwitchError'),
      })
    }
  }

  const handleMicrophoneDeviceChange = useCallback(
    async (deviceId: string, label: string) => {
      console.log('🎤 用户手动切换麦克风设备:', label, deviceId)

      // 同步更新 state 和 ref
      const previousDeviceId = currentMicrophoneDeviceIdRef.current
      setCurrentMicrophoneDeviceId(deviceId)
      currentMicrophoneDeviceIdRef.current = deviceId

      let switchSuccess = true
      try {
        const capture = (window as any).rendererAudioCapture
        if (capture?.setMicrophoneDevice) {
          switchSuccess = await capture.setMicrophoneDevice(deviceId)
        }
      } catch (error) {
        console.error('切换麦克风设备失败:', error)
        switchSuccess = false
      }

      if (!switchSuccess) {
        if (previousDeviceId) {
          setCurrentMicrophoneDeviceId(previousDeviceId)
          currentMicrophoneDeviceIdRef.current = previousDeviceId
        }
        showToast('切换麦克风设备失败', 'error')
        return
      }

      if (window.bready && isConnected && currentAudioMode === 'microphone') {
        showToast(t('collaboration.toasts.deviceSwitched', { device: label }), 'success')
      }
    },
    [currentAudioMode, isConnected, t, showToast],
  )

  // 权限检查
  const checkPermissions = async () => {
    try {
      console.log('🔍 开始检查系统权限...')
      setStatus(t('collaboration.status.checkingPermissions'))

      const permissions = await window.bready.checkPermissions()
      console.log('🔍 权限检查结果:', permissions)

      setSystemPermissions(permissions)

      // 检查所有权限是否已授予
      const allGranted =
        permissions.screenRecording.granted &&
        permissions.microphone.granted &&
        permissions.apiKey.granted &&
        permissions.audioDevice.granted

      if (!allGranted) {
        console.log('❌ 权限未完全授予')
        setStatus(t('collaboration.status.permissionsIncomplete'))
        setCurrentError({
          type: 'permissions-not-set',
          message: t('collaboration.errors.permissionsHint'),
        })
        setIsInitializing(false)
        return
      }

      console.log('✅ 所有权限已授予，初始化 AI API')
      setStatus(t('collaboration.status.connecting'))

      // 初始化 AI API
      await initializeAI()
    } catch (error) {
      console.error('权限检查失败:', error)
      setStatus(t('collaboration.status.permissionsFailed'))
      setCurrentError({
        type: 'unknown-error',
        message: `${t('collaboration.status.permissionsFailed')}: ${error instanceof Error ? error.message : String(error)}`,
      })
      setIsInitializing(false)
    }
  }

  const startAudioCaptureOnce = async () => {
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
  }

  // 初始化 AI API
  const initializeAI = async () => {
    try {
      sessionReadyRef.current = false
      audioStartPendingRef.current = false
      audioStartedRef.current = false

      // 获取选择的准备项
      const selectedPreparationStr = localStorage.getItem('bready-selected-preparation')
      const customPrompt = selectedPreparationStr || ''

      const language = localStorage.getItem('bready-selected-language') || 'cmn-CN'
      const purpose = localStorage.getItem('bready-selected-purpose') || 'interview'

      console.log('📤 前端准备调用 initializeAI，参数:', {
        customPromptLength: customPrompt.length,
        language,
        purpose,
      })

      setStatus(t('collaboration.status.connecting'))

      // 初始化 AI 连接 (API Key 从数据库获取，前端传空字符串)
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
        setTimeout(() => {
          onExit()
        }, 800)
      }
    } catch (error) {
      console.error('初始化失败:', error)
      setIsInitializing(false)
      setCurrentError({
        type: 'unknown-error',
        message: `${t('collaboration.status.initFailed')}: ${error instanceof Error ? error.message : String(error)}`,
      })
      setStatus(t('collaboration.status.initFailed'))
      showToast(t('collaboration.toasts.connectionFailed'), 'error')
      setTimeout(() => {
        onExit()
      }, 800)
    }
  }

  // 重连处理
  const handleReconnect = async () => {
    if (!window.bready) return

    try {
      setStatus(t('collaboration.status.reconnecting'))
      setIsInitializing(true)
      setCurrentError(null)

      console.log('🔄 开始手动重连...')
      const success = await window.bready.manualReconnect()

      if (success) {
        setIsConnected(true)
        setStatus(t('collaboration.status.waitingReady'))
        setCurrentError(null)
        setIsInitializing(false)
        console.log('✅ 手动重连成功')
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
        console.log('❌ 手动重连失败')
      }
    } catch (error) {
      console.error('重连失败:', error)
      setIsConnected(false)
      setStatus(t('collaboration.status.reconnectFailed'))
      setIsInitializing(false)
      setCurrentError({
        type: 'unknown-error',
        message: `${t('collaboration.status.reconnectFailed')}: ${error instanceof Error ? error.message : String(error)}`,
      })
    }
  }

  const openSystemPreferences = async (pane: string) => {
    try {
      await window.bready.openSystemPreferences(pane)
    } catch (error) {
      console.error('打开系统偏好设置失败:', error)
    }
  }

  const handleSendMessage = async () => {
    if (!inputText.trim()) return

    const messageText = inputText.trim()

    const userMessage = {
      type: 'user' as const,
      content: messageText,
      timestamp: new Date(),
      source: 'text' as const,
    }

    addToHistory(userMessage)

    pendingUserInputRef.current = {
      content: messageText,
      source: 'text',
    }

    setInputText('')
    setIsWaitingForAI(true)
    lastAIResponseRef.current = ''

    if (!isConnected) {
      const errorMessage = {
        type: 'ai' as const,
        content: t('collaboration.errors.notConnected'),
        timestamp: new Date(),
        source: 'text' as const,
      }
      addToHistory(errorMessage)
      setIsWaitingForAI(false)
      return
    }

    try {
      console.log('📤 发送文字消息到 AI:', messageText)
      const result = await window.bready.sendTextMessage(messageText)

      if (!result.success) {
        console.error('❌ 发送文字消息到 AI 失败:', result.error)
        // 添加错误消息到对话记录
        const errorMessage = {
          type: 'ai' as const,
          content: t('collaboration.errors.sendFailed', {
            error: result.error || t('collaboration.errors.tryAgain'),
          }),
          timestamp: new Date(),
          source: 'text' as const,
        }
        addToHistory(errorMessage)
        setIsWaitingForAI(false)
      }
      // 如果发送成功，AI 的回复会通过 onAIResponse 事件监听器接收
    } catch (error) {
      console.error('❌ 发送文字消息错误:', error)
      const errorMessage = {
        type: 'ai' as const,
        content: t('collaboration.errors.sendError'),
        timestamp: new Date(),
        source: 'text' as const,
      }
      addToHistory(errorMessage)
      setIsWaitingForAI(false)
    }
  }

  // 退出确认处理
  const handleExitConfirm = async () => {
    setShowExitConfirm(false)
    setIsExiting(true)

    await new Promise((resolve) => setTimeout(resolve, 400))

    if (sessionRecordIdRef.current && sessionStartTimeRef.current) {
      try {
        const minutesUsed = Math.max(
          1,
          Math.ceil((Date.now() - sessionStartTimeRef.current.getTime()) / 60000),
        )
        await usageRecordService.endSession(sessionRecordIdRef.current, minutesUsed)
      } catch (err) {
        console.error('Failed to end usage session:', err)
      }
    }
    onExit()
  }

  // 自动滚动到最新消息
  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return
    container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' })
  }, [conversationHistory, currentVoiceInput, currentAIResponse])

  useEffect(() => {
    if (rootRef.current) {
      rootRef.current.scrollTo({ top: 0, left: 0 })
    }
  }, [])

  // 组件挂载时初始化
  useEffect(() => {
    // 只在第一次调用时检查权限（防止 React StrictMode 重复调用）
    if (!hasInitialized.current) {
      hasInitialized.current = true
      checkPermissions()
    }

    // 设置事件监听器（每次 mount 都需要设置）
    const removeStatusListener = window.bready.onStatusUpdate(setStatus)
    const removeTranscriptionListener = window.bready.onTranscriptionUpdate((text) => {
      console.log(
        '📝 [前端] 收到转录:',
        text?.substring(0, 30),
        '| AI回复中:',
        !!currentAIResponseRef.current,
      )

      // 如果 AI 正在回复中（有 currentAIResponse），忽略新的转录
      if (currentAIResponseRef.current) {
        return
      }

      // 更新当前语音输入状态
      if (text && text.trim().length > 0) {
        const trimmedText = text.trim()
        console.log('📝 [前端] 更新语音输入状态:', trimmedText.substring(0, 30))
        setCurrentVoiceInput(trimmedText)
        currentVoiceInputRef.current = trimmedText
        setIsWaitingForAI(true)
      }
    })
    const removeAIResponseUpdateListener = window.bready.onAIResponseUpdate((response) => {
      console.log('📝 [前端] 收到 AI 流式更新:', response?.substring(0, 30))
      if (!response.trim()) return
      setCurrentAIResponse(response)
      currentAIResponseRef.current = response
      setIsWaitingForAI(false)
    })
    // 新增：转录完成事件监听器 - 当语音转录完成时，立即将用户消息添加到历史记录
    const removeTranscriptionCompleteListener = window.bready.onTranscriptionComplete?.(
      (transcription: string) => {
        console.log('✅ [前端] 收到转录完成事件:', transcription?.substring(0, 30))

        if (!transcription?.trim()) return

        const timestamp = new Date()

        // 立即将用户语音消息添加到历史记录
        const userMessage = {
          type: 'user' as const,
          content: transcription.trim(),
          timestamp,
          source: 'voice' as const,
        }

        console.log('📝 [前端] 立即添加语音用户消息到历史记录')
        addToHistory(userMessage)

        // 清空当前语音输入显示（因为已经添加到历史记录了）
        setCurrentVoiceInput('')
        currentVoiceInputRef.current = ''

        // 设置等待 AI 标记（用于显示 "AI正在思考..."）
        setIsWaitingForAI(true)

        // 标记这是语音输入，AI 回复时只需添加 AI 消息
        pendingUserInputRef.current = {
          content: transcription.trim(),
          source: 'text', // 这里标记为 text 但实际上是为了让 AI 回复时知道用户消息已添加
        }
      },
    )

    const removeAIResponseListener = window.bready.onAIResponse((response) => {
      console.log('🎯 前端收到 AI 回复:', response)

      if (!response.trim()) return

      // 防重复检查
      if (response === lastAIResponseRef.current) {
        console.log('⚠️ 跳过重复的 AI 回复')
        return
      }

      lastAIResponseRef.current = response
      const timestamp = new Date()
      setCurrentAIResponse('')
      currentAIResponseRef.current = ''

      // 无论是文字输入还是语音输入（通过 transcription-complete 事件已添加用户消息），
      // 现在只需要添加 AI 回复
      console.log('📝 添加 AI 回复到历史记录')

      const aiMessage = {
        type: 'ai' as const,
        content: response,
        timestamp,
        source: pendingUserInputRef.current ? ('text' as const) : ('voice' as const),
      }

      addToHistory(aiMessage)
      pendingUserInputRef.current = null
      setCurrentVoiceInput('')
      currentVoiceInputRef.current = ''
      setIsWaitingForAI(false)
    })
    const removeSessionInitializingListener = window.bready.onSessionInitializing(
      async (initializing) => {
        if (!initializing) {
          setIsConnected(true)
          setCurrentError(null)
          if (user?.id && !sessionRecordIdRef.current) {
            try {
              sessionStartTimeRef.current = new Date()
              const record = await usageRecordService.startSession(user.id, 'collaboration')
              sessionRecordIdRef.current = record.id
            } catch (err) {
              console.error('Failed to start usage session:', err)
            }
          }
        }
      },
    )
    const removeSessionReadyListener = window.bready.onSessionReady(async () => {
      sessionReadyRef.current = true
      if (audioStartPendingRef.current && !audioStartedRef.current) {
        await startAudioCaptureOnce()
      }
    })
    const removeSessionErrorListener = window.bready.onSessionError((error) => {
      setIsConnected(false)
      setStatus(`${t('collaboration.errors.unknownError')}: ${error}`)
      setCurrentError({
        type: 'unknown-error',
        message: error,
      })
    })
    const removeSessionClosedListener = window.bready.onSessionClosed(() => {
      setIsConnected(false)
      setStatus(t('collaboration.status.disconnected'))
      sessionReadyRef.current = false
      audioStartPendingRef.current = false
      audioStartedRef.current = false
      showToast(t('collaboration.toasts.audioInterrupted'), 'error')
      setTimeout(() => {
        onExit()
      }, 1500)
    })

    // 监听音频设备变更事件
    const removeAudioDeviceChangedListener = window.bready.onAudioDeviceChanged?.(
      (data: { deviceId?: string; deviceLabel?: string }) => {
        console.log('🎤 设备已切换:', data.deviceLabel, data.deviceId)
        const nextId = data.deviceId || ''
        const nextLabel = data.deviceLabel || nextId // 如果 label 不可用，至少用 deviceId

        // 只要有 deviceId 就更新，不强制要求 label
        if (!nextId) {
          return
        }

        const previousId = currentMicrophoneDeviceIdRef.current

        currentMicrophoneDeviceIdRef.current = nextId
        setCurrentMicrophoneDeviceId(nextId)

        if (previousId && previousId !== nextId && nextLabel) {
          showToast(t('collaboration.toasts.deviceSwitched', { device: nextLabel }), 'info')
        }
      },
    )

    return () => {
      removeStatusListener()
      removeTranscriptionListener()
      removeAIResponseUpdateListener()
      removeTranscriptionCompleteListener?.()
      removeAIResponseListener()
      removeSessionInitializingListener()
      removeSessionReadyListener()
      removeSessionErrorListener()
      removeSessionClosedListener()
      removeAudioDeviceChangedListener?.()
      window.bready?.stopAudioCapture?.()
    }
  }, [])

  return (
    <motion.div
      ref={rootRef}
      initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
      animate={
        isExiting
          ? { opacity: 0, x: '-100%', filter: 'blur(10px)' }
          : { opacity: 1, scale: 1, filter: 'blur(0px)' }
      }
      exit={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="h-screen w-screen overflow-hidden bg-[var(--bready-bg)] text-[var(--bready-text)] flex flex-col relative"
    >
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="absolute -top-32 left-1/4 w-96 h-96 bg-gradient-to-br from-amber-500/10 to-orange-500/5 rounded-full blur-3xl"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="absolute -bottom-32 right-1/4 w-80 h-80 bg-gradient-to-tr from-emerald-500/10 to-teal-500/5 rounded-full blur-3xl"
        />
      </div>

      {copySuccess && (
        <div className="fixed top-4 right-4 z-[9999] animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2 px-4 py-2 bg-[var(--bready-surface)] border border-[var(--bready-border)] rounded-lg shadow-xl">
            <Check className="w-4 h-4 text-emerald-500" />
            <span className="text-sm text-[var(--bready-text)]">
              {t('collaboration.copySuccess')}
            </span>
          </div>
        </div>
      )}

      {/* ==================== 顶部控制栏 ==================== */}
      {/* 
        外层容器：
        - w-full: 占满整个宽度
        - bg-[var(--bready-bg)]: 使用主题背景色
        - z-50: 高层级，确保在其他元素之上
        - border-b: 底部边框
        - flex-shrink-0: 不允许收缩，保持固定高度
        - WebkitAppRegion: 'drag': 允许拖动窗口（macOS/Windows 窗口拖动区域）
        - paddingTop: macOS 上留出 20px 空间给系统红绿灯按钮
      */}
      <CollaborationHeader
        isMac={isMac}
        title={t('collaboration.title')}
        status={status}
        isConnected={isConnected}
        audioModeOptions={audioModeOptions}
        currentAudioMode={currentAudioMode}
        showAudioModeDropdown={showAudioModeDropdown}
        onToggleAudioModeDropdown={() => setShowAudioModeDropdown(!showAudioModeDropdown)}
        onAudioModeChange={handleAudioModeChange}
        onOpenPermissions={() => setShowPermissionsModal(true)}
        onExit={() => setShowExitConfirm(true)}
        currentMicrophoneDeviceId={currentMicrophoneDeviceId}
        onMicrophoneDeviceChange={handleMicrophoneDeviceChange}
      />

      {/* 主要内容区域 - 左右分栏布局 */}
      <div className="flex-1 flex overflow-hidden bg-[var(--bready-bg)]">
        <div className="flex-1 flex flex-col min-w-0 relative">
          <AnimatePresence>
            {currentError && !isInitializing && (
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.98 }}
                className="absolute top-4 left-4 right-4 z-50"
              >
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200/50 dark:border-red-800/30 rounded-xl p-4 shadow-sm flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-red-800 dark:text-red-300">
                      {currentError.message}
                    </p>
                  </div>
                  <button
                    onClick={handleReconnect}
                    className="px-3 py-1.5 bg-white dark:bg-red-900/40 border border-red-200 dark:border-red-800 rounded-lg text-xs font-medium text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/60 transition-colors"
                  >
                    {t('collaboration.actions.reconnect')}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {isInitialState ? (
              <motion.div
                key="initial"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="flex-1 flex flex-col items-center justify-center"
              >
                <div className="flex flex-col items-center text-center">
                  <span className="text-5xl mb-4">🍞</span>
                  <p className="text-[var(--bready-text-muted)] text-sm">面宝已准备好协助你了</p>
                  <div className="mt-4 flex items-center gap-2 text-xs text-[var(--bready-text-muted)]">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>正在聆听...</span>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="active"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="flex-1 flex flex-col h-full"
              >
                <div className="flex-[0.35] flex flex-col items-center justify-center p-6 overflow-hidden relative group bg-gradient-to-b from-transparent to-[var(--bready-surface)]/10">
                  <div className="max-w-xl w-full text-center z-10">
                    <div className="mb-3 flex items-center justify-center opacity-60 transition-opacity group-hover:opacity-100">
                      <div className="px-3 py-1 bg-[var(--bready-surface-2)]/50 rounded-full border border-[var(--bready-border)]/50 flex items-center gap-2">
                        {!!currentVoiceInput ? (
                          <>
                            <Mic className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--bready-text)]">
                              Listening
                            </span>
                          </>
                        ) : (
                          <>
                            <User className="w-3.5 h-3.5 text-blue-500" />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500">
                              You
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="min-h-[80px] flex items-center justify-center">
                      {(() => {
                        const latestUserMessage = [...conversationHistory]
                          .reverse()
                          .find((m) => m.type === 'user')
                        const content = currentVoiceInput.trim() || latestUserMessage?.content

                        if (!content) {
                          return (
                            <div className="text-[var(--bready-text-muted)] opacity-20 font-light text-3xl select-none">
                              ...
                            </div>
                          )
                        }

                        return (
                          <div className="relative inline-block">
                            <StreamingText
                              text={content}
                              className="font-medium leading-tight text-[var(--bready-text)] tracking-tight"
                              isInput={true}
                            />
                          </div>
                        )
                      })()}
                    </div>
                  </div>
                </div>

                <div className="flex-[0.65] flex flex-col items-center justify-center p-6 overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--bready-surface)]/5 to-[var(--bready-surface)]/10 pointer-events-none" />
                  <div className="max-w-xl w-full z-10 flex flex-col h-full">
                    <div className="-mb-3 flex items-center justify-center shrink-0">
                      <div className="w-10 h-10 bg-gradient-to-tr from-amber-100 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/10 rounded-full flex items-center justify-center shadow-sm border border-amber-100/50 dark:border-amber-900/30">
                        <span className="text-xl">🍞</span>
                      </div>
                    </div>

                    <div className="flex-1 flex items-center justify-center overflow-y-auto custom-scrollbar w-full">
                      {(() => {
                        const latestAIMessage = [...conversationHistory]
                          .reverse()
                          .find((m) => m.type === 'ai')
                        const content = currentAIResponse.trim() || latestAIMessage?.content

                        if (!content && !isWaitingForAI) {
                          return (
                            <div className="flex flex-col items-center justify-center gap-3 text-[var(--bready-text-muted)] opacity-30 select-none">
                              <div className="w-1.5 h-1.5 rounded-full bg-current" />
                              <span className="text-xs font-medium tracking-widest uppercase">
                                Ready
                              </span>
                            </div>
                          )
                        }

                        if (!content && isWaitingForAI) {
                          return (
                            <div className="flex items-center gap-2 text-[var(--bready-text-muted)]">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span className="text-sm font-medium animate-pulse">Thinking...</span>
                            </div>
                          )
                        }

                        return (
                          <StreamingMarkdown
                            text={content || ''}
                            className="w-full text-center leading-relaxed font-medium text-[var(--bready-text)]"
                            isStreaming={!!currentAIResponse.trim()}
                          />
                        )
                      })()}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex-shrink-0 p-4">
            <div className="max-w-xl mx-auto w-full relative group">
              <div className="relative flex items-center bg-[var(--bready-surface-2)]/50 rounded-2xl shadow-sm focus-within:shadow-md focus-within:bg-[var(--bready-surface-2)] transition-all duration-200 hover:bg-[var(--bready-surface-2)]/80 border border-[var(--bready-border)]/20">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={t('collaboration.input.placeholder')}
                  className="w-full bg-transparent border-none outline-none px-6 py-3.5 text-base focus:ring-0 focus:outline-none placeholder:text-[var(--bready-text-muted)]/60 text-[var(--bready-text)]"
                  onCompositionStart={() => setIsComposing(true)}
                  onCompositionEnd={() => setIsComposing(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isComposing && inputText.trim()) {
                      e.preventDefault()
                      handleSendMessage()
                    }
                  }}
                />
                {inputText && (
                  <button
                    onClick={() => setInputText('')}
                    className="p-2 text-[var(--bready-text-muted)] hover:text-[var(--bready-text)] transition-colors mr-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <div className="pr-1.5">
                  <Button
                    onClick={handleSendMessage}
                    disabled={!inputText.trim() || isWaitingForAI}
                    size="icon"
                    className="rounded-full w-9 h-9 bg-[var(--bready-text)] text-[var(--bready-bg)] hover:opacity-90 disabled:opacity-30 transition-all"
                  >
                    <Send className="w-4 h-4 ml-0.5" />
                  </Button>
                </div>
              </div>
              <div className="text-center mt-2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <span className="text-[10px] uppercase tracking-widest text-[var(--bready-text-muted)]">
                  {t('collaboration.input.helper')}
                </span>
              </div>
            </div>
          </div>
        </div>

        <CollaborationSidebar
          conversationHistory={conversationHistory}
          copyToClipboard={copyToClipboard}
          t={t}
        />
      </div>

      {/* 初始化加载状态 */}
      {isInitializing && (
        <div className="fixed inset-0 bg-[var(--bready-bg)] flex items-center justify-center z-[9999]">
          <div className="text-center p-6">
            <div className="w-16 h-16 mx-auto mb-4 relative">
              <div className="absolute inset-0 rounded-full bg-[var(--bready-border)] opacity-50 animate-ping"></div>
              <div
                className="absolute inset-2 rounded-full bg-[var(--bready-border)] opacity-70 animate-ping"
                style={{ animationDelay: '0.5s' }}
              ></div>
              <div className="absolute inset-4 rounded-full bg-[var(--bready-surface)] border border-[var(--bready-border)] flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-[var(--bready-text)] animate-spin" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-[var(--bready-text)] mb-2">{status}</h2>
            <p className="text-[var(--bready-text-muted)]">{t('collaboration.status.preparing')}</p>
          </div>
        </div>
      )}

      <AnimatePresence>
        {showExitConfirm && (
          <Modal isOpen onClose={() => setShowExitConfirm(false)} size="sm" className="max-w-sm">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="text-center relative py-2"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1, duration: 0.3 }}
                className="w-12 h-12 mx-auto mb-5 bg-black dark:bg-white rounded-xl flex items-center justify-center"
              >
                <DoorOpen className="w-6 h-6 text-white dark:text-black" />
              </motion.div>

              <motion.h3
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.25 }}
                className="text-lg font-semibold text-[var(--bready-text)] mb-2"
              >
                {t('collaboration.exit.title')}
              </motion.h3>

              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.25 }}
                className="text-sm text-[var(--bready-text-muted)] mb-6 leading-relaxed"
              >
                {t('collaboration.exit.description')}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.25 }}
                className="flex gap-3"
              >
                <button
                  onClick={() => setShowExitConfirm(false)}
                  className="flex-1 px-4 py-2.5 bg-[var(--bready-surface-2)] hover:bg-[var(--bready-surface-3)] border border-[var(--bready-border)] rounded-lg text-sm font-medium text-[var(--bready-text)] transition-all duration-200 cursor-pointer"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleExitConfirm}
                  className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 rounded-lg text-sm font-medium text-white transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
                >
                  <DoorOpen className="w-4 h-4" />
                  {t('collaboration.exit.confirm')}
                </button>
              </motion.div>
            </motion.div>
          </Modal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPermissionsModal && (
          <Modal
            isOpen
            onClose={() => setShowPermissionsModal(false)}
            size="sm"
            className="max-w-md"
          >
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="mb-6"
              >
                <h2 className="text-xl font-bold text-[var(--bready-text)]">
                  {t('collaboration.permissions.title')}
                </h2>
              </motion.div>

              <div className="space-y-3">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  onClick={() =>
                    !systemPermissions.screenRecording.granted &&
                    openSystemPreferences('screen-recording')
                  }
                  className={`group relative overflow-hidden rounded-xl p-4 transition-all duration-300 ${
                    !systemPermissions.screenRecording.granted
                      ? 'cursor-pointer hover:scale-[1.02]'
                      : ''
                  } ${
                    systemPermissions.screenRecording.granted
                      ? 'bg-emerald-500/10 border border-emerald-500/20'
                      : 'bg-[var(--bready-surface-2)] border border-[var(--bready-border)] hover:border-amber-500/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        systemPermissions.screenRecording.granted
                          ? 'bg-emerald-500/20'
                          : 'bg-[var(--bready-surface-3)]'
                      }`}
                    >
                      <Volume2
                        className={`w-5 h-5 ${
                          systemPermissions.screenRecording.granted
                            ? 'text-emerald-500'
                            : 'text-[var(--bready-text-muted)]'
                        }`}
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-[var(--bready-text)]">
                          {t('collaboration.permissions.systemAudio')}
                        </span>
                        {getStatusIcon(systemPermissions.screenRecording)}
                      </div>
                      <p className="text-xs text-[var(--bready-text-muted)] mt-0.5">
                        {t('collaboration.permissions.systemAudioDesc')}
                      </p>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 }}
                  onClick={() =>
                    !systemPermissions.microphone.granted && openSystemPreferences('microphone')
                  }
                  className={`group relative overflow-hidden rounded-xl p-4 transition-all duration-300 ${
                    !systemPermissions.microphone.granted ? 'cursor-pointer hover:scale-[1.02]' : ''
                  } ${
                    systemPermissions.microphone.granted
                      ? 'bg-emerald-500/10 border border-emerald-500/20'
                      : 'bg-[var(--bready-surface-2)] border border-[var(--bready-border)] hover:border-amber-500/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        systemPermissions.microphone.granted
                          ? 'bg-emerald-500/20'
                          : 'bg-[var(--bready-surface-3)]'
                      }`}
                    >
                      <Mic
                        className={`w-5 h-5 ${
                          systemPermissions.microphone.granted
                            ? 'text-emerald-500'
                            : 'text-[var(--bready-text-muted)]'
                        }`}
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-[var(--bready-text)]">
                          {t('collaboration.permissions.microphone')}
                        </span>
                        {getStatusIcon(systemPermissions.microphone)}
                      </div>
                      <p className="text-xs text-[var(--bready-text-muted)] mt-0.5">
                        {t('collaboration.permissions.microphoneDesc')}
                      </p>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className={`group relative overflow-hidden rounded-xl p-4 transition-all duration-300 ${
                    isConnected
                      ? 'bg-emerald-500/10 border border-emerald-500/20'
                      : 'bg-red-500/10 border border-red-500/20'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        isConnected ? 'bg-emerald-500/20' : 'bg-red-500/20'
                      }`}
                    >
                      {isConnected ? (
                        <Wifi className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <WifiOff className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-[var(--bready-text)]">
                          {t('collaboration.permissions.network')}
                        </span>
                        {isConnected ? (
                          <CheckCircle className="w-5 h-5 text-emerald-500" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-500" />
                        )}
                      </div>
                      <p className="text-xs text-[var(--bready-text-muted)] mt-0.5">
                        {isConnected
                          ? t('collaboration.permissions.networkConnectedDesc')
                          : t('collaboration.permissions.networkDisconnectedDesc')}
                      </p>
                    </div>
                  </div>
                  {!isConnected && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-3"
                    >
                      <Button
                        onClick={handleReconnect}
                        variant="outline"
                        size="sm"
                        className="w-full"
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        {t('collaboration.permissions.reconnect')}
                      </Button>
                    </motion.div>
                  )}
                </motion.div>
              </div>
            </motion.div>
          </Modal>
        )}
      </AnimatePresence>

      {/* 确认对话框 */}
      {showConfirmationDialog && (
        <ConfirmationDialog
          title={showConfirmationDialog.title}
          message={showConfirmationDialog.message}
          onConfirm={showConfirmationDialog.onConfirm}
          onCancel={() => setShowConfirmationDialog(null)}
        />
      )}
    </motion.div>
  )
}

export default CollaborationMode
