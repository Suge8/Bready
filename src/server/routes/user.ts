import { Router } from 'express'
import { UserService } from '../services/database'
import { authMiddleware, type AuthenticatedRequest } from '../middleware/auth'

const router = Router()

router.get('/profile', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const profile = await UserService.getProfile(req.user!.id)
    res.json({ data: profile })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

router.put('/profile', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const result = await UserService.updateProfile(req.user!.id, req.body)
    if (!result) {
      res.status(400).json({ error: '没有可更新的字段' })
      return
    }
    res.json({ data: result })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

router.get('/all', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const isAdmin =
      req.user!.role === 'admin' ||
      req.user!.user_level === '管理' ||
      req.user!.user_level === '超级'

    if (!isAdmin) {
      res.status(403).json({ error: '需要管理员权限' })
      return
    }

    const users = await UserService.getAllUsers()
    res.json({ data: users })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

router.get('/all-internal', async (_req, res) => {
  try {
    const users = await UserService.getAllUsers()
    res.json({ data: users })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

router.get('/profile/:userId', async (req, res) => {
  try {
    const profile = await UserService.getProfile(req.params.userId)
    res.json({ data: profile })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

router.put('/profile/:userId', async (req, res) => {
  try {
    const allowedFields = [
      'username',
      'full_name',
      'avatar_url',
      'user_level',
      'role',
      'has_completed_onboarding',
    ]
    const result = await UserService.updateProfile(req.params.userId, req.body, allowedFields)
    if (!result) {
      res.status(400).json({ error: '没有可更新的字段' })
      return
    }
    res.json({ data: result })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

router.put('/level/:userId', async (req, res) => {
  try {
    const result = await UserService.updateUserLevel(req.params.userId, req.body.userLevel)
    res.json({ data: result })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

router.put('/role/:userId', async (req, res) => {
  try {
    const result = await UserService.updateUserRole(req.params.userId, req.body.role)
    res.json({ data: result })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

router.delete('/:userId', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    if (req.user!.user_level !== '超级') {
      res.status(403).json({ error: '只有超级管理员可以删除用户' })
      return
    }

    if (req.params.userId === req.user!.id) {
      res.status(400).json({ error: '不能删除自己' })
      return
    }

    await UserService.deleteUser(req.params.userId)
    res.json({ success: true })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

export default router
