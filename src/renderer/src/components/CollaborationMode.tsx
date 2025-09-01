import React, { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Send, RefreshCw, ChevronDown, Mic, Volume2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import PermissionsSetup from './PermissionsSetup'

import 'highlight.js/styles/github.css'
import { ErrorType } from './ErrorMessage'

// 音频模式类型定义
type AudioMode = 'system' | 'microphone'

interface AudioModeOption {
  value: AudioMode
  label: string
  icon: React.ReactNode
  description: string
}

const audioModeOptions: AudioModeOption[] = [
  {
    value: 'system',
    label: '在线面试模式',
    icon: <Volume2 className="w-4 h-4" />,
    description: '捕获系统音频，适用于在线面试'
  },
  {
    value: 'microphone',
    label: '麦克风模式',
    icon: <Mic className="w-4 h-4" />,
    description: '使用麦克风录音，适用于直接对话'
  }
]

interface CollaborationModeProps {
  onExit: () => void
}

// 定义主显示区状态类型
type MainDisplayState =
  | { type: 'listening' } // 初始状态：正在聆听
  | { type: 'voice_transcribing', content: string } // 语音转录中
  | { type: 'text_input', content: string } // 文字输入待发送
  | { type: 'ai_responding', content: string } // AI回答显示

const CollaborationMode: React.FC<CollaborationModeProps> = ({ onExit }) => {
  // 简化状态管理
  const [inputText, setInputText] = useState('')
  const [status, setStatus] = useState('正在初始化...')
  const [isConnected, setIsConnected] = useState(false)
  const [conversationHistory, setConversationHistory] = useState<Array<{type: 'user' | 'ai', content: string, timestamp: Date, source: 'voice' | 'text'}>>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 主显示区状态 - 这是核心状态管理
  const [mainDisplayState, setMainDisplayState] = useState<MainDisplayState>({ type: 'listening' })

  // 简化状态管理
  const [isWaitingForAI, setIsWaitingForAI] = useState(false)
  const [currentVoiceInput, setCurrentVoiceInput] = useState('')

  // 只用于文字输入的pending状态
  const [pendingUserInput, setPendingUserInput] = useState<{content: string, source: 'text'} | null>(null)

  // 最简单的防重复：记录上一次AI回复
  const [lastAIResponse, setLastAIResponse] = useState('')

  // 输入法状态跟踪
  const [isComposing, setIsComposing] = useState(false)

  // 退出确认弹窗状态
  const [showExitConfirm, setShowExitConfirm] = useState(false)

  // 音频模式选择状态
  const [currentAudioMode, setCurrentAudioMode] = useState<AudioMode>('system')
  const [showAudioModeDropdown, setShowAudioModeDropdown] = useState(false)
  const audioModeRef = useRef<HTMLDivElement>(null)

  // 全局测试函数 - 可以在浏览器控制台中手动调用
  const testAudioModuleImport = async () => {
    console.log('🧪 手动测试音频模块导入...')
    try {
      const audioModule = await import('../lib/audio-capture')
      console.log('✅ 手动导入成功:', audioModule)
      console.log('可用导出:', Object.keys(audioModule))
      if (audioModule.rendererAudioCapture) {
        console.log('✅ rendererAudioCapture 存在')
        console.log('实例状态:', audioModule.rendererAudioCapture.getStatus())
      } else {
        console.error('❌ rendererAudioCapture 不存在')
      }
      return audioModule
    } catch (error) {
      console.error('❌ 手动导入失败:', error)
      return null
    }
  }
  // 暴露到全局供测试
  React.useEffect(() => {
    ;(window as any).testAudioModuleImport = testAudioModuleImport
  }, [])

  // 错误标题映射
  const getErrorTitle = (errorType: ErrorType) => {
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

  // 音频模式切换处理
  const handleAudioModeChange = async (newMode: AudioMode) => {
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

  // 点击外部关闭下拉框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (audioModeRef.current && !audioModeRef.current.contains(event.target as Node)) {
        setShowAudioModeDropdown(false)
      }
    }

    if (showAudioModeDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showAudioModeDropdown])

  // 权限和错误处理状态
  const [showPermissionsSetup, setShowPermissionsSetup] = useState(false)
  const [currentError, setCurrentError] = useState<{type: ErrorType, message: string} | null>(null)
  const [permissionsChecked, setPermissionsChecked] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)

  useEffect(() => {
    // 检查是否在 Electron 环境中
    if (!window.bready) {
      console.log('🌐 Running in browser mode - skipping Electron-specific initialization')
      setIsInitializing(false)
      setStatus('浏览器预览模式')
      return
    }

    // 立即初始化音频捕获模块 - 确保在主进程发送事件之前完成
    const initAudioModule = () => {
      console.log('🎵 协作模式：立即初始化渲染进程音频捕获模块...')
      console.log('📁 模块路径: ../lib/audio-capture')
      
      // 同步导入音频捕获模块
      import('../lib/audio-capture')
        .then((audioModule) => {
          console.log('✅ 音频模块导入成功，检查内容...', audioModule)
          
          if (audioModule.rendererAudioCapture) {
            console.log('✅ 协作模式：音频捕获模块初始化成功')
            console.log('📡 渲染进程：音频IPC监听器已准备就绪')
            
            // 验证全局对象是否被设置
            if ((window as any).rendererAudioCapture) {
              console.log('✅ 音频捕获实例已添加到全局对象')
            } else {
              console.warn('⚠️ 音频捕获实例未添加到全局对象')
            }
          } else {
            console.error('❌ 协作模式：音频捕获模块导入失败，找不到 rendererAudioCapture')
            console.log('可用的导出对象:', Object.keys(audioModule))
          }
        })
        .catch((error) => {
          console.error('❌ 协作模式：音频捕获模块导入失败:', error)
          console.error('错误详情:', error.stack)
        })
    }

    // 立即初始化音频模块，不延迟
    initAudioModule()

    // 直接在这里注册音频IPC监听器 - 确保一定能收到主进程事件
    if ((window as any).bready?.ipcRenderer?.on) {
      const ipcRenderer = (window as any).bready.ipcRenderer
      
      console.log('📡 协作模式：直接注册音频IPC监听器...')
      
      // 监听开始音频捕获指令
      const handleAudioStart = async (config: any) => {
        console.log('🎵 协作模式收到音频捕获启动指令:', config)
        console.log('✅ 音频捕获事件监听器正常工作！')
        
        // 使用全局音频实例（已恢复）
        try {
          console.log('🚀 开始启动音频捕获（已恢复功能）...')
          
          // 检查全局音频捕获实例
          const audioCapture = (window as any).rendererAudioCapture
          if (audioCapture) {
            console.log('✅ 找到全局音频捕获实例')
            const success = await audioCapture.start(config)
            
            if (success) {
              console.log('✅ 音频捕获启动成功！')
            } else {
              console.warn('⚠️ 音频捕获启动失败，但不会导致崩溃')
            }
          } else {
            console.warn('⚠️ 全局音频捕获实例不可用，尝试延迟创建')
            // 如果全局实例不可用，尝试动态导入
            const { createAudioCaptureInstance } = await import('../lib/audio-capture')
            const newAudioCapture = createAudioCaptureInstance()
            const success = await newAudioCapture.start(config)
            console.log('🔄 通过延迟创建启动音频捕获:', success ? '成功' : '失败')
          }
        } catch (error) {
          console.error('❌ 启动音频捕获时发生错误（已安全处理）:', error)
        }
      }
      
      const handleAudioStop = async () => {
        console.log('🔄 协作模式收到音频捕获停止指令')
        
        try {
          const audioCapture = (window as any).rendererAudioCapture
          if (audioCapture) {
            audioCapture.stop()
            console.log('✅ 音频捕获已停止')
          }
        } catch (error) {
          console.error('❌ 停止音频捕获时发生错误（已安全处理）:', error)
        }
      }
      
      ipcRenderer.on('audio-capture-start', handleAudioStart)
      ipcRenderer.on('audio-capture-stop', handleAudioStop)
      
      console.log('✅ 协作模式：音频IPC监听器注册成功！')
    } else {
      console.error('❌ 协作模式：Bready IPC renderer 不可用')
    }

    // 然后检查权限
    checkPermissionsBeforeStart()

    // 设置事件监听器
    const removeStatusListener = window.bready.onStatusUpdate(setStatus)
    const removeTranscriptionListener = window.bready.onTranscriptionUpdate((text) => {
      console.log('📝 Frontend received transcription:', text)

      // 超简化语音转录处理：只更新显示，不添加到历史记录
      if (text && text.trim().length > 0) {
        const trimmedText = text.trim()

        console.log('📝 Voice transcription update:', trimmedText)

        // 更新当前语音输入状态
        setCurrentVoiceInput(trimmedText)

        // 更新显示状态（显示最新的转录内容）
        setMainDisplayState({
          type: 'voice_transcribing',
          content: trimmedText
        })

        // 清空文本输入框（避免冲突）
        setInputText('')
      }
    })
    const removeAIResponseListener = window.bready.onAIResponse((response) => {
      console.log('🎯 Frontend received AI response:', response)

      // 使用函数式更新来获取最新状态
      setConversationHistory(currentHistory => {
        setPendingUserInput(currentPendingInput => {
          setCurrentVoiceInput(currentVoice => {
            console.log('🎯 Current states:')
            console.log('  - pendingUserInput:', currentPendingInput)
            console.log('  - conversationHistory length:', currentHistory.length)
            console.log('  - currentVoiceInput:', currentVoice)

            // 在这里处理AI回复逻辑
            handleAIResponse(response, currentHistory, currentPendingInput, currentVoice)

            return currentVoice // 返回原值，不修改
          })
          return currentPendingInput // 返回原值，不修改
        })
        return currentHistory // 返回原值，不修改
      })

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
      setCurrentError({
        type: 'api-connection-failed',
        message: '音频流已中断，请点击重连按钮恢复连接'
      })
    })

    // 添加上下文压缩监听器
    const removeContextCompressedListener = window.bready.onContextCompressed?.((data) => {
      console.log('🗜️ Context compressed:', data)
      setStatus(`上下文已压缩 (${data.previousCount} → ${data.newCount} 条消息)`)
      setTimeout(() => {
        if (isConnected) {
          setStatus('准备就绪')
        }
      }, 3000)
    }) || (() => {})

    // 添加音频流中断监听器
    const removeAudioStreamInterruptedListener = window.bready.onAudioStreamInterrupted?.(() => {
      console.log('🚨 Audio stream interrupted by system')
      setStatus('音频流已中断，正在重启...')
      setCurrentError({
        type: 'audio-device-error',
        message: '系统音频流被中断，正在自动重启音频捕获'
      })

      // 重置主显示状态为聆听状态
      setMainDisplayState({ type: 'listening' })
      setIsWaitingForAI(false)
    }) || (() => {})

    // 添加音频流恢复监听器
    const removeAudioStreamRestoredListener = window.bready.onAudioStreamRestored?.(() => {
      console.log('✅ Audio stream restored')
      setStatus('音频流已恢复')
      setCurrentError(null)
      setTimeout(() => {
        if (isConnected) {
          setStatus('准备就绪')
        }
      }, 2000)
    }) || (() => {})

    return () => {
      // 如果不在 Electron 环境中，跳过清理
      if (!window.bready) {
        console.log('🌐 Browser mode - skipping cleanup')
        return
      }

      // 清理事件监听器
      removeStatusListener()
      removeTranscriptionListener()
      removeAIResponseListener()
      removeSessionInitializingListener()
      removeSessionErrorListener()
      removeSessionClosedListener()
      removeContextCompressedListener()
      removeAudioStreamInterruptedListener()
      removeAudioStreamRestoredListener()

      // 清理语音输入状态
      setCurrentVoiceInput('')

      // 清理连接和资源
      console.log('🧹 Cleaning up CollaborationMode component...')
      Promise.all([
        window.bready.disconnectGemini().catch(err => console.error('Failed to disconnect Gemini:', err)),
        window.bready.stopAudioCapture().catch(err => console.error('Failed to stop audio capture:', err))
      ]).then(() => {
        console.log('✅ CollaborationMode cleanup completed')
      }).catch(err => {
        console.error('❌ CollaborationMode cleanup failed:', err)
      })
    }
  }, [])

  // AI回复处理函数 - 使用最新状态
  const handleAIResponse = (response: string, currentHistory: any[], currentPendingInput: any, currentVoice: string) => {
    if (!response.trim()) return

    // 切换到AI回答显示状态
    setMainDisplayState({
      type: 'ai_responding',
      content: response
    })

    // 停止等待AI状态
    setIsWaitingForAI(false)

    // 详细调试AI回复处理
    console.log('🔍 AI Response Debug (with latest state):')
    console.log('  - response:', response.slice(0, 50) + '...')
    console.log('  - currentHistory length:', currentHistory.length)
    console.log('  - currentPendingInput:', currentPendingInput)
    console.log('  - currentVoice:', currentVoice)

    // 防重复检查
    if (response === lastAIResponse) {
      console.log('⚠️ Skipping duplicate AI response')
      return
    }

    console.log('✅ Processing new AI response')
    setLastAIResponse(response)

    const timestamp = new Date()

    // 优先检查是否有当前语音输入（新逻辑）
    if (currentVoice.trim()) {
      console.log('📝 Adding voice Q&A pair to history (new logic)')

      const userMessage = {
        type: 'user' as const,
        content: currentVoice.trim(),
        timestamp,
        source: 'voice' as const
      }

      const aiMessage = {
        type: 'ai' as const,
        content: response,
        timestamp,
        source: 'voice' as const
      }

      const newHistory = [...currentHistory, userMessage, aiMessage]
      console.log('📝 Voice Q&A pair - new history length:', newHistory.length)

      setConversationHistory(newHistory)
      setCurrentVoiceInput('')
      console.log('✅ Voice Q&A pair added and currentVoiceInput cleared')

    } else if (currentPendingInput && currentPendingInput.source === 'text') {
      // 文字输入的AI回复（保持原逻辑）
      console.log('📝 Adding AI response for text input (original logic)')

      const aiMessage = {
        type: 'ai' as const,
        content: response,
        timestamp,
        source: 'text' as const
      }

      const newHistory = [...currentHistory, aiMessage]
      console.log('📝 Text AI response - new history length:', newHistory.length)

      setConversationHistory(newHistory)
      setPendingUserInput(null)
      console.log('✅ Text AI response added and pendingUserInput cleared')

    } else {
      console.log('⚠️ No pending input found, skipping AI response')
      console.log('  - currentVoice.trim():', currentVoice.trim())
      console.log('  - currentPendingInput:', currentPendingInput)
    }
  }

  // 检查权限状态
  const checkPermissionsBeforeStart = async () => {
    try {
      console.log('🔍 Starting permission check...')
      setStatus('检查系统权限...')
      setIsInitializing(true)
      setCurrentError(null) // 清除之前的错误状态

      // 添加超时处理
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('权限检查超时')), 10000) // 10秒超时
      })

      const permissions = await Promise.race([
        window.bready.checkPermissions(),
        timeoutPromise
      ])

      console.log('🔍 Permissions result:', permissions)

      const allGranted = permissions.screenRecording.granted &&
                        permissions.microphone.granted &&
                        permissions.apiKey.granted &&
                        permissions.audioDevice.granted

      if (!allGranted) {
        console.log('❌ Not all permissions granted, showing setup')
        setIsInitializing(false)
        setShowPermissionsSetup(true)
        setStatus('需要设置权限')
        // 权限问题不算错误，只是需要设置
        setCurrentError(null)
      } else {
        console.log('✅ All permissions granted, initializing Gemini')
        setPermissionsChecked(true)
        setStatus('正在连接 AI 服务...')
        await initializeGemini()
      }
    } catch (error) {
      console.error('权限检查失败:', error)
      setIsInitializing(false)
      setCurrentError({
        type: 'unknown-error',
        message: `无法检查系统权限状态: ${error instanceof Error ? error.message : String(error)}`
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
      let customPrompt = ''

      if (selectedPreparationStr) {
        try {
          const selectedPreparation = JSON.parse(selectedPreparationStr)

          // 构建基础准备信息
          let promptParts = [
            `面试准备：${selectedPreparation.name}`,
            `岗位信息：${selectedPreparation.jobDescription}`
          ]

          // 如果有简历信息，也加入到prompt中
          if (selectedPreparation.resume && selectedPreparation.resume.trim()) {
            promptParts.push(`个人简历：${selectedPreparation.resume}`)
          }

          // 如果有 AI 分析结果，将系统提示词作为额外信息添加
          if (selectedPreparation.analysis && selectedPreparation.analysis.systemPrompt) {
            promptParts.push(`AI分析建议：${selectedPreparation.analysis.systemPrompt}`)
            customPrompt = promptParts.join('\n\n')
          } else {
            // 没有AI分析时，使用基本信息并添加通用指导
            promptParts.push('请作为专业的面试助手，基于以上信息为候选人提供面试指导和建议。')
            customPrompt = promptParts.join('\n\n')
          }
        } catch (error) {
          console.error('Failed to parse selected preparation:', error)
          customPrompt = selectedPreparationStr
        }
      }

      let language = localStorage.getItem('bready-selected-language') || 'cmn-CN'

      // 修复旧的语言代码
      if (language === 'zh-CN') {
        language = 'cmn-CN'
        localStorage.setItem('bready-selected-language', 'cmn-CN')
      }

      const purpose = localStorage.getItem('bready-selected-purpose') || 'interview'

      setStatus('正在连接 AI 服务...')
      console.log('🤖 Initializing Gemini with API key length:', apiKey.length)

      // 添加超时处理
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Gemini 初始化超时')), 15000) // 15秒超时
      })

      const success = await Promise.race([
        window.bready.initializeGemini(apiKey, customPrompt, purpose, language),
        timeoutPromise
      ])

      if (success) {
        setStatus('正在启动音频捕获...')
        setIsConnected(true)
        setCurrentError(null)
        const audioSuccess = await window.bready.startAudioCapture()

        if (audioSuccess) {
          setStatus('准备就绪')
          setIsInitializing(false) // 初始化完成
        } else {
          setIsInitializing(false)
          setCurrentError({
            type: 'audio-device-error',
            message: '无法启动音频捕获，请检查系统音频权限'
          })
          setStatus('音频捕获失败')
        }
      } else {
        setIsInitializing(false)
        setCurrentError({
          type: 'api-connection-failed',
          message: '无法连接 AI 服务，请检查网络连接和配置'
        })
        setStatus('连接失败')
      }
    } catch (error) {
      console.error('初始化失败:', error)
      setIsInitializing(false)
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
    setIsInitializing(true)
    initializeGemini()
  }

  const handlePermissionsSkip = () => {
    setShowPermissionsSetup(false)
    setCurrentError({
      type: 'permissions-not-set',
      message: '跳过了权限设置，Live Interview 模式可能无法正常工作'
    })
  }

  const handleReconnect = async () => {
    if (!window.bready) return

    try {
      setStatus('正在重连...')
      setIsInitializing(true)
      setCurrentError(null)

      console.log('🔄 Starting manual reconnect...')
      const success = await window.bready.reconnectGemini()

      if (success) {
        setIsConnected(true)
        setStatus('重连成功')
        setCurrentError(null)
        setIsInitializing(false)
        console.log('✅ Manual reconnect successful')

        // 重连成功后重新启动音频捕获
        setTimeout(async () => {
          try {
            await window.bready.startAudioCapture()
            setStatus('准备就绪')
          } catch (audioError) {
            console.error('Audio capture failed after reconnect:', audioError)
            setStatus('音频启动失败')
          }
        }, 1000)
      } else {
        setIsConnected(false)
        setStatus('重连失败，请稍后重试')
        setIsInitializing(false)
        setCurrentError({
          type: 'api-connection-failed',
          message: '重连失败，请检查网络连接后重试'
        })
        console.log('❌ Manual reconnect failed')
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

    setConversationHistory(prev => {
      console.log('📝 Adding user message to history:', userMessage)
      const newHistory = [...prev, userMessage]
      console.log('📝 New conversation history length:', newHistory.length)
      return newHistory
    })

    // 切换到文字输入状态，显示发送的问题
    setMainDisplayState({
      type: 'text_input',
      content: messageText
    })

    // 设置pending状态，用于AI回复时的历史记录处理
    setPendingUserInput({
      content: messageText,
      source: 'text'
    })

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
          content: `收到您的问题："${messageText}"，我正在思考如何回答...（浏览器预览模式）`,
          timestamp: new Date(),
          source: 'text' as const
        }
        setConversationHistory(prev => [...prev, aiMessage])

        // 切换到AI回答状态
        setMainDisplayState({
          type: 'ai_responding',
          content: aiMessage.content
        })
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

      // 切换到AI回答状态显示错误
      setMainDisplayState({
        type: 'ai_responding',
        content: errorMessage.content
      })
      setIsWaitingForAI(false)
      return
    }

    try {
      // 发送文字消息到 AI 模型
      console.log('📤 Sending text message to AI:', messageText)
      const result = await window.bready.sendTextMessage(messageText)

      if (!result.success) {
        console.error('❌ Failed to send text message to AI:', result.error)
        // 添加错误消息到对话记录
        const errorMessage = {
          type: 'ai' as const,
          content: `抱歉，发送消息失败：${result.error || '请稍后重试'}`,
          timestamp: new Date(),
          source: 'text' as const
        }
        setConversationHistory(prev => [...prev, errorMessage])

        // 切换到AI回答状态显示错误
        setMainDisplayState({
          type: 'ai_responding',
          content: errorMessage.content
        })
        setIsWaitingForAI(false)
      }
      // 如果发送成功，AI 的回复会通过 onAIResponse 事件监听器接收
    } catch (error) {
      console.error('❌ Error sending text message:', error)
      const errorMessage = {
        type: 'ai' as const,
        content: '发送消息时出现错误，请检查连接状态。',
        timestamp: new Date(),
        source: 'text' as const
      }
      setConversationHistory(prev => [...prev, errorMessage])

      // 切换到AI回答状态显示错误
      setMainDisplayState({
        type: 'ai_responding',
        content: errorMessage.content
      })
      setIsWaitingForAI(false)
    }
  }

  const scrollToBottom = () => {
    // 使用 setTimeout 确保 DOM 更新后再滚动
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  useEffect(() => {
    scrollToBottom()
  }, [conversationHistory])

  // 当AI回复完成时也滚动到底部
  useEffect(() => {
    if (mainDisplayState.type === 'ai_responding') {
      scrollToBottom()
    }
  }, [mainDisplayState])

  // 如果正在初始化，显示加载界面
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-4 h-4 bg-black rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
            <div className="w-4 h-4 bg-black rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
            <div className="w-4 h-4 bg-black rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
          </div>
          <p className="text-gray-700 font-medium">{status}</p>
          <p className="text-gray-500 text-sm mt-2">正在准备协作模式...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50/30 collaboration-content" style={{ WebkitAppRegion: 'drag' } as any}>
      {/* 权限设置向导 */}
      <PermissionsSetup
        isOpen={showPermissionsSetup}
        onComplete={handlePermissionsComplete}
        onSkip={handlePermissionsSkip}
      />

      {/* 顶部拖拽区域和返回按钮 */}
      <div className="h-8 w-full relative" style={{ WebkitAppRegion: 'drag' } as any}>
        <div className="relative">
          <button
            onClick={() => setShowExitConfirm(!showExitConfirm)}
            className="absolute left-17 top-0.5 text-gray-600 hover:text-black transition-all duration-200 hover:bg-gray-50 p-2 rounded-lg"
            style={{ WebkitAppRegion: 'no-drag' } as any}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* 自定义气泡 */}
          {showExitConfirm && (
            <>
              {/* 背景遮罩 */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowExitConfirm(false)}
                style={{ WebkitAppRegion: 'no-drag' } as any}
              />

              {/* 气泡内容 */}
              <div className="absolute top-12 left-16 z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-3 flex items-center space-x-3 min-w-max animate-in fade-in-0 zoom-in-95 duration-200">
                <span className="text-sm text-gray-700 whitespace-nowrap">退出协作模式？</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowExitConfirm(false)
                    onExit()
                  }}
                  className="w-6 h-6 bg-black text-white rounded-full hover:bg-gray-800 transition-colors duration-200 flex items-center justify-center text-xs"
                >
                  ✓
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 主要内容区域 - 去掉卡片包裹 */}
      <div className="p-4" style={{ height: 'calc(95vh)' }}>
        <div className="h-full flex gap-3">
          {/* 左侧：AI 助手回复区域 (精确3:1比例) */}
          <div style={{ flex: '3 1 0%' }} className="flex flex-col relative">
            {/* 状态信息和音频模式选择 - 右上角 */}
            <div className="absolute top-0 right-0 flex items-center space-x-3">
              {/* 音频模式选择器 */}
              <div className="relative" ref={audioModeRef}>
                <button
                  onClick={() => setShowAudioModeDropdown(!showAudioModeDropdown)}
                  className="flex items-center space-x-2 bg-white px-3 py-1.5 rounded-lg text-xs border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200"
                  style={{ WebkitAppRegion: 'no-drag' } as any}
                >
                  {audioModeOptions.find(option => option.value === currentAudioMode)?.icon}
                  <span className="text-gray-700 font-medium">
                    {audioModeOptions.find(option => option.value === currentAudioMode)?.label}
                  </span>
                  <ChevronDown className={`w-3 h-3 text-gray-500 transition-transform duration-200 ${
                    showAudioModeDropdown ? 'rotate-180' : ''
                  }`} />
                </button>

                {/* 下拉菜单 */}
                {showAudioModeDropdown && (
                  <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-48 animate-in fade-in-0 zoom-in-95 duration-200">
                    {audioModeOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => handleAudioModeChange(option.value)}
                        className={`w-full px-3 py-2.5 text-left hover:bg-gray-50 transition-colors duration-150 first:rounded-t-lg last:rounded-b-lg ${
                          currentAudioMode === option.value ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                        }`}
                        style={{ WebkitAppRegion: 'no-drag' } as any}
                      >
                        <div className="flex items-start space-x-3">
                          <div className={`mt-0.5 ${
                            currentAudioMode === option.value ? 'text-blue-600' : 'text-gray-500'
                          }`}>
                            {option.icon}
                          </div>
                          <div className="flex-1">
                            <div className={`text-sm font-medium ${
                              currentAudioMode === option.value ? 'text-blue-700' : 'text-gray-900'
                            }`}>
                              {option.label}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {option.description}
                            </div>
                          </div>
                          {currentAudioMode === option.value && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 连接状态 */}
              <div className="flex items-center space-x-2 bg-gray-50 px-3 py-1 rounded-lg text-xs">
                {isConnected ? (
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                ) : (
                  <div className="w-2 h-2 bg-red-500 rounded-full" />
                )}
                <span className="text-gray-600">{status}</span>
                {!isConnected && !isInitializing && (
                  <button
                    onClick={handleReconnect}
                    className="ml-2 p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded transition-colors"
                    style={{ WebkitAppRegion: 'no-drag' } as any}
                    title="重新连接"
                  >
                    <RefreshCw className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 pt-8">
                {/* 错误提示 - 初始化期间不显示 */}
                {currentError && !isInitializing && (
                  <div className="mb-4 mx-8 p-4 bg-red-50 border border-red-200 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        <span className="text-red-700 font-medium">
                          {getErrorTitle(currentError.type)}
                        </span>
                      </div>
                      {(currentError.type === 'api-connection-failed' || currentError.type === 'audio-device-error') && (
                        <button
                          onClick={handleReconnect}
                          className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-medium transition-colors"
                          style={{ WebkitAppRegion: 'no-drag' } as any}
                        >
                          重连
                        </button>
                      )}
                    </div>
                    <p className="text-red-600 text-sm mt-2">{currentError.message}</p>
                  </div>
                )}

                {/* 主显示区 - 基于状态渲染 */}
                <div className="flex items-center justify-center h-full">
                  <div className="text-center space-y-6 max-w-2xl">
                    {/* 根据主显示状态渲染不同内容 */}
                    {mainDisplayState.type === 'listening' ? (
                      <div className="text-gray-700 text-lg">
                        <div className="relative w-32 h-32 mx-auto mb-8">
                          {/* 外层扩散圆环 */}
                          <div className="absolute inset-0 bg-black rounded-full animate-ping opacity-10"></div>
                          <div className="absolute inset-3 bg-gray-800 rounded-full animate-ping opacity-15" style={{animationDelay: '0.3s'}}></div>
                          <div className="absolute inset-6 bg-gray-600 rounded-full animate-ping opacity-20" style={{animationDelay: '0.6s'}}></div>

                          {/* 中心圆 */}
                          <div className="absolute inset-8 bg-black rounded-full flex items-center justify-center shadow-2xl">
                            {/* 音频波形动画 */}
                            <div className="flex items-end space-x-1">
                              <div className="w-1 bg-white rounded-full animate-bounce" style={{height: '6px', animationDelay: '0ms', animationDuration: '1s'}}></div>
                              <div className="w-1 bg-white rounded-full animate-bounce" style={{height: '12px', animationDelay: '100ms', animationDuration: '1s'}}></div>
                              <div className="w-1 bg-white rounded-full animate-bounce" style={{height: '8px', animationDelay: '200ms', animationDuration: '1s'}}></div>
                              <div className="w-1 bg-white rounded-full animate-bounce" style={{height: '14px', animationDelay: '300ms', animationDuration: '1s'}}></div>
                              <div className="w-1 bg-white rounded-full animate-bounce" style={{height: '10px', animationDelay: '400ms', animationDuration: '1s'}}></div>
                              <div className="w-1 bg-white rounded-full animate-bounce" style={{height: '6px', animationDelay: '500ms', animationDuration: '1s'}}></div>
                            </div>
                          </div>
                        </div>
                        <div className="text-black font-medium tracking-wide">
                          正在聆听...
                        </div>
                      </div>
                    ) : mainDisplayState.type === 'voice_transcribing' ? (
                      <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 text-gray-800 text-lg leading-relaxed">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                          <span className="text-sm text-blue-600 font-medium">语音转录中</span>
                        </div>
                        <div className="text-left">{mainDisplayState.content}</div>
                      </div>
                    ) : mainDisplayState.type === 'text_input' ? (
                      // 文字输入状态时不显示内容，因为会在等待AI回复时显示
                      null
                    ) : mainDisplayState.type === 'ai_responding' ? (
                      <div
                        className="bg-gradient-to-r from-gray-50 to-white p-6 rounded-2xl border border-gray-100 text-gray-800 text-lg leading-relaxed text-selectable"
                        style={{
                          WebkitAppRegion: 'no-drag',
                          WebkitUserSelect: 'text',
                          userSelect: 'text'
                        } as any}
                      >
                        <div className="prose prose-gray max-w-none text-selectable" style={{
                          WebkitUserSelect: 'text',
                          userSelect: 'text'
                        } as any}>
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeHighlight]}
                            components={{
                              // 自定义代码块样式
                              code: ({ className, children, ...props }: any) => {
                                const match = /language-(\w+)/.exec(className || '')
                                const isInline = !match
                                return isInline ? (
                                  <code className="bg-gray-100 px-1 py-0.5 rounded text-sm text-selectable" style={{
                                    WebkitUserSelect: 'text',
                                    userSelect: 'text'
                                  } as any} {...props}>
                                    {children}
                                  </code>
                                ) : (
                                    <pre className="bg-gray-100 rounded-lg p-4 overflow-x-auto text-selectable" style={{
                                      WebkitUserSelect: 'text',
                                      userSelect: 'text'
                                    } as any}>
                                      <code className={`${className} text-selectable`} style={{
                                        WebkitUserSelect: 'text',
                                        userSelect: 'text'
                                      } as any} {...props}>
                                        {children}
                                      </code>
                                    </pre>
                                  )
                                },
                                // 自定义列表样式
                                ul: ({ children }: any) => (
                                  <ul className="list-disc list-inside space-y-1 my-4 text-selectable" style={{
                                    WebkitUserSelect: 'text',
                                    userSelect: 'text'
                                  } as any}>
                                    {children}
                                  </ul>
                                ),
                                ol: ({ children }: any) => (
                                  <ol className="list-decimal list-inside space-y-1 my-4 text-selectable" style={{
                                    WebkitUserSelect: 'text',
                                    userSelect: 'text'
                                  } as any}>
                                    {children}
                                  </ol>
                                ),
                                // 自定义段落样式
                                p: ({ children }: any) => (
                                  <p className="mb-4 last:mb-0 text-selectable" style={{
                                    WebkitUserSelect: 'text',
                                    userSelect: 'text'
                                  } as any}>
                                    {children}
                                  </p>
                                ),
                                // 自定义标题样式
                                h1: ({ children }: any) => (
                                  <h1 className="text-2xl font-bold mb-4 text-gray-900">
                                    {children}
                                  </h1>
                                ),
                                h2: ({ children }: any) => (
                                  <h2 className="text-xl font-semibold mb-3 text-gray-900">
                                    {children}
                                  </h2>
                                ),
                                h3: ({ children }: any) => (
                                  <h3 className="text-lg font-medium mb-2 text-gray-900">
                                    {children}
                                  </h3>
                                ),
                              }}
                            >
                              {mainDisplayState.content}
                            </ReactMarkdown>
                          </div>
                        </div>
                    ) : null}

                    {/* 等待AI回复的加载状态 */}
                    {isWaitingForAI && (
                      <div className="mt-4 space-y-4">
                        {/* AI思考动画 */}
                        <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200">
                          <div className="flex items-center justify-center space-x-2">
                            <div className="flex space-x-1">
                              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                            </div>
                          </div>
                        </div>

                        {/* 已发送的问题卡片 */}
                        {mainDisplayState.type === 'text_input' && (
                          <div className="bg-green-50 p-4 rounded-xl border border-green-100 text-gray-800">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-lg">⌨️</span>
                            </div>
                            <div className="text-left text-sm">{mainDisplayState.content}</div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 用户输入框 */}
              <div className="mt-6" style={{ WebkitAppRegion: 'no-drag' } as any}>
                <div className="flex items-center justify-center pl-8">
                  <div className="flex items-center space-x-3 w-full max-w-xl">
                    <input
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="输入问题..."
                      className="flex-1 px-5 py-3 bg-gray-50 border-2 border-transparent rounded-2xl focus:outline-none focus:border-black transition-all duration-200 text-base placeholder-gray-400"
                      style={{ WebkitAppRegion: 'no-drag' } as any}
                      onCompositionStart={() => setIsComposing(true)}
                      onCompositionEnd={() => setIsComposing(false)}
                      onKeyDown={(e) => {
                        // 只有在非输入法状态下才响应回车键
                        if (e.key === 'Enter' && !isComposing) {
                          e.preventDefault()
                          handleSendMessage()
                        }
                      }}
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!inputText.trim()}
                      className="w-10 h-10 bg-black text-white rounded-full hover:bg-gray-800 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
                      style={{ WebkitAppRegion: 'no-drag' } as any}
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

          {/* 右侧：对话记录 (精确1:3比例) */}
          <div style={{ flex: '1 1 0%' }} className="flex flex-col pl-4 pt-8">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 tracking-tight text-center">记录</h3>
            <div
              className="flex-1 overflow-y-auto space-y-2 pr-2 text-selectable"
              style={{
                maxHeight: 'calc(100vh - 200px)',
                WebkitAppRegion: 'no-drag',
                WebkitUserSelect: 'text',
                userSelect: 'text'
              } as any}
            >
              {conversationHistory.length === 0 ? (
                <div className="text-center text-gray-400 py-4 pr-4">
                  <p className="text-xs">等待提问</p>
                </div>
              ) : (
                  // 将对话按一问一答分组
                  (() => {
                    const groups = [];
                    let currentUserMessage = null;

                    for (const message of conversationHistory) {
                      if (message.type === 'user') {
                        // 如果有未配对的用户消息，先添加到组中
                        if (currentUserMessage) {
                          groups.push({ user: currentUserMessage, ai: null });
                        }
                        currentUserMessage = message;
                      } else if (message.type === 'ai' && currentUserMessage) {
                        // AI 回复配对用户消息
                        groups.push({ user: currentUserMessage, ai: message });
                        currentUserMessage = null;
                      }
                    }

                    // 处理最后一个未配对的用户消息
                    if (currentUserMessage) {
                      groups.push({ user: currentUserMessage, ai: null });
                    }

                  return groups.map((group, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-2 space-y-1.5 text-selectable" style={{
                      WebkitAppRegion: 'no-drag',
                      WebkitUserSelect: 'text',
                      userSelect: 'text'
                    } as any}>
                      {/* 用户消息 */}
                      <div className="bg-blue-50 rounded-md p-1.5 text-selectable" style={{
                        WebkitUserSelect: 'text',
                        userSelect: 'text'
                      } as any}>
                        <div className="text-xs text-blue-600 font-medium mb-0.5 flex items-center gap-1" style={{
                          WebkitUserSelect: 'none',
                          userSelect: 'none'
                        } as any}>
                          {group.user.source && (
                            <span className="text-xs bg-blue-100 px-1 py-0.5 rounded text-blue-700">
                              {group.user.source === 'voice' ? '🎤' : '⌨️'}
                            </span>
                          )}
                          <span>• {group.user.timestamp.toLocaleTimeString()}</span>
                        </div>
                        <div className="text-xs text-gray-800 text-selectable leading-tight" style={{
                          WebkitUserSelect: 'text',
                          userSelect: 'text'
                        } as any}>
                          {group.user.content}
                        </div>
                      </div>
                      {/* AI回复 */}
                      {group.ai && (
                        <div className="bg-white rounded-md p-1.5 border border-gray-200 text-selectable" style={{
                          WebkitAppRegion: 'no-drag',
                          WebkitUserSelect: 'text',
                          userSelect: 'text'
                        } as any}>
                          <div className="text-xs text-gray-600 font-bold mb-0.5 flex items-center gap-1" style={{
                            WebkitUserSelect: 'none',
                            userSelect: 'none'
                          } as any}>
                            <span className="text-xs bg-gray-100 px-1 py-0.5 rounded text-gray-700">🍞</span>
                            <span>• {group.ai.timestamp.toLocaleTimeString()}</span>
                          </div>
                          <div className="text-xs text-gray-800 prose prose-gray prose-sm max-w-none text-selectable leading-tight" style={{
                            WebkitUserSelect: 'text',
                            userSelect: 'text'
                          } as any}>
                              <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={{
                                // 简化的组件样式，适合小尺寸显示
                                code: ({ className, children, ...props }: any) => {
                                  const match = /language-(\w+)/.exec(className || '')
                                  const isInline = !match
                                  return isInline ? (
                                    <code className="bg-gray-100 px-1 py-0.5 rounded text-xs text-selectable" style={{
                                      WebkitUserSelect: 'text',
                                      userSelect: 'text'
                                    } as any} {...props}>
                                      {children}
                                    </code>
                                  ) : (
                                    <pre className="bg-gray-100 rounded p-2 overflow-x-auto text-xs text-selectable" style={{
                                      WebkitUserSelect: 'text',
                                      userSelect: 'text'
                                    } as any}>
                                      <code className={`${className} text-selectable`} style={{
                                        WebkitUserSelect: 'text',
                                        userSelect: 'text'
                                      } as any} {...props}>
                                        {children}
                                      </code>
                                    </pre>
                                  )
                                },
                                ul: ({ children }: any) => (
                                  <ul className="list-disc list-inside space-y-0 my-1 text-xs text-selectable" style={{
                                    WebkitUserSelect: 'text',
                                    userSelect: 'text'
                                  } as any}>
                                    {children}
                                  </ul>
                                ),
                                ol: ({ children }: any) => (
                                  <ol className="list-decimal list-inside space-y-0 my-1 text-xs text-selectable" style={{
                                    WebkitUserSelect: 'text',
                                    userSelect: 'text'
                                  } as any}>
                                    {children}
                                  </ol>
                                ),
                                p: ({ children }: any) => (
                                  <p className="mb-1 last:mb-0 text-xs leading-tight text-selectable" style={{
                                    WebkitUserSelect: 'text',
                                    userSelect: 'text'
                                  } as any}>
                                    {children}
                                  </p>
                                ),
                                h1: ({ children }: any) => (
                                  <h1 className="text-xs font-bold mb-1 text-gray-900">
                                    {children}
                                  </h1>
                                ),
                                h2: ({ children }: any) => (
                                  <h2 className="text-xs font-semibold mb-0.5 text-gray-900">
                                    {children}
                                  </h2>
                                ),
                                h3: ({ children }: any) => (
                                  <h3 className="text-xs font-medium mb-1 text-gray-900">
                                    {children}
                                  </h3>
                                ),
                              }}
                            >
                              {group.ai.content}
                            </ReactMarkdown>
                          </div>
                        </div>
                      )}
                    </div>
                  ));
                })()
              )}
              {/* 滚动目标 - 始终在对话记录最底部 */}
              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>
      </div>


    </div>
  )
}

export default CollaborationMode
