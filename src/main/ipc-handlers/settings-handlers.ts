import { ipcMain } from 'electron'
import { getPaymentConfig, type PaymentConfig } from '../services/settings-service'

const API_SERVER_URL = process.env.API_SERVER_URL || 'http://localhost:3001'

async function serverFetch(
  path: string,
  options: { method?: string; body?: any } = {},
): Promise<{ ok: boolean; data?: any; error?: string }> {
  try {
    const response = await fetch(`${API_SERVER_URL}${path}`, {
      method: options.method || 'GET',
      headers: { 'Content-Type': 'application/json' },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: AbortSignal.timeout(15000),
    })

    if (!response.ok) {
      return { ok: false, error: `服务器返回错误 (${response.status})` }
    }

    const data = await response.json()
    return { ok: true, data }
  } catch (err: any) {
    const errMsg = err.message || ''
    const errCode = err.code || ''
    const errCause = err.cause?.code || ''

    if (
      errCode === 'ECONNREFUSED' ||
      errCause === 'ECONNREFUSED' ||
      errMsg.includes('ECONNREFUSED') ||
      errMsg.includes('fetch failed') ||
      errMsg.includes('Failed to fetch')
    ) {
      return {
        ok: false,
        error: '后端服务未启动，请先启动后端服务',
      }
    }

    if (err.name === 'AbortError' || errMsg.includes('timeout')) {
      return { ok: false, error: '请求超时，请检查网络连接或后端服务状态' }
    }

    return { ok: false, error: errMsg || '网络请求失败' }
  }
}

ipcMain.handle('settings:check-ai-config', async () => {
  try {
    const result = await serverFetch('/api/ai/config-status')
    if (!result.ok) {
      return { configured: false, provider: '', missingFields: ['unknown'], error: result.error }
    }

    const status = result.data
    const missingFields: string[] = []
    if (!status.hasGeminiKey && !status.hasDoubaoKey) {
      missingFields.push('apiKey')
    }

    return {
      configured: status.hasGeminiKey || status.hasDoubaoKey,
      provider: status.provider,
      missingFields,
    }
  } catch (error: any) {
    return { configured: false, provider: '', missingFields: ['unknown'], error: error.message }
  }
})

ipcMain.handle('settings:get-ai-config', async () => {
  try {
    const result = await serverFetch('/api/ai/config-status')
    if (!result.ok) {
      throw new Error(result.error)
    }

    const status = result.data
    return {
      provider: status.provider || 'doubao',
      geminiApiKey: status.hasGeminiKey ? '••••••••' : '',
      doubaoChatApiKey: status.hasDoubaoKey ? '••••••••' : '',
      doubaoAsrAppId: status.hasAsrConfig ? '••••••••' : '',
      doubaoAsrAccessKey: status.hasAsrConfig ? '••••••••' : '',
      hasGeminiKey: status.hasGeminiKey,
      hasDoubaoKey: status.hasDoubaoKey,
    }
  } catch (error: any) {
    throw new Error(error.message)
  }
})

