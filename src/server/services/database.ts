import { Pool } from 'pg'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const debugDb = process.env.DEBUG_DB === '1'

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'bready',
  user: process.env.DB_USER || process.env.USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  max: 10,
  min: 2,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  allowExitOnIdle: true,
}

export const pool = new Pool(dbConfig)

pool.on('error', (err) => {
  console.error('Database pool error:', err)
})

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

export async function testConnection(): Promise<boolean> {
  try {
    const client = await pool.connect()
    await client.query('SELECT NOW()')
    client.release()
    if (debugDb) console.log('Database connection successful')
    return true
  } catch (error) {
    console.error('Database connection failed:', error)
    return false
  }
}

export async function query(text: string, params?: any[]): Promise<any> {
  const client = await pool.connect()
  try {
    return await client.query(text, params)
  } finally {
    client.release()
  }
}

export type UserLevel = '小白' | '螺丝钉' | '大牛' | '管理' | '超级'
export type UserRole = 'user' | 'admin' | UserLevel

export interface UserProfile {
  id: string
  username?: string
  email: string
  full_name?: string
  avatar_url?: string
  role: UserRole
  user_level: UserLevel
  membership_expires_at?: string
  remaining_interview_minutes: number
  total_purchased_minutes: number
  discount_rate: number
  created_at: string
  updated_at: string
}

