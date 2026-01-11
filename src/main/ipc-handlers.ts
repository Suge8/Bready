import { ipcMain } from 'electron'
import { randomInt } from 'crypto'
import { api } from './utils/api-client'

import './ipc-handlers/window-handlers'
import './ipc-handlers/gemini-handlers'
import './ipc-handlers/audio-handlers'
import './ipc-handlers/permission-handlers'
import './ipc-handlers/debug-handlers'
import './ipc-handlers/settings-handlers'
import './ipc-handlers/payment-handlers'

type PagedRequest = {
  userId: string
  limit?: number
  offset?: number
}

const normalizePagedRequest = (payload: string | PagedRequest): PagedRequest => {
  if (typeof payload === 'string') {
    return { userId: payload }
  }
  return payload
}

const phoneCodeStore = new Map<string, { code: string; expiresAt: number; lastSentAt: number }>()
const PHONE_CODE_TTL_MS = 5 * 60 * 1000
const PHONE_CODE_COOLDOWN_MS = 60 * 1000

const getUserFromToken = async (token?: string) => {
  if (!token) {
    throw new Error('未登录')
  }
  const result = await api.auth.verifySession(token)
  if (result.error || !result.data) {
    throw new Error('会话已失效，请重新登录')
  }
  return result.data
}

const isValidPhone = (phone: string) => /^1\d{10}$/.test(phone)
const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

const purgeExpiredPhoneCodes = (now: number) => {
  for (const [key, entry] of phoneCodeStore.entries()) {
    if (entry.expiresAt <= now) {
      phoneCodeStore.delete(key)
    }
  }
}

