import { Router } from 'express'
import crypto from 'crypto'
import { authMiddleware, type AuthenticatedRequest } from '../middleware/auth'
import { query } from '../services/database'

const router = Router()

const ENCRYPTION_KEY =
  process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || 'default-key-32chars-long-here!!'

function encrypt(text: string): string {
  if (!text) return ''
  const iv = crypto.randomBytes(16)
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const authTag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
}

function decrypt(text: string): string {
  if (!text) return ''
  try {
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

async function getSetting(key: string): Promise<string> {
  const result = await query('SELECT value, encrypted FROM system_settings WHERE key = $1', [key])
  if (result.rows.length === 0) return ''
  const row = result.rows[0]
  return row.encrypted ? decrypt(row.value || '') : row.value || ''
}

async function setSetting(key: string, value: string, encrypted: boolean): Promise<void> {
  const storedValue = encrypted ? encrypt(value) : value
  await query(
    `INSERT INTO system_settings (key, value, encrypted) VALUES ($1, $2, $3)
     ON CONFLICT (key) DO UPDATE SET value = $2, encrypted = $3, updated_at = NOW()`,
    [key, storedValue, encrypted],
  )
}

async function getAiConfigFromDb() {
  const [provider, geminiApiKey, doubaoChatApiKey, doubaoAsrAppId, doubaoAsrAccessKey] =
    await Promise.all([
      getSetting('ai_provider'),
      getSetting('ai_gemini_api_key'),
      getSetting('ai_doubao_chat_api_key'),
      getSetting('ai_doubao_asr_app_id'),
      getSetting('ai_doubao_asr_access_key'),
    ])

  return {
    provider: provider || 'doubao',
    geminiApiKey,
    doubaoChatApiKey,
    doubaoAsrAppId,
    doubaoAsrAccessKey,
  }
}

router.post('/test-connection', async (req, res) => {
  try {
    const {
      provider,
      testType,
      config: inputConfig,
    } = req.body as {
      provider: 'gemini' | 'doubao'
      testType?: 'chat' | 'asr'
      config?: {
        geminiApiKey?: string
        doubaoChatApiKey?: string
        doubaoAsrAppId?: string
        doubaoAsrAccessKey?: string
      }
    }
    const dbConfig = await getAiConfigFromDb()
    const config = {
      ...dbConfig,
      geminiApiKey: inputConfig?.geminiApiKey || dbConfig.geminiApiKey,
      doubaoChatApiKey: inputConfig?.doubaoChatApiKey || dbConfig.doubaoChatApiKey,
      doubaoAsrAppId: inputConfig?.doubaoAsrAppId || dbConfig.doubaoAsrAppId,
      doubaoAsrAccessKey: inputConfig?.doubaoAsrAccessKey || dbConfig.doubaoAsrAccessKey,
    }

    if (provider === 'gemini') {
      if (!config.geminiApiKey) {
        res.json({ success: false, error: 'Gemini API Key 未配置' })
        return
      }
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${config.geminiApiKey}`,
        { method: 'GET', signal: AbortSignal.timeout(10000) },
      )
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        res.json({ success: false, error: data.error?.message || `HTTP ${response.status}` })
        return
      }
      res.json({ success: true })
    } else {
      if (testType === 'asr') {
        if (!config.doubaoAsrAppId || !config.doubaoAsrAccessKey) {
          res.json({ success: false, error: 'ASR App ID 或 Access Token 未配置' })
          return
        }
        res.json({ success: true })
      } else {
        if (!config.doubaoChatApiKey) {
          res.json({ success: false, error: '豆包 Chat API Key 未配置' })
          return
        }
        const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/models', {
          method: 'GET',
          headers: { Authorization: `Bearer ${config.doubaoChatApiKey}` },
          signal: AbortSignal.timeout(10000),
        })
        if (!response.ok) {
          const data = await response.json().catch(() => ({}))
          res.json({ success: false, error: data.error?.message || `HTTP ${response.status}` })
          return
        }
        res.json({ success: true })
      }
    }
  } catch (error: any) {
    res.json({ success: false, error: error.message || '连接失败' })
  }
})

router.get('/config-status', async (_req, res) => {
  const config = await getAiConfigFromDb()
  res.json({
    provider: config.provider,
    hasGeminiKey: !!config.geminiApiKey,
    hasDoubaoKey: !!config.doubaoChatApiKey,
    hasAsrConfig: !!(config.doubaoAsrAppId && config.doubaoAsrAccessKey),
  })
})

router.get('/config-full', async (_req, res) => {
  const config = await getAiConfigFromDb()
  res.json(config)
})

router.post('/config', async (req, res) => {
  try {
    const { provider, geminiApiKey, doubaoChatApiKey, doubaoAsrAppId, doubaoAsrAccessKey } =
      req.body

    const updates: Promise<void>[] = []

    if (provider !== undefined) {
      updates.push(setSetting('ai_provider', provider, false))
    }
    if (geminiApiKey && geminiApiKey !== '••••••••') {
      updates.push(setSetting('ai_gemini_api_key', geminiApiKey, true))
    }
    if (doubaoChatApiKey && doubaoChatApiKey !== '••••••••') {
      updates.push(setSetting('ai_doubao_chat_api_key', doubaoChatApiKey, true))
    }
    if (doubaoAsrAppId && doubaoAsrAppId !== '••••••••') {
      updates.push(setSetting('ai_doubao_asr_app_id', doubaoAsrAppId, true))
    }
    if (doubaoAsrAccessKey && doubaoAsrAccessKey !== '••••••••') {
      updates.push(setSetting('ai_doubao_asr_access_key', doubaoAsrAccessKey, true))
    }

    await Promise.all(updates)
    res.json({ success: true })
  } catch (error: any) {
    res.json({ success: false, error: error.message })
  }
})

router.post('/chat', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { messages, systemPrompt } = req.body as {
      messages: { role: string; content: string }[]
      systemPrompt?: string
    }
    const config = await getAiConfigFromDb()

    if (config.provider === 'doubao' && config.doubaoChatApiKey) {
      const result = await callDoubaoChat(config.doubaoChatApiKey, messages, systemPrompt)
      res.json(result)
    } else if (config.geminiApiKey) {
      const result = await callGeminiChat(config.geminiApiKey, messages, systemPrompt)
      res.json(result)
    } else {
      res.status(400).json({ success: false, error: '无可用的 AI 服务' })
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.post('/analyze', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { jobDescription, resume, preparationName } = req.body
    const config = await getAiConfigFromDb()

    if (!config.doubaoChatApiKey && !config.geminiApiKey) {
      res.status(400).json({ success: false, error: 'AI 服务未配置' })
      return
    }

    const prompt = buildAnalysisPrompt(jobDescription, resume, preparationName)

    if (config.provider === 'doubao' && config.doubaoChatApiKey) {
      const result = await callDoubaoAnalysis(config.doubaoChatApiKey, prompt)
      res.json(result)
    } else if (config.geminiApiKey) {
      const result = await callGeminiAnalysis(config.geminiApiKey, prompt)
      res.json(result)
    } else {
      res.status(400).json({ success: false, error: '无可用的 AI 服务' })
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

async function callDoubaoChat(
  apiKey: string,
  messages: { role: string; content: string }[],
  systemPrompt?: string,
) {
  const allMessages = systemPrompt
    ? [{ role: 'system', content: systemPrompt }, ...messages]
    : messages

  const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'doubao-seed-1-6-lite-251015',
      messages: allMessages,
      stream: false,
      temperature: 0.7,
      max_tokens: 2000,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    return { success: false, error: errorText }
  }

  const data = await response.json()
  const text = data?.choices?.[0]?.message?.content
  return text ? { success: true, content: text } : { success: false, error: '空响应' }
}

async function callGeminiChat(
  apiKey: string,
  messages: { role: string; content: string }[],
  systemPrompt?: string,
) {
  const { GoogleGenAI } = await import('@google/genai')
  const client = new GoogleGenAI({ apiKey })

  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))

  const allContents = systemPrompt
    ? [{ role: 'user' as const, parts: [{ text: systemPrompt }] }, ...contents]
    : contents

  const response = await client.models.generateContent({
    model: 'gemini-2.5-flash-lite-preview-09-2025',
    contents: allContents,
    config: { temperature: 0.7, maxOutputTokens: 2000 },
  })

  const text = response.text
  return text ? { success: true, content: text } : { success: false, error: '空响应' }
}

function buildAnalysisPrompt(jd: string, resume: string, name: string): string {
  return `分析以下面试准备材料，返回 JSON 格式结果。

准备项名称: ${name}

岗位描述:
${jd}

${resume ? `简历内容:\n${resume}` : '(未提供简历)'}

请返回以下 JSON 格式:
{
  "matchScore": 0-100,
  "jobRequirements": ["要求1", "要求2"],
  "strengths": ["优势1", "优势2"],
  "weaknesses": ["不足1"],
  "suggestions": ["建议1", "建议2"],
  "systemPrompt": "面试时的系统提示词"
}`
}

async function callDoubaoAnalysis(apiKey: string, prompt: string) {
  const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'doubao-seed-1-8-251228',
      messages: [{ role: 'user', content: prompt }],
      stream: false,
      temperature: 1.0,
      max_tokens: 3000,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    return { success: false, error: errorText }
  }

  const data = await response.json()
  const text = data?.choices?.[0]?.message?.content
  if (!text) return { success: false, error: '空响应' }

  try {
    const analysis = JSON.parse(text)
    return { success: true, analysis }
  } catch {
    return { success: false, error: '解析失败' }
  }
}

async function callGeminiAnalysis(apiKey: string, prompt: string) {
  const { GoogleGenAI } = await import('@google/genai')
  const client = new GoogleGenAI({ apiKey })

  const response = await client.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      temperature: 0.7,
      maxOutputTokens: 3000,
    },
  })

  const text = response.text
  if (!text) return { success: false, error: '空响应' }

  try {
    const analysis = JSON.parse(text)
    return { success: true, analysis }
  } catch {
    return { success: false, error: '解析失败' }
  }
}

export default router
