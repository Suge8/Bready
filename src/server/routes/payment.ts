import { Router } from 'express'
import { PaymentService } from '../services/database'
import { authMiddleware, type AuthenticatedRequest } from '../middleware/auth'
import { randomUUID } from 'crypto'

const router = Router()

function generateOrderNo(): string {
  return `PAY${Date.now()}${randomUUID().slice(0, 8).toUpperCase()}`
}

function calculateDiscount(userLevel: string): number {
  if (userLevel === '螺丝钉') return 0.9
  if (userLevel === '大牛') return 0.8
  return 1.0
}

router.post('/create-order', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { packageId, channel } = req.body
    const userId = req.user!.id

    const pkg = await PaymentService.getActivePackage(packageId)
    if (!pkg) {
      res.status(404).json({ success: false, error: '套餐不存在' })
      return
    }

    const orderNo = generateOrderNo()
    await PaymentService.createOrder(
      orderNo,
      userId,
      packageId,
      pkg.price,
      'epay',
      channel || 'alipay',
    )

    res.json({ success: true, orderNo, amount: pkg.price, payUrl: `/pay/${orderNo}` })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.get('/query/:orderNo', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const order = await PaymentService.getOrderByNo(req.params.orderNo, req.user!.id)
    if (!order) {
      res.status(404).json({ success: false, error: '订单不存在' })
      return
    }

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
    const orders = await PaymentService.getUserOrders(req.user!.id)
    res.json({ success: true, orders })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.post('/create-order-internal', async (req, res) => {
  try {
    const { userId, packageId, channel } = req.body

    const pkg = await PaymentService.getActivePackage(packageId)
    if (!pkg) {
      res.status(404).json({ success: false, error: '套餐不存在' })
      return
    }

    const userInfo = await PaymentService.getUserDiscountInfo(userId)
    if (!userInfo) {
      res.status(404).json({ success: false, error: '用户不存在' })
      return
    }

    const discountRate = calculateDiscount(userInfo.user_level)
    const amount = Math.round(pkg.price * discountRate * 100) / 100
    const orderNo = generateOrderNo()
    const expiredAt = new Date(Date.now() + 30 * 60 * 1000)

    await PaymentService.createOrder(
      orderNo,
      userId,
      packageId,
      amount,
      'epay',
      channel || 'alipay',
      expiredAt,
    )

    res.json({ success: true, orderNo, amount, payUrl: `/pay/${orderNo}` })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.get('/query-internal/:orderNo', async (req, res) => {
  try {
    const order = await PaymentService.getOrderByNo(req.params.orderNo)
    if (!order) {
      res.status(404).json({ success: false, error: '订单不存在' })
      return
    }

    if (
      order.status === 'expired' ||
      (order.expired_at && new Date(order.expired_at) < new Date())
    ) {
      if (order.status !== 'expired') {
        await PaymentService.updateOrderExpired(req.params.orderNo)
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
    const orders = await PaymentService.getUserOrders(req.params.userId, 20)
    res.json({ success: true, orders })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.post('/process-success', async (req, res) => {
  try {
    const { orderNo, tradeNo, paidAt } = req.body

    const order = await PaymentService.getOrderByNo(orderNo)
    if (!order) {
      res.status(404).json({ success: false, error: '订单不存在' })
      return
    }

    if (order.status === 'paid') {
      res.json({ success: true, message: '订单已处理' })
      return
    }

    await PaymentService.markOrderPaid(orderNo, tradeNo, paidAt || new Date())

    const pkg = await PaymentService.getActivePackage(order.package_id)
    if (!pkg) {
      res.json({ success: true, message: '订单已更新但套餐不存在' })
      return
    }

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + pkg.validity_days)

    await PaymentService.createPurchaseRecord(
      order.user_id,
      order.package_id,
      pkg.price,
      order.amount,
      pkg.interview_minutes,
      expiresAt,
      order.payment_provider,
    )

    await PaymentService.updateUserMembership(order.user_id, expiresAt, pkg.interview_minutes)

    res.json({ success: true })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
