import { query } from './core'
import type { MembershipPackage, PaymentOrder, UserLevel } from './types'

export class PaymentService {
  static async getActivePackage(packageId: string): Promise<MembershipPackage | null> {
    const result = await query(
      'SELECT * FROM membership_packages WHERE id = $1 AND is_active = true',
      [packageId],
    )
    return result.rows[0] || null
  }

  static async getUserDiscountInfo(
    userId: string,
  ): Promise<{ user_level: UserLevel; discount_rate: number } | null> {
    const result = await query(
      'SELECT user_level, discount_rate FROM user_profiles WHERE id = $1',
      [userId],
    )
    return result.rows[0] || null
  }

  static async createOrder(
    orderNo: string,
    userId: string,
    packageId: string,
    amount: number,
    provider: string,
    channel: string,
    expiredAt?: Date,
  ): Promise<void> {
    await query(
      `INSERT INTO payment_orders 
       (order_no, user_id, package_id, amount, status, payment_provider, payment_channel, expired_at) 
       VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7)`,
      [orderNo, userId, packageId, amount, provider, channel, expiredAt || null],
    )
  }

  static async getOrderByNo(orderNo: string, userId?: string): Promise<PaymentOrder | null> {
    const sql = userId
      ? 'SELECT * FROM payment_orders WHERE order_no = $1 AND user_id = $2'
      : 'SELECT * FROM payment_orders WHERE order_no = $1'
    const params = userId ? [orderNo, userId] : [orderNo]
    const result = await query(sql, params)
    return result.rows[0] || null
  }

  static async getUserOrders(userId: string, limit = 50): Promise<PaymentOrder[]> {
    const result = await query(
      `SELECT po.*, mp.name as package_name 
       FROM payment_orders po 
       LEFT JOIN membership_packages mp ON po.package_id = mp.id 
       WHERE po.user_id = $1 
       ORDER BY po.created_at DESC 
       LIMIT $2`,
      [userId, limit],
    )
    return result.rows
  }

  static async updateOrderExpired(orderNo: string): Promise<void> {
    await query("UPDATE payment_orders SET status = 'expired' WHERE order_no = $1", [orderNo])
  }

  static async markOrderPaid(orderNo: string, tradeNo: string, paidAt: Date): Promise<void> {
    await query(
      "UPDATE payment_orders SET status = 'paid', trade_no = $2, paid_at = $3 WHERE order_no = $1",
      [orderNo, tradeNo, paidAt],
    )
  }

  static async createPurchaseRecord(
    userId: string,
    packageId: string,
    originalPrice: number,
    actualPrice: number,
    interviewMinutes: number,
    expiresAt: Date,
    paymentMethod: string,
  ): Promise<void> {
    await query(
      `INSERT INTO purchase_records 
       (user_id, package_id, original_price, actual_price, discount_rate, interview_minutes, expires_at, status, payment_method)
       VALUES ($1, $2, $3, $4, 1.0, $5, $6, 'completed', $7)`,
      [userId, packageId, originalPrice, actualPrice, interviewMinutes, expiresAt, paymentMethod],
    )
  }

  static async updateUserMembership(
    userId: string,
    expiresAt: Date,
    minutes: number,
  ): Promise<void> {
    await query(
      `UPDATE user_profiles SET 
       membership_expires_at = $2,
       remaining_interview_minutes = remaining_interview_minutes + $3,
       total_purchased_minutes = total_purchased_minutes + $3,
       updated_at = NOW()
       WHERE id = $1`,
      [userId, expiresAt, minutes],
    )
  }
}
