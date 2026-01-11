const API_BASE_URL = process.env.API_SERVER_URL || 'http://localhost:3001'

interface UserData {
  id: string
  email?: string
  username?: string
  [key: string]: any
}

interface PaymentOrderData {
  orderNo: string
  amount: number
  status?: string
  paidAt?: string
  payUrl?: string
  [key: string]: any
}

interface PaymentOrdersResponse {
  success: boolean
  orders?: any[]
  error?: string
}

interface ApiResponse<T = any> {
  data?: T
  error?: string
  success?: boolean
}

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint}`
  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...(options.headers as Record<string, string>),
      },
    })

    const data = await response.json()

    if (!response.ok) {
      return { error: data.error || `HTTP ${response.status}` }
    }

    return data
  } catch (error: any) {
    console.error(`API request failed: ${endpoint}`, error)
    return { error: error.message || '网络请求失败' }
  }
}

export const api = {
  auth: {
    signUp: (email: string, password: string, userData?: any) =>
      apiRequest('/api/auth/sign-up', {
        method: 'POST',
        body: JSON.stringify({ email, password, userData }),
      }),
    signIn: (email: string, password: string) =>
      apiRequest('/api/auth/sign-in', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    verifySession: (token: string) =>
      apiRequest<UserData>('/api/auth/verify-session', {
        method: 'POST',
        body: JSON.stringify({ token }),
      }),
    signOut: (token: string) =>
      apiRequest('/api/auth/sign-out', {
        method: 'POST',
        body: JSON.stringify({ token }),
      }),
    changePassword: (token: string, oldPassword: string, newPassword: string) =>
      apiRequest('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ token, oldPassword, newPassword }),
      }),
    updatePhone: (token: string, phone: string) =>
      apiRequest('/api/auth/update-phone', {
        method: 'POST',
        body: JSON.stringify({ token, phone }),
      }),
    updateEmail: (token: string, email: string) =>
      apiRequest('/api/auth/update-email', {
        method: 'POST',
        body: JSON.stringify({ token, email }),
      }),
    sendPhoneCode: (phone: string) =>
      apiRequest('/api/auth/send-phone-code', {
        method: 'POST',
        body: JSON.stringify({ phone }),
      }),
    signInWithPhone: (phone: string, code: string) =>
      apiRequest('/api/auth/sign-in-phone', {
        method: 'POST',
        body: JSON.stringify({ phone, code }),
      }),
    getWechatAuthUrl: () => apiRequest('/api/auth/wechat/auth-url'),
    wechatCallback: (code: string) =>
      apiRequest('/api/auth/wechat/callback', {
        method: 'POST',
        body: JSON.stringify({ code }),
      }),
    getWechatConfigStatus: () => apiRequest('/api/auth/wechat/config-status'),
  },

  user: {
    getProfile: (userId: string) => apiRequest(`/api/user/profile/${userId}`),
    updateProfile: (userId: string, updates: any) =>
      apiRequest(`/api/user/profile/${userId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      }),
    getAllUsers: () => apiRequest('/api/user/all-internal'),
    updateLevel: (userId: string, userLevel: string) =>
      apiRequest(`/api/user/level/${userId}`, {
        method: 'PUT',
        body: JSON.stringify({ userLevel }),
      }),
    updateRole: (userId: string, role: string) =>
      apiRequest(`/api/user/role/${userId}`, {
        method: 'PUT',
        body: JSON.stringify({ role }),
      }),
  },

  membership: {
    getPackages: () => apiRequest('/api/membership/packages'),
    purchasePackage: (userId: string, packageId: string, userLevel: string) =>
      apiRequest('/api/membership/purchase', {
        method: 'POST',
        body: JSON.stringify({ userId, packageId, userLevel }),
      }),
    getUserPurchases: (userId: string, limit?: number, offset?: number) => {
      const params = new URLSearchParams()
      if (limit) params.set('limit', String(limit))
      if (offset) params.set('offset', String(offset))
      const query = params.toString()
      return apiRequest(`/api/membership/purchases/${userId}${query ? `?${query}` : ''}`)
    },
  },

  usage: {
    startSession: (userId: string, sessionType: string, preparationId?: string) =>
      apiRequest('/api/usage/start-session', {
        method: 'POST',
        body: JSON.stringify({ userId, sessionType, preparationId }),
      }),
    endSession: (sessionId: string, minutesUsed: number) =>
      apiRequest('/api/usage/end-session', {
        method: 'POST',
        body: JSON.stringify({ sessionId, minutesUsed }),
      }),
    getUserRecords: (userId: string, limit?: number, offset?: number) => {
      const params = new URLSearchParams()
      if (limit) params.set('limit', String(limit))
      if (offset) params.set('offset', String(offset))
      const query = params.toString()
      return apiRequest(`/api/usage/records/${userId}${query ? `?${query}` : ''}`)
    },
    getAllRecords: () => apiRequest('/api/usage/all-records'),
  },

  preparation: {
    getAll: (userId?: string) =>
      userId ? apiRequest(`/api/preparation/user/${userId}`) : apiRequest('/api/preparation/all'),
    getById: (id: string) => apiRequest(`/api/preparation/item/${id}`),
    create: (preparation: any) =>
      apiRequest('/api/preparation/create', {
        method: 'POST',
        body: JSON.stringify(preparation),
      }),
    update: (id: string, preparation: any) =>
      apiRequest(`/api/preparation/item/${id}`, {
        method: 'PUT',
        body: JSON.stringify(preparation),
      }),
    delete: (id: string) =>
      apiRequest(`/api/preparation/item/${id}`, {
        method: 'DELETE',
      }),
  },

  payment: {
    createOrder: (userId: string, packageId: string, channel?: string) =>
      apiRequest<PaymentOrderData>('/api/payment/create-order-internal', {
        method: 'POST',
        body: JSON.stringify({ userId, packageId, channel }),
      }),
    queryOrder: (orderNo: string) =>
      apiRequest<PaymentOrderData>(`/api/payment/query-internal/${orderNo}`),
    getUserOrders: (userId: string) =>
      apiRequest<PaymentOrdersResponse>(`/api/payment/orders-internal/${userId}`),
    processSuccess: (orderNo: string, tradeNo?: string, paidAt?: Date) =>
      apiRequest('/api/payment/process-success', {
        method: 'POST',
        body: JSON.stringify({ orderNo, tradeNo, paidAt }),
      }),
  },

  settings: {
    getAiConfigFull: () => apiRequest('/api/settings/ai-config-full'),
    checkAiConfig: () => apiRequest('/api/settings/check-ai-config'),
    getPaymentConfig: () => apiRequest('/api/settings/payment-config'),
    getSmsConfig: (token: string) =>
      apiRequest('/api/settings/sms-config', {
        headers: { Authorization: `Bearer ${token}` },
      }),
    updateSmsConfig: (token: string, config: any) =>
      apiRequest('/api/settings/sms-config', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(config),
      }),
    getWechatLoginConfig: (token: string) =>
      apiRequest('/api/settings/wechat-login-config', {
        headers: { Authorization: `Bearer ${token}` },
      }),
    updateWechatLoginConfig: (token: string, config: any) =>
      apiRequest('/api/settings/wechat-login-config', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(config),
      }),
  },
}
