import { Router } from 'express'
import { query } from '../services/database'
import { authMiddleware, type AuthenticatedRequest } from '../middleware/auth'
import { randomUUID } from 'crypto'

const router = Router()

router.post('/create-order', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { packageId, channel } = req.body
    const userId = req.user!.id

    const pkgResult = await query(
      'SELECT * FROM membership_packages WHERE id = $1 AND is_active = true',
      [packageId],
    )
    if (pkgResult.rows.length === 0) {
      res.status(404).json({ success: false, error: '套餐不存在' })
      return
    }

    const pkg = pkgResult.rows[0]
    const orderNo = `PAY${Date.now()}${randomUUID().slice(0, 8).toUpperCase()}`

    await query(
      `INSERT INTO payment_orders 
       (order_no, user_id, package_id, amount, status, payment_provider, payment_channel) 
       VALUES ($1, $2, $3, $4, 'pending', $5, $6)`,
      [orderNo, userId, packageId, pkg.price, 'epay', channel || 'alipay'],
    )

    res.json({
      success: true,
      orderNo,
      amount: pkg.price,
      payUrl: `/pay/${orderNo}`,
    })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.get('/query/:orderNo', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const result = await query(
      'SELECT * FROM payment_orders WHERE order_no = $1 AND user_id = $2',
      [req.params.orderNo, req.user!.id],
    )

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: '订单不存在' })
      return
    }

    const order = result.rows[0]
    res.json({
      success: true,
      orderNo: order.order_no,
      status: order.status,
      paidAt: order.paid_at,
    })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.get('/orders', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const result = await query(
      `SELECT po.*, mp.name as package_name 
       FROM payment_orders po 
       LEFT JOIN membership_packages mp ON po.package_id = mp.id 
       WHERE po.user_id = $1 
       ORDER BY po.created_at DESC 
       LIMIT 50`,
      [req.user!.id],
    )
    res.json({ success: true, orders: result.rows })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.post('/create-order-internal', async (req, res) => {
  try {
    const { userId, packageId, channel } = req.body

    const pkgResult = await query(
      'SELECT * FROM membership_packages WHERE id = $1 AND is_active = true',
      [packageId],
    )
    if (pkgResult.rows.length === 0) {
      res.status(404).json({ success: false, error: '套餐不存在' })
      return
    }

    const userResult = await query(
      'SELECT user_level, discount_rate FROM user_profiles WHERE id = $1',
      [userId],
    )
    if (userResult.rows.length === 0) {
      res.status(404).json({ success: false, error: '用户不存在' })
      return
    }

    const pkg = pkgResult.rows[0]
    const user = userResult.rows[0]

    let discountRate = 1.0
    if (user.user_level === '螺丝钉') discountRate = 0.9
    else if (user.user_level === '大牛') discountRate = 0.8

    const amount = Math.round(pkg.price * discountRate * 100) / 100
    const orderNo = `PAY${Date.now()}${randomUUID().slice(0, 8).toUpperCase()}`
    const expiredAt = new Date(Date.now() + 30 * 60 * 1000)

    await query(
      `INSERT INTO payment_orders 
       (order_no, user_id, package_id, amount, status, payment_provider, payment_channel, expired_at) 
       VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7)`,
      [orderNo, userId, packageId, amount, 'epay', channel || 'alipay', expiredAt],
    )

    res.json({ success: true, orderNo, amount, payUrl: `/pay/${orderNo}` })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.get('/query-internal/:orderNo', async (req, res) => {
  try {
    const result = await query('SELECT * FROM payment_orders WHERE order_no = $1', [
      req.params.orderNo,
    ])

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: '订单不存在' })
      return
    }

    const order = result.rows[0]

    if (order.status === 'expired' || new Date(order.expired_at) < new Date()) {
      if (order.status !== 'expired') {
        await query("UPDATE payment_orders SET status = 'expired' WHERE order_no = $1", [
          req.params.orderNo,
        ])
      }
      res.json({ success: true, orderNo: order.order_no, status: 'expired' })
      return
    }

    res.json({
      success: true,
      orderNo: order.order_no,
      status: order.status,
      paidAt: order.paid_at,
      packageId: order.package_id,
      userId: order.user_id,
      amount: order.amount,
    })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.get('/orders-internal/:userId', async (req, res) => {
  try {
    const result = await query(
      `SELECT po.*, mp.name as package_name 
       FROM payment_orders po 
       LEFT JOIN membership_packages mp ON po.package_id = mp.id 
       WHERE po.user_id = $1 
       ORDER BY po.created_at DESC 
       LIMIT 20`,
      [req.params.userId],
    )
    res.json({ success: true, orders: result.rows })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.post('/process-success', async (req, res) => {
  try {
    const { orderNo, tradeNo, paidAt } = req.body

    const orderResult = await query('SELECT * FROM payment_orders WHERE order_no = $1', [orderNo])
    if (orderResult.rows.length === 0) {
      res.status(404).json({ success: false, error: '订单不存在' })
      return
    }

    const order = orderResult.rows[0]
    if (order.status === 'paid') {
      res.json({ success: true, message: '订单已处理' })
      return
    }

    await query(
      "UPDATE payment_orders SET status = 'paid', trade_no = $2, paid_at = $3 WHERE order_no = $1",
      [orderNo, tradeNo, paidAt || new Date()],
    )

    const pkgResult = await query('SELECT * FROM membership_packages WHERE id = $1', [
      order.package_id,
    ])
    if (pkgResult.rows.length === 0) {
      res.json({ success: true, message: '订单已更新但套餐不存在' })
      return
    }

    const pkg = pkgResult.rows[0]
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + pkg.validity_days)

    await query(
      `INSERT INTO purchase_records 
       (user_id, package_id, original_price, actual_price, discount_rate, interview_minutes, expires_at, status, payment_method)
       VALUES ($1, $2, $3, $4, 1.0, $5, $6, 'completed', $7)`,
      [
        order.user_id,
        order.package_id,
        pkg.price,
        order.amount,
        pkg.interview_minutes,
        expiresAt,
        order.payment_provider,
      ],
    )

    await query(
      `UPDATE user_profiles SET 
       membership_expires_at = $2,
       remaining_interview_minutes = remaining_interview_minutes + $3,
       total_purchased_minutes = total_purchased_minutes + $3,
       updated_at = NOW()
       WHERE id = $1`,
      [order.user_id, expiresAt, pkg.interview_minutes],
    )

    res.json({ success: true })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
