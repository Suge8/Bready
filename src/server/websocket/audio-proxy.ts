import { WebSocketServer, WebSocket } from 'ws'
import { gzipSync, gunzipSync } from 'zlib'
import { randomUUID } from 'crypto'
import type { Server } from 'http'
import { query } from '../services/database'

interface AudioSession {
  clientWs: WebSocket
  asrWs: WebSocket | null
  sessionId: string
  userId: string
  config: AiConfig
}

interface AiConfig {
  provider: 'gemini' | 'doubao'
  doubaoChatApiKey: string
  doubaoAsrAppId: string
  doubaoAsrAccessKey: string
}

const sessions = new Map<string, AudioSession>()

async function getAiConfig(): Promise<AiConfig> {
  const keys = [
    'ai_provider',
    'ai_doubao_chat_api_key',
    'ai_doubao_asr_app_id',
    'ai_doubao_asr_access_key',
  ]
  const results = await Promise.all(
    keys.map(async (key) => {
      const result = await query('SELECT value, encrypted FROM system_settings WHERE key = $1', [
        key,
      ])
      if (result.rows.length === 0) return ''
      const row = result.rows[0]
      return row.encrypted ? decryptValue(row.value || '') : row.value || ''
    }),
  )
  return {
    provider: (results[0] || 'doubao') as 'gemini' | 'doubao',
    doubaoChatApiKey: results[1] || '',
    doubaoAsrAppId: results[2] || '',
    doubaoAsrAccessKey: results[3] || '',
  }
}

function decryptValue(text: string): string {
  if (!text) return ''
  try {
    const crypto = require('crypto')
    const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || 'default-key'
    const parts = text.split(':')
    if (parts.length !== 3) return ''
    const iv = Buffer.from(parts[0], 'hex')
    const authTag = Buffer.from(parts[1], 'hex')
    const encrypted = parts[2]
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32)
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(authTag)
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  } catch {
    return ''
  }
}

export function setupWebSocketServer(server: Server): WebSocketServer {
  const wss = new WebSocketServer({ server, path: '/ws/audio' })

  wss.on('connection', async (ws, req) => {
    const sessionId = randomUUID()
    const url = new URL(req.url || '', `http://${req.headers.host}`)
    const userId = url.searchParams.get('userId') || 'anonymous'

    console.log(`WebSocket connected: ${sessionId}`)

    try {
      const config = await getAiConfig()
      const session: AudioSession = {
        clientWs: ws,
        asrWs: null,
        sessionId,
        userId,
        config,
      }
      sessions.set(sessionId, session)

      ws.on('message', (data) => handleClientMessage(session, data))
      ws.on('close', () => cleanupSession(sessionId))
      ws.on('error', (err) => {
        console.error(`WebSocket error: ${sessionId}`, err)
        cleanupSession(sessionId)
      })

      ws.send(JSON.stringify({ type: 'connected', sessionId }))
    } catch (error) {
      console.error('Failed to initialize session:', error)
      ws.close(1011, 'Initialization failed')
    }
  })

  return wss
}

function handleClientMessage(session: AudioSession, data: any) {
  try {
    if (Buffer.isBuffer(data) || data instanceof ArrayBuffer) {
      forwardAudioToAsr(session, Buffer.from(data))
      return
    }

    const message = JSON.parse(data.toString())

    switch (message.type) {
      case 'start_asr':
        startAsrSession(session)
        break
      case 'stop_asr':
        stopAsrSession(session)
        break
      case 'audio':
        if (message.data) {
          const audioBuffer = Buffer.from(message.data, 'base64')
          forwardAudioToAsr(session, audioBuffer)
        }
        break
    }
  } catch (error) {
    console.error('Error handling client message:', error)
  }
}

async function startAsrSession(session: AudioSession) {
  if (session.asrWs) {
    session.asrWs.close()
    session.asrWs = null
  }

  const { config } = session
  if (!config.doubaoAsrAppId || !config.doubaoAsrAccessKey) {
    sendToClient(session, { type: 'error', message: 'ASR 配置缺失' })
    return
  }

  const connectId = randomUUID()
  const headers = {
    'X-Api-App-Key': config.doubaoAsrAppId,
    'X-Api-Access-Key': config.doubaoAsrAccessKey,
    'X-Api-Resource-Id': 'volc.bigasr.sauc.duration',
    'X-Api-Connect-Id': connectId,
  }

  try {
    const asrWs = new WebSocket('wss://openspeech.bytedance.com/api/v3/sauc/bigmodel_async', {
      headers,
    })
    session.asrWs = asrWs

    asrWs.on('open', () => {
      const payload = buildAsrInitPayload()
      const frame = buildAsrFrame(0x1, 0x0, payload)
      asrWs.send(frame)
      sendToClient(session, { type: 'asr_ready' })
    })

    asrWs.on('message', (data) => handleAsrMessage(session, data))
    asrWs.on('close', () => {
      session.asrWs = null
      sendToClient(session, { type: 'asr_closed' })
    })
    asrWs.on('error', (err) => {
      console.error('ASR WebSocket error:', err)
      sendToClient(session, { type: 'error', message: 'ASR 连接错误' })
    })
  } catch (error) {
    console.error('Failed to connect to ASR:', error)
    sendToClient(session, { type: 'error', message: 'ASR 连接失败' })
  }
}

