import { Router } from 'express'
import { randomInt, randomBytes, createHash } from 'crypto'
import { AuthService } from '../services/database'
import { sendSms } from '../services/sms'
import { sendPasswordResetEmail, sendVerificationEmail } from '../services/email-service'
import {
  getWechatLoginConfig,
  getWechatAuthUrl,
  getWechatAccessToken,
  getWechatUserInfo,
} from '../services/wechat-login'
import {
  getGoogleLoginConfig,
  getGoogleAuthUrl,
  getGoogleAccessToken,
  getGoogleUserInfo,
} from '../services/google-login'

const router = Router()
const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000
const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
}

const phoneCodeStore = new Map<string, { code: string; expiresAt: number; lastSentAt: number }>()
const emailCodeStore = new Map<string, { code: string; expiresAt: number; lastSentAt: number }>()
const PHONE_CODE_TTL_MS = 5 * 60 * 1000
const PHONE_CODE_COOLDOWN_MS = 60 * 1000
const EMAIL_CODE_TTL_MS = 5 * 60 * 1000
const EMAIL_CODE_COOLDOWN_MS = 60 * 1000

function isValidPhone(phone: string): boolean {
  return /^1\d{10}$/.test(phone)
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function normalizeEmail(email: unknown): string {
  return String(email ?? '')
    .trim()
    .toLowerCase()
}

function setSessionCookie(res: any, token: string): void {
  res.cookie('session_token', token, SESSION_COOKIE_OPTIONS)
}

function getTokenFromRequest(req: any): string | undefined {
  return req.body?.token || req.cookies?.session_token
}

function purgeExpiredCodes(now: number): void {
  for (const [key, entry] of phoneCodeStore.entries()) {
    if (entry.expiresAt <= now) phoneCodeStore.delete(key)
  }
  for (const [key, entry] of emailCodeStore.entries()) {
    if (entry.expiresAt <= now) emailCodeStore.delete(key)
  }
}

router.post('/sign-up', async (req, res) => {
  try {
    const { email, password, userData } = req.body
    const user = await AuthService.signUp(email, password, userData)
    res.json({ data: user })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

router.post('/send-email-code', async (req, res) => {
  try {
    const trimmedEmail = normalizeEmail(req.body?.email)

    if (!trimmedEmail || !isValidEmail(trimmedEmail))
      return res.status(400).json({ success: false, error: '邮箱格式不正确' })

    const now = Date.now()
    purgeExpiredCodes(now)

    const existing = emailCodeStore.get(trimmedEmail)
    if (existing && now - existing.lastSentAt < EMAIL_CODE_COOLDOWN_MS) {
      const remaining = Math.ceil((EMAIL_CODE_COOLDOWN_MS - (now - existing.lastSentAt)) / 1000)
      res.json({ success: false, error: `请稍后再试 (${remaining}s)`, cooldownSeconds: remaining })
      return
    }

    const code = randomInt(100000, 1000000).toString()
    const emailResult = await sendVerificationEmail(trimmedEmail, code)

    if (!emailResult.success) {
      res.status(400).json({ success: false, error: emailResult.error || '邮件发送失败' })
      return
    }

    emailCodeStore.set(trimmedEmail, {
      code,
      expiresAt: now + EMAIL_CODE_TTL_MS,
      lastSentAt: now,
    })

    res.json({ success: true, cooldownSeconds: Math.floor(EMAIL_CODE_COOLDOWN_MS / 1000) })
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message })
  }
})

router.post('/verify-email-code', async (req, res) => {
  try {
    const { code } = req.body
    const trimmedEmail = normalizeEmail(req.body?.email)

    if (!trimmedEmail || !isValidEmail(trimmedEmail))
      return res.status(400).json({ success: false, error: '邮箱格式不正确' })

    purgeExpiredCodes(Date.now())
    const entry = emailCodeStore.get(trimmedEmail)

    if (!entry || entry.expiresAt < Date.now()) {
      if (entry) emailCodeStore.delete(trimmedEmail)
      res.status(400).json({ success: false, error: '验证码已过期，请重新获取' })
      return
    }

    if (String(code || '').trim() !== entry.code) {
      res.status(400).json({ success: false, error: '验证码错误' })
      return
    }

    emailCodeStore.delete(trimmedEmail)
    res.json({ success: true })
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message })
  }
})

