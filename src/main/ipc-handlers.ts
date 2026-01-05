import { ipcMain } from 'electron'
import { buildUpdateSetClause } from './utils/sql'
import { AuthService, query } from './database'

// 导入所有 IPC 处理器模块
import './ipc-handlers/window-handlers'
import './ipc-handlers/gemini-handlers'
import './ipc-handlers/audio-handlers'
import './ipc-handlers/permission-handlers'
import './ipc-handlers/debug-handlers'

// 认证相关 IPC 处理器
export function setupAuthHandlers() {
  // 用户注册
  ipcMain.handle('auth:sign-up', async (event, { email, password, userData }) => {
    void event
    try {
      const user = await AuthService.signUp(email, password, userData)
      return user
    } catch (error: any) {
      throw new Error(error.message)
    }
  })

  // 用户登录
  ipcMain.handle('auth:sign-in', async (event, { email, password }) => {
    void event
    console.log('🔐 IPC: auth:sign-in called with:', { email, password: '***' })
    try {
      const result = await AuthService.signIn(email, password)
      console.log('✅ IPC: auth:sign-in success')
      return result
    } catch (error: any) {
      console.error('❌ IPC: auth:sign-in error:', error.message)
      throw new Error(error.message)
    }
  })

  // 验证会话
  ipcMain.handle('auth:verify-session', async (event, token) => {
    void event
    try {
      const user = await AuthService.verifySession(token)
      return user
    } catch (error: any) {
      return null
    }
  })

  // 用户登出
  ipcMain.handle('auth:sign-out', async (event, token) => {
    void event
    try {
      await AuthService.signOut(token)
      return true
    } catch (error: any) {
      throw new Error(error.message)
    }
  })
}

// 用户配置相关 IPC 处理器
export function setupUserHandlers() {
  // 获取用户配置
  ipcMain.handle('user:get-profile', async (event, userId) => {
    void event
    try {
      const result = await query(
        'SELECT id, username, email, full_name, avatar_url, role, user_level, membership_expires_at, remaining_interview_minutes, total_purchased_minutes, discount_rate, created_at, updated_at FROM user_profiles WHERE id = $1',
        [userId]
      )
      return result.rows[0] || null
    } catch (error: any) {
      throw new Error(error.message)
    }
  })

  // 更新用户配置
  ipcMain.handle('user:upsert-profile', async (event, profile) => {
    void event
    try {
      const { id, ...updateData } = profile
      const { setClause, values } = buildUpdateSetClause(updateData, 2, ['updated_at = NOW()'])
      const result = await query(`UPDATE user_profiles SET ${setClause} WHERE id = $1 RETURNING *`, [
        id,
        ...values,
      ])
      return result.rows[0]
    } catch (error: any) {
      throw new Error(error.message)
    }
  })

  // 获取所有用户（管理员功能）
  ipcMain.handle('user:get-all-users', async (event) => {
    void event
    try {
      const result = await query(
        'SELECT id, username, email, full_name, avatar_url, role, user_level, membership_expires_at, remaining_interview_minutes, total_purchased_minutes, discount_rate, created_at, updated_at FROM user_profiles ORDER BY created_at DESC'
      )
      return result.rows
    } catch (error: any) {
      throw new Error(error.message)
    }
  })

  // 更新用户等级
  ipcMain.handle('user:update-level', async (event, { userId, userLevel }) => {
    void event
    try {
      const result = await query(
        'UPDATE user_profiles SET user_level = $2, updated_at = NOW() WHERE id = $1 RETURNING *',
        [userId, userLevel]
      )
      return result.rows[0]
    } catch (error: any) {
      throw new Error(error.message)
    }
  })

  // 更新用户角色
  ipcMain.handle('user:update-role', async (event, { userId, role }) => {
    void event
    try {
      const result = await query(
        'UPDATE user_profiles SET role = $2, updated_at = NOW() WHERE id = $1 RETURNING *',
        [userId, role]
      )
      return result.rows[0]
    } catch (error: any) {
      throw new Error(error.message)
    }
  })
}

// 会员套餐相关 IPC 处理器
export function setupMembershipHandlers() {
  // 获取所有可用套餐
  ipcMain.handle('membership:get-packages', async (event) => {
    void event
    try {
      const result = await query(
        'SELECT * FROM membership_packages WHERE is_active = true ORDER BY price ASC'
      )
      return result.rows
    } catch (error: any) {
      throw new Error(error.message)
    }
  })

  // 购买套餐
  ipcMain.handle('membership:purchase-package', async (event, { userId, packageId, userLevel }) => {
    void event
    try {
      // 获取套餐信息
      const packageResult = await query(
        'SELECT * FROM membership_packages WHERE id = $1 AND is_active = true',
        [packageId]
      )
      
      if (packageResult.rows.length === 0) {
        throw new Error('套餐不存在')
      }
      
      const packageData = packageResult.rows[0]

      // 获取当前用户数据
      const userResult = await query(
        'SELECT user_level, remaining_interview_minutes, total_purchased_minutes FROM user_profiles WHERE id = $1',
        [userId]
      )
      
      if (userResult.rows.length === 0) {
        throw new Error('用户不存在')
      }
      
      const currentUser = userResult.rows[0]

      // 计算价格（简化版本）
      let discountRate = 1.00
      if (userLevel === '螺丝钉') {
        discountRate = 0.90
      } else if (userLevel === '大牛') {
        discountRate = 0.80
      }
      
      const actualPrice = Math.round(packageData.price * discountRate * 100) / 100

      // 计算到期时间
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + packageData.validity_days)

      // 创建购买记录
      const purchaseResult = await query(
        `INSERT INTO purchase_records (user_id, package_id, original_price, actual_price, discount_rate, interview_minutes, expires_at, status) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'completed') RETURNING *`,
        [userId, packageId, packageData.price, actualPrice, discountRate, packageData.interview_minutes, expiresAt.toISOString()]
      )

      // 更新用户配置
      await query(
        `UPDATE user_profiles SET 
         membership_expires_at = $2, 
         remaining_interview_minutes = $3, 
         total_purchased_minutes = $4, 
         updated_at = NOW() 
         WHERE id = $1`,
        [
          expiresAt.toISOString(),
          (currentUser.remaining_interview_minutes || 0) + packageData.interview_minutes,
          (currentUser.total_purchased_minutes || 0) + packageData.interview_minutes
        ]
      )

      return purchaseResult.rows[0]
    } catch (error: any) {
      throw new Error(error.message)
    }
  })

  // 获取用户购买记录
  ipcMain.handle('membership:get-user-purchases', async (event, userId) => {
    void event
    try {
      const result = await query(
        `SELECT pr.*, mp.name as package_name, mp.level as package_level 
         FROM purchase_records pr 
         JOIN membership_packages mp ON pr.package_id = mp.id 
         WHERE pr.user_id = $1 
         ORDER BY pr.created_at DESC`,
        [userId]
      )
      return result.rows
    } catch (error: any) {
      throw new Error(error.message)
    }
  })
}