function stopAsrSession(session: AudioSession) {
  if (session.asrWs && session.asrWs.readyState === WebSocket.OPEN) {
    const emptyPayload = gzipSync(Buffer.alloc(0))
    const frame = buildAsrFrame(0x2, 0x2, emptyPayload)
    session.asrWs.send(frame)
    session.asrWs.close()
  }
  session.asrWs = null
}

function forwardAudioToAsr(session: AudioSession, audioBuffer: Buffer) {
  if (!session.asrWs || session.asrWs.readyState !== WebSocket.OPEN) return

  const payload = gzipSync(audioBuffer)
  const frame = buildAsrFrame(0x2, 0x0, payload)
  session.asrWs.send(frame)
}

function handleAsrMessage(session: AudioSession, data: any) {
  const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data)
  const parsed = parseAsrFrame(buffer)
  if (!parsed) return

  if (parsed.messageType === 0x0f) {
    sendToClient(session, { type: 'error', message: `ASR 错误: ${parsed.payload?.errorCode}` })
    return
  }

  if (parsed.messageType === 0x9) {
    const transcription = extractTranscription(parsed.payload)
    if (transcription) {
      sendToClient(session, {
        type: 'transcription',
        text: transcription.text,
        isFinal: transcription.isFinal,
      })
    }
  }
}

function buildAsrInitPayload(): Buffer {
  const payload = {
    user: { uid: 'bready-server' },
    audio: { format: 'pcm', rate: 16000, bits: 16, channel: 1 },
    request: {
      model_name: 'bigmodel',
      enable_accelerate_text: true,
      accelerate_score: 8,
      result_type: 'single',
      show_utterances: true,
    },
  }
  return gzipSync(Buffer.from(JSON.stringify(payload)))
}

function buildAsrFrame(messageType: number, flags: number, payload: Buffer): Buffer {
  const header = Buffer.alloc(4)
  header[0] = (0x1 << 4) | 0x1
  header[1] = (messageType << 4) | (flags & 0x0f)
  header[2] = (0x1 << 4) | 0x1
  header[3] = 0x00

  const payloadSize = Buffer.alloc(4)
  payloadSize.writeUInt32BE(payload.length, 0)

  return Buffer.concat([header, payloadSize, payload])
}

function parseAsrFrame(buffer: Buffer): { payload: any; messageType: number } | null {
  if (buffer.length < 8) return null

  const headerSize = (buffer[0] & 0x0f) * 4
  const messageType = buffer[1] >> 4
  const compression = buffer[2] & 0x0f

  let offset = headerSize
  if (buffer.length < offset + 4) return null

  const payloadSize = buffer.readUInt32BE(offset)
  offset += 4
  if (buffer.length < offset + payloadSize) return null

  let payloadBuffer = buffer.subarray(offset, offset + payloadSize)
  if (compression === 0x1) {
    try {
      payloadBuffer = gunzipSync(payloadBuffer)
    } catch {
      return null
    }
  }

  try {
    const payload = JSON.parse(payloadBuffer.toString('utf8'))
    return { payload, messageType }
  } catch {
    return { payload: payloadBuffer, messageType }
  }
}

function extractTranscription(payload: any): { text: string; isFinal: boolean } | null {
  if (!payload || typeof payload !== 'object') return null

  const result = payload.result || payload
  let text = ''
  let isFinal = false

  if (typeof result.text === 'string') {
    text = result.text
  } else if (Array.isArray(result.utterances)) {
    text = result.utterances.map((u: any) => u?.text || '').join('')
    isFinal = result.utterances.some((u: any) => u?.definite === true)
  }

  if (!text.trim()) return null
  return { text, isFinal }
}

function sendToClient(session: AudioSession, message: any) {
  if (session.clientWs.readyState === WebSocket.OPEN) {
    session.clientWs.send(JSON.stringify(message))
  }
}

function cleanupSession(sessionId: string) {
  const session = sessions.get(sessionId)
  if (session) {
    if (session.asrWs) {
      session.asrWs.close()
    }
    sessions.delete(sessionId)
  }
  console.log(`Session cleaned up: ${sessionId}`)
}