router.post('/sign-in', async (req, res) => {
  try {
    const { email, password } = req.body
    const result = await AuthService.signIn(email, password)

    setSessionCookie(res, result.token)

    res.json({ data: result })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

router.post('/verify-session', async (req, res) => {
  try {
    const token = getTokenFromRequest(req)
    if (!token) return res.json({ data: null })
    const user = await AuthService.verifySession(token)
    res.json({ data: user })
  } catch (error) {
    res.json({ data: null })
  }
})

router.post('/sign-out', async (req, res) => {
  try {
    const token = getTokenFromRequest(req)
    if (token) {
      await AuthService.signOut(token)
    }
    res.clearCookie('session_token')
    res.json({ data: true })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

router.post('/change-password', async (req, res) => {
  try {
    const { token, oldPassword, newPassword } = req.body
    if (!token) return res.status(401).json({ error: '未登录' })
    const user = await AuthService.verifySession(token)
    if (!user) return res.status(401).json({ error: '会话已失效' })
    if (!newPassword || newPassword.length < 6)
      return res.status(400).json({ error: '新密码格式不正确' })
    await AuthService.changePassword(user.id, oldPassword, newPassword)
    res.json({ success: true })
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message })
  }
})

router.post('/update-phone', async (req, res) => {
  try {
    const { token, phone } = req.body
    if (!token) return res.status(401).json({ error: '未登录' })
    const user = await AuthService.verifySession(token)
    if (!user) return res.status(401).json({ error: '会话已失效' })
    await AuthService.updatePhone(user.id, phone)
    res.json({ success: true })
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message })
  }
})

router.post('/update-email', async (req, res) => {
  try {
    const { token, email } = req.body
    if (!token) return res.status(401).json({ error: '未登录' })
    const user = await AuthService.verifySession(token)
    if (!user) return res.status(401).json({ error: '会话已失效' })
    await AuthService.updateEmail(user.id, email)
    res.json({ success: true })
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message })
  }
})

router.post('/send-phone-code', async (req, res) => {
  try {
    const { phone } = req.body
    const trimmedPhone = String(phone || '').trim()

    if (!isValidPhone(trimmedPhone))
      return res.status(400).json({ success: false, error: '手机号格式不正确' })

    const now = Date.now()
    purgeExpiredCodes(now)

    const existing = phoneCodeStore.get(trimmedPhone)
    if (existing && now - existing.lastSentAt < PHONE_CODE_COOLDOWN_MS) {
      const remaining = Math.ceil((PHONE_CODE_COOLDOWN_MS - (now - existing.lastSentAt)) / 1000)
      res.json({ success: false, error: `请稍后再试 (${remaining}s)`, cooldownSeconds: remaining })
      return
    }

    const code = randomInt(100000, 1000000).toString()
    const smsResult = await sendSms(trimmedPhone, code)

    if (!smsResult.success) {
      res.status(400).json({ success: false, error: smsResult.error || '短信发送失败' })
      return
    }

    phoneCodeStore.set(trimmedPhone, {
      code,
      expiresAt: now + PHONE_CODE_TTL_MS,
      lastSentAt: now,
    })

    res.json({ success: true, cooldownSeconds: Math.floor(PHONE_CODE_COOLDOWN_MS / 1000) })
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message })
  }
})

