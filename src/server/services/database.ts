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
