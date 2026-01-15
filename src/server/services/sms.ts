import crypto from 'crypto'
import { SettingsService } from './database'

export type SmsProvider = 'aliyun' | 'tencent' | ''

interface SmsConfig {
  provider: SmsProvider
  aliyun: {
    accessKeyId: string
    accessKeySecret: string
    signName: string
    templateCode: string
  }
  tencent: {
    secretId: string
    secretKey: string
    appId: string
    signName: string
    templateId: string
  }
}

export async function getSmsConfig(): Promise<SmsConfig> {
  const [
    provider,
    aliyunKeyId,
    aliyunKeySecret,
    aliyunSign,
    aliyunTemplate,
    tencentId,
    tencentKey,
    tencentAppId,
    tencentSign,
    tencentTemplate,
  ] = await Promise.all([
    SettingsService.get('sms_provider'),
    SettingsService.get('sms_aliyun_access_key_id'),
    SettingsService.get('sms_aliyun_access_key_secret'),
    SettingsService.get('sms_aliyun_sign_name'),
    SettingsService.get('sms_aliyun_template_code'),
    SettingsService.get('sms_tencent_secret_id'),
    SettingsService.get('sms_tencent_secret_key'),
    SettingsService.get('sms_tencent_app_id'),
    SettingsService.get('sms_tencent_sign_name'),
    SettingsService.get('sms_tencent_template_id'),
  ])

  return {
    provider: (provider as SmsProvider) || '',
    aliyun: {
      accessKeyId: aliyunKeyId,
      accessKeySecret: aliyunKeySecret,
      signName: aliyunSign,
      templateCode: aliyunTemplate,
    },
    tencent: {
      secretId: tencentId,
      secretKey: tencentKey,
      appId: tencentAppId,
      signName: tencentSign,
      templateId: tencentTemplate,
    },
  }
}

export async function sendSms(
  phone: string,
  code: string,
): Promise<{ success: boolean; error?: string }> {
  const config = await getSmsConfig()

  if (!config.provider) {
    if (process.env.DEBUG_AUTH === '1') {
      console.log('📨 [DEBUG] SMS code:', phone, code)
    }
    return { success: true }
  }

  if (config.provider === 'aliyun') {
    return sendAliyunSms(phone, code, config.aliyun)
  }

  if (config.provider === 'tencent') {
    return sendTencentSms(phone, code, config.tencent)
  }

  return { success: false, error: '未知的短信服务商' }
}

async function sendAliyunSms(
  phone: string,
  code: string,
  config: SmsConfig['aliyun'],
): Promise<{ success: boolean; error?: string }> {
  if (!config.accessKeyId || !config.accessKeySecret) {
    return { success: false, error: '阿里云短信配置不完整' }
  }

  const params: Record<string, string> = {
    AccessKeyId: config.accessKeyId,
    Action: 'SendSms',
    Format: 'JSON',
    PhoneNumbers: phone,
    SignName: config.signName,
    SignatureMethod: 'HMAC-SHA1',
    SignatureNonce: Math.random().toString(36).substring(2),
    SignatureVersion: '1.0',
    TemplateCode: config.templateCode,
    TemplateParam: JSON.stringify({ code }),
    Timestamp: new Date().toISOString().replace(/\.\d{3}/, ''),
    Version: '2017-05-25',
  }

  const sortedKeys = Object.keys(params).sort()
  const canonicalQuery = sortedKeys
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
    .join('&')

  const stringToSign = `POST&${encodeURIComponent('/')}&${encodeURIComponent(canonicalQuery)}`
  const signature = crypto
    .createHmac('sha1', config.accessKeySecret + '&')
    .update(stringToSign)
    .digest('base64')

  params.Signature = signature

  try {
    const response = await fetch('https://dysmsapi.aliyuncs.com/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(params).toString(),
    })

    const result = await response.json()
    if (result.Code === 'OK') {
      return { success: true }
    }
    return { success: false, error: result.Message || '发送失败' }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

async function sendTencentSms(
  phone: string,
  code: string,
  config: SmsConfig['tencent'],
): Promise<{ success: boolean; error?: string }> {
  if (!config.secretId || !config.secretKey) {
    return { success: false, error: '腾讯云短信配置不完整' }
  }

  const timestamp = Math.floor(Date.now() / 1000)
  const date = new Date(timestamp * 1000).toISOString().split('T')[0]

  const payload = {
    PhoneNumberSet: [phone.startsWith('+86') ? phone : `+86${phone}`],
    SmsSdkAppId: config.appId,
    SignName: config.signName,
    TemplateId: config.templateId,
    TemplateParamSet: [code],
  }

  const payloadStr = JSON.stringify(payload)
  const hashedPayload = crypto.createHash('sha256').update(payloadStr).digest('hex')

  const httpRequestMethod = 'POST'
  const canonicalUri = '/'
  const canonicalQueryString = ''
  const canonicalHeaders = `content-type:application/json\nhost:sms.tencentcloudapi.com\nx-tc-action:sendsmss\n`
  const signedHeaders = 'content-type;host;x-tc-action'

  const canonicalRequest = [
    httpRequestMethod,
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    hashedPayload,
  ].join('\n')

  const hashedCanonicalRequest = crypto.createHash('sha256').update(canonicalRequest).digest('hex')
  const credentialScope = `${date}/sms/tc3_request`
  const stringToSign = ['TC3-HMAC-SHA256', timestamp, credentialScope, hashedCanonicalRequest].join(
    '\n',
  )

  const secretDate = crypto.createHmac('sha256', `TC3${config.secretKey}`).update(date).digest()
  const secretService = crypto.createHmac('sha256', secretDate).update('sms').digest()
  const secretSigning = crypto.createHmac('sha256', secretService).update('tc3_request').digest()
  const signature = crypto.createHmac('sha256', secretSigning).update(stringToSign).digest('hex')

  const authorization = `TC3-HMAC-SHA256 Credential=${config.secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`

  try {
    const response = await fetch('https://sms.tencentcloudapi.com/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authorization,
        'X-TC-Action': 'SendSms',
        'X-TC-Version': '2021-01-11',
        'X-TC-Timestamp': String(timestamp),
      },
      body: payloadStr,
    })

    const result = await response.json()
    if (result.Response?.SendStatusSet?.[0]?.Code === 'Ok') {
      return { success: true }
    }
    return {
      success: false,
      error:
        result.Response?.SendStatusSet?.[0]?.Message ||
        result.Response?.Error?.Message ||
        '发送失败',
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
