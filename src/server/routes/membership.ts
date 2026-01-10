import { Router } from 'express'
import { query } from '../services/database'
import { authMiddleware, type AuthenticatedRequest } from '../middleware/auth'

const router = Router()

router.get('/packages', async (_req, res) => {
  try {
    const result = await query(
      'SELECT * FROM membership_packages WHERE is_active = true ORDER BY price ASC',
    )
    res.json({ data: result.rows })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

router.post('/purchase', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { packageId } = req.body
    const userId = req.user!.id

    const packageResult = await query(
      'SELECT * FROM membership_packages WHERE id = $1 AND is_active = true',
      [packageId],
    )
    if (packageResult.rows.length === 0) {
      res.status(404).json({ error: '套餐不存在' })
      return
    }

    const pkg = packageResult.rows[0]
    const userResult = await query(
      'SELECT user_level, remaining_interview_minutes, total_purchased_minutes FROM user_profiles WHERE id = $1',
      [userId],
    )
    if (userResult.rows.length === 0) {
      res.status(404).json({ error: '用户不存在' })
      return
    }

    const user = userResult.rows[0]
    let discountRate = 1.0
    if (user.user_level === '螺丝钉') discountRate = 0.9
    else if (user.user_level === '大牛') discountRate = 0.8

    const actualPrice = Math.round(pkg.price * discountRate * 100) / 100
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + pkg.validity_days)

    const purchaseResult = await query(
      `INSERT INTO purchase_records 
       (user_id, package_id, original_price, actual_price, discount_rate, interview_minutes, expires_at, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'completed') RETURNING *`,
      [
        userId,
        packageId,
        pkg.price,
        actualPrice,
        discountRate,
        pkg.interview_minutes,
        expiresAt.toISOString(),
      ],
    )

    await query(
      `UPDATE user_profiles SET 
       membership_expires_at = $2, 
       remaining_interview_minutes = $3, 
       total_purchased_minutes = $4, 
       updated_at = NOW() 
       WHERE id = $1`,
      [
        userId,
        expiresAt.toISOString(),
        (user.remaining_interview_minutes || 0) + pkg.interview_minutes,
        (user.total_purchased_minutes || 0) + pkg.interview_minutes,
      ],
    )

    res.json({ data: purchaseResult.rows[0] })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

router.get('/purchases', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const result = await query(
      `SELECT pr.*, mp.name as package_name, mp.level as package_level 
       FROM purchase_records pr 
       JOIN membership_packages mp ON pr.package_id = mp.id 
       WHERE pr.user_id = $1 
       ORDER BY pr.created_at DESC`,
      [req.user!.id],
    )
    res.json({ data: result.rows })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

router.get('/purchases/:userId', async (req, res) => {
  try {
    const result = await query(
      `SELECT pr.*, mp.name as package_name, mp.level as package_level 
       FROM purchase_records pr 
       JOIN membership_packages mp ON pr.package_id = mp.id 
       WHERE pr.user_id = $1 
       ORDER BY pr.created_at DESC`,
      [req.params.userId],
    )
    res.json({ data: result.rows })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

export default router
