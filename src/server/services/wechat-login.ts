import { SettingsService } from './database'

interface WechatLoginConfig {
  enabled: boolean
  appId: string
  appSecret: string
  redirectUri: string
}

export async function getWechatLoginConfig(): Promise<WechatLoginConfig> {
  const [enabled, appId, appSecret, redirectUri] = await Promise.all([
    SettingsService.get('wechat_login_enabled'),
    SettingsService.get('wechat_login_app_id'),
    SettingsService.get('wechat_login_app_secret'),
    SettingsService.get('wechat_login_redirect_uri'),
  ])

  return {
    enabled: enabled === 'true',
    appId,
    appSecret,
    redirectUri,
  }
}

export function getWechatAuthUrl(config: WechatLoginConfig, state: string): string {
  const params = new URLSearchParams({
    appid: config.appId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: 'snsapi_login',
    state,
  })
  return `https://open.weixin.qq.com/connect/qrconnect?${params}#wechat_redirect`
}

interface WechatTokenResponse {
  access_token?: string
  openid?: string
  unionid?: string
  errcode?: number
  errmsg?: string
}

export async function getWechatAccessToken(
  code: string,
  config: WechatLoginConfig,
): Promise<WechatTokenResponse> {
  const params = new URLSearchParams({
    appid: config.appId,
    secret: config.appSecret,
    code,
    grant_type: 'authorization_code',
  })

  const response = await fetch(`https://api.weixin.qq.com/sns/oauth2/access_token?${params}`)
  return response.json()
}

interface WechatUserInfo {
  openid: string
  nickname: string
  headimgurl: string
  unionid?: string
}

export async function getWechatUserInfo(
  accessToken: string,
  openid: string,
): Promise<WechatUserInfo | null> {
  const params = new URLSearchParams({
    access_token: accessToken,
    openid,
  })

  const response = await fetch(`https://api.weixin.qq.com/sns/userinfo?${params}`)
  const data = await response.json()

  if (data.errcode) {
    return null
  }

  return {
    openid: data.openid,
    nickname: data.nickname,
    headimgurl: data.headimgurl,
    unionid: data.unionid,
  }
}
