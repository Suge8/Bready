import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { pool, query } from './core'
import type { UserProfile } from './types'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

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
