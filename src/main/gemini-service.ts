import { GoogleGenAI, Modality, EndSensitivity } from '@google/genai'
import { getSystemPrompt } from './prompts'
import { electronAudioCapture } from './audio/electron-native-capture'
import { log, logRateLimited, logSampled } from './utils/logging'
import { recordMetric } from './utils/metrics'

interface ChatMessage {
  role: 'user' | 'model'
  parts: { text: string }[]
}

interface GeminiServiceOptions {
  onMessageToRenderer: (event: string, data?: any) => void
}

const TEXT_RESPONSE_MODEL = 'gemini-2.5-flash-lite-preview-09-2025'
const TEXT_RESPONSE_THINKING_BUDGET = 0
const MAX_CHAT_HISTORY = 20
const HEARTBEAT_INTERVAL = 30000
const geminiErrorLogCooldownMs = 30000
const TRANSCRIPTION_DEBOUNCE_MS = 800
const ANALYSIS_MODEL = 'gemini-3-flash-preview'

const debugGemini = process.env.DEBUG_GEMINI === '1'
const enableGeminiHeartbeat = false

class GeminiService {
  private geminiSession: any = null
  private isInitializingSession = false
  private reconnectAttempts = 0
  private maxReconnectAttempts = 3
  private reconnectTimeout: NodeJS.Timeout | null = null
  private reconnectResetTimer: NodeJS.Timeout | null = null
  private currentApiKey: string | null = ''
  private currentCustomPrompt = ''
  private currentProfile = 'interview'
  private currentLanguage = 'cmn-CN'
  private currentTranscription = ''
  private geminiSessionReady = false
  private textClient: GoogleGenAI | null = null
  private textSystemPrompt = ''
  private textChatHistory: ChatMessage[] = []
  private transcriptionDebounceTimer: NodeJS.Timeout | null = null
  private isProcessingVoiceInput = false
  private heartbeatInterval: NodeJS.Timeout | null = null
  private connectionStartTime = 0
  private lastGeminiError = ''
  private lastGeminiErrorAt = 0
  private apiKeys: string[] = []
  private currentKeyIndex = 0
  private onMessageToRenderer: (event: string, data?: any) => void

  constructor(options: GeminiServiceOptions) {
    this.onMessageToRenderer = options.onMessageToRenderer
  }

  isSessionReady(): boolean {
    return this.geminiSessionReady
  }

  private logGeminiFailure(reason: string, error?: unknown): void {
    const now = Date.now()
    if (reason === this.lastGeminiError && now - this.lastGeminiErrorAt < geminiErrorLogCooldownMs) {
      return
    }
    this.lastGeminiError = reason
    this.lastGeminiErrorAt = now
    log('error', `Gemini 错误: ${reason}`)
    if (debugGemini && error) {
      log('debug', 'Gemini 详细错误对象:', error)
    }
  }

  private formatGeminiReason(reason: string): string {
    if (!reason) return '未知错误'

    // 网络相关
    if (reason.includes('fetch') || reason.includes('network')) {
      return '网络连接失败，请检查网络设置'
    }
    if (reason.includes('timeout')) {
      return 'AI 服务响应超时，请稍后重试'
    }

    // 权限和区域
    if (reason.includes('User location is not supported')) {
      return '您所在的地区暂不支持此服务，请使用 VPN'
    }
    if (reason.includes('API key')) {
      return 'API 密钥无效或已过期'
    }

    // 配额和限流
    if (reason.includes('429') || reason.includes('quota') || reason.includes('rate limit')) {
      return 'API 配额已用尽，正在切换备用密钥...'
    }

    // 音频相关
    if (reason.includes('Cannot extract voices from a non-audio request')) {
      return '音频数据格式错误'
    }
    if (reason.includes('audio')) {
      return '音频处理失败，请重新启动捕获'
    }

    // 模型相关
    if (reason.includes('model')) {
      return 'AI 模型暂时不可用'
    }

    // 通用错误
    if (reason.includes('400')) {
      return '请求参数错误'
    }
    if (reason.includes('500') || reason.includes('503')) {
      return 'AI 服务暂时不可用，请稍后重试'
    }

    return reason.length > 100 ? reason.substring(0, 100) + '...' : reason
  }

