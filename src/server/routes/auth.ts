import { Router } from 'express'
import { randomInt } from 'crypto'
import { AuthService } from '../services/database'
import { sendSms } from '../services/sms'
import {
  getWechatLoginConfig,
  getWechatAuthUrl,
  getWechatAccessToken,
  getWechatUserInfo,
} from '../services/wechat-login'

const router = Router()

const phoneCodeStore = new Map<string, { code: string; expiresAt: number; lastSentAt: number }>()
const PHONE_CODE_TTL_MS = 5 * 60 * 1000
const PHONE_CODE_COOLDOWN_MS = 60 * 1000

const isValidPhone = (phone: string) => /^1\d{10}$/.test(phone)

function purgeExpiredCodes(now: number) {
  for (const [key, entry] of phoneCodeStore.entries()) {
    if (entry.expiresAt <= now) phoneCodeStore.delete(key)
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

router.post('/sign-in', async (req, res) => {
  try {
    const { email, password } = req.body
    const result = await AuthService.signIn(email, password)

    res.cookie('session_token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })

    res.json({ data: result })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

router.post('/verify-session', async (req, res) => {
  try {
    const token = req.body.token || req.cookies?.session_token
    if (!token) {
      res.json({ data: null })
      return
    }
    const user = await AuthService.verifySession(token)
    res.json({ data: user })
  } catch (error) {
    res.json({ data: null })
  }
})

router.post('/sign-out', async (req, res) => {
  try {
    const token = req.body.token || req.cookies?.session_token
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
    if (!token) {
      res.status(401).json({ error: '未登录' })
      return
    }
    const user = await AuthService.verifySession(token)
    if (!user) {
      res.status(401).json({ error: '会话已失效' })
      return
    }
    if (!newPassword || newPassword.length < 6) {
      res.status(400).json({ error: '新密码格式不正确' })
      return
    }
    await AuthService.changePassword(user.id, oldPassword, newPassword)
    res.json({ success: true })
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message })
  }
})

router.post('/update-phone', async (req, res) => {
  try {
    const { token, phone } = req.body
    if (!token) {
      res.status(401).json({ error: '未登录' })
      return
    }
    const user = await AuthService.verifySession(token)
    if (!user) {
      res.status(401).json({ error: '会话已失效' })
      return
    }
    await AuthService.updatePhone(user.id, phone)
    res.json({ success: true })
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message })
  }
})

router.post('/update-email', async (req, res) => {
  try {
    const { token, email } = req.body
    if (!token) {
      res.status(401).json({ error: '未登录' })
      return
    }
    const user = await AuthService.verifySession(token)
    if (!user) {
      res.status(401).json({ error: '会话已失效' })
      return
    }
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

    if (!isValidPhone(trimmedPhone)) {
      res.status(400).json({ success: false, error: '手机号格式不正确' })
      return
    }

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

    if (!isValidPhone(trimmedPhone)) {
      res.status(400).json({ error: '手机号格式不正确' })
      return
    }

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

    res.cookie('session_token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })

    res.json({ data: result })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

router.get('/wechat/auth-url', async (_req, res) => {
  try {
    const config = await getWechatLoginConfig()
    if (!config.enabled || !config.appId) {
      res.status(400).json({ error: '微信登录未启用' })
      return
    }

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

    if (!code) {
      res.status(400).json({ error: '缺少授权码' })
      return
    }

    const config = await getWechatLoginConfig()
    if (!config.enabled || !config.appId || !config.appSecret) {
      res.status(400).json({ error: '微信登录未配置' })
      return
    }

    const tokenRes = await getWechatAccessToken(code, config)
    if (tokenRes.errcode || !tokenRes.access_token || !tokenRes.openid) {
      res.status(400).json({ error: tokenRes.errmsg || '获取微信授权失败' })
      return
    }

    const userInfo = await getWechatUserInfo(tokenRes.access_token, tokenRes.openid)
    if (!userInfo) {
      res.status(400).json({ error: '获取微信用户信息失败' })
      return
    }

    const result = await AuthService.signInOrCreateByWechat(
      tokenRes.openid,
      tokenRes.unionid,
      userInfo.nickname,
      userInfo.headimgurl,
    )

    res.cookie('session_token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })

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

export default router
