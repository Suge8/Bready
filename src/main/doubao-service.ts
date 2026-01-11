import { gzipSync, gunzipSync } from 'zlib'
import { randomUUID } from 'crypto'
import WebSocket from 'ws'
import { getSystemPrompt } from './prompts'
import { buildInterviewAnalysisPrompt } from './analysis-prompts'
import { log, logSampled } from './utils/logging'
import { recordMetric } from './utils/metrics'
import type {
  AnalyzePreparationRequest,
  AnalyzePreparationResponse,
  ExtractFileContentRequest,
  ExtractFileContentResponse,
} from '../shared/ipc'

const API_SERVER_URL = process.env.API_SERVER_URL || 'http://localhost:3001'

async function getAiConfigFromServer() {
  const response = await fetch(`${API_SERVER_URL}/api/ai/config-full`, {
    signal: AbortSignal.timeout(10000),
  })
  if (!response.ok) {
    throw new Error(`获取 AI 配置失败: ${response.status}`)
  }
  return response.json()
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface DoubaoServiceOptions {
  onMessageToRenderer: (event: string, data?: any) => void
}

const DEFAULT_ASR_ENDPOINT = 'wss://openspeech.bytedance.com/api/v3/sauc/bigmodel_async'
const DEFAULT_CHAT_ENDPOINT = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions'
const DEFAULT_CHAT_MODEL = 'doubao-seed-1-6-lite-251015'
const ANALYSIS_MODEL = 'doubao-seed-1-8-251228'
const DEFAULT_ASR_SAMPLE_RATE = 16000
const MAX_CHAT_HISTORY = 20
const FINAL_DEBOUNCE_MS = 1000 // definite: true 后的防抖，防止豆包语义判停太早
const SIMILARITY_THRESHOLD = 0.8 // 相似度阈值，超过此值视为重复
const CHAT_THINKING = { type: 'disabled' }

const debugDoubao = process.env.DEBUG_DOUBAO === '1'

class DoubaoService {
  private ws: WebSocket | null = null
  private isInitializingSession = false
  private sessionReady = false
  private currentTranscription = ''
  private transcriptionDebounceTimer: NodeJS.Timeout | null = null
  private isProcessingVoiceInput = false
  private textChatHistory: ChatMessage[] = []
  private textSystemPrompt = ''
  private currentCustomPrompt = ''
  private currentProfile = 'interview'
  private currentLanguage = 'cmn-CN'
  private lastFinalTranscription = ''
  private lastFinalTranscriptionAt = 0
  private recentFinalTranscriptions: { text: string; at: number }[] = []
  private suppressCloseEvent = false
  private pendingAsrReconnect = false // 标记是否需要在下一个音频包时重连 ASR
  private audioReceiveCount = 0 // 调试用：记录收到的音频包数量
  private onMessageToRenderer: (event: string, data?: any) => void
  private asrAppId = ''
  private asrAccessKey = ''
  private asrResourceId = ''
  private asrEndpoint = ''
  private asrSampleRate = 24000
  private chatApiKey = ''
  private chatEndpoint = ''
  private chatModel = ''

  constructor(options: DoubaoServiceOptions) {
    this.onMessageToRenderer = options.onMessageToRenderer
  }

  isSessionReady(): boolean {
    return this.sessionReady
  }

  private async loadConfig(): Promise<{ ok: boolean; error?: string }> {
    try {
      log('info', '🔄 loadConfig: 开始从服务器加载配置...')
      const config = await getAiConfigFromServer()
      log('info', '🔄 loadConfig: 服务器返回配置:', {
        hasAsrAppId: !!config.doubaoAsrAppId,
        hasAsrAccessKey: !!config.doubaoAsrAccessKey,
        hasChatApiKey: !!config.doubaoChatApiKey,
      })

      this.asrAppId = config.doubaoAsrAppId || ''
      this.asrAccessKey = config.doubaoAsrAccessKey || ''
      this.asrResourceId = process.env.DOUBAO_ASR_RESOURCE_ID || 'volc.bigasr.sauc.duration'
      this.asrEndpoint = DEFAULT_ASR_ENDPOINT
      this.asrSampleRate = DEFAULT_ASR_SAMPLE_RATE

      this.chatApiKey = config.doubaoChatApiKey || ''
      this.chatEndpoint = DEFAULT_CHAT_ENDPOINT
      this.chatModel = process.env.DOUBAO_CHAT_MODEL || DEFAULT_CHAT_MODEL

      if (!this.asrAppId || !this.asrAccessKey) {
        return { ok: false, error: '豆包语音识别配置缺失，请在管理后台配置 ASR 凭证' }
      }
      if (!this.chatApiKey) {
        return { ok: false, error: '豆包文本模型 API Key 未配置，请在管理后台配置' }
      }

      return { ok: true }
    } catch (error) {
      log('error', '加载豆包配置失败:', error)
      return { ok: false, error: '加载 AI 配置失败，请检查数据库连接' }
    }
  }

  private mapLanguage(language: string): string {
    if (!language) return 'zh-CN'
    const normalized = language.toLowerCase()
    if (normalized.startsWith('cmn') || normalized.startsWith('zh')) {
      return 'zh-CN'
    }
    return language
  }

  private buildFrame(params: {
    messageType: number
    flags: number
    serialization: number
    compression: number
    payload: Buffer
  }): Buffer {
    const header = Buffer.alloc(4)
    header[0] = (0x1 << 4) | 0x1
    header[1] = (params.messageType << 4) | (params.flags & 0x0f)
    header[2] = (params.serialization << 4) | (params.compression & 0x0f)
    header[3] = 0x00

    const payloadSize = Buffer.alloc(4)
    payloadSize.writeUInt32BE(params.payload.length, 0)

    return Buffer.concat([header, payloadSize, params.payload])
  }

  private buildFullRequestPayload(): Buffer {
    const payload = {
      user: {
        uid: this.asrAppId,
      },
      audio: {
        format: 'pcm',
        rate: this.asrSampleRate,
        bits: 16,
        channel: 1,
      },
      request: {
        model_name: 'bigmodel',
        enable_accelerate_text: true,
        accelerate_score: 8,
        result_type: 'single',
        show_utterances: true,
        end_window_size: 1200,
        force_to_speech_time: 2000,
      },
    }

    const json = JSON.stringify(payload)
    return gzipSync(Buffer.from(json))
  }

  private parseServerFrame(buffer: Buffer): { payload: any; messageType: number } | null {
    if (buffer.length < 8) {
      return null
    }

    const headerSize = (buffer[0] & 0x0f) * 4
    const messageType = buffer[1] >> 4
    const flags = buffer[1] & 0x0f
    const serialization = buffer[2] >> 4
    const compression = buffer[2] & 0x0f

    let offset = headerSize

    if (messageType === 0x0f) {
      if (buffer.length >= offset + 4) {
        const errorCode = buffer.readUInt32BE(offset)
        log('error', '豆包语音识别错误码:', errorCode)
        return { payload: { errorCode }, messageType }
      }
      return null
    }

    if (flags === 0x1 || flags === 0x3) {
      if (buffer.length < offset + 4) {
        return null
      }
      offset += 4
    }

    if (buffer.length < offset + 4) {
      return null
    }

    const payloadSize = buffer.readUInt32BE(offset)
    offset += 4
    if (buffer.length < offset + payloadSize) {
      return null
    }

    let payloadBuffer = buffer.subarray(offset, offset + payloadSize)
    if (compression === 0x1) {
      try {
        payloadBuffer = gunzipSync(payloadBuffer)
      } catch (error) {
        if (debugDoubao) {
          log('debug', '豆包响应解压失败:', error)
        }
        return null
      }
    }

    if (serialization === 0x1) {
      try {
        const jsonText = payloadBuffer.toString('utf8')
        const payload = JSON.parse(jsonText)
        return { payload, messageType }
      } catch (error) {
        if (debugDoubao) {
          log('debug', '豆包响应解析失败:', error)
        }
        return null
      }
    }

    return { payload: payloadBuffer, messageType }
  }

  private handleAsrError(errorCode?: number): void {
    const codeText =
      typeof errorCode === 'number' ? `豆包语音识别错误码: ${errorCode}` : '豆包语音识别错误'
    this.onMessageToRenderer('session-error', codeText)
    try {
      this.ws?.close()
    } catch {
      // ignore
    }
    this.ws = null
    this.sessionReady = false
  }

  pauseAsrSession(): void {
    this.clearTranscriptionState()

    this.suppressCloseEvent = true
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        const emptyPayload = gzipSync(Buffer.alloc(0))
        const frame = this.buildFrame({
          messageType: 0x2,
          flags: 0x2,
          serialization: 0x0,
          compression: 0x1,
          payload: emptyPayload,
        })
        this.ws.send(frame)
      } catch {
        // ignore
      }
    }

    if (this.ws) {
      try {
        this.ws.close()
      } catch {
        // ignore
      }
      this.ws = null
    }

    this.sessionReady = false
  }

  /**
   * 清理转录状态（不关闭连接）
   * 用于切换音频模式时重置状态
   */
  clearTranscriptionState(): void {
    this.isProcessingVoiceInput = false
    if (this.transcriptionDebounceTimer) {
      clearTimeout(this.transcriptionDebounceTimer)
      this.transcriptionDebounceTimer = null
    }
    this.currentTranscription = ''
    this.lastFinalTranscription = ''
    this.lastFinalTranscriptionAt = 0
    this.recentFinalTranscriptions = []
    log('info', '🧹 已清理豆包转录状态')
  }

  async resumeAsrSession(): Promise<boolean> {
    if (this.isInitializingSession) {
      return false
    }
    this.isInitializingSession = true
    const connected = await this.connectAsr()
    this.isInitializingSession = false
    return connected
  }

  private extractTranscription(payload: any): { text: string; isFinal: boolean } | null {
    if (!payload || typeof payload !== 'object') {
      return null
    }

    const result = payload.result || payload.response || payload
    let text = ''
    let isFinal = false

    // 提取文本
    if (typeof result.text === 'string') {
      text = result.text
    } else if (typeof result === 'string') {
      text = result
    } else if (typeof payload.text === 'string') {
      text = payload.text
    } else if (Array.isArray(result)) {
      text = result.map((item: any) => item?.text || item?.transcript || '').join('')
    } else if (Array.isArray(result.utterances)) {
      text = result.utterances.map((item: any) => item?.text || '').join('')
    } else if (Array.isArray(result.segments)) {
      text = result.segments.map((item: any) => item?.text || '').join('')
    } else if (Array.isArray(payload.data)) {
      text = payload.data.map((item: any) => item?.text || '').join('')
    }

    // 单独检查 utterances 里的 definite 字段
    if (Array.isArray(result.utterances) && result.utterances.length > 0) {
      // 只要有任意一个 utterance 的 definite 为 true，就认为是最终结果
      if (result.utterances.some((item: any) => item?.definite === true)) {
        isFinal = true
      }
    }

    // 兜底检查其他 final 字段
    if (
      result.final === true ||
      result.is_final === true ||
      payload.final === true ||
      payload.is_final === true
    ) {
      isFinal = true
    }

    if (!text.trim()) {
      return null
    }

    return { text, isFinal }
  }

  private normalizeTranscription(text: string): string {
    let normalized = text.trim()
    if (!normalized) {
      return ''
    }

    const now = Date.now()
    this.pruneRecentFinals(now)

    let stripped = false
    let changed = true
    while (changed) {
      changed = false
      for (const entry of this.recentFinalTranscriptions) {
        if (normalized.length > entry.text.length && normalized.startsWith(entry.text)) {
          normalized = normalized.slice(entry.text.length)
          normalized = normalized.replace(/^[\s，,。！？!?：:]+/, '').trim()
          stripped = true
          changed = true
        }
      }
    }

    if (stripped) {
      for (const entry of this.recentFinalTranscriptions) {
        if (normalized === entry.text) {
          return ''
        }
      }
    }

    return normalized
  }

  private pruneRecentFinals(now: number): void {
    const windowMs = 15000
    this.recentFinalTranscriptions = this.recentFinalTranscriptions.filter(
      (entry) => now - entry.at < windowMs,
    )
    if (this.recentFinalTranscriptions.length > 5) {
      this.recentFinalTranscriptions = this.recentFinalTranscriptions.slice(-5)
    }
  }

  private recordFinalTranscription(text: string): void {
    if (!text) return
    const now = Date.now()
    this.pruneRecentFinals(now)
    this.recentFinalTranscriptions.push({ text, at: now })
  }

  private mergeTranscription(current: string, incoming: string): string {
    if (!current) return incoming
    if (!incoming) return current

    // 完全相同
    if (current === incoming) return current

    // incoming 包含 current（incoming 是更完整的版本）
    if (incoming.includes(current)) return incoming

    // current 包含 incoming（current 已经更完整）
    if (current.includes(incoming)) return current

    // incoming 以 current 开头（incoming 是 current 的扩展）
    if (incoming.startsWith(current)) return incoming

    // current 以 incoming 开头（current 是 incoming 的扩展，保持 current）
    if (current.startsWith(incoming)) return current

    // 检查 current 末尾是否与 incoming 开头有重叠
    // 例如: current="...然后", incoming="然后讲一讲" → 结果应该是 "...然后讲一讲"
    // 从长到短尝试找重叠
    const maxOverlap = Math.min(current.length, incoming.length)
    for (let i = maxOverlap; i >= 1; i--) {
      const suffix = current.slice(-i)
      if (incoming.startsWith(suffix)) {
        // 找到重叠，用 incoming 替换重叠部分
        return current.slice(0, -i) + incoming
      }
    }

    // 没有任何重叠关系，说明是全新的 utterance，追加
    return current + incoming
  }

  // 计算两个字符串的相似度（基于最长公共子序列）
  private calculateSimilarity(a: string, b: string): number {
    if (!a || !b) return 0
    if (a === b) return 1

    const shorter = a.length < b.length ? a : b
    const longer = a.length < b.length ? b : a

    // 如果一个包含另一个，根据长度比例计算相似度
    if (longer.includes(shorter)) {
      return shorter.length / longer.length
    }

    // 简单的字符重叠计算
    let matches = 0
    const shorterChars = shorter.split('')
    const longerChars = longer.split('')

    for (const char of shorterChars) {
      const idx = longerChars.indexOf(char)
      if (idx !== -1) {
        matches++
        longerChars.splice(idx, 1)
      }
    }

    return (matches * 2) / (a.length + b.length)
  }

  private async finalizeCurrentTranscription(
    reason: 'debounce' | 'final' | 'silence',
  ): Promise<void> {
    if (this.isProcessingVoiceInput) {
      return
    }

    if (this.transcriptionDebounceTimer) {
      clearTimeout(this.transcriptionDebounceTimer)
      this.transcriptionDebounceTimer = null
    }

    const transcribedText = this.currentTranscription.trim()
    if (!transcribedText) {
      return
    }

    const now = Date.now()
    // 使用相似度检查去重，避免只差几个字或标点的重复发送
    if (
      this.lastFinalTranscription &&
      now - this.lastFinalTranscriptionAt < 5000 &&
      this.calculateSimilarity(transcribedText, this.lastFinalTranscription) > SIMILARITY_THRESHOLD
    ) {
      log('debug', '⏭️ 跳过重复转录（相似度过高）:', transcribedText.substring(0, 30))
      this.currentTranscription = ''
      return
    }

    this.isProcessingVoiceInput = true
    this.lastFinalTranscription = transcribedText
    this.lastFinalTranscriptionAt = now
    this.recordFinalTranscription(transcribedText)
    this.currentTranscription = ''

    // bigmodel_async 模式：不需要发送负包，连接持续使用
    const reasonTag = reason === 'silence' ? '(静音触发)' : reason === 'final' ? '(VAD判停)' : ''
    log('info', `🎤 语音转录完成${reasonTag}，调用文本模型:`, transcribedText.substring(0, 100))
    this.onMessageToRenderer('transcription-complete', transcribedText)

    try {
      await this.generateTextResponse(transcribedText)
    } finally {
      this.isProcessingVoiceInput = false
      // bigmodel_async: 连接持续使用，不需要重连
    }
  }

  private handleTranscriptionUpdate(text: string, isFinal: boolean): void {
    const trimmed = this.normalizeTranscription(text)
    if (!trimmed) {
      return
    }

    log('info', '📝 收到豆包转录结果:', trimmed.substring(0, 50), isFinal ? '(definite)' : '')

    // bigmodel_async 模式：实时显示转录结果
    const nextTranscription = this.mergeTranscription(this.currentTranscription, trimmed)

    if (nextTranscription !== this.currentTranscription) {
      this.currentTranscription = nextTranscription
      this.onMessageToRenderer('transcription-update', this.currentTranscription)
    }

    // 只有在豆包判停（definite: true）时才启动防抖计时器
    if (isFinal) {
      if (this.transcriptionDebounceTimer) {
        clearTimeout(this.transcriptionDebounceTimer)
      }
      this.transcriptionDebounceTimer = setTimeout(() => {
        void this.finalizeCurrentTranscription('final')
      }, FINAL_DEBOUNCE_MS)
    }
  }

  /**
   * 处理收到的转录结果（发送给文本模型）
   */
  private async processReceivedTranscription(transcribedText: string): Promise<void> {
    const now = Date.now()
    if (
      transcribedText === this.lastFinalTranscription &&
      now - this.lastFinalTranscriptionAt < 3000
    ) {
      this.currentTranscription = ''
      this.isProcessingVoiceInput = false
      return
    }

    this.lastFinalTranscription = transcribedText
    this.lastFinalTranscriptionAt = now
    this.recordFinalTranscription(transcribedText)
    this.currentTranscription = ''

    log('info', '🎤 语音转录完成(静音触发)，调用文本模型:', transcribedText.substring(0, 50))
    this.onMessageToRenderer('transcription-complete', transcribedText)

    try {
      await this.generateTextResponse(transcribedText)
    } finally {
      this.isProcessingVoiceInput = false
      // bigmodel_nostream: 只有当连接未就绪时才标记需要重连
      // 如果在生成响应期间连接已经被重建，就不需要再次重连
      if (!this.sessionReady && !this.isInitializingSession) {
        this.pendingAsrReconnect = true
      }
    }
  }

  /**
   * 静音触发（已废弃）
   * bigmodel_async 模式下不再需要此方法，服务端 VAD 会自动判停
   * 保留此方法仅作为备用，实际上不会被调用
   */
  finalizeTranscriptionBySilence(): void {
    log('warn', '⚠️ finalizeTranscriptionBySilence 在 bigmodel_async 模式下不应被调用')
    // bigmodel_async 模式下，服务端 VAD 会自动判停，不需要客户端发送负包
  }

  /**
   * 发送结束包（负包）给豆包，表示这句话结束
   * bigmodel_nostream 模式下，发送负包后服务端会返回最终识别结果
   */
  private sendEndOfSpeechPacket(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return
    }

    try {
      // flags = 0x2 表示这是最后一包（负包）
      const emptyPayload = gzipSync(Buffer.alloc(0))
      const frame = this.buildFrame({
        messageType: 0x2,
        flags: 0x2,
        serialization: 0x0,
        compression: 0x1,
        payload: emptyPayload,
      })
      this.ws.send(frame)
      log('info', '📤 已发送结束包给豆包 ASR')
    } catch (error) {
      log('warn', '发送结束包失败:', error)
    }
  }

  private async connectAsr(): Promise<boolean> {
    const connectId = randomUUID()
    log('info', '🔌 connectAsr: 准备连接豆包 ASR...', {
      endpoint: this.asrEndpoint,
      hasAppId: !!this.asrAppId,
      hasAccessKey: !!this.asrAccessKey,
      resourceId: this.asrResourceId,
    })

    const headers: Record<string, string> = {
      'X-Api-App-Key': this.asrAppId,
      'X-Api-Access-Key': this.asrAccessKey,
      'X-Api-Resource-Id': this.asrResourceId,
      'X-Api-Connect-Id': connectId,
    }

    try {
      this.ws = new WebSocket(this.asrEndpoint, { headers })
      this.ws.binaryType = 'arraybuffer'

      return await new Promise<boolean>((resolve) => {
        let resolved = false
        const finish = (value: boolean) => {
          if (resolved) return
          resolved = true
          resolve(value)
        }

        const timeout = setTimeout(() => {
          log('error', '豆包语音识别连接超时')
          try {
            this.ws?.close()
          } catch {
            // ignore
          }
          finish(false)
        }, 7000)

        this.ws!.on('open', () => {
          clearTimeout(timeout)
          try {
            const payload = this.buildFullRequestPayload()
            const frame = this.buildFrame({
              messageType: 0x1,
              flags: 0x0,
              serialization: 0x1,
              compression: 0x1,
              payload,
            })

            this.ws?.send(frame)
            this.sessionReady = true
            this.onMessageToRenderer('session-ready')
            this.onMessageToRenderer('update-status', '已连接豆包 - 正在启动录音...')
            recordMetric('doubao.session.open')
            finish(true)
          } catch (error) {
            log('error', '豆包会话初始化失败:', error)
            this.onMessageToRenderer('session-error', '豆包会话初始化失败')
            finish(false)
          }
        })

        this.ws!.on('message', (data) => {
          let buffer: Buffer | null = null

          if (typeof data === 'string') {
            try {
              const payload = JSON.parse(data)
              log('debug', '📨 收到豆包文本响应:', JSON.stringify(payload).substring(0, 200))
              const transcription = this.extractTranscription(payload)
              if (transcription) {
                this.handleTranscriptionUpdate(transcription.text, transcription.isFinal)
              } else {
                log('debug', '⚠️ 无法从响应中提取转录文本')
              }
            } catch (error) {
              if (debugDoubao) {
                log('debug', '豆包文本消息解析失败:', error)
              }
            }
            return
          }

          if (data instanceof ArrayBuffer) {
            buffer = Buffer.from(data)
          } else if (ArrayBuffer.isView(data)) {
            buffer = Buffer.from(data.buffer, data.byteOffset, data.byteLength)
          } else if (Buffer.isBuffer(data)) {
            buffer = data
          } else if (data instanceof Uint8Array) {
            buffer = Buffer.from(data)
          }

          if (!buffer) {
            return
          }

          const parsed = this.parseServerFrame(buffer)
          if (!parsed) {
            return
          }
          if (parsed.messageType === 0x0f) {
            this.handleAsrError(parsed.payload?.errorCode)
            return
          }
          if (parsed.messageType !== 0x9) {
            log('debug', '⚠️ 收到非识别结果的消息类型:', parsed.messageType)
            return
          }

          log('debug', '📨 收到豆包二进制响应:', JSON.stringify(parsed.payload).substring(0, 200))
          const transcription = this.extractTranscription(parsed.payload)
          if (transcription) {
            this.handleTranscriptionUpdate(transcription.text, transcription.isFinal)
          }
          // 空文本是正常的（检测到语音但还没识别出文字），静默忽略
        })

        this.ws!.on('error', (event) => {
          clearTimeout(timeout)
          log('error', '❌ 豆包 WebSocket 连接错误:', event)
          if (debugDoubao) {
            log('debug', '豆包 WebSocket 错误:', event)
          }
          this.onMessageToRenderer('session-error', '豆包语音识别连接错误')
          recordMetric('doubao.session.error')
          finish(false)
        })

        this.ws!.on('close', (code, reason) => {
          clearTimeout(timeout)
          log('warn', '🔌 豆包 WebSocket 关闭:', { code, reason: reason?.toString() })
          this.sessionReady = false
          this.ws = null
          if (this.suppressCloseEvent) {
            this.suppressCloseEvent = false
            finish(false)
            return
          }
          this.onMessageToRenderer('session-closed')
          this.onMessageToRenderer('update-status', '会话已关闭')
          recordMetric('doubao.session.closed')
          finish(false)
        })
      })
    } catch (error) {
      log('error', '豆包语音识别连接失败:', error)
      return false
    }
  }

  async initializeGeminiSession(
    apiKey: string,
    customPrompt = '',
    profile = 'interview',
    language = 'cmn-CN',
  ): Promise<boolean> {
    void apiKey
    if (this.isInitializingSession) {
      return false
    }

    const config = await this.loadConfig()
    if (!config.ok) {
      this.onMessageToRenderer('session-error', config.error)
      return false
    }

    this.currentCustomPrompt = customPrompt
    this.currentProfile = profile
    this.currentLanguage = language
    this.textSystemPrompt = getSystemPrompt(profile, customPrompt, false, language)
    this.textChatHistory = []
    this.currentTranscription = ''

    this.isInitializingSession = true
    this.onMessageToRenderer('session-initializing', true)
    recordMetric('doubao.session.init.start', { profile, language })

    const connected = await this.connectAsr()

    this.isInitializingSession = false
    this.onMessageToRenderer('session-initializing', false)

    if (!connected) {
      this.onMessageToRenderer('session-error', '豆包语音识别初始化失败')
      recordMetric('doubao.session.init.failure')
      return false
    }

    recordMetric('doubao.session.init.success')
    return true
  }

  async generateTextResponse(userMessage: string): Promise<{ success: boolean; error?: string }> {
    if (!this.chatApiKey) {
      return { success: false, error: '豆包文本模型未配置' }
    }

    try {
      this.onMessageToRenderer('update-status', '正在思考...')
      this.textChatHistory.push({ role: 'user', content: userMessage })

      const messages: ChatMessage[] = []
      if (this.textSystemPrompt) {
        messages.push({ role: 'system', content: this.textSystemPrompt })
      }
      messages.push(...this.textChatHistory)

      const controller = new AbortController()
      const timeoutMs = Number.parseInt(process.env.API_TIMEOUT || '30000', 10)
      const timeout = setTimeout(() => controller.abort(), timeoutMs)

      let response: Response
      let fullResponseText = ''
      let chunkCount = 0

      try {
        response = await fetch(this.chatEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.chatApiKey}`,
          },
          body: JSON.stringify({
            model: this.chatModel,
            messages,
            stream: true,
            thinking: CHAT_THINKING,
            temperature: 1.0,
            max_tokens: 2048,
          }),
          signal: controller.signal,
        })

        if (!response.ok) {
          const errorText = await response.text()
          if (
            this.textChatHistory.length > 0 &&
            this.textChatHistory[this.textChatHistory.length - 1].role === 'user'
          ) {
            this.textChatHistory.pop()
          }
          this.onMessageToRenderer('update-status', '正在聆听...')
          return { success: false, error: errorText || `豆包请求失败: ${response.status}` }
        }

        if (response.body) {
          const decoder = new TextDecoder()
          let buffer = ''

          for await (const chunk of response.body as any) {
            buffer += decoder.decode(chunk, { stream: true })
            const lines = buffer.split(/\r?\n/)
            buffer = lines.pop() || ''

            for (const line of lines) {
              const trimmed = line.trim()
              if (!trimmed) continue

              const dataLine = trimmed.startsWith('data:') ? trimmed.slice(5).trim() : trimmed
              if (dataLine === '[DONE]') {
                continue
              }

              try {
                const payload = JSON.parse(dataLine)
                const delta = payload?.choices?.[0]?.delta?.content
                if (delta) {
                  fullResponseText += delta
                  chunkCount += 1
                  this.onMessageToRenderer('ai-response-update', fullResponseText)
                  if (chunkCount === 1) {
                    this.onMessageToRenderer('update-status', '正在回复...')
                  }
                }
              } catch (error) {
                if (debugDoubao) {
                  log('debug', '豆包流式解析失败:', error)
                }
              }
            }
          }

          buffer += decoder.decode()
          const remaining = buffer.trim()
          if (remaining) {
            const dataLine = remaining.startsWith('data:') ? remaining.slice(5).trim() : remaining
            if (dataLine !== '[DONE]') {
              try {
                const payload = JSON.parse(dataLine)
                const delta = payload?.choices?.[0]?.delta?.content
                if (delta) {
                  fullResponseText += delta
                  chunkCount += 1
                  this.onMessageToRenderer('ai-response-update', fullResponseText)
                }
              } catch (error) {
                if (debugDoubao) {
                  log('debug', '豆包流式尾部解析失败:', error)
                }
              }
            }
          }
        } else {
          const payload = await response.json()
          fullResponseText = payload?.choices?.[0]?.message?.content || ''
        }
      } finally {
        clearTimeout(timeout)
      }

      if (fullResponseText) {
        this.textChatHistory.push({ role: 'assistant', content: fullResponseText })
        if (this.textChatHistory.length > MAX_CHAT_HISTORY * 2) {
          this.textChatHistory = this.textChatHistory.slice(-MAX_CHAT_HISTORY * 2)
        }

        this.onMessageToRenderer('ai-response', fullResponseText)
        this.onMessageToRenderer('update-status', '正在聆听...')
        log(
          'info',
          '✅ 豆包文本模型流式回答完成，共',
          chunkCount,
          '个块，总长度:',
          fullResponseText.length,
        )
        recordMetric('doubao.text.response.success', { chunks: chunkCount })
      } else {
        this.textChatHistory.pop()
        this.onMessageToRenderer('update-status', '正在聆听...')
      }

      return { success: true }
    } catch (error: any) {
      const errorMessage = error?.message || String(error)
      log('error', '❌ 豆包文本模型流式生成失败:', errorMessage)
      recordMetric('doubao.text.response.failure', { message: errorMessage })

      if (
        this.textChatHistory.length > 0 &&
        this.textChatHistory[this.textChatHistory.length - 1].role === 'user'
      ) {
        this.textChatHistory.pop()
      }

      this.onMessageToRenderer('update-status', '正在聆听...')
      return { success: false, error: errorMessage }
    }
  }

  async reconnectGemini(): Promise<boolean> {
    if (this.isInitializingSession) {
      return false
    }

    this.disconnectGemini()
    await new Promise((resolve) => setTimeout(resolve, 1000))
    return await this.initializeGeminiSession(
      '',
      this.currentCustomPrompt,
      this.currentProfile,
      this.currentLanguage,
    )
  }

  async manualReconnect(): Promise<boolean> {
    return await this.initializeGeminiSession(
      '',
      this.currentCustomPrompt,
      this.currentProfile,
      this.currentLanguage,
    )
  }

  disconnectGemini(): boolean {
    this.sessionReady = false
    this.isProcessingVoiceInput = false
    if (this.transcriptionDebounceTimer) {
      clearTimeout(this.transcriptionDebounceTimer)
      this.transcriptionDebounceTimer = null
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        const emptyPayload = gzipSync(Buffer.alloc(0))
        const frame = this.buildFrame({
          messageType: 0x2,
          flags: 0x2,
          serialization: 0x0,
          compression: 0x1,
          payload: emptyPayload,
        })
        this.ws.send(frame)
      } catch (error) {
        if (debugDoubao) {
          log('debug', '发送最后音频包失败:', error)
        }
      }
    }

    if (this.ws) {
      try {
        this.ws.close()
      } catch (error) {
        log('warn', '关闭豆包会话失败:', error)
      }
      this.ws = null
    }

    this.textChatHistory = []
    this.currentTranscription = ''
    this.onMessageToRenderer('session-closed')
    this.onMessageToRenderer('update-status', '已断开连接')
    return true
  }

  sendAudioToGemini(base64Data: string, _mimeType = 'audio/pcm;rate=24000'): void {
    void _mimeType

    if (!base64Data || typeof base64Data !== 'string') {
      return
    }

    // 首次或每 50 次打印状态日志
    this.audioReceiveCount++
    if (this.audioReceiveCount === 1 || this.audioReceiveCount % 50 === 0) {
      log('debug', `📥 豆包收到音频包 #${this.audioReceiveCount}，状态:`, {
        sessionReady: this.sessionReady,
        isInitializing: this.isInitializingSession,
        wsState: this.ws?.readyState,
      })
    }

    // bigmodel_async: 连接持续使用，不需要重连
    if (!this.ws || !this.sessionReady || this.ws.readyState !== WebSocket.OPEN) {
      if (this.audioReceiveCount <= 5) {
        log('debug', '⏸️ 豆包 ASR 未就绪，丢弃音频包:', {
          hasWs: !!this.ws,
          sessionReady: this.sessionReady,
          wsState: this.ws?.readyState,
        })
      }
      return
    }

    try {
      const audioBuffer = Buffer.from(base64Data, 'base64')
      const payload = gzipSync(audioBuffer)
      const frame = this.buildFrame({
        messageType: 0x2,
        flags: 0x0,
        serialization: 0x0,
        compression: 0x1,
        payload,
      })

      this.ws.send(frame)
    } catch (error) {
      logSampled('error', 0.1, '发送音频到豆包失败:', error)
    }
  }

  // === 通用方法别名（用于多渠道支持）===

  async initializeSession(
    apiKey: string,
    customPrompt = '',
    profile = 'interview',
    language = 'cmn-CN',
  ): Promise<boolean> {
    return this.initializeGeminiSession(apiKey, customPrompt, profile, language)
  }

  async reconnect(): Promise<boolean> {
    return this.reconnectGemini()
  }

  disconnect(): boolean {
    return this.disconnectGemini()
  }

  sendAudio(base64Data: string, mimeType = 'audio/pcm;rate=24000'): void {
    return this.sendAudioToGemini(base64Data, mimeType)
  }

  /**
   * 为新一句话重新建立 ASR 连接
   * bigmodel_nostream 模式下，每句话是一个独立的 ASR 会话
   */
  private async reconnectForNewSentence(): Promise<void> {
    if (this.isInitializingSession) {
      return
    }
    this.isInitializingSession = true

    // 清理旧连接
    if (this.ws) {
      this.suppressCloseEvent = true
      try {
        this.ws.close()
      } catch {
        // ignore
      }
      this.ws = null
    }
    this.sessionReady = false
    this.currentTranscription = ''
    // 清除 pendingAsrReconnect，避免重复重连
    this.pendingAsrReconnect = false

    // 重新建立连接
    const connected = await this.connectAsr()
    this.isInitializingSession = false

    if (connected) {
      log('info', '✅ 新句子 ASR 连接已建立')
    } else {
      log('warn', '⚠️ 新句子 ASR 连接失败')
      this.onMessageToRenderer('session-error', 'ASR 重连失败，请检查网络')
    }
  }

  async analyzePreparation(
    preparationData: AnalyzePreparationRequest,
  ): Promise<AnalyzePreparationResponse> {
    try {
      const config = await getAiConfigFromServer()
      const chatApiKey = config.doubaoChatApiKey || ''
      const chatEndpoint = DEFAULT_CHAT_ENDPOINT
      const chatModel = process.env.DOUBAO_ANALYSIS_MODEL || ANALYSIS_MODEL

      log(
        'info',
        '豆包 AI 分析 - API密钥状态:',
        chatApiKey ? `存在，长度: ${chatApiKey.length}` : '未找到',
      )
      log('info', '豆包 AI 分析 - 使用模型:', chatModel)

      if (!chatApiKey) {
        log('error', '豆包 AI 分析失败: API密钥未配置')
        return { success: false, error: '豆包 API 密钥未配置，请在管理后台配置' }
      }

      const analysisPrompt = buildInterviewAnalysisPrompt(preparationData)
      const response = await fetch(chatEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${chatApiKey}`,
        },
        body: JSON.stringify({
          model: chatModel,
          messages: [{ role: 'user', content: analysisPrompt }],
          stream: false,
          thinking: CHAT_THINKING,
          temperature: 1.0,
          max_tokens: 3000,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        return { success: false, error: errorText || `豆包请求失败: ${response.status}` }
      }

      const payload = await response.json()
      const analysisText = payload?.choices?.[0]?.message?.content
      if (!analysisText) {
        return { success: false, error: 'AI 分析返回空结果' }
      }

      try {
        const analysis = JSON.parse(analysisText)
        if (analysis.matchScore > 100) analysis.matchScore = 100
        if (analysis.matchScore < 0) analysis.matchScore = 0
        if (!preparationData.resume) {
          analysis.matchScore = 0
        }

        if (!analysis.jobRequirements) {
          analysis.jobRequirements =
            analysis.job_requirements ||
            analysis.requirements ||
            analysis.岗位需求 ||
            analysis.岗位要求 ||
            []
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

        return { success: true, analysis }
      } catch (parseError) {
        log('error', 'Failed to parse Doubao analysis result:', parseError)
        log('error', '原始文本:', analysisText)
        return { success: false, error: 'AI 分析结果格式错误' }
      }
    } catch (error: any) {
      log('error', 'AI analysis failed:', error)
      return { success: false, error: `AI 分析失败: ${error?.message || error}` }
    }
  }

  async extractFileContent(
    _fileData: ExtractFileContentRequest,
  ): Promise<ExtractFileContentResponse> {
    void _fileData
    return { success: false, error: '豆包模式暂不支持文件内容提取，请切换 Gemini' }
  }
}

let doubaoService: DoubaoService | null = null

export function initializeDoubaoService(
  onMessageToRenderer: (event: string, data?: any) => void,
): DoubaoService {
  if (!doubaoService) {
    doubaoService = new DoubaoService({ onMessageToRenderer })
  }
  return doubaoService
}

export function getDoubaoService(): DoubaoService | null {
  return doubaoService
}
