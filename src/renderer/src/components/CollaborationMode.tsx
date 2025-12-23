import React, { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Send, RefreshCw, Mic, Volume2, Settings, X, AlertCircle, CheckCircle, XCircle, Loader2, Wifi, WifiOff, Copy, Check } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'
import { ToastNotification, ConfirmationDialog } from './ui/notifications'
import { TouchButton, SwipeableCard } from './ui/touch-optimized'
import 'highlight.js/styles/github.css'

interface CollaborationModeProps {
  onExit: () => void
}

const CollaborationMode: React.FC<CollaborationModeProps> = ({ onExit }) => {
  // 状态管理
  const [inputText, setInputText] = useState('')
  const [status, setStatus] = useState('正在初始化...')
  const [isConnected, setIsConnected] = useState(false)
  const [conversationHistory, setConversationHistory] = useState<Array<{ type: 'user' | 'ai', content: string, timestamp: Date, source: 'voice' | 'text' }>>([])
  const [isWaitingForAI, setIsWaitingForAI] = useState(false)
  const [currentVoiceInput, setCurrentVoiceInput] = useState('')
  const [currentAIResponse, setCurrentAIResponse] = useState('')
  const [pendingUserInput, setPendingUserInput] = useState<{ content: string, source: 'text' } | null>(null)
  const [lastAIResponse, setLastAIResponse] = useState('')
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
      label: '在线面试模式',
      icon: <Volume2 className="w-4 h-4" />,
      description: '捕获系统音频，适用于在线面试'
    },
    {
      value: 'microphone' as const,
      label: '麦克风模式',
      icon: <Mic className="w-4 h-4" />,
      description: '使用麦克风录音，适用于直接对话'
    }
  ]

  // 错误标题映射
  const getErrorTitle = (errorType: string) => {
    switch (errorType) {
      case 'api-connection-failed':
        return 'API连接失败'
      case 'audio-device-error':
        return '音频设备错误'
      case 'permissions-not-set':
        return '权限未设置'
      case 'network-error':
        return '网络错误'
      case 'unknown-error':
        return '未知错误'
      default:
        return '未知错误'
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
    if (status.granted) return '已授予'
    if (status.canRequest) return '需要设置'
    return '被拒绝'
  }

  // 音频模式切换处理
  const handleAudioModeChange = async (newMode: 'system' | 'microphone') => {
    console.log('🎧 切换音频模式:', currentAudioMode, '->', newMode)

    if (newMode === currentAudioMode) {
      setShowAudioModeDropdown(false)
      return
    }

    setCurrentAudioMode(newMode)
    setShowAudioModeDropdown(false)

    // 在 Electron 环境中更新音频设置
    if (window.bready && isConnected) {
      try {
        setStatus('正在切换音频模式...')

        // 使用新的 API 直接切换模式
        const success = await window.bready.switchAudioMode(newMode)

        if (success) {
          setStatus(`已切换到${newMode === 'system' ? '在线面试' : '麦克风'}模式`)

          // 2秒后恢复正常状态
          setTimeout(() => {
            if (isConnected) {
              setStatus('准备就绪')
            }
          }, 2000)
        } else {
          setStatus('音频模式切换失败')
          setCurrentError({
            type: 'audio-device-error',
            message: `切换到${newMode === 'system' ? '在线面试' : '麦克风'}模式失败，请检查设备设置`
          })
        }
      } catch (error) {
        console.error('音频模式切换失败:', error)
        setStatus('音频模式切换失败')
        setCurrentError({
          type: 'audio-device-error',
          message: '音频模式切换出错，请重试'
        })
      }
    } else {
      // 浏览器模式下的模拟切换
      setStatus(`已切换到${newMode === 'system' ? '在线面试' : '麦克风'}模式（浏览器预览）`)
      setTimeout(() => {
        setStatus('浏览器预览模式')
      }, 2000)
    }
  }

  // 权限检查
  const checkPermissions = async () => {
    try {
      console.log('🔍 开始检查系统权限...')
      setStatus('检查系统权限...')

      // 检查是否在 Electron 环境中
      if (!window.bready) {
        console.log('🌐 浏览器模式 - 跳过权限检查')
        setIsInitializing(false)
        setStatus('浏览器预览模式')
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
        setStatus('权限未完全设置')
        setCurrentError({
          type: 'permissions-not-set',
          message: '请在设置中完成所有权限配置'
        })
        setIsInitializing(false)
        return
      }

      console.log('✅ 所有权限已授予，初始化 Gemini API')
      setStatus('正在连接 AI 服务...')

      // 初始化 Gemini API
      await initializeGemini()

    } catch (error) {
      console.error('权限检查失败:', error)
      setStatus('权限检查失败')
      setCurrentError({
        type: 'unknown-error',
        message: `权限检查失败: ${error instanceof Error ? error.message : String(error)}`
      })
      setIsInitializing(false)
    }
  }

  const startAudioCaptureOnce = async () => {
    if (!window.bready || audioStartedRef.current) {
      return
    }
    audioStartPendingRef.current = false
    setStatus('正在启动音频捕获...')
    const audioSuccess = await window.bready.startAudioCapture()
    if (audioSuccess) {
      audioStartedRef.current = true
      setStatus('准备就绪')
      setIsInitializing(false)
      return
    }
    setIsInitializing(false)
    setCurrentError({
      type: 'audio-device-error',
      message: '无法启动音频捕获，请检查系统音频权限'
    })
    setStatus('音频捕获失败')
  }

  // 初始化 Gemini API
  const initializeGemini = async () => {
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
          message: '未找到 API 密钥，请检查 .env.local 文件中的 VITE_GEMINI_API_KEY 配置'
        })
        setStatus('API 密钥未配置')
        return
      }

      // 获取选择的准备项
      const selectedPreparationStr = localStorage.getItem('bready-selected-preparation')
      let customPrompt = selectedPreparationStr || ''

      let language = localStorage.getItem('bready-selected-language') || 'cmn-CN'
      const purpose = localStorage.getItem('bready-selected-purpose') || 'interview'

      console.log('📤 前端准备调用 initializeGemini，参数:', {
        customPromptLength: customPrompt.length,
        language,
        purpose
      })

      setStatus('正在连接 AI 服务...')
      console.log('🤖 初始化 Gemini API，API 密钥长度:', apiKey.length)

      // 初始化 Gemini 连接
      const success = await window.bready.initializeGemini(apiKey, customPrompt, purpose, language)

      if (success) {
        setIsConnected(true)
        setCurrentError(null)
        audioStartPendingRef.current = true
        setStatus('等待 AI 就绪...')

        if (sessionReadyRef.current) {
          await startAudioCaptureOnce()
        }
      } else {
        setIsInitializing(false)
        setCurrentError({
          type: 'api-connection-failed',
          message: '无法连接 AI 服务，请检查API密钥是否有效'
        })
        setStatus('连接失败')
        setToast({ message: '连接 AI 服务失败，已返回主页', type: 'error' })
        setTimeout(() => {
          onExit()
        }, 800)
      }
    } catch (error) {
      console.error('初始化失败:', error)
      setIsInitializing(false)
      setCurrentError({
        type: 'unknown-error',
        message: `初始化失败: ${error instanceof Error ? error.message : String(error)}`
      })
      setStatus('初始化失败')
      setToast({ message: '连接 AI 服务失败，已返回主页', type: 'error' })
      setTimeout(() => {
        onExit()
      }, 800)
    }
  }

  // 重连处理
  const handleReconnect = async () => {
    if (!window.bready) return

    try {
      setStatus('正在重连...')
      setIsInitializing(true)
      setCurrentError(null)

      console.log('🔄 开始手动重连...')
      const success = await window.bready.manualReconnect()

      if (success) {
        setIsConnected(true)
        setStatus('等待 AI 就绪...')
        setCurrentError(null)
        setIsInitializing(false)
        console.log('✅ 手动重连成功')
        audioStartPendingRef.current = true
        audioStartedRef.current = false
        sessionReadyRef.current = false
      } else {
        setIsConnected(false)
        setStatus('重连失败，请稍后重试')
        setIsInitializing(false)
        setCurrentError({
          type: 'api-connection-failed',
          message: '重连失败，请检查网络连接后重试'
        })
        console.log('❌ 手动重连失败')
      }
    } catch (error) {
      console.error('重连失败:', error)
      setIsConnected(false)
      setStatus('重连失败')
      setIsInitializing(false)
      setCurrentError({
        type: 'unknown-error',
        message: `重连错误: ${error instanceof Error ? error.message : String(error)}`
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
    setPendingUserInput({
      content: messageText,
      source: 'text'
    })
    pendingUserInputRef.current = {
      content: messageText,
      source: 'text'
    }

    // 清空输入框并设置等待AI状态
    setInputText('')
    setIsWaitingForAI(true)

    // 重置AI回复记录
    setLastAIResponse('')

    // 检查是否在 Electron 环境中
    if (!window.bready) {
      // 浏览器环境下的模拟回复
      setTimeout(() => {
        const aiMessage = {
          type: 'ai' as const,
          content: `收到您的问题：\"${messageText}\"，我正在思考如何回答...（浏览器预览模式）`,
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
        content: '当前未连接到 AI 服务，请等待连接完成或点击重连。',
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
          content: `抱歉，发送消息失败：${result.error || '请稍后重试'}`,
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
        content: '发送消息时出现错误，请检查连接状态。',
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
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [conversationHistory, currentVoiceInput, currentAIResponse])

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
      setStatus('浏览器预览模式')
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
    const removeTranscriptionCompleteListener = window.bready.onTranscriptionComplete?.((transcription) => {
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
      setPendingUserInput({
        content: transcription.trim(),
        source: 'text'
      })
    })

    const removeAIResponseListener = window.bready.onAIResponse((response) => {
      console.log('🎯 前端收到 AI 回复:', response)

      if (!response.trim()) return

      // 防重复检查
      if (response === lastAIResponseRef.current) {
        console.log('⚠️ 跳过重复的 AI 回复')
        return
      }

      setLastAIResponse(response)
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
      setPendingUserInput(null)
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
      setStatus(`错误：${error}`)
      setCurrentError({
        type: 'unknown-error',
        message: error
      })
    })
    const removeSessionClosedListener = window.bready.onSessionClosed(() => {
      setIsConnected(false)
      setStatus('连接已断开')
      sessionReadyRef.current = false
      audioStartPendingRef.current = false
      audioStartedRef.current = false
      setCurrentError({
        type: 'api-connection-failed',
        message: '音频流已中断，请点击重连按钮恢复连接'
      })
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
    }
  }, [])

  return (
    <div className="h-screen w-screen overflow-hidden bg-black flex flex-col">
      {/* 复制成功提示 */}
      {copySuccess && (
        <div className="fixed top-4 right-4 z-[9999] animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl">
            <Check className="w-4 h-4 text-green-400" />
            <span className="text-sm text-white">复制成功</span>
          </div>
        </div>
      )}

      {/* 顶部控制栏 - 分为两行 */}
      <div className="w-full bg-black z-50" style={{ WebkitAppRegion: 'drag' } as any}>
        {/* 第一行：返回按钮 - 贴近顶部 */}
        <div className="h-8 w-full relative flex items-center px-16">
          <button
            onClick={() => setShowExitConfirm(true)}
            className="p-1 text-gray-400 hover:text-white transition-all duration-200 hover:bg-zinc-800 rounded-lg cursor-pointer"
            style={{ marginLeft: process.platform === 'darwin' ? '90px' : '0', WebkitAppRegion: 'no-drag' } as any}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>

        {/* 第二行：标题、状态和控制按钮 */}
        <div className="h-6 w-full relative flex items-center justify-between px-4 -mt-3">
          {/* 左侧占位 */}
          <div className="w-10"></div>

          {/* 中间：标题和状态 */}
          <div className="absolute left-1/2 transform -translate-x-1/2 text-center">
            <h1 className="font-semibold text-white">协作模式</h1>
            <div className="flex items-center justify-center space-x-2 text-xs text-gray-400">
              {isConnected ? (
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              ) : (
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              )}
              <span>{status}</span>
            </div>
          </div>

          {/* 右侧：控制按钮 */}
          <div className="flex items-center space-x-2" style={{ WebkitAppRegion: 'no-drag' } as any}>
            {/* 音频模式选择器 */}
            <div className="relative" style={{ WebkitAppRegion: 'no-drag' } as any}>
              <button
                onClick={() => setShowAudioModeDropdown(!showAudioModeDropdown)}
                className="flex items-center space-x-1 px-2 py-1.5 bg-zinc-800 text-gray-300 rounded-lg text-xs hover:bg-zinc-700 transition-all duration-200 cursor-pointer"
              >
                {audioModeOptions.find(option => option.value === currentAudioMode)?.icon}
                <span className="font-medium whitespace-nowrap">
                  {audioModeOptions.find(option => option.value === currentAudioMode)?.label}
                </span>
              </button>

              {/* 下拉菜单 */}
              {showAudioModeDropdown && (
                <div className="absolute top-full right-0 mt-1 bg-zinc-900 border border-zinc-700 rounded-lg shadow-lg z-50 min-w-48">
                  {audioModeOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleAudioModeChange(option.value)}
                      className={`w-full px-3 py-2.5 text-left hover:bg-zinc-800 transition-colors duration-150 first:rounded-t-lg last:rounded-b-lg ${currentAudioMode === option.value ? 'bg-blue-900/30 text-blue-400' : 'text-gray-300'
                        }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`mt-0.5 ${currentAudioMode === option.value ? 'text-blue-400' : 'text-gray-400'}`}>
                          {option.icon}
                        </div>
                        <div className="flex-1">
                          <div className={`text-sm font-medium ${currentAudioMode === option.value ? 'text-blue-400' : 'text-white'}`}>
                            {option.label}
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5">
                            {option.description}
                          </div>
                        </div>
                        {currentAudioMode === option.value && (
                          <div className="w-2 h-2 bg-blue-400 rounded-full mt-1.5" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>



            {/* 设置按钮 */}
            <button
              onClick={() => setShowPermissionsModal(true)}
              className="p-2 text-gray-400 hover:text-white transition-all duration-200 hover:bg-zinc-800 rounded-lg cursor-pointer"
              style={{ WebkitAppRegion: 'no-drag' } as any}
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 主要内容区域 - 左右分栏布局 */}
      <div className="flex-1 flex p-4 gap-4 overflow-hidden" style={{ pointerEvents: 'auto' }}>

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
                    重连
                  </button>
                </div>
                <p className="text-red-700 dark:text-red-300 text-sm mt-2">{currentError.message}</p>
              </CardContent>
            </Card>
          )}

          {/* 实时问答展示区 */}
          <div className="flex-1 flex flex-col items-center justify-center overflow-hidden">
            {/* 空状态 */}
            {conversationHistory.length === 0 && !currentVoiceInput.trim() && !currentAIResponse.trim() && !isWaitingForAI ? (
              <div className="text-center text-gray-400 animate-in fade-in duration-500">
                <div className="w-20 h-20 mx-auto mb-6 bg-zinc-800/50 rounded-full flex items-center justify-center backdrop-blur-sm animate-pulse">
                  <Mic className="w-10 h-10 text-gray-500" />
                </div>
                <p className="text-lg font-medium text-gray-300">{currentAudioMode === 'system' ? '面宝会回复面试官提问' : '面宝会回复麦克风说话'}</p>
                <p className="text-sm mt-2 text-gray-500">打字输入也可以哦</p>
              </div>
            ) : (
              <div className="w-full max-w-3xl space-y-6 overflow-y-auto px-4">
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
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                          <Mic className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-sm font-medium text-gray-300">
                          {isTranscribing ? '转录中...' : '输入'}
                        </span>
                        {isTranscribing && (
                          <div className="flex gap-1">
                            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" />
                            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                          </div>
                        )}
                      </div>
                      <div className="bg-gradient-to-br from-blue-600/20 to-indigo-600/20 backdrop-blur-xl rounded-2xl p-6 border border-blue-400/30 shadow-xl shadow-blue-500/10 relative group/user">
                        <p className="text-lg text-gray-100 leading-relaxed font-medium">{userContent}</p>
                        {/* 复制按钮 */}
                        <button
                          onClick={() => copyToClipboard(userContent)}
                          className="absolute bottom-3 right-3 p-2 bg-blue-900/50 hover:bg-blue-800/50 rounded-lg opacity-0 group-hover/user:opacity-100 transition-opacity duration-200 cursor-pointer"
                          title="复制内容"
                        >
                          <Copy className="w-4 h-4 text-blue-300" />
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
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
                          <span className="text-sm">🍞</span>
                        </div>
                        <span className="text-sm font-medium text-gray-300">
                          {isWaitingForAI && !aiContent ? '思考中...' : isResponding ? '回复中...' : '面宝'}
                        </span>
                        {(isWaitingForAI || isResponding) && (
                          <div className="flex gap-1">
                            <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" />
                            <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                            <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                          </div>
                        )}
                      </div>
                      <div className="bg-zinc-900/80 backdrop-blur-xl rounded-2xl p-6 border border-zinc-700/50 shadow-2xl relative group/ai">
                        {aiContent ? (
                          <>
                            <div className="prose prose-lg max-w-none text-white prose-p:text-white prose-headings:text-white prose-strong:text-white prose-em:text-gray-200 prose-code:text-amber-300 prose-li:text-white prose-a:text-blue-400">
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
                              className="absolute bottom-3 right-3 p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg opacity-0 group-hover/ai:opacity-100 transition-opacity duration-200 cursor-pointer"
                              title="复制内容"
                            >
                              <Copy className="w-4 h-4 text-zinc-400" />
                            </button>
                          </>
                        ) : (
                          <div className="flex items-center gap-3 text-white">
                            <div className="w-5 h-5 border-2 border-zinc-600 border-t-white rounded-full animate-spin" />
                            <span>面宝正在思考回答...</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })()}

                {/* 滚动目标元素 */}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* 输入区域 */}
          <div className="pt-4 mt-auto">
            <div className="flex items-center space-x-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="输入您的问题..."
                  className="w-full px-5 py-4 bg-zinc-800/80 backdrop-blur-sm border border-zinc-700/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20 text-white placeholder-gray-500 text-base transition-all duration-200"
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
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300 cursor-pointer transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <TouchButton
                onClick={handleSendMessage}
                disabled={!inputText.trim() || isWaitingForAI}
                className="w-12 h-12 bg-white hover:bg-gray-100 text-black rounded-xl flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer hover:scale-105"
              >
                <Send className="w-5 h-5" />
              </TouchButton>
            </div>
            <div className="flex items-center justify-center mt-2 text-[10px] text-gray-500">
              <span>按 Enter 发送 · Shift+Enter 换行</span>
            </div>
          </div>
        </div>

        {/* 右侧对话 - 响应式宽度 */}
        <div className="w-1/4 min-w-[200px] max-w-[320px] flex-shrink-0 flex flex-col bg-zinc-950/80 rounded-xl border border-zinc-800/40">
          {/* 标题 */}
          <div className="px-3 py-2.5 border-b border-zinc-800/40 flex items-center justify-between">
            <h3 className="text-xs font-medium text-gray-400 tracking-wide">对话</h3>
            <span className="text-[10px] text-zinc-500 tabular-nums">
              {conversationHistory.length}
            </span>
          </div>

          {/* 对话列表 */}
          <div className="flex-1 overflow-y-auto p-2 space-y-2 scrollbar-thin">
            {conversationHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-zinc-600 text-xs">
                <span className="text-lg mb-1">💬</span>
                <p>暂无对话</p>
              </div>
            ) : (
              conversationHistory.map((entry, index) => {
                const isTruncated = entry.content.length > 150
                return (
                  <div
                    key={index}
                    className={`group relative p-3 rounded-lg transition-all duration-150 cursor-pointer hover:bg-zinc-800/60 active:scale-[0.98] ${entry.type === 'user' ? 'bg-zinc-900/50' : 'bg-zinc-900/30'
                      }`}
                    onClick={() => copyToClipboard(entry.content)}
                    title="点击复制内容"
                  >
                    <div className="flex gap-2.5">
                      {/* 头像和时间列 */}
                      <div className="flex flex-col items-center flex-shrink-0">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${entry.type === 'user' ? 'bg-white text-black' : 'bg-zinc-700'
                          }`}>
                          {entry.type === 'user' ? (
                            entry.source === 'voice' ? <Mic className="w-3 h-3" /> : <span className="text-[9px]">⌨</span>
                          ) : (
                            <span className="text-[10px]">🍞</span>
                          )}
                        </div>
                        <span className="text-[9px] text-zinc-500 mt-1 tabular-nums">
                          {entry.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      {/* 内容 - 支持 Markdown */}
                      <div className="flex-1 min-w-0 text-xs text-zinc-300 leading-relaxed line-clamp-3 prose prose-sm prose-invert max-w-none prose-p:m-0 prose-p:text-zinc-300">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {isTruncated ? entry.content.substring(0, 150) + '...' : entry.content}
                        </ReactMarkdown>
                      </div>
                    </div>

                    {/* 悬浮显示完整内容 - 只在被截断时显示，延迟 0.5 秒 */}
                    {isTruncated && (
                      <div className="absolute left-0 right-0 bottom-full mb-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 delay-500 z-50">
                        <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4 shadow-2xl">
                          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-zinc-800">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${entry.type === 'user' ? 'bg-white text-black' : 'bg-zinc-700'
                              }`}>
                              {entry.type === 'user' ? (
                                entry.source === 'voice' ? <Mic className="w-2.5 h-2.5" /> : <span className="text-[8px]">⌨</span>
                              ) : (
                                <span className="text-[9px]">🍞</span>
                              )}
                            </div>
                            <span className="text-[10px] text-zinc-400">
                              {entry.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                          </div>
                          <div className="prose prose-sm prose-invert max-w-none text-white prose-p:text-white prose-headings:text-white">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              rehypePlugins={[rehypeHighlight]}
                            >
                              {entry.content}
                            </ReactMarkdown>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* 初始化加载状态 */}
      {
        isInitializing && (
          <div className="fixed inset-0 bg-black flex items-center justify-center z-[9999]" style={{ pointerEvents: 'auto' }}>
            <div className="text-center p-6">
              <div className="w-16 h-16 mx-auto mb-4 relative">
                <div className="absolute inset-0 rounded-full bg-white opacity-10 animate-ping"></div>
                <div className="absolute inset-2 rounded-full bg-white opacity-20 animate-ping" style={{ animationDelay: '0.5s' }}></div>
                <div className="absolute inset-4 rounded-full bg-white flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-black animate-spin" />
                </div>
              </div>
              <h2 className="text-xl font-bold text-white mb-2">{status}</h2>
              <p className="text-gray-400">正在准备协作模式...</p>
            </div>
          </div>
        )
      }

      {/* 退出确认对话框 */}
      {
        showExitConfirm && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-[100] cursor-pointer"
            onClick={() => setShowExitConfirm(false)}
          >
            <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl cursor-auto" onClick={(e) => e.stopPropagation()}>
              <div className="text-center">
                <div className="w-12 h-12 bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-6 h-6 text-red-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">退出协作模式？</h3>
                <p className="text-gray-400 mb-6">这将断开与AI的连接并返回主页。</p>
                <Button
                  onClick={handleExitConfirm}
                  className="w-full bg-red-600 hover:bg-red-700 text-white cursor-pointer"
                >
                  退出
                </Button>
              </div>
            </div>
          </div>
        )
      }

      {/* 权限设置模态框 */}
      {
        showPermissionsModal && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-[100] p-4 cursor-pointer"
            onClick={() => setShowPermissionsModal(false)}
          >
            <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-md shadow-2xl cursor-auto" onClick={(e) => e.stopPropagation()}>
              <div className="p-6">
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-white">权限设置</h2>
                </div>

                <div className="space-y-4">
                  <div className="bg-zinc-800 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <Volume2 className="w-5 h-5 text-gray-400" />
                        <span className="font-medium text-white">系统音频权限</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(systemPermissions.screenRecording)}
                        <span className="text-sm font-medium text-green-600 dark:text-green-400">
                          {getStatusText(systemPermissions.screenRecording)}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-400">
                      用于捕获系统播放的音频（如在线面试官的声音）
                    </p>
                  </div>

                  <div className="bg-zinc-800 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <Mic className="w-5 h-5 text-gray-400" />
                        <span className="font-medium text-white">麦克风权限</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(systemPermissions.microphone)}
                        <span className="text-sm font-medium text-green-600 dark:text-green-400">
                          {getStatusText(systemPermissions.microphone)}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-400">
                      用于语音输入（可选）
                    </p>
                  </div>

                  <div className="bg-zinc-800 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <Wifi className="w-5 h-5 text-gray-400" />
                        <span className="font-medium text-white">网络连接</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        {isConnected ? (
                          <>
                            <Wifi className="w-5 h-5 text-green-400" />
                            <span className="text-sm font-medium text-green-400">已连接</span>
                          </>
                        ) : (
                          <>
                            <WifiOff className="w-5 h-5 text-red-400" />
                            <span className="text-sm font-medium text-red-400">未连接</span>
                          </>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-400">
                      {isConnected ? '与Gemini API保持连接' : '尝试重新连接AI服务'}
                    </p>

                    {!isConnected && (
                      <Button
                        onClick={handleReconnect}
                        variant="outline"
                        size="sm"
                        className="mt-3 w-full border-zinc-600 hover:bg-zinc-700 text-gray-300 cursor-pointer"
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        重新连接
                      </Button>
                    )}
                  </div>
                </div>

              </div>
            </div>
          </div>
        )
      }

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
