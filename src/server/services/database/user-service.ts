import { query } from './core'
import type { UserLevel, UserProfile, UserRole } from './types'

const USER_SELECT_FIELDS = `id, username, email, full_name, avatar_url, role, user_level,
  membership_expires_at, remaining_interview_minutes, total_purchased_minutes,
  discount_rate, has_completed_onboarding, created_at, updated_at`

export class UserService {
  static async getProfile(userId: string): Promise<UserProfile | null> {
    const result = await query(`SELECT ${USER_SELECT_FIELDS} FROM user_profiles WHERE id = $1`, [
      userId,
    ])
    return result.rows[0] || null
  }

  static async updateProfile(
    userId: string,
    updates: Record<string, unknown>,
    allowedFields: string[] = ['username', 'full_name', 'avatar_url'],
  ): Promise<UserProfile | null> {
    const setClause: string[] = []
    const values: unknown[] = [userId]
    let paramIndex = 2

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        setClause.push(`${field} = $${paramIndex}`)
        values.push(updates[field])
        paramIndex++
      }
    }

    if (setClause.length === 0) return null

    setClause.push('updated_at = NOW()')
    const result = await query(
      `UPDATE user_profiles SET ${setClause.join(', ')} WHERE id = $1 RETURNING *`,
      values,
    )
    return result.rows[0] || null
  }

  static async getAllUsers(): Promise<UserProfile[]> {
    const result = await query(
      `SELECT ${USER_SELECT_FIELDS} FROM user_profiles ORDER BY created_at DESC`,
    )
    return result.rows
  }

  static async updateUserLevel(userId: string, userLevel: UserLevel): Promise<UserProfile | null> {
    const result = await query(
      'UPDATE user_profiles SET user_level = $2, updated_at = NOW() WHERE id = $1 RETURNING *',
      [userId, userLevel],
    )
    return result.rows[0] || null
  }

  static async updateUserRole(userId: string, role: UserRole): Promise<UserProfile | null> {
    const result = await query(
      'UPDATE user_profiles SET role = $2, updated_at = NOW() WHERE id = $1 RETURNING *',
      [userId, role],
    )
    return result.rows[0] || null
  }

  static async deleteUser(userId: string): Promise<void> {
    await query('DELETE FROM user_profiles WHERE id = $1', [userId])
  }
}