// 使用记录相关 IPC 处理器
export function setupUsageHandlers() {
  // 开始面试会话
  ipcMain.handle('usage:start-session', async (event, { userId, sessionType, preparationId }) => {
    void event
    try {
      const result = await query(
        `INSERT INTO interview_usage_records (user_id, preparation_id, session_type, minutes_used, started_at) 
         VALUES ($1, $2, $3, 0, NOW()) RETURNING *`,
        [userId, preparationId || null, sessionType]
      )
      return result.rows[0]
    } catch (error: any) {
      throw new Error(error.message)
    }
  })

  // 结束面试会话
  ipcMain.handle('usage:end-session', async (event, { sessionId, minutesUsed }) => {
    void event
    try {
      // 更新会话记录
      const sessionResult = await query(
        'UPDATE interview_usage_records SET minutes_used = $2, ended_at = NOW() WHERE id = $1 RETURNING *',
        [sessionId, minutesUsed]
      )
      
      if (sessionResult.rows.length === 0) {
        throw new Error('会话不存在')
      }
      
      const session = sessionResult.rows[0]

      // 扣除用户剩余时间
      await query(
        'UPDATE user_profiles SET remaining_interview_minutes = GREATEST(remaining_interview_minutes - $2, 0), updated_at = NOW() WHERE id = $1',
        [session.user_id, minutesUsed]
      )

      return session
    } catch (error: any) {
      throw new Error(error.message)
    }
  })

  // 获取用户使用记录
  ipcMain.handle('usage:get-user-records', async (event, userId) => {
    void event
    try {
      const result = await query(
        `SELECT iur.*, p.name as preparation_name 
         FROM interview_usage_records iur 
         LEFT JOIN preparations p ON iur.preparation_id = p.id 
         WHERE iur.user_id = $1 
         ORDER BY iur.created_at DESC`,
        [userId]
      )
      return result.rows
    } catch (error: any) {
      throw new Error(error.message)
    }
  })
}

// 准备项相关 IPC 处理器
export function setupPreparationHandlers() {
  // 获取所有准备项
  ipcMain.handle('preparation:get-all', async (event, userId) => {
    void event
    try {
      let queryText = 'SELECT * FROM preparations ORDER BY updated_at DESC'
      let params: any[] = []
      
      if (userId) {
        queryText = 'SELECT * FROM preparations WHERE user_id = $1 ORDER BY updated_at DESC'
        params = [userId]
      }
      
      const result = await query(queryText, params)
      return result.rows
    } catch (error: any) {
      throw new Error(error.message)
    }
  })

  // 根据ID获取准备项
  ipcMain.handle('preparation:get-by-id', async (event, id) => {
    void event
    try {
      const result = await query('SELECT * FROM preparations WHERE id = $1', [id])
      return result.rows[0] || null
    } catch (error: any) {
      return null
    }
  })

  // 创建准备项
  ipcMain.handle('preparation:create', async (event, preparation) => {
    void event
    try {
      const result = await query(
        `INSERT INTO preparations (user_id, name, job_description, resume, analysis, is_analyzing) 
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [
          preparation.user_id,
          preparation.name,
          preparation.job_description,
          preparation.resume || null,
          preparation.analysis || null,
          preparation.is_analyzing || false
        ]
      )
      return result.rows[0]
    } catch (error: any) {
      throw new Error(error.message)
    }
  })

  // 更新准备项
  ipcMain.handle('preparation:update', async (event, { id, preparation }) => {
    void event
    try {
      const { setClause, values } = buildUpdateSetClause(preparation, 1, ['updated_at = NOW()'])
      const result = await query(
        `UPDATE preparations SET ${setClause} WHERE id = $${values.length + 1} RETURNING *`,
        [...values, id],
      )
      return result.rows[0]
    } catch (error: any) {
      throw new Error(error.message)
    }
  })

  // 删除准备项
  ipcMain.handle('preparation:delete', async (event, id) => {
    void event
    try {
      await query('DELETE FROM preparations WHERE id = $1', [id])
      return true
    } catch (error: any) {
      throw new Error(error.message)
    }
  })
}

// 初始化所有 IPC 处理器
export function setupAllHandlers() {
  setupAuthHandlers()
  setupUserHandlers()
  setupMembershipHandlers()
  setupUsageHandlers()
  setupPreparationHandlers()
}
