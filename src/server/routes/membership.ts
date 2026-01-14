import { Router } from 'express'
import { PaymentService, MembershipService } from '../services/database'
import { authMiddleware, type AuthenticatedRequest } from '../middleware/auth'

const router = Router()

function calculateDiscount(userLevel: string): number {
  if (userLevel === '螺丝钉') return 0.9
  if (userLevel === '大牛') return 0.8
  return 1.0
}

router.get('/packages', async (_req, res) => {
  try {
    const packages = await MembershipService.getAllActivePackages()
    res.json({ data: packages })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

router.post('/purchase', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { packageId } = req.body
    const userId = req.user!.id

    const pkg = await PaymentService.getActivePackage(packageId)
    if (!pkg) {
      res.status(404).json({ error: '套餐不存在' })
      return
    }

    const userInfo = await MembershipService.getUserMembershipInfo(userId)
    if (!userInfo) {
      res.status(404).json({ error: '用户不存在' })
      return
    }

    const discountRate = calculateDiscount(userInfo.user_level)
    const actualPrice = Math.round(pkg.price * discountRate * 100) / 100
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + pkg.validity_days)

    const purchase = await MembershipService.createPurchaseRecordWithDiscount(
      userId,
      packageId,
      pkg.price,
      actualPrice,
      discountRate,
      pkg.interview_minutes,
      expiresAt,
    )

    await MembershipService.updateUserMembershipDirect(
      userId,
      expiresAt,
      (userInfo.remaining_interview_minutes || 0) + pkg.interview_minutes,
      (userInfo.total_purchased_minutes || 0) + pkg.interview_minutes,
    )

    res.json({ data: purchase })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

router.get('/purchases', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const purchases = await MembershipService.getUserPurchases(req.user!.id)
    res.json({ data: purchases })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

router.get('/purchases/:userId', async (req, res) => {
  try {
    const purchases = await MembershipService.getUserPurchases(req.params.userId)
    res.json({ data: purchases })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

export default router
