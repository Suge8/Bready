import { Pool, PoolClient } from 'pg'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

// 数据库连接配置（优化版）
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'bready',
  user: process.env.DB_USER || process.env.USER || 'sugeh',
  password: process.env.DB_PASSWORD || '',
  // 优化的连接池配置
  max: parseInt(process.env.DB_MAX_CONNECTIONS || '10'), // 降低最大连接数
  min: parseInt(process.env.DB_MIN_CONNECTIONS || '2'),  // 最小连接数
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000, // 增加连接超时时间
  acquireTimeoutMillis: 20000,   // 获取连接超时时间
  createRetryIntervalMillis: 1000, // 重试间隔
  createTimeoutMillis: 5000,     // 创建连接超时
  // 连接验证
  allowExitOnIdle: true,
  // 错误处理
  log: (msg: string) => {
    // 只在开发模式下显示连接相关日志，且过滤掉频繁的正常操作
    if (process.env.NODE_ENV === 'development' && 
        !msg.includes('pulse queue') && 
        !msg.includes('no queued requests') && 
        !msg.includes('checking client timeout') &&
        !msg.includes('connecting new client')) {
      console.log('🔍 DB Pool:', msg)
    }
  }
}

// 创建连接池
export const pool = new Pool(dbConfig)

// 连接池监控
let poolMetrics = {
  totalConnections: 0,
  idleConnections: 0,
  waitingClients: 0,
  lastError: null as Error | null,
  lastHealthCheck: Date.now()
}

// 连接池事件监听
pool.on('connect', () => {
  poolMetrics.totalConnections++
  // 只在连接数量发生显著变化时记录日志
  if (process.env.NODE_ENV === 'development' && poolMetrics.totalConnections % 5 === 1) {
    console.log('📊 数据库连接池: 新连接创建', {
      totalConnections: poolMetrics.totalConnections,
      idleConnections: poolMetrics.idleConnections,
      waitingClients: poolMetrics.waitingClients
    })
  }
})

pool.on('remove', () => {
  poolMetrics.totalConnections--
  // 只在连接数量显著变化时记录
  if (process.env.NODE_ENV === 'development' && poolMetrics.totalConnections % 5 === 0) {
    console.log('📊 数据库连接池: 连接移除', {
      totalConnections: poolMetrics.totalConnections,
      idleConnections: poolMetrics.idleConnections
    })
  }
})

pool.on('error', (err) => {
  poolMetrics.lastError = err
  console.error('❌ 数据库连接池错误:', err)
})

// 定期健康检查
setInterval(async () => {
  try {
    poolMetrics.totalConnections = pool.totalCount
    poolMetrics.idleConnections = pool.idleCount
    poolMetrics.waitingClients = pool.waitingCount
    poolMetrics.lastHealthCheck = Date.now()
    
    // 如果等待客户端过多，发出警告
    if (poolMetrics.waitingClients > 5) {
      console.warn('⚠️ 数据库连接池压力过大，等待客户端数:', poolMetrics.waitingClients)
    }
  } catch (error) {
    console.error('❌ 数据库健康检查失败:', error)
  }
}, 30000) // 每30秒检查一次

// 获取连接池状态
export function getPoolMetrics() {
  return {
    ...poolMetrics,
    totalConnections: pool.totalCount,
    idleConnections: pool.idleCount,
    waitingClients: pool.waitingCount
  }
}

// JWT 密钥
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

// 数据库连接测试
export async function testConnection(): Promise<boolean> {
  try {
    const client = await pool.connect()
    await client.query('SELECT NOW()')
    client.release()
    console.log('数据库连接成功')
    return true
  } catch (error) {
    console.error('数据库连接失败:', error)
    return false
  }
}

// 用户类型定义
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

export interface Preparation {
  id: string
  user_id: string
  name: string
  job_description: string
  resume?: string
  analysis?: any
  is_analyzing: boolean
  created_at: string
  updated_at: string
}

