import { SettingsService } from './database'

export interface GoogleLoginConfig {
  enabled: boolean
  clientId: string
  clientSecret: string
  redirectUri: string
}

export async function getGoogleLoginConfig(): Promise<GoogleLoginConfig> {
  const [enabled, clientId, clientSecret, redirectUri] = await Promise.all([
    SettingsService.get('login_google_enabled'),
    SettingsService.get('google_login_client_id'),
    SettingsService.get('google_login_client_secret'),
    SettingsService.get('google_login_redirect_uri'),
  ])

  return {
    enabled: enabled === 'true' && !!clientId && !!clientSecret,
    clientId: clientId || '',
    clientSecret: clientSecret || '',
    redirectUri: redirectUri || '',
  }
}

export function getGoogleAuthUrl(config: GoogleLoginConfig, state: string): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'offline',
    prompt: 'consent',
  })

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

export interface GoogleTokenResponse {
  access_token: string
  id_token: string
  refresh_token?: string
  expires_in: number
  token_type: string
  error?: string
  error_description?: string
}

export async function getGoogleAccessToken(
  code: string,
  config: GoogleLoginConfig,
): Promise<GoogleTokenResponse> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: 'authorization_code',
    }),
  })

  return response.json()
}

export interface GoogleUserInfo {
  sub: string
  email: string
  email_verified: boolean
  name: string
  picture: string
  given_name?: string
  family_name?: string
}

export async function getGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo | null> {
  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!response.ok) return null
    return response.json()
  } catch {
    return null
  }
}
