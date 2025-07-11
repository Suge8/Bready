import React, { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Settings, Volume2, Send, RefreshCw, Wifi, WifiOff, Trash2 } from 'lucide-react'
import PermissionsSetup from './PermissionsSetup'
import ErrorMessage, { ErrorType } from './ErrorMessage'

interface CollaborationModeProps {
  onExit: () => void
}

const CollaborationMode: React.FC<CollaborationModeProps> = ({ onExit }) => {
  const [transcription, setTranscription] = useState('')
  const [aiResponse, setAiResponse] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [inputText, setInputText] = useState('')
  const [status, setStatus] = useState('准备中...')
  const [isConnected, setIsConnected] = useState(false)
  const [conversationHistory, setConversationHistory] = useState<Array<{type: 'user' | 'ai', content: string, timestamp: Date}>>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  // 权限和错误处理状态
  const [showPermissionsSetup, setShowPermissionsSetup] = useState(false)
  const [currentError, setCurrentError] = useState<{type: ErrorType, message: string} | null>(null)
  const [permissionsChecked, setPermissionsChecked] = useState(false)

  useEffect(() => {
    // 首次加载时检查权限
    checkPermissionsBeforeStart()

    // 验证 API 是否可用
    console.log('🔧 Checking window.bready API:', window.bready)
    console.log('🔧 onAIResponse function:', window.bready?.onAIResponse)

    // 设置事件监听器
    console.log('🔧 Setting up event listeners...')
    const removeStatusListener = window.bready.onStatusUpdate(setStatus)
    const removeTranscriptionListener = window.bready.onTranscriptionUpdate((text) => {
      console.log('📝 Frontend received transcription:', text)
      setTranscription(text)
    })
    const removeAIResponseListener = window.bready.onAIResponse((response) => {
      console.log('🎯 Frontend received AI response:', response)
      setAiResponse(response)
    })
    const removeSessionInitializingListener = window.bready.onSessionInitializing((initializing) => {
      if (!initializing) {
        setIsConnected(true)
        setStatus('准备就绪')
        setCurrentError(null)
      }
    })
    const removeSessionErrorListener = window.bready.onSessionError((error) => {
      setIsConnected(false)
      setStatus(`错误：${error}`)
      categorizeAndSetError(error)
    })
    const removeSessionClosedListener = window.bready.onSessionClosed(() => {
      setIsConnected(false)
      setStatus('连接已断开')
    })

    return () => {
      removeStatusListener()
      removeTranscriptionListener()
      removeAIResponseListener()
      removeSessionInitializingListener()
      removeSessionErrorListener()
      removeSessionClosedListener()
    }
  }, [])

  // 检查权限状态
  const checkPermissionsBeforeStart = async () => {
    try {
      setStatus('检查系统权限...')
      const permissions = await window.bready.checkPermissions()
      const allGranted = permissions.screenRecording.granted && 
                        permissions.microphone.granted && 
                        permissions.apiKey.granted && 
                        permissions.audioDevice.granted
      
      if (!allGranted) {
        setShowPermissionsSetup(true)
        setStatus('需要设置权限')
        setCurrentError({
          type: 'permissions-not-set',
          message: '请完成权限设置后再启动 Live Interview 模式'
        })
      } else {
        setPermissionsChecked(true)
        setCurrentError(null)
        await initializeGemini()
      }
    } catch (error) {
      console.error('权限检查失败:', error)
      setCurrentError({
        type: 'unknown-error',
        message: '无法检查系统权限状态'
      })
      setStatus('权限检查失败')
    }
  }

  // 错误分类和设置
  const categorizeAndSetError = (errorMessage: string) => {
    let errorType: ErrorType = 'unknown-error'
    let message = errorMessage

    if (errorMessage.includes('权限') || errorMessage.includes('permission')) {
      errorType = 'permissions-not-set'
      message = '系统权限未正确设置，请检查屏幕录制和麦克风权限'
    } else if (errorMessage.includes('API') || errorMessage.includes('密钥')) {
      errorType = 'api-connection-failed'
      message = 'Gemini API 连接失败，请检查 API 密钥配置'
    } else if (errorMessage.includes('音频') || errorMessage.includes('audio')) {
      errorType = 'audio-device-error'
      message = '音频设备无法正常工作，请检查系统音频设置'
    } else if (errorMessage.includes('网络') || errorMessage.includes('network')) {
      errorType = 'network-error'
      message = '网络连接失败，请检查网络设置'
    }

    setCurrentError({ type: errorType, message })
  }

  // 初始化 Gemini API
  const initializeGemini = async () => {
    try {
      let apiKey = ''
      
      if (window.env && window.env.GEMINI_API_KEY) {
        apiKey = window.env.GEMINI_API_KEY
      }
      
      if (!apiKey) {
        const storedKey = localStorage.getItem('gemini-api-key')
        if (storedKey) {
          apiKey = storedKey
        }
      }
      
      if (!apiKey) {
        setCurrentError({
          type: 'api-connection-failed',
          message: '未找到 API 密钥，请检查 .env.local 文件中的 VITE_GEMINI_API_KEY 配置'
        })
        setStatus('API 密钥未配置')
        return
      }

      const customPrompt = localStorage.getItem('bready-selected-preparation') || ''
      let language = localStorage.getItem('bready-selected-language') || 'cmn-CN'

      // 修复旧的语言代码
      if (language === 'zh-CN') {
        language = 'cmn-CN'
        localStorage.setItem('bready-selected-language', 'cmn-CN')
      }

      const purpose = localStorage.getItem('bready-selected-purpose') || 'interview'

      setStatus('正在连接 Gemini API...')
      const success = await window.bready.initializeGemini(apiKey, customPrompt, purpose, language)
      
      if (success) {
        setStatus('已连接，正在启动音频捕获...')
        setIsConnected(true)
        setCurrentError(null)
        const audioSuccess = await window.bready.startAudioCapture()

        if (audioSuccess) {
          setStatus('准备就绪')
          setIsListening(true)
        } else {
          setCurrentError({
            type: 'audio-device-error',
            message: '无法启动音频捕获，请检查系统音频权限'
          })
          setStatus('音频捕获失败')
        }
      } else {
        setCurrentError({
          type: 'api-connection-failed',
          message: '无法连接 Gemini API，请检查API密钥是否有效'
        })
        setStatus('API 连接失败')
      }
    } catch (error) {
      console.error('初始化失败:', error)
      setCurrentError({
        type: 'unknown-error',
        message: `初始化失败: ${error}`
      })
      setStatus('初始化失败')
    }
  }

  const handlePermissionsComplete = () => {
    setShowPermissionsSetup(false)
    setPermissionsChecked(true)
    setCurrentError(null)
    initializeGemini()
  }

  const handlePermissionsSkip = () => {
    setShowPermissionsSetup(false)
    setCurrentError({
      type: 'permissions-not-set',
      message: '跳过了权限设置，Live Interview 模式可能无法正常工作'
    })
  }

  const handleErrorFix = () => {
    if (currentError?.type === 'permissions-not-set') {
      setShowPermissionsSetup(true)
    } else if (currentError?.type === 'api-connection-failed') {
      // 重新检查API密钥
      initializeGemini()
    } else if (currentError?.type === 'audio-device-error') {
      // 重新测试音频设备
      window.bready.testAudioCapture()
    } else {
      // 通用重试
      checkPermissionsBeforeStart()
    }
  }

  const handleReconnect = async () => {
    setStatus('正在重连...')
    setCurrentError(null)
    try {
      const success = await window.bready.manualReconnect()
      if (success) {
        setIsConnected(true)
        setStatus('重连成功，正在启动音频捕获...')
        
        const audioSuccess = await window.bready.startAudioCapture()
        if (audioSuccess) {
          setStatus('准备就绪')
          setIsListening(true)
        } else {
          setCurrentError({
            type: 'audio-device-error',
            message: '重连成功，但音频捕获失败'
          })
          setStatus('音频捕获失败')
        }
      } else {
        setCurrentError({
          type: 'api-connection-failed',
          message: '重连失败，请检查网络和API配置'
        })
        setStatus('重连失败')
      }
    } catch (error) {
      setCurrentError({
        type: 'unknown-error',
        message: `重连错误：${error}`
      })
      setStatus('重连失败')
    }
  }

  const clearConversation = () => {
    setConversationHistory([])
    setTranscription('')
    setAiResponse('')
  }

  const testAIResponse = () => {
    console.log('🧪 Testing AI response display...')
    setAiResponse('这是一个测试回复，用于验证 AI 回复显示功能是否正常工作。')
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [conversationHistory, aiResponse])

  return (
    <div className="min-h-screen bg-white">
      {/* 权限设置向导 */}
      <PermissionsSetup
        isOpen={showPermissionsSetup}
        onComplete={handlePermissionsComplete}
        onSkip={handlePermissionsSkip}
      />

      {/* 头部 */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onExit}
              className="flex items-center space-x-2 text-gray-600 hover:text-black transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>返回</span>
            </button>
            
            <div className="h-6 w-px bg-gray-300" />
            
            <h1 className="text-xl font-semibold text-black">Live Interview</h1>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              {isConnected ? (
                <Wifi className="w-5 h-5 text-green-500" />
              ) : (
                <WifiOff className="w-5 h-5 text-red-500" />
              )}
              <span className="text-sm text-gray-600">{status}</span>
            </div>

            {!isConnected && (
              <button
                onClick={handleReconnect}
                className="flex items-center space-x-2 px-3 py-1 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                <span>重连</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 错误消息 */}
      {currentError && (
        <div className="px-6 py-4">
          <ErrorMessage
            type={currentError.type}
            message={currentError.message}
            onFix={handleErrorFix}
            onDismiss={() => setCurrentError(null)}
          />
        </div>
      )}

      {/* 主要内容区域 */}
      <div className="flex-1 p-6">
        <div className="max-w-4xl mx-auto">
          {/* AI 响应区域 */}
          <div className="bg-gray-50 rounded-lg p-6 mb-6 min-h-[200px]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-black">AI 助手回复</h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={clearConversation}
                  className="flex items-center space-x-2 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>清空</span>
                </button>
                <button
                  onClick={testAIResponse}
                  className="flex items-center space-x-2 text-blue-500 hover:text-blue-700 transition-colors"
                >
                  <Send className="w-4 h-4" />
                  <span>测试</span>
                </button>
              </div>
            </div>
            
            <div className="text-gray-800 whitespace-pre-wrap">
              {aiResponse ? (
                <div>
                  <div className="text-sm text-gray-500 mb-2">AI 助手回复：</div>
                  <div>{aiResponse}</div>
                </div>
              ) : (
                isListening ? '正在聆听...' : '等待开始对话'
              )}
            </div>
          </div>

          {/* 转录文本 */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">实时转录</h3>
            <div className="text-gray-600 text-sm">
              {transcription || '暂无转录内容'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CollaborationMode
