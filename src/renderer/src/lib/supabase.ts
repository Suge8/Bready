// 本地数据库客户端
console.log('使用本地 PostgreSQL 数据库')

// IPC 调用辅助函数
async function invokeIpc(channel: string, ...args: any[]) {
  const ipcRenderer = (window as any).bready?.ipcRenderer
  if (!ipcRenderer) {
    // 浏览器环境回退：直接调用后端 API
    console.warn('Running in browser mode, using HTTP API instead of IPC')
    return await callHttpApi(channel, ...args)
  }
  return await ipcRenderer.invoke(channel, ...args)
}

// 浏览器环境的 HTTP API 调用
async function callHttpApi(channel: string, ...args: any[]) {
  const baseUrl = 'http://localhost:3001/api' // 需要启动一个 HTTP API 服务器

  // 将 IPC 通道映射到 HTTP 端点
  const endpoint = channel.replace(':', '/')

  try {
    const response = await fetch(`${baseUrl}/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ args }),
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const result = await response.json()
    if (result.error) {
      throw new Error(result.error)
    }

    return result.data
  } catch (error) {
    console.error(`HTTP API call failed for ${channel}:`, error)
    throw error
  }
}

console.log('本地数据库客户端初始化成功')

// 全局认证状态监听器
let authStateListeners: Array<(event: string, session: any) => void> = []

function notifyAuthStateChange(event: string, session: any) {
  authStateListeners.forEach((callback) => {
    try {
      callback(event, session)
    } catch (error) {
      console.error('Auth state change callback error:', error)
    }
  })
}

// 数据库类型定义
export type UserLevel = '小白' | '螺丝钉' | '大牛' | '管理' | '超级'
export type UserRole = 'user' | 'admin' | UserLevel

export interface UserProfile {
  id: string
  username?: string
  email?: string
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

export interface MembershipPackage {
  id: string
  name: string
  level: '螺丝钉' | '大牛'
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
  status: 'pending' | 'completed' | 'cancelled'
  payment_method?: string
  created_at: string
}

export interface InterviewUsageRecord {
  id: string
  user_id: string
  preparation_id?: string
  session_type: 'collaboration' | 'live_interview'
  minutes_used: number
  started_at: string
  ended_at?: string
  created_at: string
}

export interface PagedResult<T> {
  records: T[]
  hasMore: boolean
}

export interface Preparation {
  id: string
  name: string
  job_description: string
  resume?: string
  analysis?: {
    matchScore: number
    jobRequirements: string[]
    strengths: string[]
    weaknesses: string[]
    suggestions: string[]
    systemPrompt: string
  }
  is_analyzing?: boolean
  user_id: string
  created_at: string
  updated_at: string
}

// 认证服务
export const authService = {
  // 获取当前用户
  async getCurrentUser() {
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) {
        return { data: { user: null }, error: null }
      }

      const user = await invokeIpc('auth:verify-session', token)
      return { data: { user }, error: null }
    } catch (error) {
      return { data: { user: null }, error }
    }
  },

  // 获取当前会话
  async getCurrentSession() {
    console.log('authService: Getting current session')
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) {
        return { data: { session: null }, error: null }
      }

      const user = await invokeIpc('auth:verify-session', token)
      if (!user) {
        localStorage.removeItem('auth_token')
        return { data: { session: null }, error: null }
      }

      return {
        data: {
          session: {
            user,
            access_token: token,
          },
        },
        error: null,
      }
    } catch (error) {
      return { data: { session: null }, error }
    }
  },

  // 邮箱密码登录
  async signInWithEmail(email: string, password: string) {
    try {
      const result = await invokeIpc('auth:sign-in', { email, password })
      if (result.token) {
        localStorage.setItem('auth_token', result.token)

        // 创建会话对象
        const session = { user: result.user, access_token: result.token }

        // 触发认证状态变化
        notifyAuthStateChange('SIGNED_IN', session)

        return {
          data: {
            user: result.user,
            session,
          },
          error: null,
        }
      }
      return { data: { user: null, session: null }, error: { message: '登录失败' } }
    } catch (error: any) {
      return { data: { user: null, session: null }, error: { message: error.message } }
    }
  },

  // 邮箱密码注册
  async signUpWithEmail(email: string, password: string, userData?: { full_name?: string }) {
    try {
      const user = await invokeIpc('auth:sign-up', { email, password, userData })
      return { data: { user }, error: null }
    } catch (error: any) {
      return { data: { user: null }, error: { message: error.message } }
    }
  },

  // Google OAuth 登录（暂不支持）
  async signInWithGoogle() {
    return {
      data: { user: null, session: null },
      error: { message: 'Google OAuth 登录暂不支持，请使用邮箱密码登录' },
    }
  },

  // 手机号登录（暂不支持）
  async signInWithPhone(phone: string) {
    void phone
    return {
      data: { user: null, session: null },
      error: { message: '手机号登录暂不支持，请使用邮箱密码登录' },
    }
  },

  // 验证手机号 OTP（暂不支持）
  async verifyOtp(phone: string, token: string) {
    void phone
    void token
    return {
      data: { user: null, session: null },
      error: { message: 'OTP 验证暂不支持，请使用邮箱密码登录' },
    }
  },

  // 登出
  async signOut() {
    try {
      const token = localStorage.getItem('auth_token')
      if (token) {
        await invokeIpc('auth:sign-out', token)
        localStorage.removeItem('auth_token')
      }

      // 触发登出状态变化
      notifyAuthStateChange('SIGNED_OUT', null)

      return { error: null }
    } catch (error: any) {
      return { error: { message: error.message } }
    }
  },

  // 修改密码
  async changePassword(
    oldPassword: string,
    newPassword: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) {
        return { success: false, error: '未登录' }
      }
      return await invokeIpc('auth:change-password', { token, oldPassword, newPassword })
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  },

  // 发送手机验证码
  async sendPhoneCode(
    phone: string,
  ): Promise<{ success: boolean; error?: string; cooldownSeconds?: number }> {
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) {
        return { success: false, error: '未登录' }
      }
      return await invokeIpc('auth:send-phone-code', { token, phone })
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  },

  // 绑定手机
  async bindPhone(phone: string, code: string): Promise<{ success: boolean; error?: string }> {
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) {
        return { success: false, error: '未登录' }
      }
      return await invokeIpc('auth:bind-phone', { token, phone, code })
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  },

  // 绑定邮箱
  async bindEmail(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) {
        return { success: false, error: '未登录' }
      }
      return await invokeIpc('auth:bind-email', { token, email })
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  },

  // 监听认证状态变化
  onAuthStateChange(callback: (event: string, session: any) => void) {
    console.log('authService: Setting up auth state change listener')

    // 添加到全局监听器列表
    authStateListeners.push(callback)

    // 立即检查当前状态
    this.getCurrentSession().then(({ data }) => {
      callback('INITIAL_SESSION', data.session)
    })

    // 返回一个取消订阅函数
    return {
      data: {
        subscription: {
          unsubscribe: () => {
            console.log('Auth state change listener unsubscribed')
            const index = authStateListeners.indexOf(callback)
            if (index > -1) {
              authStateListeners.splice(index, 1)
            }
          },
        },
      },
    }
  },
}

// 用户配置服务
export const userProfileService = {
  // 获取用户配置
  async getProfile(userId: string): Promise<UserProfile | null> {
    try {
      const profile = await invokeIpc('user:get-profile', userId)
      return profile
    } catch (error) {
      console.error('Error fetching user profile:', error)
      return null
    }
  },

  // 创建或更新用户配置
  async upsertProfile(profile: Partial<UserProfile>): Promise<UserProfile> {
    try {
      const updatedProfile = await invokeIpc('user:upsert-profile', profile)
      return updatedProfile
    } catch (error) {
      console.error('Error upserting user profile:', error)
      throw error
    }
  },

  // 获取所有用户（管理员功能）
  async getAllUsers(): Promise<UserProfile[]> {
    try {
      const users = await invokeIpc('user:get-all-users')
      return users || []
    } catch (error) {
      console.error('Error fetching all users:', error)
      throw error
    }
  },

  // 更新用户身份等级（管理员功能）
  async updateUserLevel(userId: string, userLevel: UserLevel): Promise<UserProfile> {
    try {
      const updatedUser = await invokeIpc('user:update-level', { userId, userLevel })
      return updatedUser
    } catch (error) {
      console.error('Error updating user level:', error)
      throw error
    }
  },

  // 更新用户角色（超级管理员功能）
  async updateUserRole(userId: string, role: UserRole): Promise<UserProfile> {
    try {
      const updatedUser = await invokeIpc('user:update-role', { userId, role })
      return updatedUser
    } catch (error) {
      console.error('Error updating user role:', error)
      throw error
    }
  },
}

// 会员套餐服务
export const membershipService = {
  // 获取所有可用套餐
  async getPackages(): Promise<MembershipPackage[]> {
    try {
      const packages = await invokeIpc('membership:get-packages')
      return packages || []
    } catch (error) {
      console.error('Error fetching membership packages:', error)
      throw error
    }
  },

  // 计算用户购买价格（考虑折扣）
  calculatePrice(
    originalPrice: number,
    userLevel: UserLevel,
  ): { actualPrice: number; discountRate: number } {
    let discountRate = 1.0

    if (userLevel === '螺丝钉') {
      discountRate = 0.9 // 9折
    } else if (userLevel === '大牛') {
      discountRate = 0.8 // 8折
    }

    return {
      actualPrice: Math.round(originalPrice * discountRate * 100) / 100,
      discountRate,
    }
  },

  // 购买套餐
  async purchasePackage(
    userId: string,
    packageId: string,
    userLevel: UserLevel,
  ): Promise<PurchaseRecord> {
    try {
      const purchaseData = await invokeIpc('membership:purchase-package', {
        userId,
        packageId,
        userLevel,
      })
      return purchaseData
    } catch (error) {
      console.error('Error purchasing package:', error)
      throw error
    }
  },

  // 获取用户购买记录
  async getUserPurchases(userId: string): Promise<PurchaseRecord[]> {
    try {
      const purchases = await invokeIpc('membership:get-user-purchases', userId)
      return purchases || []
    } catch (error) {
      console.error('Error fetching user purchases:', error)
      throw error
    }
  },

  async getUserPurchasesPage(
    userId: string,
    page: number,
    pageSize: number,
  ): Promise<PagedResult<PurchaseRecord>> {
    try {
      const offset = Math.max(0, page) * pageSize
      const result = await invokeIpc('membership:get-user-purchases', {
        userId,
        limit: pageSize,
        offset,
      })
      return {
        records: result.records || [],
        hasMore: result.hasMore === true,
      }
    } catch (error) {
      console.error('Error fetching user purchases page:', error)
      throw error
    }
  },

  async getTotalPurchasedMinutes(userId: string): Promise<number> {
    try {
      const purchases = await invokeIpc('membership:get-user-purchases', userId)
      if (!purchases || !Array.isArray(purchases)) return 0
      return purchases
        .filter((p: PurchaseRecord) => p.status === 'completed')
        .reduce((sum: number, p: PurchaseRecord) => sum + (p.interview_minutes || 0), 0)
    } catch (error) {
      console.error('Error calculating total purchased minutes:', error)
      return 0
    }
  },
}

// 面试时间使用记录服务
export const usageRecordService = {
  // 开始面试会话
  async startSession(
    userId: string,
    sessionType: 'collaboration' | 'live_interview',
    preparationId?: string,
  ): Promise<InterviewUsageRecord> {
    try {
      const session = await invokeIpc('usage:start-session', {
        userId,
        sessionType,
        preparationId,
      })
      return session
    } catch (error) {
      console.error('Error starting session:', error)
      throw error
    }
  },

  // 结束面试会话
  async endSession(sessionId: string, minutesUsed: number): Promise<InterviewUsageRecord> {
    try {
      const session = await invokeIpc('usage:end-session', {
        sessionId,
        minutesUsed,
      })
      return session
    } catch (error) {
      console.error('Error ending session:', error)
      throw error
    }
  },

  // 获取用户使用记录
  async getUserUsageRecords(userId: string): Promise<InterviewUsageRecord[]> {
    try {
      const records = await invokeIpc('usage:get-user-records', userId)
      return records || []
    } catch (error) {
      console.error('Error fetching usage records:', error)
      throw error
    }
  },

  async getUserUsageRecordsPage(
    userId: string,
    page: number,
    pageSize: number,
  ): Promise<PagedResult<InterviewUsageRecord>> {
    try {
      const offset = Math.max(0, page) * pageSize
      const result = await invokeIpc('usage:get-user-records', {
        userId,
        limit: pageSize,
        offset,
      })
      return {
        records: result.records || [],
        hasMore: result.hasMore === true,
      }
    } catch (error) {
      console.error('Error fetching usage records page:', error)
      throw error
    }
  },

  async getAllRecords(): Promise<
    (InterviewUsageRecord & { full_name?: string; username?: string; email?: string })[]
  > {
    try {
      const records = await invokeIpc('usage:get-all-records')
      return records || []
    } catch (error) {
      console.error('Error fetching all usage records:', error)
      throw error
    }
  },
}

export const preparationService = {
  // 获取当前用户的所有准备项
  async getAll(userId?: string): Promise<Preparation[]> {
    try {
      const preparations = await invokeIpc('preparation:get-all', userId)
      return preparations || []
    } catch (error) {
      console.error('Error fetching preparations:', error)
      throw error
    }
  },

  // 根据ID获取单个准备项
  async getById(id: string): Promise<Preparation | null> {
    try {
      const preparation = await invokeIpc('preparation:get-by-id', id)
      return preparation
    } catch (error) {
      console.error('Error fetching preparation:', error)
      return null
    }
  },

  // 创建新的准备项
  async create(
    preparation: Omit<Preparation, 'id' | 'created_at' | 'updated_at'>,
  ): Promise<Preparation> {
    try {
      const newPreparation = await invokeIpc('preparation:create', preparation)
      return newPreparation
    } catch (error) {
      console.error('Error creating preparation:', error)
      throw error
    }
  },

  // 更新准备项
  async update(
    id: string,
    preparation: Partial<Omit<Preparation, 'id' | 'created_at' | 'updated_at'>>,
  ): Promise<Preparation> {
    try {
      const updatedPreparation = await invokeIpc('preparation:update', { id, preparation })
      return updatedPreparation
    } catch (error) {
      console.error('Error updating preparation:', error)
      throw error
    }
  },

  async delete(id: string): Promise<void> {
    try {
      await invokeIpc('preparation:delete', id)
    } catch (error) {
      console.error('Error deleting preparation:', error)
      throw error
    }
  },
}

export interface AiConfigDisplay {
  provider: 'gemini' | 'doubao'
  geminiApiKey: string
  doubaoChatApiKey: string
  doubaoAsrAppId: string
  doubaoAsrAccessKey: string
  hasGeminiKey: boolean
  hasDoubaoKey: boolean
}

export interface PaymentConfigDisplay {
  provider: 'epay' | 'wechat' | 'alipay' | ''
  notifyUrl: string
  epay: { pid: string; key: string; apiUrl: string; hasCredentials: boolean }
  wechat: {
    mchid: string
    appid: string
    apiKey: string
    certSerial: string
    privateKey: string
    hasCredentials: boolean
  }
  alipay: { appId: string; privateKey: string; publicKey: string; hasCredentials: boolean }
}

export interface PaymentOrder {
  id: string
  order_no: string
  amount: number
  status: 'pending' | 'paid' | 'failed' | 'expired'
  payment_provider: string
  package_name?: string
  created_at: string
  paid_at?: string
}

export const settingsService = {
  async checkAiConfig(): Promise<{
    configured: boolean
    provider: 'gemini' | 'doubao' | ''
    missingFields: string[]
  }> {
    return await invokeIpc('settings:check-ai-config')
  },

  async getAiConfig(): Promise<AiConfigDisplay> {
    return await invokeIpc('settings:get-ai-config')
  },

  async updateAiConfig(
    config: Partial<{
      provider: 'gemini' | 'doubao'
      geminiApiKey: string
      doubaoChatApiKey: string
      doubaoAsrAppId: string
      doubaoAsrAccessKey: string
    }>,
  ): Promise<{ success: boolean; error?: string }> {
    return await invokeIpc('settings:update-ai-config', config)
  },

  async testAiConnection(
    provider: 'gemini' | 'doubao',
  ): Promise<{ success: boolean; error?: string }> {
    return await invokeIpc('settings:test-ai-connection', provider)
  },

  async getPaymentConfig(): Promise<PaymentConfigDisplay> {
    return await invokeIpc('settings:get-payment-config')
  },

  async updatePaymentConfig(config: any): Promise<{ success: boolean; error?: string }> {
    return await invokeIpc('settings:update-payment-config', config)
  },
}

export const paymentService = {
  async createOrder(
    userId: string,
    packageId: string,
    channel?: 'alipay' | 'wxpay',
  ): Promise<{
    success: boolean
    orderNo?: string
    payUrl?: string
    qrcodeUrl?: string
    amount?: number
    error?: string
  }> {
    return await invokeIpc('payment:create-order', { userId, packageId, channel })
  },

  async queryOrder(orderNo: string): Promise<{
    success: boolean
    orderNo?: string
    status?: 'pending' | 'paid' | 'failed' | 'expired'
    paidAt?: string
    error?: string
  }> {
    return await invokeIpc('payment:query-order', orderNo)
  },

  async getUserOrders(userId: string): Promise<{
    success: boolean
    orders: PaymentOrder[]
    error?: string
  }> {
    return await invokeIpc('payment:get-user-orders', userId)
  },
}
