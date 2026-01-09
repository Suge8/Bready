import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { AuthService, initializeDatabase, query } from './main/database'

// 加载环境变量
dotenv.config({ path: '.env.local' })

const app = express()
const PORT = 3001

// 中间件
app.use(cors())
app.use(express.json())

// 初始化数据库
initializeDatabase().catch(console.error)

// 认证相关 API
app.post('/api/auth/sign-up', async (req, res) => {
  try {
    const { args } = req.body
    const [{ email, password, userData }] = args
    const user = await AuthService.signUp(email, password, userData)
    res.json({ data: user })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

app.post('/api/auth/sign-in', async (req, res) => {
  try {
    const { args } = req.body
    const [{ email, password }] = args
    console.log('🔐 API: auth/sign-in called with:', { email, password: '***' })
    const result = await AuthService.signIn(email, password)
    console.log('✅ API: auth/sign-in success')
    res.json({ data: result })
  } catch (error: any) {
    console.error('❌ API: auth/sign-in error:', error.message)
    res.status(400).json({ error: error.message })
  }
})

app.post('/api/auth/verify-session', async (req, res) => {
  try {
    const { args } = req.body
    const [token] = args
    const user = await AuthService.verifySession(token)
    res.json({ data: user })
  } catch (error: any) {
    res.json({ data: null })
  }
})

app.post('/api/auth/sign-out', async (req, res) => {
  try {
    const { args } = req.body
    const [token] = args
    await AuthService.signOut(token)
    res.json({ data: true })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

// 用户配置相关 API
app.post('/api/user/get-profile', async (req, res) => {
  try {
    const { args } = req.body
    const [userId] = args
    const result = await query(
      'SELECT id, username, email, full_name, avatar_url, role, user_level, membership_expires_at, remaining_interview_minutes, total_purchased_minutes, discount_rate, created_at, updated_at FROM user_profiles WHERE id = $1',
      [userId],
    )
    res.json({ data: result.rows[0] || null })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

app.post('/api/user/update-profile', async (req, res) => {
  try {
    const { args } = req.body
    const [{ userId, updates }] = args
    const setClause = Object.keys(updates)
      .map((key, index) => `${key} = $${index + 2}`)
      .join(', ')
    const values = [userId, ...Object.values(updates)]

    const result = await query(
      `UPDATE user_profiles SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      values,
    )
    res.json({ data: result.rows[0] })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

app.post('/api/user/get-all-users', async (req, res) => {
  void req
  try {
    const result = await query(
      'SELECT id, username, email, full_name, avatar_url, role, user_level, membership_expires_at, remaining_interview_minutes, total_purchased_minutes, discount_rate, created_at, updated_at FROM user_profiles ORDER BY created_at DESC',
    )
    res.json({ data: result.rows })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

app.post('/api/user/update-level', async (req, res) => {
  try {
    const { args } = req.body
    const [{ userId, userLevel }] = args
    const result = await query(
      'UPDATE user_profiles SET user_level = $2, updated_at = NOW() WHERE id = $1 RETURNING *',
      [userId, userLevel],
    )
    res.json({ data: result.rows[0] })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

// 面试准备相关 API
app.post('/api/preparation/get-all', async (req, res) => {
  try {
    const { args } = req.body
    const [userId] = args
    const result = await query(
      'SELECT * FROM preparations WHERE user_id = $1 ORDER BY created_at DESC',
      [userId],
    )
    res.json({ data: result.rows })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

app.post('/api/preparation/create', async (req, res) => {
  try {
    const { args } = req.body
    const [preparationData] = args
    const result = await query(
      'INSERT INTO preparations (user_id, title, company, position, description) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [
        preparationData.user_id,
        preparationData.title,
        preparationData.company,
        preparationData.position,
        preparationData.description,
      ],
    )
    res.json({ data: result.rows[0] })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

app.post('/api/preparation/update', async (req, res) => {
  try {
    const { args } = req.body
    const [{ id, updates }] = args
    const setClause = Object.keys(updates)
      .map((key, index) => `${key} = $${index + 2}`)
      .join(', ')
    const values = [id, ...Object.values(updates)]

    const result = await query(
      `UPDATE preparations SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      values,
    )
    res.json({ data: result.rows[0] })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

app.post('/api/preparation/delete', async (req, res) => {
  try {
    const { args } = req.body
    const [id] = args
    await query('DELETE FROM preparations WHERE id = $1', [id])
    res.json({ data: true })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

// 会员套餐相关 API
app.post('/api/membership/get-packages', async (req, res) => {
  void req
  try {
    const result = await query(
      'SELECT * FROM membership_packages WHERE is_active = true ORDER BY price ASC',
    )
    res.json({ data: result.rows })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

app.post('/api/membership/purchase', async (req, res) => {
  try {
    const { args } = req.body
    const [{ userId, packageId }] = args

    // 获取套餐信息
    const packageResult = await query('SELECT * FROM membership_packages WHERE id = $1', [
      packageId,
    ])

    if (packageResult.rows.length === 0) {
      return res.status(404).json({ error: '套餐不存在' })
    }

    const membershipPackage = packageResult.rows[0]

    // 创建购买记录
    const purchaseResult = await query(
      'INSERT INTO purchase_records (user_id, package_id, amount, interview_minutes) VALUES ($1, $2, $3, $4) RETURNING *',
      [userId, packageId, membershipPackage.price, membershipPackage.interview_minutes],
    )

    // 更新用户配置
    await query(
      'UPDATE user_profiles SET remaining_interview_minutes = remaining_interview_minutes + $2, total_purchased_minutes = total_purchased_minutes + $2, updated_at = NOW() WHERE id = $1',
      [userId, membershipPackage.interview_minutes],
    )

    res.json({ data: purchaseResult.rows[0] })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 API Server running on http://localhost:${PORT}`)
})

export default app
