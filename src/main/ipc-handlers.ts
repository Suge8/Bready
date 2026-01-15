import { app, ipcMain, IpcMainEvent, IpcMainInvokeEvent } from 'electron'
import { randomInt } from 'crypto'
import { api } from './utils/api-client'
import { createLogger } from './utils/logging'

const logger = createLogger('ipc-handlers')
const devRendererOrigin = (() => {
  if (!app.isPackaged && process.env.ELECTRON_RENDERER_URL) {
    try {
      return new URL(process.env.ELECTRON_RENDERER_URL).origin
    } catch {
      return null
    }
  }
  return null
})()

function getSenderUrl(event: IpcMainInvokeEvent | IpcMainEvent): string | undefined {
  return event.senderFrame?.url || event.sender?.getURL?.()
}

function isTrustedSender(event: IpcMainInvokeEvent | IpcMainEvent): boolean {
  const senderUrl = getSenderUrl(event)
  if (!senderUrl) return false

  if (devRendererOrigin) {
    try {
      return new URL(senderUrl).origin === devRendererOrigin
    } catch {
      return false
    }
  }

  return senderUrl.startsWith('file://') || senderUrl.startsWith('app://')
}

let ipcValidationEnabled = false

function enableIpcValidation(): void {
  if (ipcValidationEnabled) return

  const originalHandle = ipcMain.handle.bind(ipcMain)
  const originalOn = ipcMain.on.bind(ipcMain)

  ipcMain.handle = (channel: string, listener: any) => {
    const securedListener = async (event: IpcMainInvokeEvent, ...args: any[]) => {
      if (!isTrustedSender(event)) {
        logger.warn('未授权 IPC 调用', { channel, url: getSenderUrl(event) })
        throw new Error('未授权的IPC调用来源')
      }

      return await listener(event, ...args)
    }

    return originalHandle(channel, securedListener)
  }

  ipcMain.on = (channel: string, listener: any) => {
    const securedListener = (event: IpcMainEvent, ...args: any[]) => {
      if (!isTrustedSender(event)) {
        logger.warn('未授权 IPC 事件', { channel, url: getSenderUrl(event) })
        return
      }

      return listener(event, ...args)
    }

    return originalOn(channel, securedListener)
  }

  ipcValidationEnabled = true
  logger.info('IPC sender 校验已启用')
}

type PagedRequest = {
  userId: string
  limit?: number
  offset?: number
}

function normalizePagedRequest(payload: string | PagedRequest): PagedRequest {
  if (typeof payload === 'string') {
    return { userId: payload }
  }
  return payload
}

type AuthUser = { id: string } & Record<string, unknown>

const phoneCodeStore = new Map<string, { code: string; expiresAt: number; lastSentAt: number }>()
const PHONE_CODE_TTL_MS = 5 * 60 * 1000
const PHONE_CODE_COOLDOWN_MS = 60 * 1000

async function getUserFromToken(token?: string): Promise<AuthUser> {
  if (!token) {
    throw new Error('未登录')
  }
  const result = await api.auth.verifySession(token)
  if (result.error || !result.data) {
    throw new Error('会话已失效，请重新登录')
  }
  return result.data
}