export function setupAuthHandlers() {
  ipcMain.handle('auth:sign-up', async (event, { email, password, userData }) => {
    void event
    try {
      const result = await api.auth.signUp(email, password, userData)
      if (result.error) throw new Error(result.error)
      return result.data
    } catch (error: any) {
      throw new Error(error.message)
    }
  })

  ipcMain.handle('auth:sign-in', async (event, { email, password }) => {
    void event
    console.log('🔐 IPC: auth:sign-in called with:', { email, password: '***' })
    try {
      const result = await api.auth.signIn(email, password)
      if (result.error) throw new Error(result.error)
      console.log('✅ IPC: auth:sign-in success')
      return result.data
    } catch (error: any) {
      console.error('❌ IPC: auth:sign-in error:', error.message)
      throw new Error(error.message)
    }
  })

  ipcMain.handle('auth:verify-session', async (event, token) => {
    void event
    try {
      const result = await api.auth.verifySession(token)
      return result.data || null
    } catch {
      return null
    }
  })

  ipcMain.handle('auth:sign-out', async (event, token) => {
    void event
    try {
      const result = await api.auth.signOut(token)
      if (result.error) throw new Error(result.error)
      return true
    } catch (error: any) {
      throw new Error(error.message)
    }
  })

  ipcMain.handle('auth:change-password', async (event, { token, oldPassword, newPassword }) => {
    void event
    try {
      await getUserFromToken(token)
      if (!oldPassword || !newPassword || newPassword.length < 6) {
        return { success: false, error: '新密码格式不正确' }
      }
      const result = await api.auth.changePassword(token, oldPassword, newPassword)
      if (result.error) return { success: false, error: result.error }
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('auth:send-phone-code', async (event, { token, phone }) => {
    void event
    try {
      const user = await getUserFromToken(token)
      const trimmedPhone = String(phone || '').trim()
      if (!isValidPhone(trimmedPhone)) {
        return { success: false, error: '手机号格式不正确' }
      }

      const now = Date.now()
      purgeExpiredPhoneCodes(now)

      const key = `${user.id}:${trimmedPhone}`
      const existing = phoneCodeStore.get(key)
      if (existing && now - existing.lastSentAt < PHONE_CODE_COOLDOWN_MS) {
        const remaining = Math.ceil((PHONE_CODE_COOLDOWN_MS - (now - existing.lastSentAt)) / 1000)
        return { success: false, error: `请稍后再试 (${remaining}s)`, cooldownSeconds: remaining }
      }

      const code = randomInt(100000, 1000000).toString()
      phoneCodeStore.set(key, {
        code,
        expiresAt: now + PHONE_CODE_TTL_MS,
        lastSentAt: now,
      })

      if (process.env.DEBUG_AUTH === '1') {
        console.log('📨 手机验证码:', trimmedPhone, code)
      }

      return { success: true, cooldownSeconds: Math.floor(PHONE_CODE_COOLDOWN_MS / 1000) }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('auth:bind-phone', async (event, { token, phone, code }) => {
    void event
    try {
      const user = await getUserFromToken(token)
      const trimmedPhone = String(phone || '').trim()
      if (!isValidPhone(trimmedPhone)) {
        return { success: false, error: '手机号格式不正确' }
      }

      purgeExpiredPhoneCodes(Date.now())
      const key = `${user.id}:${trimmedPhone}`
      const entry = phoneCodeStore.get(key)
      if (!entry || entry.expiresAt < Date.now()) {
        if (entry) phoneCodeStore.delete(key)
        return { success: false, error: '验证码已过期，请重新获取' }
      }
      if (String(code || '').trim() !== entry.code) {
        return { success: false, error: '验证码错误' }
      }

      const result = await api.auth.updatePhone(token, trimmedPhone)
      if (result.error) return { success: false, error: result.error }
      phoneCodeStore.delete(key)
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('auth:bind-email', async (event, { token, email }) => {
    void event
    try {
      await getUserFromToken(token)
      const trimmedEmail = String(email || '')
        .trim()
        .toLowerCase()
      if (!isValidEmail(trimmedEmail)) {
        return { success: false, error: '邮箱格式不正确' }
      }

      const result = await api.auth.updateEmail(token, trimmedEmail)
      if (result.error) return { success: false, error: result.error }
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('auth:send-login-code', async (event, { phone }) => {
    void event
    try {
      const trimmedPhone = String(phone || '').trim()
      if (!isValidPhone(trimmedPhone)) {
        return { success: false, error: '手机号格式不正确' }
      }
      const result = await api.auth.sendPhoneCode(trimmedPhone)
      if (result.error) return { success: false, error: result.error }
      return result.data || { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('auth:sign-in-phone', async (event, { phone, code }) => {
    void event
    try {
      const result = await api.auth.signInWithPhone(phone, code)
      if (result.error) throw new Error(result.error)
      return result.data
    } catch (error: any) {
      throw new Error(error.message)
    }
  })

  ipcMain.handle('auth:wechat-auth-url', async (event) => {
    void event
    try {
      const result = await api.auth.getWechatAuthUrl()
      if (result.error) return { success: false, error: result.error }
      return { success: true, data: result.data }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('auth:wechat-callback', async (event, { code }) => {
    void event
    try {
      const result = await api.auth.wechatCallback(code)
      if (result.error) throw new Error(result.error)
      return result.data
    } catch (error: any) {
      throw new Error(error.message)
    }
  })

  ipcMain.handle('auth:wechat-config-status', async (event) => {
    void event
    try {
      const result = await api.auth.getWechatConfigStatus()
      return result.data || { enabled: false }
    } catch {
      return { enabled: false }
    }
  })
}

export function setupUserHandlers() {
  ipcMain.handle('user:get-profile', async (event, userId) => {
    void event
    try {
      const result = await api.user.getProfile(userId)
      if (result.error) throw new Error(result.error)
      return result.data || null
    } catch (error: any) {
      throw new Error(error.message)
    }
  })

  ipcMain.handle('user:upsert-profile', async (event, profile) => {
    void event
    try {
      const { id, ...updateData } = profile
      const result = await api.user.updateProfile(id, updateData)
      if (result.error) throw new Error(result.error)
      return result.data
    } catch (error: any) {
      throw new Error(error.message)
    }
  })

  ipcMain.handle('user:get-all-users', async (event) => {
    void event
    try {
      const result = await api.user.getAllUsers()
      if (result.error) throw new Error(result.error)
      return result.data || []
    } catch (error: any) {
      throw new Error(error.message)
    }
  })

  ipcMain.handle('user:update-level', async (event, { userId, userLevel }) => {
    void event
    try {
      const result = await api.user.updateLevel(userId, userLevel)
      if (result.error) throw new Error(result.error)
      return result.data
    } catch (error: any) {
      throw new Error(error.message)
    }
  })

  ipcMain.handle('user:update-role', async (event, { userId, role }) => {
    void event
    try {
      const result = await api.user.updateRole(userId, role)
      if (result.error) throw new Error(result.error)
      return result.data
    } catch (error: any) {
      throw new Error(error.message)
    }
  })
}

export function setupMembershipHandlers() {
  ipcMain.handle('membership:get-packages', async (event) => {
    void event
    try {
      const result = await api.membership.getPackages()
      if (result.error) throw new Error(result.error)
      return result.data || []
    } catch (error: any) {
      throw new Error(error.message)
    }
  })

  ipcMain.handle('membership:purchase-package', async (event, { userId, packageId, userLevel }) => {
    void event
    try {
      const result = await api.membership.purchasePackage(userId, packageId, userLevel)
      if (result.error) throw new Error(result.error)
      return result.data
    } catch (error: any) {
      throw new Error(error.message)
    }
  })

  ipcMain.handle('membership:get-user-purchases', async (event, payload) => {
    void event
    try {
      const { userId, limit, offset } = normalizePagedRequest(payload)
      const result = await api.membership.getUserPurchases(userId, limit, offset)
      if (result.error) throw new Error(result.error)
      const records = Array.isArray(result.data) ? result.data : []
      return {
        records,
        hasMore: records.length === (limit || 20),
      }
    } catch (error: any) {
      throw new Error(error.message)
    }
  })
}

export function setupUsageHandlers() {
  ipcMain.handle('usage:start-session', async (event, { userId, sessionType, preparationId }) => {
    void event
    try {
      const result = await api.usage.startSession(userId, sessionType, preparationId)
      if (result.error) throw new Error(result.error)
      return result.data
    } catch (error: any) {
      throw new Error(error.message)
    }
  })

  ipcMain.handle('usage:end-session', async (event, { sessionId, minutesUsed }) => {
    void event
    try {
      const result = await api.usage.endSession(sessionId, minutesUsed)
      if (result.error) throw new Error(result.error)
      return result.data
    } catch (error: any) {
      throw new Error(error.message)
    }
  })

  ipcMain.handle('usage:get-user-records', async (event, payload) => {
    void event
    try {
      const { userId, limit, offset } = normalizePagedRequest(payload)
      const result = await api.usage.getUserRecords(userId, limit, offset)
      if (result.error) throw new Error(result.error)
      const records = Array.isArray(result.data) ? result.data : []
      return {
        records,
        hasMore: records.length === (limit || 20),
      }
    } catch (error: any) {
      throw new Error(error.message)
    }
  })

  ipcMain.handle('usage:get-all-records', async (event) => {
    void event
    try {
      const result = await api.usage.getAllRecords()
      if (result.error) throw new Error(result.error)
      return result.data || []
    } catch (error: any) {
      throw new Error(error.message)
    }
  })
}

export function setupPreparationHandlers() {
  ipcMain.handle('preparation:get-all', async (event, userId) => {
    void event
    try {
      const result = await api.preparation.getAll(userId)
      if (result.error) throw new Error(result.error)
      return result.data || []
    } catch (error: any) {
      throw new Error(error.message)
    }
  })

  ipcMain.handle('preparation:get-by-id', async (event, id) => {
    void event
    try {
      const result = await api.preparation.getById(id)
      return result.data || null
    } catch {
      return null
    }
  })

  ipcMain.handle('preparation:create', async (event, preparation) => {
    void event
    try {
      const result = await api.preparation.create(preparation)
      if (result.error) throw new Error(result.error)
      return result.data
    } catch (error: any) {
      throw new Error(error.message)
    }
  })

  ipcMain.handle('preparation:update', async (event, { id, preparation }) => {
    void event
    try {
      const result = await api.preparation.update(id, preparation)
      if (result.error) throw new Error(result.error)
      return result.data
    } catch (error: any) {
      throw new Error(error.message)
    }
  })

  ipcMain.handle('preparation:delete', async (event, id) => {
    void event
    try {
      const result = await api.preparation.delete(id)
      if (result.error) throw new Error(result.error)
      return true
    } catch (error: any) {
      throw new Error(error.message)
    }
  })
}

export function setupAllHandlers() {
  setupAuthHandlers()
  setupUserHandlers()
  setupMembershipHandlers()
  setupUsageHandlers()
  setupPreparationHandlers()
}
