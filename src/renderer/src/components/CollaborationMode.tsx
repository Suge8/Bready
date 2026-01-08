import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Send, RefreshCw, Mic, Volume2, X, AlertCircle, CheckCircle, XCircle, Loader2, Wifi, WifiOff, Copy, Check } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'
import { ToastNotification, ConfirmationDialog } from './ui/notifications'
import { TouchButton } from './ui/touch-optimized'
import 'highlight.js/styles/github.css'
import { useI18n } from '../contexts/I18nContext'
import { Modal } from './ui/Modal'
import CollaborationHeader from './collaboration/CollaborationHeader'
import CollaborationSidebar from './collaboration/CollaborationSidebar'

interface CollaborationModeProps {
  onExit: () => void
}

const CollaborationMode: React.FC<CollaborationModeProps> = ({ onExit }) => {
  const { t } = useI18n()
  const isMac = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform)
  // 状态管理
  const [inputText, setInputText] = useState('')
  const [status, setStatus] = useState(t('collaboration.status.initializing'))
  const [isConnected, setIsConnected] = useState(false)
  const [conversationHistory, setConversationHistory] = useState<Array<{ type: 'user' | 'ai', content: string, timestamp: Date, source: 'voice' | 'text' }>>([])
  const [isWaitingForAI, setIsWaitingForAI] = useState(false)
  const [currentVoiceInput, setCurrentVoiceInput] = useState('')
  const [currentAIResponse, setCurrentAIResponse] = useState('')
  const [isComposing, setIsComposing] = useState(false)
  const [showExitConfirm, setShowExitConfirm] = useState(false)
  const [currentAudioMode, setCurrentAudioMode] = useState<'system' | 'microphone'>('system')
  const [showAudioModeDropdown, setShowAudioModeDropdown] = useState(false)
  const [currentError, setCurrentError] = useState<{ type: string, message: string } | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null)
  const [showConfirmationDialog, setShowConfirmationDialog] = useState<{
    title: string;
    message: string;
    onConfirm: () => void
  } | null>(null)
  const [showPermissionsModal, setShowPermissionsModal] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)
  const [currentMicrophoneDeviceId, setCurrentMicrophoneDeviceId] = useState<string>('')

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
  const pendingUserInputRef = useRef<{ content: string, source: 'text' } | null>(null)
  const currentVoiceInputRef = useRef('')
  const currentAIResponseRef = useRef('')
  const lastAIResponseRef = useRef('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const currentMicrophoneDeviceIdRef = useRef('')


  // 权限状态
  const [systemPermissions, setSystemPermissions] = useState({
    screenRecording: { granted: false, canRequest: true, message: '' },
    microphone: { granted: false, canRequest: true, message: '' },
    apiKey: { granted: false, canRequest: true, message: '' },
    audioDevice: { granted: false, canRequest: true, message: '' }
  })

  // 音频模式选项
  const audioModeOptions = [
    {
      value: 'system' as const,
      label: t('collaboration.audioMode.system.label'),
      icon: <Volume2 className="w-4 h-4" />,
      description: t('collaboration.audioMode.system.description')
    },
    {
      value: 'microphone' as const,
      label: t('collaboration.audioMode.microphone.label'),
      icon: <Mic className="w-4 h-4" />,
      description: t('collaboration.audioMode.microphone.description')
    }
  ]

  // 错误标题映射
  const getErrorTitle = (errorType: string) => {
    switch (errorType) {
      case 'api-connection-failed':
        return t('collaboration.errors.apiConnectionFailed')
      case 'audio-device-error':
        return t('collaboration.errors.audioDeviceError')
      case 'permissions-not-set':
        return t('collaboration.errors.permissionsNotSet')
      case 'network-error':
        return t('collaboration.errors.networkError')
      case 'unknown-error':
        return t('collaboration.errors.unknownError')
      default:
        return t('collaboration.errors.unknownError')
    }
  }

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

  // 状态文本
  const getStatusText = (status: any) => {
    if (status.granted) return t('collaboration.permissions.granted')
    if (status.canRequest) return t('collaboration.permissions.needsSetup')
    return t('collaboration.permissions.denied')
  }

  // 音频模式切换处理
  const handleAudioModeChange = async (newMode: 'system' | 'microphone') => {
    console.log('🎧 切换音频模式:', currentAudioMode, '->', newMode)
    const modeLabel = newMode === 'system'
      ? t('collaboration.audioMode.system.label')
      : t('collaboration.audioMode.microphone.label')

    if (newMode === currentAudioMode) {
      setShowAudioModeDropdown(false)
      return
    }

    setCurrentAudioMode(newMode)
    setShowAudioModeDropdown(false)

    // 在 Electron 环境中更新音频设置
    if (window.bready && isConnected) {
      try {
        setStatus(t('collaboration.status.switchingAudio'))

        // 使用新的 API 直接切换模式
        const success = await window.bready.switchAudioMode(newMode)

        if (success) {
          setStatus(t('collaboration.status.switched', { mode: modeLabel }))

          // 2秒后恢复正常状态
          setTimeout(() => {
            if (isConnected) {
              setStatus(t('collaboration.status.ready'))
            }
          }, 2000)
        } else {
          setStatus(t('collaboration.status.switchFailed'))
          setCurrentError({
            type: 'audio-device-error',
            message: t('collaboration.errors.audioSwitchFailed', { mode: modeLabel })
          })
        }
      } catch (error) {
        console.error('音频模式切换失败:', error)
        setStatus(t('collaboration.status.switchFailed'))
        setCurrentError({
          type: 'audio-device-error',
          message: t('collaboration.errors.audioSwitchError')
        })
      }
    } else {
      // 浏览器模式下的模拟切换
      setStatus(t('collaboration.status.browserSwitched', { mode: modeLabel }))
      setTimeout(() => {
        setStatus(t('collaboration.status.browserPreview'))
      }, 2000)
    }
  }

  const handleMicrophoneDeviceChange = useCallback(async (deviceId: string, label: string) => {
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
      setToast({
        message: '切换麦克风设备失败',
        type: 'error'
      })
      return
    }

    if (window.bready && isConnected && currentAudioMode === 'microphone') {
      setToast({
        message: t('collaboration.toasts.deviceSwitched', { device: label }),
        type: 'success'
      })
    }
  }, [currentAudioMode, isConnected, t])

  // 权限检查
  const checkPermissions = async () => {
    try {
      console.log('🔍 开始检查系统权限...')
      setStatus(t('collaboration.status.checkingPermissions'))

      // 检查是否在 Electron 环境中
      if (!window.bready) {
        console.log('🌐 浏览器模式 - 跳过权限检查')
        setIsInitializing(false)
        setStatus(t('collaboration.status.browserPreview'))
        return
      }

      // 调用主进程权限检查
      const permissions = await window.bready.checkPermissions()
      console.log('🔍 权限检查结果:', permissions)

      setSystemPermissions(permissions)

      // 检查所有权限是否已授予
      const allGranted = permissions.screenRecording.granted &&
        permissions.microphone.granted &&
        permissions.apiKey.granted &&
        permissions.audioDevice.granted

      if (!allGranted) {
        console.log('❌ 权限未完全授予')
        setStatus(t('collaboration.status.permissionsIncomplete'))
        setCurrentError({
          type: 'permissions-not-set',
          message: t('collaboration.errors.permissionsHint')
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
        message: `${t('collaboration.status.permissionsFailed')}: ${error instanceof Error ? error.message : String(error)}`
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
      message: t('collaboration.errors.audioStartFailed')
    })
    setStatus(t('collaboration.status.audioFailed'))
  }

  // 初始化 AI API
  const initializeAI = async () => {
    try {
      let apiKey = ''
      sessionReadyRef.current = false
      audioStartPendingRef.current = false
      audioStartedRef.current = false

      // 从环境变量获取 API 密钥
      if (window.env && window.env.GEMINI_API_KEY) {
        apiKey = window.env.GEMINI_API_KEY
      }

      // 从 localStorage 获取（备用）
      if (!apiKey) {
        const storedKey = localStorage.getItem('gemini-api-key')
        if (storedKey) {
          apiKey = storedKey
        }
      }

      if (!apiKey) {
        setIsInitializing(false)
        setCurrentError({
          type: 'api-connection-failed',
          message: t('collaboration.errors.apiKeyMissing')
        })
        setStatus(t('collaboration.status.apiKeyMissing'))
        return
      }

      // 获取选择的准备项
      const selectedPreparationStr = localStorage.getItem('bready-selected-preparation')
      let customPrompt = selectedPreparationStr || ''

      let language = localStorage.getItem('bready-selected-language') || 'cmn-CN'
      const purpose = localStorage.getItem('bready-selected-purpose') || 'interview'

      console.log('📤 前端准备调用 initializeAI，参数:', {
        customPromptLength: customPrompt.length,
        language,
        purpose
      })

      setStatus(t('collaboration.status.connecting'))
      console.log('🤖 初始化 AI API，API 密钥长度:', apiKey.length)

      // 初始化 AI 连接
      const success = await window.bready.initializeAI(apiKey, customPrompt, purpose, language)

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
          message: t('collaboration.errors.connectFailed')
        })
        setStatus(t('collaboration.status.connectFailed'))
        setToast({ message: t('collaboration.toasts.connectionFailed'), type: 'error' })
        setTimeout(() => {
          onExit()
        }, 800)
      }
    } catch (error) {
      console.error('初始化失败:', error)
      setIsInitializing(false)
      setCurrentError({
        type: 'unknown-error',
        message: `${t('collaboration.status.initFailed')}: ${error instanceof Error ? error.message : String(error)}`
      })
      setStatus(t('collaboration.status.initFailed'))
      setToast({ message: t('collaboration.toasts.connectionFailed'), type: 'error' })
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
          message: t('collaboration.errors.reconnectFailed')
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
        message: `${t('collaboration.status.reconnectFailed')}: ${error instanceof Error ? error.message : String(error)}`
      })
    }
  }

  // 发送消息处理
  const handleSendMessage = async () => {
    if (!inputText.trim()) return

    const messageText = inputText.trim()

    // 添加用户消息到对话记录
    const userMessage = {
      type: 'user' as const,
      content: messageText,
      timestamp: new Date(),
      source: 'text' as const
    }

    setConversationHistory(prev => [...prev, userMessage])

    // 设置pending状态，用于AI回复时的历史记录处理
    pendingUserInputRef.current = {
      content: messageText,
      source: 'text'
    }

    // 清空输入框并设置等待AI状态
    setInputText('')
    setIsWaitingForAI(true)

    // 重置AI回复记录
    lastAIResponseRef.current = ''

    // 检查是否在 Electron 环境中
    if (!window.bready) {
      // 浏览器环境下的模拟回复
      setTimeout(() => {
        const aiMessage = {
          type: 'ai' as const,
          content: t('collaboration.previewReply', { message: messageText }),
          timestamp: new Date(),
          source: 'text' as const
        }
        setConversationHistory(prev => [...prev, aiMessage])

        setIsWaitingForAI(false)
      }, 1000)
      return
    }

    // 检查连接状态
    if (!isConnected) {
      const errorMessage = {
        type: 'ai' as const,
        content: t('collaboration.errors.notConnected'),
        timestamp: new Date(),
        source: 'text' as const
      }
      setConversationHistory(prev => [...prev, errorMessage])
      setIsWaitingForAI(false)
      return
    }

    try {
      // 发送文字消息到 AI 模型
      console.log('📤 发送文字消息到 AI:', messageText)
      const result = await window.bready.sendTextMessage(messageText)

      if (!result.success) {
        console.error('❌ 发送文字消息到 AI 失败:', result.error)
        // 添加错误消息到对话记录
        const errorMessage = {
          type: 'ai' as const,
          content: t('collaboration.errors.sendFailed', { error: result.error || t('collaboration.errors.tryAgain') }),
          timestamp: new Date(),
          source: 'text' as const
        }
        setConversationHistory(prev => [...prev, errorMessage])
        setIsWaitingForAI(false)
      }
      // 如果发送成功，AI 的回复会通过 onAIResponse 事件监听器接收
    } catch (error) {
      console.error('❌ 发送文字消息错误:', error)
      const errorMessage = {
        type: 'ai' as const,
        content: t('collaboration.errors.sendError'),
        timestamp: new Date(),
        source: 'text' as const
      }
      setConversationHistory(prev => [...prev, errorMessage])
      setIsWaitingForAI(false)
    }
  }

  // 退出确认处理
  const handleExitConfirm = () => {
    setShowExitConfirm(false)
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

    // 如果不在 Electron 环境中，跳过事件监听器设置
    if (!window.bready) {
      console.log('🌐 浏览器模式 - 跳过事件监听器设置')
      setIsInitializing(false)
      setStatus(t('collaboration.status.browserPreview'))
      return
    }

    // 设置事件监听器（每次 mount 都需要设置）
    const removeStatusListener = window.bready.onStatusUpdate(setStatus)
    const removeTranscriptionListener = window.bready.onTranscriptionUpdate((text) => {
      console.log('📝 [前端] 收到转录:', text?.substring(0, 30), '| AI回复中:', !!currentAIResponseRef.current)

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
    const removeTranscriptionCompleteListener = window.bready.onTranscriptionComplete?.((transcription: string) => {
      console.log('✅ [前端] 收到转录完成事件:', transcription?.substring(0, 30))

      if (!transcription?.trim()) return

      const timestamp = new Date()

      // 立即将用户语音消息添加到历史记录
      const userMessage = {
        type: 'user' as const,
        content: transcription.trim(),
        timestamp,
        source: 'voice' as const
      }

      console.log('📝 [前端] 立即添加语音用户消息到历史记录')
      setConversationHistory(prev => [...prev, userMessage])

      // 清空当前语音输入显示（因为已经添加到历史记录了）
      setCurrentVoiceInput('')
      currentVoiceInputRef.current = ''

      // 设置等待 AI 标记（用于显示 "AI正在思考..."）
      setIsWaitingForAI(true)

      // 标记这是语音输入，AI 回复时只需添加 AI 消息
      pendingUserInputRef.current = {
        content: transcription.trim(),
        source: 'text' // 这里标记为 text 但实际上是为了让 AI 回复时知道用户消息已添加
      }
    })

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
        source: pendingUserInputRef.current ? 'text' as const : 'voice' as const
      }

      setConversationHistory(prev => [...prev, aiMessage])
      pendingUserInputRef.current = null
      setCurrentVoiceInput('')
      currentVoiceInputRef.current = ''
      setIsWaitingForAI(false)
    })
    const removeSessionInitializingListener = window.bready.onSessionInitializing((initializing) => {
      if (!initializing) {
        setIsConnected(true)
        setCurrentError(null)
      }
    })
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
        message: error
      })
    })
    const removeSessionClosedListener = window.bready.onSessionClosed(() => {
      setIsConnected(false)
      setStatus(t('collaboration.status.disconnected'))
      sessionReadyRef.current = false
      audioStartPendingRef.current = false
      audioStartedRef.current = false
      setCurrentError({
        type: 'api-connection-failed',
        message: t('collaboration.errors.audioInterrupted')
      })
    })

    // 监听音频设备变更事件
    const removeAudioDeviceChangedListener = window.bready.onAudioDeviceChanged?.((data: { deviceId?: string; deviceLabel?: string }) => {
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

      // 只有当设备真正改变时才显示 Toast
      if (previousId && previousId !== nextId && nextLabel) {
        setToast({
          message: t('collaboration.toasts.deviceSwitched', { device: nextLabel }),
          type: 'info'
        })
      }
    })

    // 返回清理函数
    return () => {
      // 清理事件监听器
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
    }
  }, [])

  return (
    <div ref={rootRef} className="h-screen w-screen overflow-hidden bg-[var(--bready-bg)] text-[var(--bready-text)] flex flex-col relative transition-colors duration-300">
      {/* 背景光晕效果已移除，确保背景色统一 */}
      {/* <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[720px] h-[420px] bg-[radial-gradient(circle,_var(--bready-glow)_0%,_transparent_65%)] blur-[120px]" />
        <div className="absolute bottom-[-120px] right-[-60px] w-[360px] h-[280px] bg-[radial-gradient(circle,_var(--bready-glow)_0%,_transparent_70%)] blur-[120px]" />
      </div> */}
      {/* 复制成功提示 */}
      {copySuccess && (
        <div className="fixed top-4 right-4 z-[9999] animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2 px-4 py-2 bg-[var(--bready-surface)] border border-[var(--bready-border)] rounded-lg shadow-xl">
            <Check className="w-4 h-4 text-emerald-500" />
            <span className="text-sm text-[var(--bready-text)]">{t('collaboration.copySuccess')}</span>
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
      <div className="flex-1 flex p-4 gap-4 overflow-hidden bg-[var(--bready-bg)]">

        {/* 左侧主区域 - 实时问答 (约3/4宽度) */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* 错误提示 */}
          {currentError && !isInitializing && (
            <Card className="mb-4 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 rounded-xl animate-in fade-in slide-in-from-top-2 duration-300">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                    <span className="font-medium text-red-800 dark:text-red-200">
                      {getErrorTitle(currentError.type)}
                    </span>
                  </div>
                  <button
                    onClick={handleReconnect}
                    className="px-3 py-1 bg-red-100 dark:bg-red-800/30 hover:bg-red-200 dark:hover:bg-red-700/50 text-red-700 dark:text-red-300 rounded-lg text-sm font-medium transition-colors cursor-pointer"
                  >
                    {t('collaboration.actions.reconnect')}
                  </button>
                </div>
                <p className="text-red-700 dark:text-red-300 text-sm mt-2">{currentError.message}</p>
              </CardContent>
            </Card>
          )}

          {/* 实时问答展示区 - 固定布局，只有内容区域动态变化 */}
          <div className="flex-1 flex flex-col overflow-hidden relative">
            {/* 空状态 - 绝对定位居中，有消息时淡出 */}
            <div className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ${conversationHistory.length === 0 && !currentVoiceInput.trim() && !currentAIResponse.trim() && !isWaitingForAI ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
              <div className="text-center text-[var(--bready-text-muted)]">
                <div className="w-20 h-20 mx-auto mb-6 bg-[var(--bready-surface-2)] rounded-full flex items-center justify-center backdrop-blur-sm animate-pulse">
                  <Mic className="w-10 h-10 text-[var(--bready-text-muted)]" />
                </div>
                <p className="text-lg font-medium text-[var(--bready-text)]">
                  {currentAudioMode === 'system' ? t('collaboration.empty.system') : t('collaboration.empty.microphone')}
                </p>
                <p className="text-sm mt-2 text-[var(--bready-text-muted)]">{t('collaboration.empty.helper')}</p>
              </div>
            </div>

            {/* 聊天内容区域 - 绝对定位，有消息时显示 */}
            <div ref={messagesContainerRef} className={`absolute inset-0 flex flex-col items-center justify-start pt-6 overflow-y-auto transition-all duration-500 ${conversationHistory.length > 0 || currentVoiceInput.trim() || currentAIResponse.trim() || isWaitingForAI ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
              <div className="w-full max-w-3xl space-y-8 px-4 pb-4">
                {/* 最新用户提问 - 从历史记录或实时输入中获取 */}
                {(() => {
                  // 获取最新的用户消息
                  const latestUserMessage = [...conversationHistory].reverse().find(m => m.type === 'user')
                  const showUserMessage = currentVoiceInput.trim() || latestUserMessage

                  if (!showUserMessage && !isWaitingForAI) return null

                  const userContent = currentVoiceInput.trim() || latestUserMessage?.content || ''
                  const isTranscribing = !!currentVoiceInput.trim()

                  if (!userContent) return null

                  return (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/40 ring-2 ring-emerald-400/20">
                          <Mic className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-[var(--bready-text)]">
                            {isTranscribing ? t('collaboration.labels.transcribing') : t('collaboration.labels.input')}
                          </span>
                          {isTranscribing && (
                            <div className="flex gap-1 mt-1">
                              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" />
                              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="bg-gradient-to-br from-emerald-500/20 via-emerald-500/10 to-teal-500/15 backdrop-blur-2xl rounded-3xl p-7 border border-emerald-400/40 shadow-2xl shadow-emerald-500/20 relative group/user hover:shadow-emerald-500/30 transition-all duration-300">
                        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-emerald-400/5 to-transparent pointer-events-none" />
                        <p className="text-xl text-[var(--bready-text)] leading-relaxed font-medium relative z-10">{userContent}</p>
                        {/* 复制按钮 */}
                        <button
                          onClick={() => copyToClipboard(userContent)}
                          className="absolute bottom-4 right-4 p-2.5 bg-emerald-500/15 hover:bg-emerald-500/25 rounded-xl opacity-0 group-hover/user:opacity-100 transition-all duration-200 cursor-pointer hover:scale-105"
                          title={t('collaboration.actions.copy')}
                        >
                          <Copy className="w-4 h-4 text-emerald-600 dark:text-emerald-200" />
                        </button>
                      </div>
                    </div>
                  )
                })()}

                {/* AI 回复区域 */}
                {(() => {
                  // 获取最新的 AI 消息
                  const latestAIMessage = [...conversationHistory].reverse().find(m => m.type === 'ai')
                  const showAIMessage = currentAIResponse.trim() || latestAIMessage || isWaitingForAI

                  if (!showAIMessage) return null

                  const aiContent = currentAIResponse.trim() || latestAIMessage?.content || ''
                  const isResponding = !!currentAIResponse.trim()

                  return (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '0.15s' }}>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/40 ring-2 ring-amber-400/20">
                          <span className="text-base">🍞</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-[var(--bready-text)]">
                            {isWaitingForAI && !aiContent ? t('collaboration.labels.thinking') : isResponding ? t('collaboration.labels.responding') : t('collaboration.labels.bready')}
                          </span>
                          {(isWaitingForAI || isResponding) && (
                            <div className="flex gap-1 mt-1">
                              <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" />
                              <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                              <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="bg-[var(--bready-surface)] backdrop-blur-2xl rounded-3xl p-7 border border-[var(--bready-border)] shadow-2xl shadow-black/10 relative group/ai hover:border-[var(--bready-border)] transition-all duration-300">
                        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-black/[0.02] to-transparent pointer-events-none" />
                        {aiContent ? (
                          <>
                            <div className="prose prose-lg max-w-none text-[var(--bready-text)] prose-p:text-[var(--bready-text)] prose-p:leading-relaxed prose-headings:text-[var(--bready-text)] prose-strong:text-[var(--bready-text)] prose-em:text-[var(--bready-text-muted)] prose-code:text-amber-500 dark:prose-code:text-amber-300 prose-code:bg-black/5 dark:prose-code:bg-white/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-lg prose-li:text-[var(--bready-text)] prose-a:text-emerald-600 dark:prose-a:text-emerald-300 prose-a:no-underline hover:prose-a:underline relative z-10 dark:prose-invert">
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                rehypePlugins={[rehypeHighlight]}
                              >
                                {aiContent}
                              </ReactMarkdown>
                            </div>
                            {/* 复制按钮 */}
                            <button
                              onClick={() => copyToClipboard(aiContent)}
                              className="absolute bottom-4 right-4 p-2.5 bg-[var(--bready-surface-2)] hover:bg-[var(--bready-surface-3)] rounded-xl opacity-0 group-hover/ai:opacity-100 transition-all duration-200 cursor-pointer hover:scale-105"
                              title={t('collaboration.actions.copy')}
                            >
                              <Copy className="w-4 h-4 text-[var(--bready-text-muted)]" />
                            </button>
                          </>
                        ) : (
                          <div className="flex items-center gap-4 text-[var(--bready-text)]">
                            <div className="w-6 h-6 border-2 border-[var(--bready-border)] border-t-amber-400 rounded-full animate-spin" />
                            <span className="text-[var(--bready-text-muted)] font-medium">{t('collaboration.aiThinking')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })()}

                {/* 滚动目标元素 */}
                <div ref={messagesEndRef} />
              </div>
            </div>
          </div>

          {/* 输入区域 */}
          <div className="pt-4 -mb-2 mt-auto">
            <div className="flex items-center space-x-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={t('collaboration.input.placeholder')}
                  className="w-full px-5 py-4 bg-[var(--bready-surface-2)] backdrop-blur-sm border border-[var(--bready-border)] rounded-2xl focus:outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/20 focus:border-[var(--bready-border)] text-[var(--bready-text)] placeholder:text-[var(--bready-text-muted)] text-base transition-all duration-200"
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
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-[var(--bready-text-muted)] hover:text-[var(--bready-text)] cursor-pointer transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <TouchButton
                onClick={handleSendMessage}
                disabled={!inputText.trim() || isWaitingForAI}
                className="w-12 h-12 bg-black hover:opacity-90 text-white dark:bg-white dark:text-black rounded-xl flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer hover:scale-105"
              >
                <Send className="w-5 h-5" />
              </TouchButton>
            </div>
            <div className="flex items-center justify-center mt-2 text-[10px] text-[var(--bready-text-muted)]">
              <span>{t('collaboration.input.helper')}</span>
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
      {
        isInitializing && (
          <div className="fixed inset-0 bg-[var(--bready-bg)] flex items-center justify-center z-[9999]">
            <div className="text-center p-6">
              <div className="w-16 h-16 mx-auto mb-4 relative">
                <div className="absolute inset-0 rounded-full bg-[var(--bready-border)] opacity-50 animate-ping"></div>
                <div className="absolute inset-2 rounded-full bg-[var(--bready-border)] opacity-70 animate-ping" style={{ animationDelay: '0.5s' }}></div>
                <div className="absolute inset-4 rounded-full bg-[var(--bready-surface)] border border-[var(--bready-border)] flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-[var(--bready-text)] animate-spin" />
                </div>
              </div>
              <h2 className="text-xl font-bold text-[var(--bready-text)] mb-2">{status}</h2>
              <p className="text-[var(--bready-text-muted)]">{t('collaboration.status.preparing')}</p>
            </div>
          </div>
        )
      }

      {/* 退出确认对话框 */}
      {showExitConfirm && (
        <Modal
          isOpen
          onClose={() => setShowExitConfirm(false)}
          size="sm"
          className="max-w-sm"
        >
          <div className="text-center">
            <div className="w-12 h-12 bg-red-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="text-lg font-semibold text-[var(--bready-text)] mb-2">
              {t('collaboration.exit.title')}
            </h3>
            <p className="text-[var(--bready-text-muted)] mb-6">
              {t('collaboration.exit.description')}
            </p>
            <Button onClick={handleExitConfirm} variant="danger" fullWidth>
              {t('collaboration.exit.confirm')}
            </Button>
          </div>
        </Modal>
      )}

      {/* 权限设置模态框 */}
      {showPermissionsModal && (
        <Modal
          isOpen
          onClose={() => setShowPermissionsModal(false)}
          size="sm"
          className="max-w-md"
        >
          <div className="mb-6">
            <h2 className="text-xl font-bold text-[var(--bready-text)]">
              {t('collaboration.permissions.title')}
            </h2>
          </div>

          <div className="space-y-4">
            <div className="bg-[var(--bready-surface-2)] rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Volume2 className="w-5 h-5 text-[var(--bready-text-muted)]" />
                  <span className="font-medium text-[var(--bready-text)]">{t('collaboration.permissions.systemAudio')}</span>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(systemPermissions.screenRecording)}
                  <span className="text-sm font-medium text-emerald-600 dark:text-emerald-300">
                    {getStatusText(systemPermissions.screenRecording)}
                  </span>
                </div>
              </div>
              <p className="text-sm text-[var(--bready-text-muted)]">{t('collaboration.permissions.systemAudioDesc')}</p>
            </div>

            <div className="bg-[var(--bready-surface-2)] rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Mic className="w-5 h-5 text-[var(--bready-text-muted)]" />
                  <span className="font-medium text-[var(--bready-text)]">{t('collaboration.permissions.microphone')}</span>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(systemPermissions.microphone)}
                  <span className="text-sm font-medium text-emerald-600 dark:text-emerald-300">
                    {getStatusText(systemPermissions.microphone)}
                  </span>
                </div>
              </div>
              <p className="text-sm text-[var(--bready-text-muted)]">{t('collaboration.permissions.microphoneDesc')}</p>
            </div>

            <div className="bg-[var(--bready-surface-2)] rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Wifi className="w-5 h-5 text-[var(--bready-text-muted)]" />
                  <span className="font-medium text-[var(--bready-text)]">{t('collaboration.permissions.network')}</span>
                </div>
                <div className="flex items-center space-x-2">
                  {isConnected ? (
                    <>
                      <Wifi className="w-5 h-5 text-emerald-500" />
                      <span className="text-sm font-medium text-emerald-500">{t('collaboration.permissions.networkConnected')}</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-5 h-5 text-red-500" />
                      <span className="text-sm font-medium text-red-500">{t('collaboration.permissions.networkDisconnected')}</span>
                    </>
                  )}
                </div>
              </div>
              <p className="text-sm text-[var(--bready-text-muted)]">
                {isConnected ? t('collaboration.permissions.networkConnectedDesc') : t('collaboration.permissions.networkDisconnectedDesc')}
              </p>

              {!isConnected && (
                <Button
                  onClick={handleReconnect}
                  variant="outline"
                  size="sm"
                  className="mt-3 w-full"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {t('collaboration.permissions.reconnect')}
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Toast通知 */}
      {
        toast && (
          <ToastNotification
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )
      }

      {/* 确认对话框 */}
      {
        showConfirmationDialog && (
          <ConfirmationDialog
            title={showConfirmationDialog.title}
            message={showConfirmationDialog.message}
            onConfirm={showConfirmationDialog.onConfirm}
            onCancel={() => setShowConfirmationDialog(null)}
          />
        )
      }
    </div >
  )
}

export default CollaborationMode
