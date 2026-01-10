import { Router } from 'express'
import { query } from '../services/database'
import { authMiddleware, adminMiddleware, type AuthenticatedRequest } from '../middleware/auth'
import crypto from 'crypto'

const router = Router()

const ENCRYPTION_KEY =
  process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || 'default-key-32chars-long-here!!'
const IV_LENGTH = 16

function encrypt(text: string): string {
  if (!text) return ''
  const iv = crypto.randomBytes(IV_LENGTH)
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const authTag = cipher.getAuthTag()
  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted
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

router.get(
  '/ai-config',
  authMiddleware,
  adminMiddleware,
  async (_req: AuthenticatedRequest, res) => {
    try {
      const [provider, geminiKey, doubaoKey, asrAppId, asrAccessKey] = await Promise.all([
        getSetting('ai_provider'),
        getSetting('ai_gemini_api_key'),
        getSetting('ai_doubao_chat_api_key'),
        getSetting('ai_doubao_asr_app_id'),
        getSetting('ai_doubao_asr_access_key'),
      ])

      res.json({
        data: {
          provider: provider || 'doubao',
          hasGeminiKey: !!geminiKey,
          hasDoubaoKey: !!doubaoKey,
          geminiApiKey: geminiKey ? '••••••••' : '',
          doubaoChatApiKey: doubaoKey ? '••••••••' : '',
          doubaoAsrAppId: asrAppId ? '••••••••' : '',
          doubaoAsrAccessKey: asrAccessKey ? '••••••••' : '',
        },
      })
    } catch (error: any) {
      res.status(400).json({ error: error.message })
    }
  },
)

router.put(
  '/ai-config',
  authMiddleware,
  adminMiddleware,
  async (req: AuthenticatedRequest, res) => {
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
      res.status(400).json({ success: false, error: error.message })
    }
  },
)

router.get('/check-ai-config', async (_req, res) => {
  try {
    const [provider, geminiKey, doubaoKey, asrAppId, asrAccessKey] = await Promise.all([
      getSetting('ai_provider'),
      getSetting('ai_gemini_api_key'),
      getSetting('ai_doubao_chat_api_key'),
      getSetting('ai_doubao_asr_app_id'),
      getSetting('ai_doubao_asr_access_key'),
    ])

    const missingFields: string[] = []
    const resolvedProvider = provider || 'doubao'

    if (resolvedProvider === 'gemini' && !geminiKey) {
      missingFields.push('geminiApiKey')
    } else if (resolvedProvider === 'doubao') {
      if (!doubaoKey) missingFields.push('doubaoChatApiKey')
      if (!asrAppId) missingFields.push('doubaoAsrAppId')
      if (!asrAccessKey) missingFields.push('doubaoAsrAccessKey')
    }

    res.json({
      configured: missingFields.length === 0,
      provider: resolvedProvider,
      missingFields,
    })
  } catch (error: any) {
    res.status(400).json({ configured: false, provider: '', missingFields: ['unknown'] })
  }
})

router.get('/ai-config-full', async (_req, res) => {
  try {
    const [provider, geminiKey, doubaoKey, asrAppId, asrAccessKey] = await Promise.all([
      getSetting('ai_provider'),
      getSetting('ai_gemini_api_key'),
      getSetting('ai_doubao_chat_api_key'),
      getSetting('ai_doubao_asr_app_id'),
      getSetting('ai_doubao_asr_access_key'),
    ])

    res.json({
      data: {
        provider: provider || 'doubao',
        geminiApiKey: geminiKey || '',
        doubaoChatApiKey: doubaoKey || '',
        doubaoAsrAppId: asrAppId || '',
        doubaoAsrAccessKey: asrAccessKey || '',
      },
    })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

router.get('/payment-config', async (_req, res) => {
  try {
    const keys = [
      'payment_provider',
      'payment_notify_url',
      'payment_epay_pid',
      'payment_epay_key',
      'payment_epay_api_url',
    ]
    const values = await Promise.all(keys.map((k) => getSetting(k)))

    res.json({
      data: {
        provider: values[0] || '',
        notifyUrl: values[1] || '',
        epay: {
          pid: values[2] || '',
          key: values[3] || '',
          apiUrl: values[4] || 'https://zpayz.cn',
        },
      },
    })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

router.put('/payment-config', async (req, res) => {
  try {
    const config = req.body
    const updates: Promise<void>[] = []

    if (config.provider !== undefined) {
      updates.push(setSetting('payment_provider', config.provider, false))
    }
    if (config.notifyUrl !== undefined) {
      updates.push(setSetting('payment_notify_url', config.notifyUrl, false))
    }
    if (config.epay) {
      if (config.epay.pid) updates.push(setSetting('payment_epay_pid', config.epay.pid, true))
      if (config.epay.key) updates.push(setSetting('payment_epay_key', config.epay.key, true))
      if (config.epay.apiUrl)
        updates.push(setSetting('payment_epay_api_url', config.epay.apiUrl, false))
    }

    await Promise.all(updates)
    res.json({ success: true })
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message })
  }
})

export default router
