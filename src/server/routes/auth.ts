import { Router } from 'express'
import { AuthService } from '../services/database'

const router = Router()

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

export default router
