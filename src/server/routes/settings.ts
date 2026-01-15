import { Router } from 'express'
import { SettingsService } from '../services/database'
import { authMiddleware, adminMiddleware, type AuthenticatedRequest } from '../middleware/auth'
import { testSmtpConnection, saveSmtpConfig, getSmtpConfig } from '../services/email-service'

const router = Router()

const AI_CONFIG_KEYS = [
  'ai_provider',
  'ai_gemini_api_key',
  'ai_doubao_chat_api_key',
  'ai_doubao_asr_app_id',
  'ai_doubao_asr_access_key',
]

const LOGIN_ENABLED_KEYS = [
  'login_email_enabled',
  'login_phone_enabled',
  'login_wechat_enabled',
  'login_google_enabled',
]

const LOGIN_CONFIG_KEYS = [
  ...LOGIN_ENABLED_KEYS,
  'google_login_client_id',
  'google_login_client_secret',
  'google_login_redirect_uri',
  'wechat_login_app_id',
  'wechat_login_app_secret',
  'wechat_login_redirect_uri',
]

const maskValue = (v: string) => (v ? '••••••••' : '')

router.get(
  '/ai-config',
  authMiddleware,
  adminMiddleware,
  async (_req: AuthenticatedRequest, res) => {
    try {
      const c = await SettingsService.getMultiple(AI_CONFIG_KEYS)
      res.json({
        data: {
          provider: c.ai_provider || 'doubao',
          hasGeminiKey: !!c.ai_gemini_api_key,
          hasDoubaoKey: !!c.ai_doubao_chat_api_key,
          geminiApiKey: maskValue(c.ai_gemini_api_key),
          doubaoChatApiKey: maskValue(c.ai_doubao_chat_api_key),
          doubaoAsrAppId: maskValue(c.ai_doubao_asr_app_id),
          doubaoAsrAccessKey: maskValue(c.ai_doubao_asr_access_key),
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
        updates.push(SettingsService.set('ai_provider', provider, false))
      }
      if (geminiApiKey && geminiApiKey !== '••••••••') {
        updates.push(SettingsService.set('ai_gemini_api_key', geminiApiKey, true))
      }
      if (doubaoChatApiKey && doubaoChatApiKey !== '••••••••') {
        updates.push(SettingsService.set('ai_doubao_chat_api_key', doubaoChatApiKey, true))
      }
      if (doubaoAsrAppId && doubaoAsrAppId !== '••••••••') {
        updates.push(SettingsService.set('ai_doubao_asr_app_id', doubaoAsrAppId, true))
      }
      if (doubaoAsrAccessKey && doubaoAsrAccessKey !== '••••••••') {
        updates.push(SettingsService.set('ai_doubao_asr_access_key', doubaoAsrAccessKey, true))
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
    const c = await SettingsService.getMultiple(AI_CONFIG_KEYS)
    const missingFields: string[] = []
    const provider = c.ai_provider || 'doubao'

    if (provider === 'gemini' && !c.ai_gemini_api_key) {
      missingFields.push('geminiApiKey')
    } else if (provider === 'doubao') {
      if (!c.ai_doubao_chat_api_key) missingFields.push('doubaoChatApiKey')
      if (!c.ai_doubao_asr_app_id) missingFields.push('doubaoAsrAppId')
      if (!c.ai_doubao_asr_access_key) missingFields.push('doubaoAsrAccessKey')
    }

    res.json({ configured: missingFields.length === 0, provider, missingFields })
  } catch {
    res.status(400).json({ configured: false, provider: '', missingFields: ['unknown'] })
  }
})

router.get('/ai-config-full', async (_req, res) => {
  try {
    const c = await SettingsService.getMultiple(AI_CONFIG_KEYS)
    res.json({
      data: {
        provider: c.ai_provider || 'doubao',
        geminiApiKey: c.ai_gemini_api_key || '',
        doubaoChatApiKey: c.ai_doubao_chat_api_key || '',
        doubaoAsrAppId: c.ai_doubao_asr_app_id || '',
        doubaoAsrAccessKey: c.ai_doubao_asr_access_key || '',
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
    const values = await Promise.all(keys.map((k) => SettingsService.get(k)))

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
      updates.push(SettingsService.set('payment_provider', config.provider, false))
    }
    if (config.notifyUrl !== undefined) {
      updates.push(SettingsService.set('payment_notify_url', config.notifyUrl, false))
    }
    if (config.epay) {
      if (config.epay.pid)
        updates.push(SettingsService.set('payment_epay_pid', config.epay.pid, true))
      if (config.epay.key)
        updates.push(SettingsService.set('payment_epay_key', config.epay.key, true))
      if (config.epay.apiUrl)
        updates.push(SettingsService.set('payment_epay_api_url', config.epay.apiUrl, false))
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
      const values = await Promise.all(keys.map((k) => SettingsService.get(k)))

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
        updates.push(SettingsService.set('sms_provider', config.provider, false))
      }
      if (config.aliyun) {
        const a = config.aliyun
        if (a.accessKeyId && a.accessKeyId !== '••••••••')
          updates.push(SettingsService.set('sms_aliyun_access_key_id', a.accessKeyId, true))
        if (a.accessKeySecret && a.accessKeySecret !== '••••••••')
          updates.push(SettingsService.set('sms_aliyun_access_key_secret', a.accessKeySecret, true))
        if (a.signName !== undefined)
          updates.push(SettingsService.set('sms_aliyun_sign_name', a.signName, false))
        if (a.templateCode !== undefined)
          updates.push(SettingsService.set('sms_aliyun_template_code', a.templateCode, false))
      }
      if (config.tencent) {
        const t = config.tencent
        if (t.secretId && t.secretId !== '••••••••')
          updates.push(SettingsService.set('sms_tencent_secret_id', t.secretId, true))
        if (t.secretKey && t.secretKey !== '••••••••')
          updates.push(SettingsService.set('sms_tencent_secret_key', t.secretKey, true))
        if (t.appId !== undefined)
          updates.push(SettingsService.set('sms_tencent_app_id', t.appId, false))
        if (t.signName !== undefined)
          updates.push(SettingsService.set('sms_tencent_sign_name', t.signName, false))
        if (t.templateId !== undefined)
          updates.push(SettingsService.set('sms_tencent_template_id', t.templateId, false))
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
        SettingsService.get('wechat_login_enabled'),
        SettingsService.get('wechat_login_app_id'),
        SettingsService.get('wechat_login_app_secret'),
        SettingsService.get('wechat_login_redirect_uri'),
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
        updates.push(SettingsService.set('wechat_login_enabled', String(enabled), false))
      }
      if (appId && appId !== '••••••••') {
        updates.push(SettingsService.set('wechat_login_app_id', appId, true))
      }
      if (appSecret && appSecret !== '••••••••') {
        updates.push(SettingsService.set('wechat_login_app_secret', appSecret, true))
      }
      if (redirectUri !== undefined) {
        updates.push(SettingsService.set('wechat_login_redirect_uri', redirectUri, false))
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
      const c = await SettingsService.getMultiple(LOGIN_CONFIG_KEYS)
      res.json({
        data: {
          email: { enabled: c.login_email_enabled !== 'false' },
          phone: { enabled: c.login_phone_enabled === 'true' },
          wechat: {
            enabled: c.login_wechat_enabled === 'true',
            appId: maskValue(c.wechat_login_app_id),
            appSecret: maskValue(c.wechat_login_app_secret),
            redirectUri: c.wechat_login_redirect_uri || '',
            hasCredentials: !!(c.wechat_login_app_id && c.wechat_login_app_secret),
          },
          google: {
            enabled: c.login_google_enabled === 'true',
            clientId: maskValue(c.google_login_client_id),
            clientSecret: maskValue(c.google_login_client_secret),
            redirectUri: c.google_login_redirect_uri || '',
            hasCredentials: !!(c.google_login_client_id && c.google_login_client_secret),
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
        updates.push(SettingsService.set('login_phone_enabled', String(phone.enabled), false))
      }

      if (wechat) {
        if (wechat.enabled !== undefined) {
          updates.push(SettingsService.set('login_wechat_enabled', String(wechat.enabled), false))
        }
        if (wechat.appId && wechat.appId !== '••••••••') {
          updates.push(SettingsService.set('wechat_login_app_id', wechat.appId, true))
        }
        if (wechat.appSecret && wechat.appSecret !== '••••••••') {
          updates.push(SettingsService.set('wechat_login_app_secret', wechat.appSecret, true))
        }
        if (wechat.redirectUri !== undefined) {
          updates.push(SettingsService.set('wechat_login_redirect_uri', wechat.redirectUri, false))
        }
      }

      if (google) {
        if (google.enabled !== undefined) {
          updates.push(SettingsService.set('login_google_enabled', String(google.enabled), false))
          if (google.enabled) {
            updates.push(SettingsService.set('login_wechat_enabled', 'false', false))
          }
        }
        if (google.clientId && google.clientId !== '••••••••') {
          updates.push(SettingsService.set('google_login_client_id', google.clientId, true))
        }
        if (google.clientSecret && google.clientSecret !== '••••••••') {
          updates.push(SettingsService.set('google_login_client_secret', google.clientSecret, true))
        }
        if (google.redirectUri !== undefined) {
          updates.push(SettingsService.set('google_login_redirect_uri', google.redirectUri, false))
        }
      }

      if (wechat?.enabled === true) {
        updates.push(SettingsService.set('login_google_enabled', 'false', false))
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
    const c = await SettingsService.getMultiple(LOGIN_ENABLED_KEYS)
    res.json({
      data: {
        email: c.login_email_enabled !== 'false',
        phone: c.login_phone_enabled === 'true',
        wechat: c.login_wechat_enabled === 'true',
        google: c.login_google_enabled === 'true',
      },
    })
  } catch {
    res.json({ data: { email: true, phone: false, wechat: false, google: false } })
  }
})

router.get(
  '/smtp-config',
  authMiddleware,
  adminMiddleware,
  async (_req: AuthenticatedRequest, res) => {
    try {
      const config = await getSmtpConfig()
      res.json({
        data: {
          host: config.host,
          port: String(config.port),
          secure: config.secure,
          user: config.user,
          hasPassword: !!config.pass,
        },
      })
    } catch (error: any) {
      res.status(400).json({ error: error.message })
    }
  },
)

router.put(
  '/smtp-config',
  authMiddleware,
  adminMiddleware,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { host, port, secure, user, pass } = req.body
      await saveSmtpConfig({ host, port, secure, user, pass })
      res.json({ success: true })
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message })
    }
  },
)

router.post(
  '/smtp-test',
  authMiddleware,
  adminMiddleware,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { host, port, secure, user, pass } = req.body
      const result = await testSmtpConnection({
        host,
        port: parseInt(port || '465', 10),
        secure: secure !== false,
        user,
        pass,
      })
      res.json(result)
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message })
    }
  },
)

export { SettingsService }
export default router
