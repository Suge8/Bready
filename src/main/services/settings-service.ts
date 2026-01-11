import { api } from '../utils/api-client'

export interface AiConfig {
  provider: 'gemini' | 'doubao'
  geminiApiKey: string
  doubaoChatApiKey: string
  doubaoAsrAppId: string
  doubaoAsrAccessKey: string
}

export interface PaymentConfig {
  provider: 'epay' | 'wechat' | 'alipay' | ''
  notifyUrl: string
  epay: {
    pid: string
    key: string
    apiUrl: string
  }
  wechat: {
    mchid: string
    appid: string
    apiKey: string
    certSerial: string
    privateKey: string
  }
  alipay: {
    appId: string
    privateKey: string
    publicKey: string
  }
}

export async function getAiConfig(): Promise<AiConfig> {
  const result = await api.settings.getAiConfigFull()
  if (result.error || !result.data) {
    return {
      provider: 'doubao',
      geminiApiKey: '',
      doubaoChatApiKey: '',
      doubaoAsrAppId: '',
      doubaoAsrAccessKey: '',
    }
  }
  return result.data as AiConfig
}

export async function checkAiConfigStatus(): Promise<{
  configured: boolean
  provider: 'gemini' | 'doubao' | ''
  missingFields: string[]
}> {
  const result = await api.settings.checkAiConfig()
  console.log('🔍 checkAiConfig API 返回:', JSON.stringify(result))
  if (result.error) {
    console.log('❌ checkAiConfig 错误:', result.error)
    return { configured: false, provider: '', missingFields: ['unknown'] }
  }
  return result as {
    configured: boolean
    provider: 'gemini' | 'doubao' | ''
    missingFields: string[]
  }
}

export async function getPaymentConfig(): Promise<PaymentConfig> {
  const result = await api.settings.getPaymentConfig()
  if (result.error || !result.data) {
    return {
      provider: '',
      notifyUrl: '',
      epay: { pid: '', key: '', apiUrl: 'https://zpayz.cn' },
      wechat: { mchid: '', appid: '', apiKey: '', certSerial: '', privateKey: '' },
      alipay: { appId: '', privateKey: '', publicKey: '' },
    }
  }
  const data = result.data as any
  return {
    provider: data.provider || '',
    notifyUrl: data.notifyUrl || '',
    epay: data.epay || { pid: '', key: '', apiUrl: 'https://zpayz.cn' },
    wechat: data.wechat || { mchid: '', appid: '', apiKey: '', certSerial: '', privateKey: '' },
    alipay: data.alipay || { appId: '', privateKey: '', publicKey: '' },
  }
}