export interface MembershipPackage {
  id: string
  name: string
  level: string
  price: number
  interview_minutes: number
  validity_days: number
  description?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface PurchaseRecord {
  id: string
  user_id: string
  package_id: string
  original_price: number
  actual_price: number
  discount_rate: number
  interview_minutes: number
  expires_at: string
  status: string
  payment_method?: string
  created_at: string
}

export interface InterviewUsageRecord {
  id: string
  user_id: string
  preparation_id?: string
  session_type: string
  minutes_used: number
  started_at: string
  ended_at?: string
  created_at: string
}

export interface UserSession {
  id: string
  user_id: string
  token: string
  expires_at: string
  created_at: string
}

// 认证服务
export class AuthService {
  // 密码哈希
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10)
  }

  // 验证密码
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash)
  }

  // 生成 JWT token
  static generateToken(userId: string): string {
    // 添加随机数和时间戳确保唯一性
    const payload = {
      userId,
      iat: Math.floor(Date.now() / 1000),
      random: Math.random().toString(36).substring(2, 15)
    }
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
  }

  // 验证 JWT token
  static verifyToken(token: string): { userId: string } | null {
    try {
      return jwt.verify(token, JWT_SECRET) as { userId: string }
    } catch {
      return null
    }
  }

  // 用户注册
  static async signUp(email: string, password: string, userData?: { full_name?: string }): Promise<UserProfile> {
    const client = await pool.connect()
    try {
      // 检查邮箱是否已存在
      const existingUser = await client.query('SELECT id FROM user_profiles WHERE email = $1', [email])
      if (existingUser.rows.length > 0) {
        throw new Error('邮箱已被注册')
      }

      // 哈希密码
      const passwordHash = await this.hashPassword(password)

      // 创建用户
      const result = await client.query(
        `INSERT INTO user_profiles (email, password_hash, full_name) 
         VALUES ($1, $2, $3) 
         RETURNING id, email, full_name, role, user_level, remaining_interview_minutes, total_purchased_minutes, discount_rate, created_at, updated_at`,
        [email, passwordHash, userData?.full_name || null]
      )

      return result.rows[0]
    } finally {
      client.release()
    }
  }

  // 用户登录
  static async signIn(email: string, password: string): Promise<{ user: UserProfile; token: string }> {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      // 查找用户
      const result = await client.query(
        'SELECT * FROM user_profiles WHERE email = $1',
        [email]
      )

      if (result.rows.length === 0) {
        throw new Error('用户不存在')
      }

      const user = result.rows[0]

      // 验证密码
      const isValidPassword = await this.verifyPassword(password, user.password_hash)
      if (!isValidPassword) {
        throw new Error('密码错误')
      }

      // 先删除该用户的所有旧会话
      await client.query('DELETE FROM user_sessions WHERE user_id = $1', [user.id])

      // 生成新的唯一 token
      const token = this.generateToken(user.id)

      // 保存新会话
      await client.query(
        'INSERT INTO user_sessions (user_id, token, expires_at) VALUES ($1, $2, $3)',
        [user.id, token, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)] // 7天后过期
      )

      await client.query('COMMIT')

      // 移除密码哈希
      delete user.password_hash

      return { user, token }
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  // 验证会话
  static async verifySession(token: string): Promise<UserProfile | null> {
    const client = await pool.connect()
    try {
      // 验证 token
      const payload = this.verifyToken(token)
      if (!payload) {
        return null
      }

      // 检查会话是否存在且未过期
      const sessionResult = await client.query(
        'SELECT user_id FROM user_sessions WHERE token = $1 AND expires_at > NOW()',
        [token]
      )

      if (sessionResult.rows.length === 0) {
        return null
      }

      // 获取用户信息
      const userResult = await client.query(
        'SELECT id, username, email, full_name, avatar_url, role, user_level, membership_expires_at, remaining_interview_minutes, total_purchased_minutes, discount_rate, created_at, updated_at FROM user_profiles WHERE id = $1',
        [payload.userId]
      )

      return userResult.rows[0] || null
    } finally {
      client.release()
    }
  }

  // 登出
  static async signOut(token: string): Promise<void> {
    const client = await pool.connect()
    try {
      await client.query('DELETE FROM user_sessions WHERE token = $1', [token])
    } finally {
      client.release()
    }
  }
}

// 数据库查询辅助函数
export async function query(text: string, params?: any[]): Promise<any> {
  const client = await pool.connect()
  try {
    const result = await client.query(text, params)
    return result
  } finally {
    client.release()
  }
}

// 初始化数据库
export async function initializeDatabase(): Promise<void> {
  try {
    await testConnection()
    console.log('数据库初始化完成')
  } catch (error) {
    console.error('数据库初始化失败:', error)
    throw error
  }
}
