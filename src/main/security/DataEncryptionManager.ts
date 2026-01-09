import * as crypto from 'crypto'
import { createLogger } from '../utils/logging'

const toErrorMetadata = (error: unknown): Record<string, any> => ({
  error: error instanceof Error ? { message: error.message, stack: error.stack } : String(error),
})

/**
 * 加密数据结构
 */
export interface EncryptedData {
  data: string
  algorithm: string
  version: string
}

/**
 * 数据加密管理器
 * 负责敏感数据的加密存储和解密读取
 */
export class DataEncryptionManager {
  private logger = createLogger('data-encryption')
  private readonly ALGORITHM = 'aes-256-gcm'
  private readonly KEY_LENGTH = 32
  private readonly IV_LENGTH = 16
  private readonly TAG_LENGTH = 16
  private readonly VERSION = '1.0'
  private readonly AAD = Buffer.from('bready-app-v1')

  constructor() {}

  /**
   * 加密数据
   * @param data 待加密的数据
   * @param password 加密密码
   */
  encrypt(data: string, password: string): EncryptedData {
    try {
      // 派生加密密钥
      const key = this.deriveKey(password)

      // 生成随机初始化向量
      const iv = crypto.randomBytes(this.IV_LENGTH)

      // 创建加密器
      const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv)
      cipher.setAAD(this.AAD)

      // 加密数据
      let encrypted = cipher.update(data, 'utf8', 'hex')
      encrypted += cipher.final('hex')

      // 获取认证标签
      const tag = cipher.getAuthTag()

      // 组合结果：IV + TAG + 加密数据
      const result = iv.toString('hex') + tag.toString('hex') + encrypted

      this.logger.debug('数据加密成功')

      return {
        data: result,
        algorithm: this.ALGORITHM,
        version: this.VERSION,
      }
    } catch (error) {
      this.logger.error('数据加密失败:', toErrorMetadata(error))
      throw new Error('数据加密失败')
    }
  }

  /**
   * 解密数据
   * @param encryptedData 加密数据结构
   * @param password 解密密码
   */
  decrypt(encryptedData: EncryptedData, password: string): string {
    try {
      // 验证版本兼容性
      if (encryptedData.version !== this.VERSION) {
        throw new Error(`不支持的加密版本: ${encryptedData.version}`)
      }

      // 验证算法
      if (encryptedData.algorithm !== this.ALGORITHM) {
        throw new Error(`不支持的加密算法: ${encryptedData.algorithm}`)
      }

      // 派生解密密钥
      const key = this.deriveKey(password)

      const data = encryptedData.data

      // 提取IV、认证标签和加密数据
      const iv = Buffer.from(data.slice(0, this.IV_LENGTH * 2), 'hex')
      const tag = Buffer.from(
        data.slice(this.IV_LENGTH * 2, (this.IV_LENGTH + this.TAG_LENGTH) * 2),
        'hex',
      )
      const encrypted = data.slice((this.IV_LENGTH + this.TAG_LENGTH) * 2)

      try {
        const decipher = crypto.createDecipheriv(this.ALGORITHM, key, iv) as crypto.DecipherGCM
        const decrypted = this.decryptPayload(decipher, encrypted, tag, true)
        this.logger.debug('数据解密成功')
        return decrypted
      } catch (error) {
        this.logger.warn('数据解密失败，尝试兼容旧格式（无 AAD）', toErrorMetadata(error))
        const legacyDecipher = crypto.createDecipheriv(
          this.ALGORITHM,
          key,
          iv,
        ) as crypto.DecipherGCM
        const decrypted = this.decryptPayload(legacyDecipher, encrypted, tag, false)
        this.logger.debug('数据解密成功（兼容旧格式）')
        return decrypted
      }
    } catch (error) {
      this.logger.error('数据解密失败:', toErrorMetadata(error))
      throw new Error('数据解密失败')
    }
  }

  /**
   * 加密JSON对象
   * @param obj 待加密的对象
   * @param password 加密密码
   */
  encryptObject(obj: any, password: string): EncryptedData {
    try {
      const jsonString = JSON.stringify(obj)
      return this.encrypt(jsonString, password)
    } catch (error) {
      this.logger.error('对象加密失败:', toErrorMetadata(error))
      throw new Error('对象加密失败')
    }
  }

  /**
   * 解密JSON对象
   * @param encryptedData 加密数据
   * @param password 解密密码
   */
  decryptObject<T = any>(encryptedData: EncryptedData, password: string): T {
    try {
      const jsonString = this.decrypt(encryptedData, password)
      return JSON.parse(jsonString)
    } catch (error) {
      this.logger.error('对象解密失败:', toErrorMetadata(error))
      throw new Error('对象解密失败')
    }
  }

  /**
   * 生成安全随机密码
   * @param length 密码长度
   */
  generateSecurePassword(length: number = 32): string {
    return crypto.randomBytes(length).toString('base64')
  }

  /**
   * 生成密码哈希（用于密码验证）
   * @param password 原始密码
   */
  hashPassword(password: string): string {
    const salt = crypto.randomBytes(16)
    const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha256')
    return salt.toString('hex') + ':' + hash.toString('hex')
  }

  /**
   * 验证密码哈希
   * @param password 原始密码
   * @param hashedPassword 哈希密码
   */
  verifyPassword(password: string, hashedPassword: string): boolean {
    try {
      const [saltHex, hashHex] = hashedPassword.split(':')
      const salt = Buffer.from(saltHex, 'hex')
      const hash = Buffer.from(hashHex, 'hex')

      const computedHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha256')

      return crypto.timingSafeEqual(hash, computedHash)
    } catch (error) {
      this.logger.error('密码验证失败:', toErrorMetadata(error))
      return false
    }
  }

  /**
   * 派生加密密钥
   * @param password 原始密码
   */
  private deriveKey(password: string): Buffer {
    // 使用固定盐值（在实际应用中可以考虑使用动态盐值）
    const salt = Buffer.from('bready-encryption-salt-2024', 'utf8')

    // 使用PBKDF2派生密钥
    return crypto.pbkdf2Sync(password, salt, 100000, this.KEY_LENGTH, 'sha256')
  }

  private decryptPayload(
    decipher: crypto.DecipherGCM,
    encrypted: string,
    tag: Buffer,
    useAAD: boolean,
  ): string {
    if (useAAD) {
      decipher.setAAD(this.AAD)
    }
    decipher.setAuthTag(tag)

    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  }

  /**
   * 生成数据指纹
   * @param data 数据
   */
  generateFingerprint(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16)
  }

  /**
   * 验证数据完整性
   * @param data 数据
   * @param expectedFingerprint 期望的指纹
   */
  verifyIntegrity(data: string, expectedFingerprint: string): boolean {
    const actualFingerprint = this.generateFingerprint(data)
    return actualFingerprint === expectedFingerprint
  }

  /**
   * 安全清除内存中的敏感数据
   * @param sensitiveString 敏感字符串
   */
  secureClear(sensitiveString: string): void {
    // JavaScript中无法直接清除内存，但可以覆盖变量
    // 这更多是一个提醒开发者注意敏感数据处理
    if (sensitiveString) {
      // 用随机数据覆盖
      const randomData = crypto.randomBytes(sensitiveString.length).toString('hex')
      sensitiveString = randomData
    }
  }

  /**
   * 获取加密统计信息
   */
  getEncryptionStats(): {
    algorithm: string
    keyLength: number
    ivLength: number
    tagLength: number
    version: string
  } {
    return {
      algorithm: this.ALGORITHM,
      keyLength: this.KEY_LENGTH,
      ivLength: this.IV_LENGTH,
      tagLength: this.TAG_LENGTH,
      version: this.VERSION,
    }
  }
}
