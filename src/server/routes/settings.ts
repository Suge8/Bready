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

router.get(
  '/sms-config',
  authMiddleware,
  adminMiddleware,
  async (_req: AuthenticatedRequest, res) => {
    try {
      const keys = [
        'sms_provider',
        'sms_aliyun_access_key_id',
        'sms_aliyun_access_key_secret',
        'sms_aliyun_sign_name',
        'sms_aliyun_template_code',
        'sms_tencent_secret_id',
        'sms_tencent_secret_key',
        'sms_tencent_app_id',
        'sms_tencent_sign_name',
        'sms_tencent_template_id',
      ]
      const values = await Promise.all(keys.map((k) => getSetting(k)))

      res.json({
        data: {
          provider: values[0] || '',
          aliyun: {
            accessKeyId: values[1] ? '••••••••' : '',
            accessKeySecret: values[2] ? '••••••••' : '',
            signName: values[3] || '',
            templateCode: values[4] || '',
            hasCredentials: !!(values[1] && values[2]),
          },
          tencent: {
            secretId: values[5] ? '••••••••' : '',
            secretKey: values[6] ? '••••••••' : '',
            appId: values[7] || '',
            signName: values[8] || '',
            templateId: values[9] || '',
            hasCredentials: !!(values[5] && values[6]),
          },
        },
      })
    } catch (error: any) {
      res.status(400).json({ error: error.message })
    }
  },
)

router.put(
  '/sms-config',
  authMiddleware,
  adminMiddleware,
  async (req: AuthenticatedRequest, res) => {
    try {
      const config = req.body
      const updates: Promise<void>[] = []

      if (config.provider !== undefined) {
        updates.push(setSetting('sms_provider', config.provider, false))
      }
      if (config.aliyun) {
        const a = config.aliyun
        if (a.accessKeyId && a.accessKeyId !== '••••••••')
          updates.push(setSetting('sms_aliyun_access_key_id', a.accessKeyId, true))
        if (a.accessKeySecret && a.accessKeySecret !== '••••••••')
          updates.push(setSetting('sms_aliyun_access_key_secret', a.accessKeySecret, true))
        if (a.signName !== undefined)
          updates.push(setSetting('sms_aliyun_sign_name', a.signName, false))
        if (a.templateCode !== undefined)
          updates.push(setSetting('sms_aliyun_template_code', a.templateCode, false))
      }
      if (config.tencent) {
        const t = config.tencent
        if (t.secretId && t.secretId !== '••••••••')
          updates.push(setSetting('sms_tencent_secret_id', t.secretId, true))
        if (t.secretKey && t.secretKey !== '••••••••')
          updates.push(setSetting('sms_tencent_secret_key', t.secretKey, true))
        if (t.appId !== undefined) updates.push(setSetting('sms_tencent_app_id', t.appId, false))
        if (t.signName !== undefined)
          updates.push(setSetting('sms_tencent_sign_name', t.signName, false))
        if (t.templateId !== undefined)
          updates.push(setSetting('sms_tencent_template_id', t.templateId, false))
      }

      await Promise.all(updates)
      res.json({ success: true })
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message })
    }
  },
)

router.get(
  '/wechat-login-config',
  authMiddleware,
  adminMiddleware,
  async (_req: AuthenticatedRequest, res) => {
    try {
      const [enabled, appId, appSecret, redirectUri] = await Promise.all([
        getSetting('wechat_login_enabled'),
        getSetting('wechat_login_app_id'),
        getSetting('wechat_login_app_secret'),
        getSetting('wechat_login_redirect_uri'),
      ])

      res.json({
        data: {
          enabled: enabled === 'true',
          appId: appId ? '••••••••' : '',
          appSecret: appSecret ? '••••••••' : '',
          redirectUri: redirectUri || '',
          hasCredentials: !!(appId && appSecret),
        },
      })
    } catch (error: any) {
      res.status(400).json({ error: error.message })
    }
  },
)

router.put(
  '/wechat-login-config',
  authMiddleware,
  adminMiddleware,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { enabled, appId, appSecret, redirectUri } = req.body
      const updates: Promise<void>[] = []

      if (enabled !== undefined) {
        updates.push(setSetting('wechat_login_enabled', String(enabled), false))
      }
      if (appId && appId !== '••••••••') {
        updates.push(setSetting('wechat_login_app_id', appId, true))
      }
      if (appSecret && appSecret !== '••••••••') {
        updates.push(setSetting('wechat_login_app_secret', appSecret, true))
      }
      if (redirectUri !== undefined) {
        updates.push(setSetting('wechat_login_redirect_uri', redirectUri, false))
      }

      await Promise.all(updates)
      res.json({ success: true })
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message })
    }
  },
)

