import { query } from './core'
import type { MembershipPackage, PurchaseRecord, UserLevel } from './types'

export class MembershipService {
  static async getAllActivePackages(): Promise<MembershipPackage[]> {
    const result = await query(
      'SELECT * FROM membership_packages WHERE is_active = true ORDER BY price ASC',
    )
    return result.rows
  }

  static async getUserMembershipInfo(userId: string): Promise<{
    user_level: UserLevel
    remaining_interview_minutes: number
    total_purchased_minutes: number
  } | null> {
    const result = await query(
      'SELECT user_level, remaining_interview_minutes, total_purchased_minutes FROM user_profiles WHERE id = $1',
      [userId],
    )
    return result.rows[0] || null
  }

  static async createPurchaseRecordWithDiscount(
    userId: string,
    packageId: string,
    originalPrice: number,
    actualPrice: number,
    discountRate: number,
    interviewMinutes: number,
    expiresAt: Date,
  ): Promise<PurchaseRecord> {
    const result = await query(
      `INSERT INTO purchase_records 
       (user_id, package_id, original_price, actual_price, discount_rate, interview_minutes, expires_at, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'completed') RETURNING *`,
      [
        userId,
        packageId,
        originalPrice,
        actualPrice,
        discountRate,
        interviewMinutes,
        expiresAt.toISOString(),
      ],
    )
    return result.rows[0]
  }

  static async updateUserMembershipDirect(
    userId: string,
    expiresAt: Date,
    newRemainingMinutes: number,
    newTotalMinutes: number,
  ): Promise<void> {
    await query(
      `UPDATE user_profiles SET 
       membership_expires_at = $2, 
       remaining_interview_minutes = $3, 
       total_purchased_minutes = $4, 
       updated_at = NOW() 
       WHERE id = $1`,
      [userId, expiresAt.toISOString(), newRemainingMinutes, newTotalMinutes],
    )
  }

  static async getUserPurchases(userId: string): Promise<PurchaseRecord[]> {
    const result = await query(
      `SELECT pr.*, mp.name as package_name, mp.level as package_level 
       FROM purchase_records pr 
       JOIN membership_packages mp ON pr.package_id = mp.id 
       WHERE pr.user_id = $1 
       ORDER BY pr.created_at DESC`,
      [userId],
    )
    return result.rows
  }
}