ipcMain.handle('settings:update-ai-config', async (_, config: any) => {
  try {
    const result = await serverFetch('/api/ai/config', {
      method: 'POST',
      body: config,
    })

    if (!result.ok) {
      return { success: false, error: result.error }
    }

    return result.data
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle(
  'settings:test-ai-connection',
  async (
    _,
    provider: 'gemini' | 'doubao',
    testType?: 'chat' | 'asr',
    config?: {
      geminiApiKey?: string
      doubaoChatApiKey?: string
      doubaoAsrAppId?: string
      doubaoAsrAccessKey?: string
    },
  ) => {
    try {
      const result = await serverFetch('/api/ai/test-connection', {
        method: 'POST',
        body: { provider, testType, config },
      })

      if (!result.ok) {
        return { success: false, error: result.error }
      }

      return result.data
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  },
)

ipcMain.handle('settings:get-payment-config', async () => {
  try {
    const config = await getPaymentConfig()
    return {
      provider: config.provider,
      notifyUrl: config.notifyUrl,
      epay: {
        pid: config.epay.pid ? '••••••••' : '',
        key: config.epay.key ? '••••••••' : '',
        apiUrl: config.epay.apiUrl,
        hasCredentials: !!(config.epay.pid && config.epay.key),
      },
      wechat: {
        mchid: config.wechat.mchid ? '••••••••' : '',
        appid: config.wechat.appid ? '••••••••' : '',
        apiKey: config.wechat.apiKey ? '••••••••' : '',
        certSerial: config.wechat.certSerial ? '••••••••' : '',
        privateKey: config.wechat.privateKey ? '••••••••' : '',
        hasCredentials: !!(config.wechat.mchid && config.wechat.apiKey),
      },
      alipay: {
        appId: config.alipay.appId ? '••••••••' : '',
        privateKey: config.alipay.privateKey ? '••••••••' : '',
        publicKey: config.alipay.publicKey ? '••••••••' : '',
        hasCredentials: !!(config.alipay.appId && config.alipay.privateKey),
      },
    }
  } catch (error: any) {
    throw new Error(error.message)
  }
})

ipcMain.handle('settings:update-payment-config', async (_, config: Partial<PaymentConfig>) => {
  try {
    const cleanConfig: Partial<PaymentConfig> = {}
    if (config.provider !== undefined) cleanConfig.provider = config.provider
    if (config.notifyUrl !== undefined) cleanConfig.notifyUrl = config.notifyUrl

    if (config.epay) {
      cleanConfig.epay = {} as any
      if (config.epay.apiUrl !== undefined) cleanConfig.epay!.apiUrl = config.epay.apiUrl
      if (config.epay.pid && config.epay.pid !== '••••••••') cleanConfig.epay!.pid = config.epay.pid
      if (config.epay.key && config.epay.key !== '••••••••') cleanConfig.epay!.key = config.epay.key
    }
    if (config.wechat) {
      cleanConfig.wechat = {} as any
      if (config.wechat.mchid && config.wechat.mchid !== '••••••••')
        cleanConfig.wechat!.mchid = config.wechat.mchid
      if (config.wechat.appid && config.wechat.appid !== '••••••••')
        cleanConfig.wechat!.appid = config.wechat.appid
      if (config.wechat.apiKey && config.wechat.apiKey !== '••••••••')
        cleanConfig.wechat!.apiKey = config.wechat.apiKey
      if (config.wechat.certSerial && config.wechat.certSerial !== '••••••••')
        cleanConfig.wechat!.certSerial = config.wechat.certSerial
      if (config.wechat.privateKey && config.wechat.privateKey !== '••••••••')
        cleanConfig.wechat!.privateKey = config.wechat.privateKey
    }
    if (config.alipay) {
      cleanConfig.alipay = {} as any
      if (config.alipay.appId && config.alipay.appId !== '••••••••')
        cleanConfig.alipay!.appId = config.alipay.appId
      if (config.alipay.privateKey && config.alipay.privateKey !== '••••••••')
        cleanConfig.alipay!.privateKey = config.alipay.privateKey
      if (config.alipay.publicKey && config.alipay.publicKey !== '••••••••')
        cleanConfig.alipay!.publicKey = config.alipay.publicKey
    }

    const result = await serverFetch('/api/settings/payment-config', {
      method: 'PUT',
      body: cleanConfig,
    })
    if (!result.ok) {
      return { success: false, error: result.error }
    }
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('settings:get-login-config', async (_, token?: string) => {
  try {
    const headers: Record<string, string> = {}
    if (token) headers['Authorization'] = `Bearer ${token}`

    const response = await fetch(`${API_SERVER_URL}/api/settings/login-config`, {
      headers: { 'Content-Type': 'application/json', ...headers },
      signal: AbortSignal.timeout(15000),
    })

    if (!response.ok) {
      return {
        email: { enabled: true },
        phone: { enabled: false },
        wechat: { enabled: false, hasCredentials: false },
        google: { enabled: false, hasCredentials: false },
      }
    }

    const data = await response.json()
    return data?.data || {}
  } catch {
    return {
      email: { enabled: true },
      phone: { enabled: false },
      wechat: { enabled: false, hasCredentials: false },
      google: { enabled: false, hasCredentials: false },
    }
  }
})

ipcMain.handle('settings:update-login-config', async (_, token: string, config: any) => {
  try {
    const response = await fetch(`${API_SERVER_URL}/api/settings/login-config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(config),
      signal: AbortSignal.timeout(15000),
    })

    if (!response.ok) {
      return { success: false, error: '保存失败' }
    }
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('settings:get-sms-config', async (_, token?: string) => {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`

    const response = await fetch(`${API_SERVER_URL}/api/settings/sms-config`, {
      headers,
      signal: AbortSignal.timeout(15000),
    })

    if (!response.ok) {
      return { provider: '', aliyun: { hasCredentials: false }, tencent: { hasCredentials: false } }
    }

    const data = await response.json()
    return data?.data || {}
  } catch {
    return { provider: '', aliyun: { hasCredentials: false }, tencent: { hasCredentials: false } }
  }
})

ipcMain.handle('settings:update-sms-config', async (_, token: string, config: any) => {
  try {
    const response = await fetch(`${API_SERVER_URL}/api/settings/sms-config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(config),
      signal: AbortSignal.timeout(15000),
    })

    if (!response.ok) {
      return { success: false, error: '保存失败' }
    }
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})