export class AuthService {
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10)
  }

  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash)
  }

  static generateToken(userId: string): string {
    const payload = {
      userId,
      iat: Math.floor(Date.now() / 1000),
      random: Math.random().toString(36).substring(2, 15),
    }
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
  }

  static verifyToken(token: string): { userId: string } | null {
    try {
      return jwt.verify(token, JWT_SECRET) as { userId: string }
    } catch {
      return null
    }
  }

  static async signUp(
    email: string,
    password: string,
    userData?: { full_name?: string },
  ): Promise<UserProfile> {
    const client = await pool.connect()
    try {
      const existingUser = await client.query('SELECT id FROM user_profiles WHERE email = $1', [
        email,
      ])
      if (existingUser.rows.length > 0) {
        throw new Error('邮箱已被注册')
      }

      const passwordHash = await this.hashPassword(password)
      const result = await client.query(
        `INSERT INTO user_profiles (email, password_hash, full_name) 
         VALUES ($1, $2, $3) 
         RETURNING id, email, full_name, role, user_level, remaining_interview_minutes, total_purchased_minutes, discount_rate, created_at, updated_at`,
        [email, passwordHash, userData?.full_name || null],
      )
      return result.rows[0]
    } finally {
      client.release()
    }
  }

  static async signIn(
    email: string,
    password: string,
  ): Promise<{ user: UserProfile; token: string }> {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      const result = await client.query('SELECT * FROM user_profiles WHERE email = $1', [email])
      if (result.rows.length === 0) {
        throw new Error('用户不存在')
      }

      const user = result.rows[0]
      const isValidPassword = await this.verifyPassword(password, user.password_hash)
      if (!isValidPassword) {
        throw new Error('密码错误')
      }

      await client.query('DELETE FROM user_sessions WHERE user_id = $1', [user.id])
      const token = this.generateToken(user.id)
      await client.query(
        'INSERT INTO user_sessions (user_id, token, expires_at) VALUES ($1, $2, $3)',
        [user.id, token, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)],
      )

      await client.query('COMMIT')
      delete user.password_hash
      return { user, token }
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  static async verifySession(token: string): Promise<UserProfile | null> {
    const client = await pool.connect()
    try {
      const payload = this.verifyToken(token)
      if (!payload) return null

      const sessionResult = await client.query(
        'SELECT user_id FROM user_sessions WHERE token = $1 AND expires_at > NOW()',
        [token],
      )
      if (sessionResult.rows.length === 0) return null

      const userResult = await client.query(
        'SELECT id, username, email, full_name, avatar_url, role, user_level, membership_expires_at, remaining_interview_minutes, total_purchased_minutes, discount_rate, created_at, updated_at FROM user_profiles WHERE id = $1',
        [payload.userId],
      )
      return userResult.rows[0] || null
    } finally {
      client.release()
    }
  }

  static async signOut(token: string): Promise<void> {
    const client = await pool.connect()
    try {
      await client.query('DELETE FROM user_sessions WHERE token = $1', [token])
    } finally {
      client.release()
    }
  }

  static async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
  ): Promise<void> {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      const result = await client.query('SELECT password_hash FROM user_profiles WHERE id = $1', [
        userId,
      ])
      if (result.rows.length === 0) throw new Error('用户不存在')

      const isValid = await this.verifyPassword(oldPassword, result.rows[0].password_hash)
      if (!isValid) throw new Error('当前密码不正确')

      const newHash = await this.hashPassword(newPassword)
      await client.query(
        'UPDATE user_profiles SET password_hash = $2, updated_at = NOW() WHERE id = $1',
        [userId, newHash],
      )
      await client.query('DELETE FROM user_sessions WHERE user_id = $1', [userId])

      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  static async updatePhone(userId: string, phone: string): Promise<void> {
    await query('UPDATE user_profiles SET phone = $2, updated_at = NOW() WHERE id = $1', [
      userId,
      phone,
    ])
  }

  static async updateEmail(userId: string, email: string): Promise<void> {
    await query('UPDATE user_profiles SET email = $2, updated_at = NOW() WHERE id = $1', [
      userId,
      email,
    ])
  }

  static async signInOrCreateByPhone(phone: string): Promise<{ user: UserProfile; token: string }> {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      let result = await client.query('SELECT * FROM user_profiles WHERE phone = $1', [phone])
      let user: any

      if (result.rows.length === 0) {
        const insertResult = await client.query(
          `INSERT INTO user_profiles (phone, password_hash) 
           VALUES ($1, '') 
           RETURNING *`,
          [phone],
        )
        user = insertResult.rows[0]
      } else {
        user = result.rows[0]
      }

      await client.query('DELETE FROM user_sessions WHERE user_id = $1', [user.id])
      const token = this.generateToken(user.id)
      await client.query(
        'INSERT INTO user_sessions (user_id, token, expires_at) VALUES ($1, $2, $3)',
        [user.id, token, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)],
      )

      await client.query('COMMIT')
      delete user.password_hash
      return { user, token }
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  static async signInOrCreateByWechat(
    openid: string,
    unionid: string | undefined,
    nickname: string,
    avatarUrl: string,
  ): Promise<{ user: UserProfile; token: string }> {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      let result = await client.query('SELECT * FROM user_profiles WHERE wechat_openid = $1', [
        openid,
      ])
      let user: any

      if (result.rows.length === 0) {
        const insertResult = await client.query(
          `INSERT INTO user_profiles (wechat_openid, wechat_unionid, full_name, avatar_url, password_hash) 
           VALUES ($1, $2, $3, $4, '') 
           RETURNING *`,
          [openid, unionid || null, nickname, avatarUrl],
        )
        user = insertResult.rows[0]
      } else {
        user = result.rows[0]
        await client.query(
          `UPDATE user_profiles SET full_name = $2, avatar_url = $3, wechat_unionid = $4, updated_at = NOW() 
           WHERE id = $1`,
          [user.id, nickname, avatarUrl, unionid || user.wechat_unionid],
        )
        user.full_name = nickname
        user.avatar_url = avatarUrl
      }

      await client.query('DELETE FROM user_sessions WHERE user_id = $1', [user.id])
      const token = this.generateToken(user.id)
      await client.query(
        'INSERT INTO user_sessions (user_id, token, expires_at) VALUES ($1, $2, $3)',
        [user.id, token, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)],
      )

      await client.query('COMMIT')
      delete user.password_hash
      return { user, token }
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  static async signInOrCreateByGoogle(
    googleId: string,
    email: string,
    name: string,
    avatarUrl: string,
  ): Promise<{ user: UserProfile; token: string }> {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      let result = await client.query('SELECT * FROM user_profiles WHERE google_id = $1', [
        googleId,
      ])
      let user: any

      if (result.rows.length === 0) {
        const existingEmail = await client.query('SELECT * FROM user_profiles WHERE email = $1', [
          email,
        ])
        if (existingEmail.rows.length > 0) {
          user = existingEmail.rows[0]
          await client.query(
            `UPDATE user_profiles SET google_id = $2, avatar_url = $3, updated_at = NOW() WHERE id = $1`,
            [user.id, googleId, avatarUrl || user.avatar_url],
          )
          user.google_id = googleId
        } else {
          const insertResult = await client.query(
            `INSERT INTO user_profiles (google_id, email, full_name, avatar_url, password_hash) 
             VALUES ($1, $2, $3, $4, '') 
             RETURNING *`,
            [googleId, email, name, avatarUrl],
          )
          user = insertResult.rows[0]
        }
      } else {
        user = result.rows[0]
        await client.query(
          `UPDATE user_profiles SET full_name = $2, avatar_url = $3, updated_at = NOW() WHERE id = $1`,
          [user.id, name, avatarUrl],
        )
        user.full_name = name
        user.avatar_url = avatarUrl
      }

      await client.query('DELETE FROM user_sessions WHERE user_id = $1', [user.id])
      const token = this.generateToken(user.id)
      await client.query(
        'INSERT INTO user_sessions (user_id, token, expires_at) VALUES ($1, $2, $3)',
        [user.id, token, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)],
      )

      await client.query('COMMIT')
      delete user.password_hash
      return { user, token }
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  static async createPasswordResetToken(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<void> {
    await query('DELETE FROM password_reset_tokens WHERE user_id = $1', [userId])
    await query(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [userId, tokenHash, expiresAt],
    )
  }

  static async resetPasswordWithToken(tokenHash: string, newPassword: string): Promise<boolean> {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      const tokenResult = await client.query(
        `SELECT user_id FROM password_reset_tokens 
         WHERE token = $1 AND expires_at > NOW() AND used_at IS NULL`,
        [tokenHash],
      )

      if (tokenResult.rows.length === 0) {
        await client.query('ROLLBACK')
        return false
      }

      const userId = tokenResult.rows[0].user_id
      const passwordHash = await this.hashPassword(newPassword)

      await client.query(
        'UPDATE user_profiles SET password_hash = $2, updated_at = NOW() WHERE id = $1',
        [userId, passwordHash],
      )
      await client.query('UPDATE password_reset_tokens SET used_at = NOW() WHERE token = $1', [
        tokenHash,
      ])
      await client.query('DELETE FROM user_sessions WHERE user_id = $1', [userId])

      await client.query('COMMIT')
      return true
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  static async getUserIdByEmail(email: string): Promise<string | null> {
    const result = await query('SELECT id FROM user_profiles WHERE email = $1', [email])
    return result.rows.length > 0 ? result.rows[0].id : null
  }
}

export async function initializeDatabase(): Promise<void> {
  try {
    await testConnection()
    if (debugDb) console.log('Database initialized')
  } catch (error) {
    console.error('Database initialization failed:', error)
    throw error
  }
}

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

export interface MembershipPackage {
  id: string
  name: string
  price: number
  interview_minutes: number
  validity_days: number
  is_active: boolean
}

export interface PaymentOrder {
  order_no: string
  user_id: string
  package_id: string
  amount: number
  status: 'pending' | 'paid' | 'expired' | 'cancelled'
  payment_provider: string
  payment_channel: string
  trade_no?: string
  paid_at?: Date
  expired_at?: Date
  created_at: Date
  package_name?: string
}

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

export interface PurchaseRecord {
  id: string
  user_id: string
  package_id: string
  original_price: number
  actual_price: number
  discount_rate: number
  interview_minutes: number
  expires_at: Date
  status: string
  payment_method?: string
  created_at: Date
  package_name?: string
  package_level?: string
}

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

export interface CollabSession {
  id: string
  user_id: string
  remaining_ms_at_start: number
  started_at: Date
  expires_at: Date
  last_seen_at: Date
  ended_at?: Date
  end_reason?: string
  consumed_ms?: number
}

export class CollabService {
  static async getUserRemainingMinutes(userId: string): Promise<number | null> {
    const result = await query(
      'SELECT remaining_interview_minutes FROM user_profiles WHERE id = $1 FOR UPDATE',
      [userId],
    )
    return result.rows.length > 0 ? result.rows[0].remaining_interview_minutes || 0 : null
  }

  static async getActiveSession(userId: string): Promise<{ id: string } | null> {
    const result = await query(
      'SELECT id FROM collab_sessions WHERE user_id = $1 AND ended_at IS NULL',
      [userId],
    )
    return result.rows[0] || null
  }

  static async createSession(
    userId: string,
    remainingMs: number,
    startedAt: Date,
    expiresAt: Date,
  ): Promise<CollabSession> {
    const result = await query(
      `INSERT INTO collab_sessions (user_id, remaining_ms_at_start, started_at, expires_at, last_seen_at)
       VALUES ($1, $2, $3, $4, $3) RETURNING *`,
      [userId, remainingMs, startedAt, expiresAt],
    )
    return result.rows[0]
  }

  static async getSessionById(sessionId: string): Promise<CollabSession | null> {
    const result = await query('SELECT * FROM collab_sessions WHERE id = $1 AND ended_at IS NULL', [
      sessionId,
    ])
    return result.rows[0] || null
  }

  static async getSessionForUpdate(sessionId: string): Promise<CollabSession | null> {
    const result = await query(
      'SELECT * FROM collab_sessions WHERE id = $1 AND ended_at IS NULL FOR UPDATE',
      [sessionId],
    )
    return result.rows[0] || null
  }

  static async updateLastSeen(sessionId: string, now: Date): Promise<void> {
    await query('UPDATE collab_sessions SET last_seen_at = $2 WHERE id = $1', [sessionId, now])
  }

  static async endSession(
    sessionId: string,
    endedAt: Date,
    reason: string,
    consumedMs: number,
  ): Promise<void> {
    await query(
      `UPDATE collab_sessions SET ended_at = $2, end_reason = $3, consumed_ms = $4 WHERE id = $1`,
      [sessionId, endedAt, reason, consumedMs],
    )
  }

  static async deductUserMinutes(userId: string, minutes: number): Promise<void> {
    await query(
      `UPDATE user_profiles SET remaining_interview_minutes = GREATEST(remaining_interview_minutes - $2, 0) WHERE id = $1`,
      [userId, minutes],
    )
  }
}

export interface UsageRecord {
  id: string
  user_id: string
  preparation_id?: string
  session_type: string
  minutes_used: number
  started_at: Date
  ended_at?: Date
  created_at: Date
  preparation_name?: string
  full_name?: string
  username?: string
  email?: string
  avatar_url?: string
}

export class UsageService {
  static async startSession(
    userId: string,
    sessionType: string,
    preparationId?: string,
  ): Promise<UsageRecord> {
    const result = await query(
      `INSERT INTO interview_usage_records (user_id, preparation_id, session_type, minutes_used, started_at) 
       VALUES ($1, $2, $3, 0, NOW()) RETURNING *`,
      [userId, preparationId || null, sessionType],
    )
    return result.rows[0]
  }

  static async endSession(sessionId: string, minutesUsed: number): Promise<UsageRecord | null> {
    const result = await query(
      'UPDATE interview_usage_records SET minutes_used = $2, ended_at = NOW() WHERE id = $1 RETURNING *',
      [sessionId, minutesUsed],
    )
    return result.rows[0] || null
  }

  static async getUserRecords(userId: string): Promise<UsageRecord[]> {
    const result = await query(
      `SELECT iur.*, p.name as preparation_name 
       FROM interview_usage_records iur 
       LEFT JOIN preparations p ON iur.preparation_id = p.id 
       WHERE iur.user_id = $1 
       ORDER BY iur.created_at DESC`,
      [userId],
    )
    return result.rows
  }

  static async getAllRecords(limit = 500): Promise<UsageRecord[]> {
    const result = await query(
      `SELECT iur.*, 
              up.full_name, up.username, up.email, up.avatar_url,
              p.name as preparation_name 
       FROM interview_usage_records iur 
       LEFT JOIN user_profiles up ON iur.user_id = up.id
       LEFT JOIN preparations p ON iur.preparation_id = p.id 
       ORDER BY iur.created_at DESC
       LIMIT $1`,
      [limit],
    )
    return result.rows
  }
}

export interface Preparation {
  id: string
  user_id: string
  name: string
  job_description?: string
  resume?: string
  analysis?: string
  is_analyzing: boolean
  created_at: Date
  updated_at: Date
}

export class PreparationService {
  static async getUserPreparations(userId: string): Promise<Preparation[]> {
    const result = await query(
      'SELECT * FROM preparations WHERE user_id = $1 ORDER BY updated_at DESC',
      [userId],
    )
    return result.rows
  }

  static async getById(id: string, userId?: string): Promise<Preparation | null> {
    const sql = userId
      ? 'SELECT * FROM preparations WHERE id = $1 AND user_id = $2'
      : 'SELECT * FROM preparations WHERE id = $1'
    const params = userId ? [id, userId] : [id]
    const result = await query(sql, params)
    return result.rows[0] || null
  }

  static async create(
    userId: string,
    name: string,
    jobDescription?: string,
    resume?: string,
    analysis?: string,
    isAnalyzing = false,
  ): Promise<Preparation> {
    const result = await query(
      `INSERT INTO preparations (user_id, name, job_description, resume, analysis, is_analyzing) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [userId, name, jobDescription, resume || null, analysis || null, isAnalyzing],
    )
    return result.rows[0]
  }

  static async update(
    id: string,
    updates: Record<string, unknown>,
    userId?: string,
  ): Promise<Preparation | null> {
    const allowedFields = ['name', 'job_description', 'resume', 'analysis', 'is_analyzing']
    const setClause: string[] = []
    const values: unknown[] = []
    let paramIndex = 1

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        setClause.push(`${field} = $${paramIndex}`)
        values.push(updates[field])
        paramIndex++
      }
    }

    if (setClause.length === 0) return null

    setClause.push('updated_at = NOW()')
    values.push(id)

    const sql = userId
      ? `UPDATE preparations SET ${setClause.join(', ')} WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1} RETURNING *`
      : `UPDATE preparations SET ${setClause.join(', ')} WHERE id = $${paramIndex} RETURNING *`

    if (userId) values.push(userId)

    const result = await query(sql, values)
    return result.rows[0] || null
  }

  static async delete(id: string, userId?: string): Promise<void> {
    const sql = userId
      ? 'DELETE FROM preparations WHERE id = $1 AND user_id = $2'
      : 'DELETE FROM preparations WHERE id = $1'
    const params = userId ? [id, userId] : [id]
    await query(sql, params)
  }
}