router.get(
  '/login-config',
  authMiddleware,
  adminMiddleware,
  async (_req: AuthenticatedRequest, res) => {
    try {
      const [emailEnabled, phoneEnabled, wechatEnabled, googleEnabled] = await Promise.all([
        getSetting('login_email_enabled'),
        getSetting('login_phone_enabled'),
        getSetting('login_wechat_enabled'),
        getSetting('login_google_enabled'),
      ])

      const [googleClientId, googleClientSecret, googleRedirectUri] = await Promise.all([
        getSetting('google_login_client_id'),
        getSetting('google_login_client_secret'),
        getSetting('google_login_redirect_uri'),
      ])

      const [wechatAppId, wechatAppSecret, wechatRedirectUri] = await Promise.all([
        getSetting('wechat_login_app_id'),
        getSetting('wechat_login_app_secret'),
        getSetting('wechat_login_redirect_uri'),
      ])

      res.json({
        data: {
          email: { enabled: emailEnabled !== 'false' },
          phone: { enabled: phoneEnabled === 'true' },
          wechat: {
            enabled: wechatEnabled === 'true',
            appId: wechatAppId ? '••••••••' : '',
            appSecret: wechatAppSecret ? '••••••••' : '',
            redirectUri: wechatRedirectUri || '',
            hasCredentials: !!(wechatAppId && wechatAppSecret),
          },
          google: {
            enabled: googleEnabled === 'true',
            clientId: googleClientId ? '••••••••' : '',
            clientSecret: googleClientSecret ? '••••••••' : '',
            redirectUri: googleRedirectUri || '',
            hasCredentials: !!(googleClientId && googleClientSecret),
          },
        },
      })
    } catch (error: any) {
      res.status(400).json({ error: error.message })
    }
  },
)

router.put(
  '/login-config',
  authMiddleware,
  adminMiddleware,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { phone, wechat, google } = req.body
      const updates: Promise<void>[] = []

      if (phone?.enabled !== undefined) {
        updates.push(setSetting('login_phone_enabled', String(phone.enabled), false))
      }

      if (wechat) {
        if (wechat.enabled !== undefined) {
          updates.push(setSetting('login_wechat_enabled', String(wechat.enabled), false))
        }
        if (wechat.appId && wechat.appId !== '••••••••') {
          updates.push(setSetting('wechat_login_app_id', wechat.appId, true))
        }
        if (wechat.appSecret && wechat.appSecret !== '••••••••') {
          updates.push(setSetting('wechat_login_app_secret', wechat.appSecret, true))
        }
        if (wechat.redirectUri !== undefined) {
          updates.push(setSetting('wechat_login_redirect_uri', wechat.redirectUri, false))
        }
      }

      if (google) {
        if (google.enabled !== undefined) {
          updates.push(setSetting('login_google_enabled', String(google.enabled), false))
          if (google.enabled) {
            updates.push(setSetting('login_wechat_enabled', 'false', false))
          }
        }
        if (google.clientId && google.clientId !== '••••••••') {
          updates.push(setSetting('google_login_client_id', google.clientId, true))
        }
        if (google.clientSecret && google.clientSecret !== '••••••••') {
          updates.push(setSetting('google_login_client_secret', google.clientSecret, true))
        }
        if (google.redirectUri !== undefined) {
          updates.push(setSetting('google_login_redirect_uri', google.redirectUri, false))
        }
      }

      if (wechat?.enabled === true) {
        updates.push(setSetting('login_google_enabled', 'false', false))
      }

      await Promise.all(updates)
      res.json({ success: true })
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message })
    }
  },
)

router.get('/login-config-public', async (_req, res) => {
  try {
    const [emailEnabled, phoneEnabled, wechatEnabled, googleEnabled] = await Promise.all([
      getSetting('login_email_enabled'),
      getSetting('login_phone_enabled'),
      getSetting('login_wechat_enabled'),
      getSetting('login_google_enabled'),
    ])

    res.json({
      data: {
        email: emailEnabled !== 'false',
        phone: phoneEnabled === 'true',
        wechat: wechatEnabled === 'true',
        google: googleEnabled === 'true',
      },
    })
  } catch {
    res.json({
      data: { email: true, phone: false, wechat: false, google: false },
    })
  }
})

export { getSetting, setSetting }
export default router