router.post('/sign-in-phone', async (req, res) => {
  try {
    const { phone, code } = req.body
    const trimmedPhone = String(phone || '').trim()

    if (!isValidPhone(trimmedPhone)) return res.status(400).json({ error: '手机号格式不正确' })

    purgeExpiredCodes(Date.now())
    const entry = phoneCodeStore.get(trimmedPhone)

    if (!entry || entry.expiresAt < Date.now()) {
      if (entry) phoneCodeStore.delete(trimmedPhone)
      res.status(400).json({ error: '验证码已过期，请重新获取' })
      return
    }

    if (String(code || '').trim() !== entry.code) {
      res.status(400).json({ error: '验证码错误' })
      return
    }

    phoneCodeStore.delete(trimmedPhone)

    const result = await AuthService.signInOrCreateByPhone(trimmedPhone)

    setSessionCookie(res, result.token)

    res.json({ data: result })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

router.get('/wechat/auth-url', async (_req, res) => {
  try {
    const config = await getWechatLoginConfig()
    if (!config.enabled || !config.appId) return res.status(400).json({ error: '微信登录未启用' })

    const state = randomInt(100000000, 999999999).toString()
    const authUrl = getWechatAuthUrl(config, state)

    res.json({ data: { authUrl, state } })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

router.post('/wechat/callback', async (req, res) => {
  try {
    const { code } = req.body

    if (!code) return res.status(400).json({ error: '缺少授权码' })

    const config = await getWechatLoginConfig()
    if (!config.enabled || !config.appId || !config.appSecret)
      return res.status(400).json({ error: '微信登录未配置' })

    const tokenRes = await getWechatAccessToken(code, config)
    if (tokenRes.errcode || !tokenRes.access_token || !tokenRes.openid)
      return res.status(400).json({ error: tokenRes.errmsg || '获取微信授权失败' })

    const userInfo = await getWechatUserInfo(tokenRes.access_token, tokenRes.openid)
    if (!userInfo) return res.status(400).json({ error: '获取微信用户信息失败' })

    const result = await AuthService.signInOrCreateByWechat(
      tokenRes.openid,
      tokenRes.unionid,
      userInfo.nickname,
      userInfo.headimgurl,
    )

    setSessionCookie(res, result.token)

    res.json({ data: result })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

router.get('/wechat/config-status', async (_req, res) => {
  try {
    const config = await getWechatLoginConfig()
    res.json({
      data: {
        enabled: config.enabled && !!config.appId && !!config.appSecret,
      },
    })
  } catch {
    res.json({ data: { enabled: false } })
  }
})

router.get('/google/auth-url', async (_req, res) => {
  try {
    const config = await getGoogleLoginConfig()
    if (!config.enabled || !config.clientId)
      return res.status(400).json({ error: 'Google 登录未启用' })

    const state = randomInt(100000000, 999999999).toString()
    const authUrl = getGoogleAuthUrl(config, state)

    res.json({ data: { authUrl, state } })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

router.post('/google/callback', async (req, res) => {
  try {
    const { code } = req.body

    if (!code) return res.status(400).json({ error: '缺少授权码' })

    const config = await getGoogleLoginConfig()
    if (!config.enabled || !config.clientId || !config.clientSecret)
      return res.status(400).json({ error: 'Google 登录未配置' })

    const tokenRes = await getGoogleAccessToken(code, config)
    if (tokenRes.error || !tokenRes.access_token)
      return res.status(400).json({ error: tokenRes.error_description || '获取 Google 授权失败' })

    const userInfo = await getGoogleUserInfo(tokenRes.access_token)
    if (!userInfo) return res.status(400).json({ error: '获取 Google 用户信息失败' })

    const result = await AuthService.signInOrCreateByGoogle(
      userInfo.sub,
      userInfo.email,
      userInfo.name,
      userInfo.picture,
    )

    setSessionCookie(res, result.token)

    res.json({ data: result })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

router.get('/google/config-status', async (_req, res) => {
  try {
    const config = await getGoogleLoginConfig()
    res.json({
      data: {
        enabled: config.enabled && !!config.clientId && !!config.clientSecret,
      },
    })
  } catch {
    res.json({ data: { enabled: false } })
  }
})

router.post('/forgot-password', async (req, res) => {
  try {
    const trimmedEmail = normalizeEmail(req.body?.email)
    if (!trimmedEmail || !isValidEmail(trimmedEmail))
      return res.status(400).json({ success: false, error: '邮箱格式不正确' })

    const userId = await AuthService.getUserIdByEmail(trimmedEmail)
    if (!userId) {
      res.json({ success: true })
      return
    }

    const token = randomBytes(32).toString('hex')
    const tokenHash = createHash('sha256').update(token).digest('hex')
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS)

    await AuthService.createPasswordResetToken(userId, tokenHash, expiresAt)

    const baseUrl = process.env.APP_BASE_URL || `http://localhost:${process.env.PORT || 3001}`
    const emailResult = await sendPasswordResetEmail(trimmedEmail, token, baseUrl)

    if (!emailResult.success) {
      console.error('Failed to send password reset email:', emailResult.error)
    }

    res.json({ success: true })
  } catch (error: any) {
    console.error('Forgot password error:', error)
    res.status(500).json({ error: '服务器错误，请稍后重试' })
  }
})

router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body
    if (!token || !password) {
      res.status(400).json({ error: '缺少必要参数' })
      return
    }
    if (password.length < 6) {
      res.status(400).json({ error: '密码长度至少6位' })
      return
    }

    const tokenHash = createHash('sha256').update(token).digest('hex')
    const success = await AuthService.resetPasswordWithToken(tokenHash, password)

    if (!success) {
      res.status(400).json({ error: '链接已失效或已被使用，请重新申请' })
      return
    }

    res.json({ success: true })
  } catch (error: any) {
    console.error('Reset password error:', error)
    res.status(500).json({ error: '服务器错误，请稍后重试' })
  }
})

export default router