function isValidPhone(phone: string): boolean {
  return /^1\d{10}$/.test(phone)
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function purgeExpiredPhoneCodes(now: number): void {
  for (const [key, entry] of phoneCodeStore.entries()) {
    if (entry.expiresAt <= now) {
      phoneCodeStore.delete(key)
    }
  }
}

export function setupAuthHandlers(): void {
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
    logger.debug('auth:sign-in called', { email })
    try {
      const result = await api.auth.signIn(email, password)
      if (result.error) throw new Error(result.error)
      logger.info('auth:sign-in success')
      return result.data
    } catch (error: any) {
      logger.error('auth:sign-in error', { error: error.message })
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
        logger.debug('手机验证码', { phone: trimmedPhone, code })
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

  ipcMain.handle('auth:send-email-code', async (event, { email }) => {
    void event
    try {
      const trimmedEmail = String(email || '')
        .trim()
        .toLowerCase()
      if (!isValidEmail(trimmedEmail)) {
        return { success: false, error: '邮箱格式不正确' }
      }
      const result = await api.auth.sendEmailCode(trimmedEmail)
      if (result.error) return { success: false, error: result.error }
      return result.data || { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('auth:verify-email-code', async (event, { email, code }) => {
    void event
    try {
      const trimmedEmail = String(email || '')
        .trim()
        .toLowerCase()
      if (!isValidEmail(trimmedEmail)) {
        return { success: false, error: '邮箱格式不正确' }
      }
      const result = await api.auth.verifyEmailCode(trimmedEmail, code)
      if (result.error) return { success: false, error: result.error }
      return result.data || { success: true }
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

  ipcMain.handle('auth:google-auth-url', async (event) => {
    void event
    try {
      const result = await api.auth.getGoogleAuthUrl()
      if (result.error) return { success: false, error: result.error }
      return { success: true, data: result.data }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('auth:google-callback', async (event, { code }) => {
    void event
    try {
      const result = await api.auth.googleCallback(code)
      if (result.error) throw new Error(result.error)
      return result.data
    } catch (error: any) {
      throw new Error(error.message)
    }
  })

  ipcMain.handle('auth:google-config-status', async (event) => {
    void event
    try {
      const result = await api.auth.getGoogleConfigStatus()
      return result.data || { enabled: false }
    } catch {
      return { enabled: false }
    }
  })

  ipcMain.handle('auth:login-config-public', async (event) => {
    void event
    try {
      const result = await api.settings.getLoginConfigPublic()
      return result.data || { email: true, phone: false, wechat: false, google: false }
    } catch {
      return { email: true, phone: false, wechat: false, google: false }
    }
  })

  ipcMain.handle('auth:forgot-password', async (event, { email }) => {
    void event
    try {
      const result = await api.auth.forgotPassword(email)
      if (result.error) return { success: false, error: result.error }
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })
}

export function setupUserHandlers(): void {
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

  ipcMain.handle('user:delete', async (event, { userId, token }) => {
    void event
    try {
      const result = await api.user.delete(userId, token)
      if (result.error) throw new Error(result.error)
      return result.success
    } catch (error: any) {
      throw new Error(error.message)
    }
  })
}

export function setupMembershipHandlers(): void {
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

export function setupUsageHandlers(): void {
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

  ipcMain.handle('collab:start', async (event, { userId }) => {
    void event
    try {
      const result = await api.collab.start(userId)
      if (result.error) throw new Error(result.error)
      return result.data
    } catch (error: any) {
      throw new Error(error.message)
    }
  })

  ipcMain.handle('collab:heartbeat', async (event, { sessionId }) => {
    void event
    try {
      const result = await api.collab.heartbeat(sessionId)
      if (result.error) throw new Error(result.error)
      return result.data
    } catch (error: any) {
      throw new Error(error.message)
    }
  })

  ipcMain.handle('collab:end', async (event, { sessionId, reason }) => {
    void event
    try {
      const result = await api.collab.end(sessionId, reason)
      if (result.error) throw new Error(result.error)
      return result.data
    } catch (error: any) {
      throw new Error(error.message)
    }
  })
}

export function setupPreparationHandlers(): void {
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

export async function setupAllHandlers() {
  enableIpcValidation()

  await Promise.all([
    import('./ipc-handlers/window-handlers'),
    import('./ipc-handlers/gemini-handlers'),
    import('./ipc-handlers/audio-handlers'),
    import('./ipc-handlers/permission-handlers'),
    import('./ipc-handlers/debug-handlers'),
    import('./ipc-handlers/settings-handlers'),
    import('./ipc-handlers/payment-handlers'),
    import('./ipc-handlers/shortcut-handlers'),
  ])

  setupAuthHandlers()
  setupUserHandlers()
  setupMembershipHandlers()
  setupUsageHandlers()
  setupPreparationHandlers()
}
