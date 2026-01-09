import React, { useState, useEffect, useRef } from 'react'
import { X, Settings, Volume2, Send, RefreshCw, Wifi, WifiOff, Trash2 } from 'lucide-react'
import { useI18n } from '../contexts/I18nContext'

const FloatingWindow: React.FC = () => {
  const { t, locale } = useI18n()
  const [transcription, setTranscription] = useState('')
  const [aiResponse, setAiResponse] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [opacity, setOpacity] = useState(0.9)
  const [inputText, setInputText] = useState('')
  const [status, setStatus] = useState(() => t('floating.status.idle'))
  const [isConnected, setIsConnected] = useState(false)
  const [conversationHistory, setConversationHistory] = useState<
    Array<{ type: 'user' | 'ai'; content: string; timestamp: Date }>
  >([])
  const responseRef = useRef<HTMLDivElement>(null)
  const transcriptionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // 初始化 AI API
    const initializeAI = async () => {
      try {
        // 尝试多种方式获取API密钥
        let apiKey = ''

        // 1. 从环境变量获取
        if (window.env && window.env.GEMINI_API_KEY) {
          apiKey = window.env.GEMINI_API_KEY
          console.log('API密钥来源：环境变量')
        }

        // 2. 从localStorage获取（备用）
        if (!apiKey) {
          const storedKey = localStorage.getItem('gemini-api-key')
          if (storedKey) {
            apiKey = storedKey
            console.log('API密钥来源：localStorage')
          }
        }

        // 3. 检查.env.local中的密钥是否存在
        if (!apiKey) {
          console.error('API密钥获取失败')
          console.log('环境变量状态:', window.env)
          console.log('localStorage状态:', localStorage.getItem('gemini-api-key'))
          setStatus(t('floating.status.apiKeyMissing'))
          return
        }

        console.log('使用API密钥:', apiKey.substring(0, 10) + '...')

        const customPrompt = localStorage.getItem('bready-selected-preparation') || ''
        let language = localStorage.getItem('bready-selected-language') || 'cmn-CN'

        // 修复旧的语言代码
        if (language === 'zh-CN') {
          language = 'cmn-CN'
          localStorage.setItem('bready-selected-language', 'cmn-CN')
        }

        const purpose = localStorage.getItem('bready-selected-purpose') || 'interview'

        console.log('初始化参数:', { customPrompt, language, purpose })

        setStatus(t('floating.status.connecting'))
        const success = await window.bready.initializeAI(apiKey, customPrompt, purpose, language)

        if (success) {
          setStatus(t('floating.status.connected'))
          setIsConnected(true)
          const audioSuccess = await window.bready.startAudioCapture()

          if (audioSuccess) {
            setStatus(t('floating.status.ready'))
            setIsListening(true)
          } else {
            setStatus(t('floating.status.audioFailed'))
          }
        } else {
          setStatus(t('floating.status.connectFailed'))
          setIsConnected(false)
        }
      } catch (error) {
        console.error('初始化错误:', error)
        const message = error instanceof Error ? error.message : String(error)
        setStatus(t('floating.status.error', { error: message }))
      }
    }

    // 设置事件监听器
    const setupEventListeners = () => {
      const removeStatusListener = window.bready.onStatusUpdate((status) => {
        setStatus(status)
      })

      const removeTranscriptionListener = window.bready.onTranscriptionUpdate((text) => {
        const cleanText = cleanTranscription(text)
        if (cleanText.trim()) {
          setTranscription((prev) => {
            const newText = prev + ' ' + cleanText
            // 限制转录文本长度，保留最近的内容
            const words = newText.split(' ')
            if (words.length > 100) {
              return words.slice(-80).join(' ')
            }
            return newText
          })

          // 添加到对话历史
          setConversationHistory((prev) => {
            const lastEntry = prev[prev.length - 1]
            if (lastEntry && lastEntry.type === 'user') {
              // 更新最后一个用户条目
              return [
                ...prev.slice(0, -1),
                {
                  ...lastEntry,
                  content: lastEntry.content + ' ' + cleanText,
                  timestamp: new Date(),
                },
              ]
            } else {
              // 创建新的用户条目
              return [
                ...prev,
                {
                  type: 'user' as const,
                  content: cleanText,
                  timestamp: new Date(),
                },
              ]
            }
          })
        }
      })

      const removeResponseListener = window.bready.onAIResponse((response) => {
        if (response.trim()) {
          setAiResponse(response)

          // 添加到对话历史
          setConversationHistory((prev) => [
            ...prev,
            {
              type: 'ai' as const,
              content: response,
              timestamp: new Date(),
            },
          ])
        }
      })

      const removeErrorListener = window.bready.onSessionError((error) => {
        setStatus(t('floating.status.error', { error }))
        setIsListening(false)
        setIsConnected(false)
      })

      const removeClosedListener = window.bready.onSessionClosed(() => {
        setStatus(t('floating.status.sessionClosed'))
        setIsListening(false)
        setIsConnected(false)
      })

      return () => {
        removeStatusListener()
        removeTranscriptionListener()
        removeResponseListener()
        removeErrorListener()
        removeClosedListener()
      }
    }

    initializeAI()
    const cleanup = setupEventListeners()

    return () => {
      cleanup()
      window.bready.stopAudioCapture()
    }
  }, [])

  // 自动滚动到最新回复
  useEffect(() => {
    if (responseRef.current) {
      responseRef.current.scrollTop = responseRef.current.scrollHeight
    }
  }, [aiResponse, conversationHistory])

  // 自动滚动转录区域
  useEffect(() => {
    if (transcriptionRef.current) {
      transcriptionRef.current.scrollTop = transcriptionRef.current.scrollHeight
    }
  }, [transcription])

  const handleClose = async () => {
    await window.bready.stopAudioCapture()
    await window.bready.closeFloatingWindow()
  }

  const handleOpacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOpacity(parseFloat(e.target.value))
  }

  const handleInputSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputText.trim()) {
      // 这里可以添加发送文本到 AI 的逻辑
      setInputText('')
    }
  }

  const handleReconnect = async () => {
    setStatus(t('floating.status.reconnecting'))
    try {
      const success = await window.bready.reconnectAI()
      if (success) {
        setIsConnected(true)
        setStatus(t('floating.status.reconnectSuccess'))
      } else {
        setStatus(t('floating.status.reconnectFailed'))
      }
    } catch (error) {
      setStatus(t('floating.status.reconnectError', { error: String(error) }))
    }
  }

  const handleClearHistory = () => {
    setConversationHistory([])
    setTranscription('')
    setAiResponse('')
  }

  // 清理转录文本中的噪声标签
  const cleanTranscription = (text: string) => {
    return text.replace(/\[.*?\]/g, '').replace(/\(.*?\)/g, '')
  }

  return (
    <div
      className="rounded-lg overflow-hidden shadow-vercel-lg border border-vercel-gray-200 flex flex-col"
      style={{
        opacity,
        backgroundColor: `rgba(255, 255, 255, ${opacity})`,
        height: '100vh',
        width: '100vw',
      }}
    >
      {/* 顶部控制栏 */}
      <div className="bg-vercel-black text-white p-2 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div
            className={`w-2 h-2 rounded-full ${isListening ? 'bg-green-500' : 'bg-red-500'}`}
          ></div>
          <span className="text-xs">{status}</span>
        </div>
        <div className="flex items-center space-x-1">
          {isConnected ? (
            <Wifi className="w-4 h-4 text-green-400" />
          ) : (
            <WifiOff className="w-4 h-4 text-red-400" />
          )}

          {!isConnected && (
            <button
              onClick={handleReconnect}
              className="p-1 hover:bg-vercel-gray-800 rounded"
              title={t('floating.labels.reconnect')}
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}

          <button className="p-1 hover:bg-vercel-gray-800 rounded">
            <Settings className="w-4 h-4" />
          </button>
          <button onClick={handleClose} className="p-1 hover:bg-vercel-gray-800 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 主要内容区 */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* 实时转录区域 */}
        <div className="bg-vercel-gray-50 p-3 border-b border-vercel-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-medium text-vercel-gray-500">
              {t('floating.labels.liveTranscription')}
            </h3>
            <div
              className={`w-2 h-2 rounded-full ${isListening ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}
            ></div>
          </div>
          <div
            ref={transcriptionRef}
            className="text-sm text-vercel-gray-700 max-h-20 overflow-y-auto"
          >
            {transcription ||
              (isListening ? t('floating.labels.listening') : t('floating.labels.waitingAudio'))}
          </div>
        </div>

        {/* 对话历史和AI回复区域 */}
        <div ref={responseRef} className="flex-1 p-3 overflow-y-auto bg-white">
          {conversationHistory.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-vercel-gray-400">
                {isListening ? (
                  <div>
                    <div className="loading-dots mb-2">
                      {t('floating.labels.listeningHintTitle')}
                    </div>
                    <p className="text-xs">{t('floating.labels.listeningHint')}</p>
                  </div>
                ) : (
                  <div>
                    <p className="mb-2">{t('floating.labels.waitingConnection')}</p>
                    <p className="text-xs">{t('floating.labels.initializingHint')}</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {conversationHistory.map((entry, index) => (
                <div key={index} className={`${entry.type === 'ai' ? 'ml-0' : 'mr-0'}`}>
                  <div
                    className={`text-xs text-vercel-gray-500 mb-1 ${entry.type === 'ai' ? 'text-left' : 'text-right'}`}
                  >
                    {entry.type === 'ai'
                      ? t('floating.labels.aiAssistant')
                      : t('floating.labels.you')}{' '}
                    • {entry.timestamp.toLocaleTimeString(locale)}
                  </div>
                  <div
                    className={`p-2 rounded-lg text-sm ${
                      entry.type === 'ai'
                        ? 'bg-vercel-gray-100 text-vercel-black'
                        : 'bg-vercel-blue-50 text-vercel-blue-900 ml-8'
                    }`}
                  >
                    {entry.type === 'ai' ? (
                      <div dangerouslySetInnerHTML={{ __html: entry.content }} />
                    ) : (
                      <p>{entry.content}</p>
                    )}
                  </div>
                </div>
              ))}

              {/* 显示最新的AI回复 */}
              {aiResponse && conversationHistory[conversationHistory.length - 1]?.type !== 'ai' && (
                <div className="ml-0">
                  <div className="text-xs text-vercel-gray-500 mb-1 text-left">
                    {t('floating.labels.aiAssistant')} • {t('floating.labels.responding')}
                  </div>
                  <div className="p-2 rounded-lg text-sm bg-vercel-gray-100 text-vercel-black">
                    <div dangerouslySetInnerHTML={{ __html: aiResponse }} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 输入区域 */}
        <form
          onSubmit={handleInputSubmit}
          className="border-t border-vercel-gray-200 p-2 flex items-center"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={t('floating.labels.inputPlaceholder')}
            className="flex-1 px-3 py-2 border border-vercel-gray-200 rounded-l-lg focus:outline-none focus:ring-1 focus:ring-vercel-black"
          />
          <button
            type="submit"
            className="px-3 py-2 bg-vercel-black text-white rounded-r-lg hover:bg-vercel-gray-800"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* 底部控制区 */}
      <div className="bg-vercel-gray-50 p-2 border-t border-vercel-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1">
              <Volume2 className="w-4 h-4 text-vercel-gray-600" />
              <span className="text-xs text-vercel-gray-600">
                {t('floating.labels.systemAudio')}
              </span>
            </div>

            {conversationHistory.length > 0 && (
              <button
                onClick={handleClearHistory}
                className="flex items-center space-x-1 px-2 py-1 text-xs text-vercel-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                title={t('floating.labels.clearHistoryTitle')}
              >
                <Trash2 className="w-3 h-3" />
                <span>{t('floating.labels.clearHistory')}</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs text-vercel-gray-600">{t('floating.labels.opacity')}</span>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.1"
              value={opacity}
              onChange={handleOpacityChange}
              className="w-20"
            />
            <span className="text-xs text-vercel-gray-500 w-8">{Math.round(opacity * 100)}%</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FloatingWindow
