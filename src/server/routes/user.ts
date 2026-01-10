import { Router } from 'express'
import { query } from '../services/database'
import { authMiddleware, type AuthenticatedRequest } from '../middleware/auth'

const router = Router()

router.get('/profile', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const result = await query(
      `SELECT id, username, email, full_name, avatar_url, role, user_level, 
       membership_expires_at, remaining_interview_minutes, total_purchased_minutes, 
       discount_rate, created_at, updated_at 
       FROM user_profiles WHERE id = $1`,
      [req.user!.id],
    )
    res.json({ data: result.rows[0] || null })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

router.put('/profile', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const updates = req.body
    const allowedFields = ['username', 'full_name', 'avatar_url']
    const setClause: string[] = []
    const values: any[] = [req.user!.id]
    let paramIndex = 2

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        setClause.push(`${field} = $${paramIndex}`)
        values.push(updates[field])
        paramIndex++
      }
    }

    if (setClause.length === 0) {
      res.status(400).json({ error: '没有可更新的字段' })
      return
    }

    setClause.push('updated_at = NOW()')
    const result = await query(
      `UPDATE user_profiles SET ${setClause.join(', ')} WHERE id = $1 RETURNING *`,
      values,
    )
    res.json({ data: result.rows[0] })
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

    const result = await query(
      `SELECT id, username, email, full_name, avatar_url, role, user_level,
       membership_expires_at, remaining_interview_minutes, total_purchased_minutes,
       discount_rate, created_at, updated_at 
       FROM user_profiles ORDER BY created_at DESC`,
    )
    res.json({ data: result.rows })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

router.get('/profile/:userId', async (req, res) => {
  try {
    const result = await query(
      `SELECT id, username, email, full_name, avatar_url, role, user_level,
       membership_expires_at, remaining_interview_minutes, total_purchased_minutes,
       discount_rate, created_at, updated_at 
       FROM user_profiles WHERE id = $1`,
      [req.params.userId],
    )
    res.json({ data: result.rows[0] || null })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

router.put('/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params
    const updates = req.body
    const allowedFields = ['username', 'full_name', 'avatar_url', 'user_level', 'role']
    const setClause: string[] = []
    const values: any[] = [userId]
    let paramIndex = 2

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        setClause.push(`${field} = $${paramIndex}`)
        values.push(updates[field])
        paramIndex++
      }
    }

    if (setClause.length === 0) {
      res.status(400).json({ error: '没有可更新的字段' })
      return
    }

    setClause.push('updated_at = NOW()')
    const result = await query(
      `UPDATE user_profiles SET ${setClause.join(', ')} WHERE id = $1 RETURNING *`,
      values,
    )
    res.json({ data: result.rows[0] })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

router.put('/level/:userId', async (req, res) => {
  try {
    const { userLevel } = req.body
    const result = await query(
      'UPDATE user_profiles SET user_level = $2, updated_at = NOW() WHERE id = $1 RETURNING *',
      [req.params.userId, userLevel],
    )
    res.json({ data: result.rows[0] })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

router.put('/role/:userId', async (req, res) => {
  try {
    const { role } = req.body
    const result = await query(
      'UPDATE user_profiles SET role = $2, updated_at = NOW() WHERE id = $1 RETURNING *',
      [req.params.userId, role],
    )
    res.json({ data: result.rows[0] })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

export default router
