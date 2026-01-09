import { safeStorage } from 'electron'
import * as crypto from 'crypto'
import * as path from 'path'
import * as fs from 'fs/promises'
import { createLogger } from '../utils/logging'

const toErrorMetadata = (error: unknown): Record<string, any> => ({
  error: error instanceof Error ? { message: error.message, stack: error.stack } : String(error),
})

/**
 * 安全密钥管理器
 * 负责API密钥的安全存储、获取和管理
 */
export class SecureKeyManager {
  private logger = createLogger('secure-key')
  private keyCache: Map<string, { value: string; timestamp: number }> = new Map()
  private readonly CACHE_TTL = 3600000 // 1小时缓存过期时间

  constructor() {}

  /**
   * 安全存储API密钥
   * @param keyName 密钥名称
   * @param apiKey API密钥值
   */
  async storeApiKey(keyName: string, apiKey: string): Promise<void> {
    try {
      // 检查系统是否支持安全存储
      if (!safeStorage.isEncryptionAvailable()) {
        throw new Error('系统不支持安全存储功能')
      }

      // 验证密钥格式
      if (!this.validateApiKey(keyName, apiKey)) {
        throw new Error(`API密钥格式无效: ${keyName}`)
      }

      // 使用系统安全存储加密密钥
      const encryptedKey = safeStorage.encryptString(apiKey)
      const keyPath = await this.getSecureKeyPath(keyName)

      // 写入加密文件
      await this.writeSecureFile(keyPath, encryptedKey)

      // 更新内存缓存
      this.keyCache.set(keyName, {
        value: apiKey,
        timestamp: Date.now(),
      })

      this.logger.info(`API密钥 ${keyName} 已安全存储`)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.logger.error(`存储API密钥失败 [${keyName}]:`, toErrorMetadata(error))
      throw new Error(`密钥存储失败: ${message}`)
    }
  }

  /**
   * 安全获取API密钥
   * @param keyName 密钥名称
   * @returns API密钥值或null
   */
  async getApiKey(keyName: string): Promise<string | null> {
    try {
      // 检查缓存是否有效
      const cached = this.keyCache.get(keyName)
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.value
      }

      // 从安全存储读取
      const keyPath = await this.getSecureKeyPath(keyName)
      const encryptedKey = await this.readSecureFile(keyPath)

      if (!encryptedKey) {
        this.logger.warn(`API密钥不存在: ${keyName}`)
        return null
      }

      // 解密密钥
      const decryptedKey = safeStorage.decryptString(encryptedKey)

      // 更新缓存
      this.keyCache.set(keyName, {
        value: decryptedKey,
        timestamp: Date.now(),
      })

      return decryptedKey
    } catch (error) {
      this.logger.error(`获取API密钥失败 [${keyName}]:`, toErrorMetadata(error))
      return null
    }
  }

  /**
   * 删除API密钥
   * @param keyName 密钥名称
   */
  async deleteApiKey(keyName: string): Promise<void> {
    try {
      const keyPath = await this.getSecureKeyPath(keyName)

      // 删除文件
      try {
        await fs.unlink(keyPath)
      } catch (error: any) {
        if (error.code !== 'ENOENT') {
          throw error
        }
      }

      // 清除缓存
      this.keyCache.delete(keyName)

      this.logger.info(`API密钥 ${keyName} 已删除`)
    } catch (error) {
      this.logger.error(`删除API密钥失败 [${keyName}]:`, toErrorMetadata(error))
      throw error
    }
  }

  /**
   * 检查API密钥是否存在
   * @param keyName 密钥名称
   */
  async hasApiKey(keyName: string): Promise<boolean> {
    try {
      const keyPath = await this.getSecureKeyPath(keyName)
      await fs.access(keyPath)
      return true
    } catch {
      return false
    }
  }

  /**
   * 获取所有存储的密钥名称
   */
  async getAllKeyNames(): Promise<string[]> {
    try {
      const secureDir = await this.getSecureDirectory()
      const files = await fs.readdir(secureDir)

      return files.filter((file) => file.endsWith('.key')).map((file) => file.replace('.key', ''))
    } catch (error) {
      this.logger.error('获取密钥列表失败:', toErrorMetadata(error))
      return []
    }
  }

  /**
   * 清理过期缓存
   */
  cleanupCache(): void {
    const now = Date.now()
    for (const [keyName, cached] of this.keyCache.entries()) {
      if (now - cached.timestamp > this.CACHE_TTL) {
        this.keyCache.delete(keyName)
      }
    }
  }

  /**
   * 清空所有缓存
   */
  clearCache(): void {
    this.keyCache.clear()
    this.logger.info('API密钥缓存已清理')
  }

  /**
   * 验证API密钥格式
   * @param keyName 密钥名称
   * @param apiKey API密钥值
   */
  private validateApiKey(keyName: string, apiKey: string): boolean {
    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
      return false
    }

    switch (keyName) {
      case 'GEMINI_API_KEY':
        // Gemini API密钥格式: AIza开头，后跟35个字符
        return /^AIza[0-9A-Za-z-_]{35}$/.test(apiKey)

      case 'SUPABASE_ANON_KEY':
        // Supabase匿名密钥格式检查
        return apiKey.length > 100 && apiKey.includes('.')

      default:
        // 通用验证：至少8个字符
        return apiKey.length >= 8
    }
  }

  /**
   * 获取安全密钥存储路径
   * @param keyName 密钥名称
   */
  private async getSecureKeyPath(keyName: string): Promise<string> {
    const secureDir = await this.getSecureDirectory()
    return path.join(secureDir, `${keyName}.key`)
  }

  /**
   * 获取安全存储目录
   */
  private async getSecureDirectory(): Promise<string> {
    const { app } = require('electron')
    const userDataPath = app.getPath('userData')
    const secureDir = path.join(userDataPath, '.secure')

    // 确保目录存在且权限正确
    try {
      await fs.mkdir(secureDir, { recursive: true, mode: 0o700 })
    } catch (error: any) {
      if (error.code !== 'EEXIST') {
        throw error
      }
    }

    return secureDir
  }

  /**
   * 安全文件写入
   * @param filePath 文件路径
   * @param data 数据
   */
  private async writeSecureFile(filePath: string, data: Buffer): Promise<void> {
    // 确保目录存在
    const dir = path.dirname(filePath)
    await fs.mkdir(dir, { recursive: true, mode: 0o700 })

    // 写入文件，设置仅用户可读写权限
    await fs.writeFile(filePath, data, { mode: 0o600 })
  }

  /**
   * 安全文件读取
   * @param filePath 文件路径
   */
  private async readSecureFile(filePath: string): Promise<Buffer | null> {
    try {
      return await fs.readFile(filePath)
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return null // 文件不存在
      }
      throw error
    }
  }

  /**
   * 生成密钥指纹用于验证
   * @param apiKey API密钥
   */
  generateKeyFingerprint(apiKey: string): string {
    return crypto.createHash('sha256').update(apiKey).digest('hex').substring(0, 16)
  }

  /**
   * 获取密钥统计信息
   */
  async getKeyStats(): Promise<{
    totalKeys: number
    cacheSize: number
    lastAccessed: Record<string, number>
  }> {
    const keyNames = await this.getAllKeyNames()
    const lastAccessed: Record<string, number> = {}

    for (const [keyName, cached] of this.keyCache.entries()) {
      lastAccessed[keyName] = cached.timestamp
    }

    return {
      totalKeys: keyNames.length,
      cacheSize: this.keyCache.size,
      lastAccessed,
    }
  }
}