  private isRegionNotSupportedError(message: string): boolean {
    if (!message) return false
    return message.includes('User location is not supported')
      || message.includes('location is not supported')
      || message.includes('not supported for the API use')
  }

  private initializeApiKeysPool(apiKey: string): void {
    if (apiKey && apiKey.includes(',')) {
      this.apiKeys = apiKey.split(',').map(k => k.trim()).filter(k => k.length > 0)
      this.currentKeyIndex = 0
    } else if (apiKey) {
      this.apiKeys = [apiKey]
      this.currentKeyIndex = 0
    }
  }

  private getNextApiKey(): string | null {
    if (this.apiKeys.length === 0) {
      return null
    }
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length
    return this.apiKeys[this.currentKeyIndex]
  }

  private handleQuotaExceeded(): string | null {
    const newKey = this.getNextApiKey()
    if (newKey) {
      this.textClient = new GoogleGenAI({ apiKey: newKey, apiVersion: 'v1beta' })
    }
    return newKey
  }

  private startHeartbeat(session: any): void {
    if (!enableGeminiHeartbeat) {
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval)
        this.heartbeatInterval = null
      }
      return
    }

    if (!session) {
      return
    }

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
    }

    this.connectionStartTime = Date.now()

    this.heartbeatInterval = setInterval(() => {
      if (session && session.readyState === 1) {
        try {
          session.sendClientContent({
            turns: [],
            turnComplete: false
          })
        } catch (error) {
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect()
          }
        }
      }
    }, HEARTBEAT_INTERVAL)
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
    }

    this.stopHeartbeat()

    if (!this.currentApiKey || this.isInitializingSession) {
      return
    }

    const connectionDuration = Date.now() - this.connectionStartTime
    const isShortConnection = connectionDuration < 60000

    this.reconnectAttempts++
    let delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 30000)

    if (isShortConnection) {
      delay = Math.min(delay * 2, 60000)
    }

    this.onMessageToRenderer('update-status', `连接丢失，${Math.ceil(delay / 1000)}秒后重连... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
    recordMetric('gemini.reconnect.scheduled', { attempt: this.reconnectAttempts, delayMs: delay })

    this.reconnectTimeout = setTimeout(async () => {
      if (this.reconnectAttempts > this.maxReconnectAttempts) {
        this.onMessageToRenderer('session-error', '达到最大重连次数，重连失败')
        return
      }

      this.onMessageToRenderer('update-status', '正在重连...')

      try {
        if (!this.currentApiKey) return
        const success = await this.initializeGeminiSession(this.currentApiKey, this.currentCustomPrompt, this.currentProfile, this.currentLanguage)
        if (!success) {
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect()
          } else {
            this.onMessageToRenderer('session-error', '达到最大重连次数，重连失败')
          }
        }
      } catch (error) {
        log('error', '重连过程中出错:', error)
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect()
        } else {
          this.onMessageToRenderer('session-error', '达到最大重连次数，重连失败')
        }
      }
    }, delay)
  }

  async generateTextResponse(userMessage: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.textClient) {
        log('error', '❌ textClient 未初始化')
        this.onMessageToRenderer('session-error', 'AI 服务未初始化，请先连接')
        return { success: false, error: 'AI 服务未初始化，请先连接' }
      }

      recordMetric('gemini.text.response.start')
      log('info', '📨 正在使用文本模型生成流式回答...')
      this.onMessageToRenderer('update-status', '正在思考...')

      this.textChatHistory.push({
        role: 'user',
        parts: [{ text: userMessage }]
      })

      const contents = this.textChatHistory.map(msg => ({
        role: msg.role,
        parts: msg.parts
      }))

      const streamResponse = await this.textClient.models.generateContentStream({
        model: TEXT_RESPONSE_MODEL,
        contents: contents,
        config: {
          systemInstruction: this.textSystemPrompt,
          temperature: 1.0,
          maxOutputTokens: 2048,
          thinkingConfig: {
            thinkingBudget: TEXT_RESPONSE_THINKING_BUDGET
          }
        }
      })

      let fullResponseText = ''
      let chunkCount = 0

      for await (const chunk of streamResponse) {
        const chunkText = chunk.text
        if (chunkText) {
          fullResponseText += chunkText
          chunkCount++

          this.onMessageToRenderer('ai-response-update', fullResponseText)

          if (chunkCount === 1) {
            this.onMessageToRenderer('update-status', '正在回复...')
          }
        }
      }

      if (fullResponseText) {
        log('info', '✅ 文本模型流式回答完成，共', chunkCount, '个块，总长度:', fullResponseText.length)

        this.textChatHistory.push({
          role: 'model',
          parts: [{ text: fullResponseText }]
        })

        if (this.textChatHistory.length > MAX_CHAT_HISTORY * 2) {
          await this.compressHistory()
        }

        this.onMessageToRenderer('ai-response', fullResponseText)
        this.onMessageToRenderer('update-status', '正在聆听...')
      } else {
        log('warn', '⚠️ 文本模型返回空回答')
        this.textChatHistory.pop()
        this.onMessageToRenderer('update-status', '正在聆听...')
      }

      return { success: true }

    } catch (error: any) {
      const errorMessage = error?.message || String(error)
      log('error', '❌ 文本模型流式生成失败:', errorMessage)
      recordMetric('gemini.text.response.failure', { message: errorMessage })

      if (this.textChatHistory.length > 0 && this.textChatHistory[this.textChatHistory.length - 1].role === 'user') {
        this.textChatHistory.pop()
      }

      if (errorMessage.includes('429') || errorMessage.includes('quota')) {
        const newKey = this.handleQuotaExceeded()
        if (newKey) {
          return await this.generateTextResponse(userMessage)
        }
      }

      this.onMessageToRenderer('update-status', '正在聆听...')
      return { success: false, error: errorMessage }
    }
  }

  async initializeGeminiSession(apiKey: string, customPrompt = '', profile = 'interview', language = 'cmn-CN'): Promise<boolean> {
    if (this.isInitializingSession) {
      return false
    }

    if (!apiKey || apiKey.trim() === '') {
      log('error', 'API 密钥无效或为空')
      this.onMessageToRenderer('session-error', 'API密钥无效或为空')
      return false
    }

    recordMetric('gemini.session.init.start', { profile, language })

    this.currentApiKey = apiKey
    this.currentCustomPrompt = customPrompt
    this.currentProfile = profile
    this.currentLanguage = language

    this.isInitializingSession = true
    this.onMessageToRenderer('session-initializing', true)

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }

    this.initializeApiKeysPool(apiKey)

    try {
      const client = new GoogleGenAI({
        apiKey,
        apiVersion: 'v1beta',
      })

      const systemPrompt = getSystemPrompt(profile, customPrompt, false, language)
      log('debug', '📝 生成的系统提示词 (前500字符):', systemPrompt.substring(0, 500))
      log('debug', '📝 系统提示词参数:', { profile, language, customPromptLength: customPrompt.length })
      this.textClient = client
      this.textSystemPrompt = systemPrompt

      const responseModalities = [Modality.AUDIO]
      const liveConnectConfig: any = {
        responseModalities,
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        contextWindowCompression: { slidingWindow: {} },
        realtimeInputConfig: {
          automaticActivityDetection: {
            disabled: false,
            silenceDurationMs: 200,
            endOfSpeechSensitivity: EndSensitivity.END_SENSITIVITY_HIGH
          }
        },
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        thinkingConfig: {
          thinkingBudget: 0,
          includeThoughts: false
        }
      }

      const connectPromise = client.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            log('info', 'Gemini 会话已打开')
            recordMetric('gemini.session.open')
            this.geminiSessionReady = false
            this.connectionStartTime = Date.now()
            if (this.reconnectResetTimer) {
              clearTimeout(this.reconnectResetTimer)
            }
            this.reconnectResetTimer = setTimeout(() => {
              if (this.geminiSessionReady) {
                this.reconnectAttempts = 0
              }
            }, 10000)

            this.onMessageToRenderer('update-status', '已连接 Gemini - 正在启动录音...')
          },
          onmessage: (message: any) => {
            const hasAudioData = message.serverContent?.modelTurn?.parts?.some((p: any) => p.inlineData)

            if (message.serverContent?.outputTranscription) {
              // 日志在下面 outputTranscription 处理时打印
            } else if (message.serverContent?.modelTurn && !hasAudioData) {
              const parts = message.serverContent.modelTurn.parts || []
              const hasThought = parts.some((p: any) => p.thought)
              if (hasThought) {
                logSampled('debug', 0.1, '🤔 思考中...')
              }
            } else if (message.setupComplete) {
              log('debug', '📨 Gemini: setupComplete')
            } else if (message.serverContent?.turnComplete) {
              log('debug', '📨 Gemini: turnComplete')
            }

            if (message.setupComplete) {
              this.geminiSessionReady = true
              this.onMessageToRenderer('session-ready')
            }

            const inputTranscription = message.serverContent?.inputTranscription
            const transcriptionChunk = inputTranscription?.text
              || (Array.isArray(inputTranscription?.results)
                ? inputTranscription.results.map((result: any) => result?.transcript || '').join('')
                : '')
            if (transcriptionChunk) {
              this.currentTranscription += transcriptionChunk
              logRateLimited('transcription-update', 1000, 'debug', '📝 [后端] 发送转录:', this.currentTranscription.substring(0, 30))
              this.onMessageToRenderer('transcription-update', this.currentTranscription)

              if (this.transcriptionDebounceTimer) {
                clearTimeout(this.transcriptionDebounceTimer)
              }
              this.transcriptionDebounceTimer = setTimeout(async () => {
                if (this.currentTranscription.trim() && !this.isProcessingVoiceInput) {
                  this.isProcessingVoiceInput = true
                  const transcribedText = this.currentTranscription.trim()
                  log('info', '🎤 语音转录完成，调用文本模型:', transcribedText.substring(0, 50))

                  this.currentTranscription = ''

                  this.onMessageToRenderer('transcription-complete', transcribedText)

                  await this.generateTextResponse(transcribedText)
                  this.isProcessingVoiceInput = false
                }
              }, TRANSCRIPTION_DEBOUNCE_MS)
            }

            if (message.serverContent?.turnComplete) {
              logSampled('debug', 0.2, '📨 Gemini Live: turnComplete (仅转录)')
              this.onMessageToRenderer('update-status', '正在聆听...')
            }
          },
          onerror: (error: any) => {
            const errorMessage = error.message || error.toString() || 'Unknown error'
            this.logGeminiFailure(`会话错误：${errorMessage}`, error)
            recordMetric('gemini.session.error', { message: errorMessage })

            this.stopHeartbeat()
            this.geminiSessionReady = false

            this.onMessageToRenderer('session-error', `Gemini API 连接错误: ${errorMessage}`)

            if (this.isRegionNotSupportedError(errorMessage)) {
              this.currentApiKey = null
              this.reconnectAttempts = this.maxReconnectAttempts
              this.textClient = null
              this.textSystemPrompt = ''
              if (this.reconnectTimeout) {
                clearTimeout(this.reconnectTimeout)
                this.reconnectTimeout = null
              }
              electronAudioCapture.stopCapture()
              return
            }

            if (errorMessage.includes('API key') || errorMessage.includes('authentication') || errorMessage.includes('unauthorized')) {
              this.currentApiKey = null
              this.reconnectAttempts = this.maxReconnectAttempts
              return
            }

            if (this.reconnectAttempts < this.maxReconnectAttempts) {
              this.scheduleReconnect()
            }
          },
          onclose: (e) => {
            const reason = this.formatGeminiReason(e?.reason || '')
            log('info', 'Gemini 会话已关闭:', reason || '未知原因')
            recordMetric('gemini.session.closed', { reason: reason || 'unknown' })

            this.stopHeartbeat()

            this.geminiSession = null
            this.geminiSessionReady = false
            if (this.reconnectResetTimer) {
              clearTimeout(this.reconnectResetTimer)
              this.reconnectResetTimer = null
            }
            this.onMessageToRenderer('session-closed')

            if (reason.includes('language') || reason.includes('API key') || reason.includes('authentication') || reason.includes('unauthorized')) {
              log('warn', '会话因配置错误关闭:', reason)
              this.currentApiKey = null
              this.reconnectAttempts = this.maxReconnectAttempts
              this.onMessageToRenderer('session-error', `配置错误: ${reason}`)
              return
            }

            if (this.isRegionNotSupportedError(reason)) {
              this.currentApiKey = null
              this.reconnectAttempts = this.maxReconnectAttempts
              this.onMessageToRenderer('session-error', '当前地区不支持 Gemini API，请更换支持地区或改用 Vertex AI')
              this.textClient = null
              this.textSystemPrompt = ''
              if (this.reconnectTimeout) {
                clearTimeout(this.reconnectTimeout)
                this.reconnectTimeout = null
              }
              electronAudioCapture.stopCapture()
              return
            }

            if (this.reconnectAttempts < this.maxReconnectAttempts && this.currentApiKey && !this.isInitializingSession) {
              this.scheduleReconnect()
            } else {
              this.onMessageToRenderer('update-status', '会话已关闭')
            }
          }
        },
        config: liveConnectConfig,
      })

      const session = await Promise.race([
        connectPromise,
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('连接超时，请检查网络或 API 状态')), 7000)
        })
      ])

      this.geminiSession = session
      log('info', 'Gemini 会话初始化成功')
      recordMetric('gemini.session.init.success')

      this.startHeartbeat(session)
      this.isInitializingSession = false
      this.onMessageToRenderer('session-initializing', false)

      return true
    } catch (error: any) {
      let errorMessage = 'Unknown error'
      if (error.message) {
        errorMessage = error.message
      } else if (typeof error === 'string') {
        errorMessage = error
      } else if (error.toString) {
        errorMessage = error.toString()
      }

      if (errorMessage.includes('not found') || errorMessage.includes('not supported') || errorMessage.includes('model')) {
        errorMessage = `模型不可用: ${errorMessage}\n\n建议尝试以下模型之一:\n- gemini-2.0-flash-exp\n- models/gemini-2.0-flash-exp`
      } else if (errorMessage.includes('API_KEY_INVALID') || errorMessage.includes('401') || errorMessage.includes('API key')) {
        errorMessage = 'API密钥无效，请检查.env.local文件中的VITE_GEMINI_API_KEY配置'
        this.currentApiKey = null
      } else if (errorMessage.includes('PERMISSION_DENIED') || errorMessage.includes('403')) {
        errorMessage = 'API权限被拒绝，请检查API密钥权限'
      } else if (errorMessage.includes('language') || errorMessage.includes('Language')) {
        errorMessage = '语言配置错误，已自动修复为支持的语言代码'
      } else if (errorMessage.includes('ECONNRESET') || errorMessage.includes('socket disconnected') || errorMessage.includes('TLS connection')) {
        errorMessage = '网络连接被重置，这通常是网络不稳定导致的，请点击重连'
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect()
        }
      } else if (errorMessage.includes('NETWORK') || errorMessage.includes('fetch') || errorMessage.includes('timeout')) {
        errorMessage = '网络连接错误，请检查网络连接或点击重连'
      } else if (errorMessage.includes('WebSocket') || errorMessage.includes('connection')) {
        errorMessage = '连接已断开，请点击重连按钮'
      }

      this.logGeminiFailure(`初始化失败：${errorMessage}`, error)
      recordMetric('gemini.session.init.failure', { message: errorMessage })
      this.isInitializingSession = false
      this.onMessageToRenderer('session-initializing', false)
      this.onMessageToRenderer('session-error', errorMessage)
      return false
    }
  }

  async reconnectGemini(): Promise<boolean> {
    if (!this.currentApiKey) {
      return false
    }

    if (this.isInitializingSession) {
      return false
    }

    try {
      recordMetric('gemini.reconnect.full')
      this.stopHeartbeat()
      electronAudioCapture.stopCapture()

      if (this.geminiSession) {
        try {
          this.geminiSession.close()
        } catch {
          // ignore
        }
        this.geminiSession = null
      }

      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout)
        this.reconnectTimeout = null
      }

      this.reconnectAttempts = 0
      this.isInitializingSession = false
      this.currentTranscription = ''
      this.textChatHistory = []

      await new Promise(resolve => setTimeout(resolve, 1000))

      return await this.initializeGeminiSession(this.currentApiKey, this.currentCustomPrompt, this.currentProfile, this.currentLanguage)
    } catch (error) {
      this.isInitializingSession = false
      recordMetric('gemini.reconnect.failure', { message: error instanceof Error ? error.message : String(error) })
      return false
    }
  }

  async manualReconnect(): Promise<boolean> {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }
    this.reconnectAttempts = 0

    if (this.currentApiKey) {
      recordMetric('gemini.reconnect.manual')
      const success = await this.initializeGeminiSession(this.currentApiKey, this.currentCustomPrompt, this.currentProfile, this.currentLanguage)
      if (success) {
        this.onMessageToRenderer('session-paused-silence', false)
        this.onMessageToRenderer('update-status', '手动重连成功')
      }
      return success
    }
    return false
  }

  disconnectGemini(): boolean {
    recordMetric('gemini.session.disconnect')
    this.stopHeartbeat()
    electronAudioCapture.stopCapture()

    if (this.geminiSession) {
      try {
        this.geminiSession.close()
      } catch (error) {
        log('warn', '关闭会话错误:', error)
      }
      this.geminiSession = null
    }
    this.geminiSessionReady = false

    if (this.reconnectResetTimer) {
      clearTimeout(this.reconnectResetTimer)
      this.reconnectResetTimer = null
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }

    this.reconnectAttempts = this.maxReconnectAttempts
    this.isInitializingSession = false
    this.currentTranscription = ''
    this.textClient = null
    this.textSystemPrompt = ''
    this.textChatHistory = []

    this.onMessageToRenderer('session-closed')
    this.onMessageToRenderer('update-status', '已断开连接')

    log('info', '清理流程已完成')
    return true
  }

  sendAudioToGemini(base64Data: string, mimeType = 'audio/pcm;rate=24000'): void {
    if (!this.geminiSession || !this.geminiSessionReady) return
    if (!base64Data || typeof base64Data !== 'string') return

    try {
      this.geminiSession.sendRealtimeInput({
        audio: {
          data: base64Data,
          mimeType,
        },
      })
    } catch (error) {
      log('error', '发送音频到 Gemini 失败:', error)
    }
  }

  async analyzePreparation(preparationData: {
    name: string
    jobDescription: string
    resume?: string
  }): Promise<{
    success: boolean
    analysis?: {
      matchScore: number
      jobRequirements: string[]
      strengths: string[]
      weaknesses: string[]
      suggestions: string[]
      systemPrompt: string
    }
    error?: string
  }> {
    try {
      const apiKey = process.env.VITE_GEMINI_API_KEY
      log('info', 'AI分析 - API密钥状态:', apiKey ? `存在，长度: ${apiKey.length}` : '未找到')

      if (!apiKey) {
        log('error', 'AI分析失败: API密钥未配置')
        return {
          success: false,
          error: 'Gemini API 密钥未配置'
        }
      }

      const client = new GoogleGenAI({ apiKey })

      const analysisPrompt = `
你是一位资深的人力资源专家和面试官，拥有15年以上的招聘经验，曾在多家顶级互联网公司担任招聘总监。请以极其严格、专业、客观的标准分析以下面试准备信息。

**极其严格的评分原则（必须严格遵守）：**
- 评分必须严格遵循 0-100 分制
- 50分以下：明显不匹配，缺乏多项关键技能或经验，不建议面试
- 50-60分：勉强匹配，存在较多短板，需要大量准备
- 60-70分：基本匹配，具备部分要求但有明显不足
- 70-80分：较好匹配，具备大部分要求，有一定竞争力
- 80-90分：优秀匹配，几乎完全符合要求（仅限经验丰富且高度契合的候选人）
- 90分以上：极度罕见，仅限于完美契合且有突出亮点的情况
- **如果没有提供简历，评分直接为0分，无法进行任何有效评估**
- **即使简历优秀，也要严格对照岗位要求逐条评估，不要轻易给高分**

**准备名称：** ${preparationData.name}

**岗位描述（JD）：**
${preparationData.jobDescription}

${preparationData.resume ? `**个人简历：**\n${preparationData.resume}` : '**警告：** 未提供个人简历，无法进行任何有效评估，评分将直接为0分'}

请严格按照以下要求分析并返回JSON：

1. **matchScore** (必填，0-100整数)：严格的综合匹配度评分，请逐条对照岗位要求评估

2. **jobRequirements** (必填，数组，5-6项)：从岗位描述JD中提炼出最核心的关键要求，包括：
   - 必备技能要求
   - 经验年限要求  
   - 学历要求
   - 核心能力素质
   每条15-20字，要具体明确

3. **strengths** (必填，数组，4-5项)：候选人的核心竞争优势，每条20-30字，要具体说明为什么是优势

4. **weaknesses** (必填，数组，3-4项)：候选人需要改进的方面，每条20-30字，要指出具体的差距和改进方向

5. **suggestions** (必填，数组，4-5项)：针对性的面试准备建议，每条25-35字，要包含具体的准备方法或可能被问到的问题

6. **systemPrompt** (必填，字符串)：为AI面试助手生成的系统提示词

返回格式（所有字段必填，字段名必须完全一致）：
{
  "matchScore": 65,
  "jobRequirements": ["要求1详细描述", "要求2详细描述", "要求3详细描述", "要求4详细描述", "要求5详细描述"],
  "strengths": ["优势1：具体说明为什么是优势", "优势2：具体说明", "优势3：具体说明", "优势4：具体说明"],
  "weaknesses": ["改进1：指出差距和改进方向", "改进2：指出差距", "改进3：指出差距"],
  "suggestions": ["建议1：具体准备方法", "建议2：可能被问的问题", "建议3：回答策略", "建议4：注意事项"],
  "systemPrompt": "你是一名专业的面试助手..."
}
`

      const response = await client.models.generateContent({
        model: ANALYSIS_MODEL,
        contents: analysisPrompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.7,
          maxOutputTokens: 3000
        }
      })

      const analysisText = response.text
      if (!analysisText) {
        return {
          success: false,
          error: 'AI 分析返回空结果'
        }
      }

      try {
        const analysis = JSON.parse(analysisText)
        log('debug', '========== AI分析原始返回 ==========')
        log('debug', JSON.stringify(analysis, null, 2))
        log('debug', '所有字段:', Object.keys(analysis))
        log('debug', '=====================================')

        if (analysis.matchScore > 100) analysis.matchScore = 100
        if (analysis.matchScore < 0) analysis.matchScore = 0
        if (!preparationData.resume) {
          analysis.matchScore = 0
        }

        if (!analysis.jobRequirements) {
          analysis.jobRequirements = analysis.job_requirements
            || analysis.requirements
            || analysis.岗位需求
            || analysis.岗位要求
            || []
        }
        if (!analysis.strengths) {
          analysis.strengths = analysis.核心优势 || []
        }
        if (!analysis.weaknesses) {
          analysis.weaknesses = analysis.改进空间 || analysis.劣势 || []
        }
        if (!analysis.suggestions) {
          analysis.suggestions = analysis.面试建议 || analysis.建议 || []
        }

        log('debug', '处理后 jobRequirements:', analysis.jobRequirements)

        return {
          success: true,
          analysis
        }
      } catch (parseError) {
        log('error', 'Failed to parse AI analysis result:', parseError)
        log('error', '原始文本:', analysisText)
        return {
          success: false,
          error: 'AI 分析结果格式错误'
        }
      }

    } catch (error: any) {
      log('error', 'AI analysis failed:', error)
      return {
        success: false,
        error: `AI 分析失败: ${error.message || error}`
      }
    }
  }

  async extractFileContent(fileData: {
    fileName: string
    fileType: string
    base64Data: string
  }): Promise<{
    success: boolean
    content?: string
    error?: string
  }> {
    try {
      const apiKey = process.env.VITE_GEMINI_API_KEY
      log('info', '文件内容提取 - API密钥状态:', apiKey ? `存在，长度: ${apiKey.length}` : '未找到')

      if (!apiKey) {
        log('error', '文件内容提取失败: API密钥未配置')
        return {
          success: false,
          error: 'Gemini API 密钥未配置'
        }
      }

      const client = new GoogleGenAI({ apiKey })

      let mimeType = fileData.fileType
      if (!mimeType || mimeType === 'application/octet-stream') {
        const ext = fileData.fileName.toLowerCase().split('.').pop()
        switch (ext) {
          case 'pdf':
            mimeType = 'application/pdf'
            break
          case 'png':
            mimeType = 'image/png'
            break
          case 'jpg':
          case 'jpeg':
            mimeType = 'image/jpeg'
            break
          case 'webp':
            mimeType = 'image/webp'
            break
          default:
            mimeType = 'application/octet-stream'
        }
      }

      log('debug', '文件内容提取 - 文件类型:', mimeType)

      const extractionPrompt = `请仔细阅读并提取这份文档中的所有文字内容。

要求：
1. 完整提取所有文字，保持原有的结构和格式
2. 如果是简历，请按照以下格式整理：
   - 个人信息（姓名、联系方式等）
   - 教育背景
   - 工作经历
   - 技能特长
   - 项目经验
   - 其他信息
3. 如果是其他类型的文档，保持原有的段落结构
4. 只返回提取的文字内容，不要添加任何额外的说明或评论

请直接输出提取的内容：`

      const response = await client.models.generateContent({
        model: TEXT_RESPONSE_MODEL,
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType: mimeType,
                  data: fileData.base64Data
                }
              },
              {
                text: extractionPrompt
              }
            ]
          }
        ],
        config: {
          temperature: 0.1,
          maxOutputTokens: 8000
        }
      })

      const extractedText = response.text
      if (!extractedText) {
        return {
          success: false,
          error: '文件内容提取返回空结果'
        }
      }

      return {
        success: true,
        content: extractedText.trim()
      }

    } catch (error: any) {
      log('error', 'File content extraction failed:', error)
      return {
        success: false,
        error: `文件内容提取失败: ${error.message || error}`
      }
    }
  }

  /**
   * 智能压缩聊天历史
   * 保留最近 5 轮对话 + 早期对话摘要
   */
  private async compressHistory(): Promise<void> {
    try {
      const recentCount = 10 // 保留最近 5 轮（user + model = 10 条）
      const recent = this.textChatHistory.slice(-recentCount)
      const older = this.textChatHistory.slice(0, -recentCount)

      if (older.length === 0) {
        return
      }

      recordMetric('gemini.history.compress.start', { oldCount: this.textChatHistory.length })
      log('debug', '📝 开始压缩对话历史，旧消息:', older.length, '条')

      // 生成摘要
      const summaryText = older.map((msg, i) =>
        `${i + 1}. ${msg.role === 'user' ? '用户' : 'AI'}: ${msg.parts[0].text.substring(0, 100)}...`
      ).join('\n')

      const summaryPrompt = `请将以下对话历史简化为一段简短的摘要（50-100字），保留关键信息：\n\n${summaryText}`

      const response = await this.textClient?.models.generateContent({
        model: TEXT_RESPONSE_MODEL,
        contents: [{ role: 'user', parts: [{ text: summaryPrompt }] }],
        config: {
          temperature: 0.3,
          maxOutputTokens: 200
        }
      })

      const summary = response?.text?.trim()
      if (summary) {
        this.textChatHistory = [
          { role: 'user', parts: [{ text: `[之前的对话摘要] ${summary}` }] },
          ...recent
        ]
        log('info', '✅ 对话历史已压缩:', this.textChatHistory.length, '条（含摘要）')
        recordMetric('gemini.history.compress.success', { newCount: this.textChatHistory.length })
      } else {
        // 降级方案：直接截断
        this.textChatHistory = recent
        log('warn', '⚠️ 摘要生成失败，使用截断方式')
        recordMetric('gemini.history.compress.fallback')
      }
    } catch (error) {
      log('error', '❌ 压缩对话历史失败:', error)
      this.textChatHistory = this.textChatHistory.slice(-MAX_CHAT_HISTORY * 2)
      recordMetric('gemini.history.compress.error')
    }
  }
}

let geminiService: GeminiService | null = null

export function initializeGeminiService(onMessageToRenderer: (event: string, data?: any) => void): GeminiService {
  if (!geminiService) {
    geminiService = new GeminiService({ onMessageToRenderer })
  }
  return geminiService
}

export function getGeminiService(): GeminiService | null {
  return geminiService
}
