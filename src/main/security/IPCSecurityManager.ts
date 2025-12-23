import * as crypto from 'crypto'
import { ipcMain, IpcMainInvokeEvent } from 'electron'
import { Logger } from '../utils/Logger'

/**
 * 安全IPC消息接口
 */
export interface SecureIPCMessage {
  payload: any
  timestamp: number
  signature: string
  nonce: string
}

/**
 * IPC安全管理器
 * 负责IPC通信的安全验证和消息完整性保护
 */
export class IPCSecurityManager {
  private logger: Logger
  private secretKey: string
  private messageCache: Set<string> = new Set()
  private readonly MESSAGE_TIMEOUT = 30000 // 30秒消息超时
  private readonly MAX_CACHE_SIZE = 1000 // 最大缓存消息数
  
  // 需要安全验证的IPC通道
  private readonly SECURE_CHANNELS = new Set([
    'auth:sign-in',
    'auth:sign-up', 
    'gemini:connect',
    'gemini:send-message',
    'db:save-preparation',
    'db:update-preparation',
    'db:delete-preparation'
  ])

  constructor() {
    this.logger = Logger.getInstance()
    this.secretKey = this.generateSecretKey()
    this.setupSecureHandlers()
    this.startCacheCleanup()
  }

  /**
   * 生成会话密钥
   */
  private generateSecretKey(): string {
    return crypto.randomBytes(32).toString('hex')
  }

  /**
   * 设置安全IPC处理器
   */
  private setupSecureHandlers(): void {
    // 保存原始的handle方法
    const originalHandle = ipcMain.handle.bind(ipcMain)
    
    // 重写handle方法，添加安全验证
    ipcMain.handle = (channel: string, listener: any) => {
      const secureListener = async (event: IpcMainInvokeEvent, ...args: any[]) => {
        try {
          // 验证消息来源
          if (!this.validateOrigin(event)) {
            this.logger.warn(`未授权的IPC调用来源: ${channel}`)
            throw new Error('未授权的IPC调用来源')
          }

          // 对安全通道进行额外验证
          if (this.SECURE_CHANNELS.has(channel)) {
            if (!args[0] || typeof args[0] !== 'object') {
              throw new Error('安全通道需要安全消息格式')
            }

            const validMessage = this.validateSecureMessage(args[0])
            if (!validMessage) {
              this.logger.warn(`IPC消息验证失败: ${channel}`)
              throw new Error('IPC消息验证失败')
            }
            
            // 替换为验证后的载荷
            args[0] = validMessage.payload
          }

          // 记录IPC调用
          this.logger.debug(`IPC调用: ${channel}`)

          // 调用原始处理器
          return await listener(event, ...args)
          
        } catch (error) {
          this.logger.error(`安全IPC调用失败 [${channel}]:`, error)
          throw error
        }
      }

      return originalHandle(channel, secureListener)
    }

    this.logger.info('IPC安全管理器已初始化')
  }

  /**
   * 创建安全消息
   * @param payload 消息载荷
   */
  createSecureMessage(payload: any): SecureIPCMessage {
    const timestamp = Date.now()
    const nonce = crypto.randomBytes(16).toString('hex')
    
    // 创建消息数据用于签名
    const messageData = JSON.stringify({ 
      payload, 
      timestamp, 
      nonce 
    })
    
    const signature = this.signMessage(messageData)

    return {
      payload,
      timestamp,
      signature,
      nonce
    }
  }

  /**
   * 验证安全消息
   * @param message 待验证的消息
   */
  private validateSecureMessage(message: SecureIPCMessage): SecureIPCMessage | null {
    try {
      // 检查消息格式
      if (!message || 
          typeof message !== 'object' ||
          !message.signature || 
          !message.timestamp || 
          !message.nonce ||
          message.payload === undefined) {
        this.logger.warn('IPC消息格式无效')
        return null
      }

      // 检查时间戳（防重放攻击）
      const now = Date.now()
      if (now - message.timestamp > this.MESSAGE_TIMEOUT) {
        this.logger.warn('IPC消息已过期')
        return null
      }

      if (message.timestamp > now + 5000) { // 允许5秒时钟偏差
        this.logger.warn('IPC消息时间戳异常')
        return null
      }

      // 检查nonce（防重放攻击）
      const messageId = `${message.timestamp}-${message.nonce}`
      if (this.messageCache.has(messageId)) {
        this.logger.warn('检测到IPC消息重放攻击')
        return null
      }

      // 验证消息签名
      const messageData = JSON.stringify({
        payload: message.payload,
        timestamp: message.timestamp,
        nonce: message.nonce
      })
      
      if (!this.verifySignature(messageData, message.signature)) {
        this.logger.warn('IPC消息签名验证失败')
        return null
      }

      // 缓存消息ID防止重放
      this.messageCache.add(messageId)
      
      return message
      
    } catch (error) {
      this.logger.error('IPC消息验证异常:', error)
      return null
    }
  }

  /**
   * 消息签名
   * @param message 消息内容
   */
  private signMessage(message: string): string {
    return crypto
      .createHmac('sha256', this.secretKey)
      .update(message)
      .digest('hex')
  }

  /**
   * 验证消息签名
   * @param message 消息内容
   * @param signature 签名
   */
  private verifySignature(message: string, signature: string): boolean {
    try {
      const expectedSignature = this.signMessage(message)
      
      // 使用时间安全的比较方法
      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      )
    } catch (error) {
      this.logger.error('签名验证异常:', error)
      return false
    }
  }

  /**
   * 验证消息来源
   * @param event IPC事件
   */
  private validateOrigin(event: IpcMainInvokeEvent): boolean {
    try {
      const sender = event.sender
      
      // 检查发送方是否有效
      if (!sender || sender.isDestroyed()) {
        return false
      }

      // 检查发送方是否为应用的渲染进程
      const url = sender.getURL()
      if (!url.startsWith('file://') && !url.startsWith('app://')) {
        this.logger.warn(`可疑的IPC调用来源: ${url}`)
        return false
      }

      return true
      
    } catch (error) {
      this.logger.error('验证IPC来源时发生错误:', error)
      return false
    }
  }

  /**
   * 启动缓存清理定时器
   */
  private startCacheCleanup(): void {
    // 每5分钟清理一次过期缓存
    setInterval(() => {
      this.cleanupMessageCache()
    }, 5 * 60 * 1000)
  }

  /**
   * 清理消息缓存
   */
  private cleanupMessageCache(): void {
    // 如果缓存过大，直接清空
    if (this.messageCache.size > this.MAX_CACHE_SIZE) {
      this.messageCache.clear()
      this.logger.info('IPC消息缓存已清理（超出大小限制）')
      return
    }

    // 这里可以实现更精细的清理逻辑
    // 由于Set不支持按时间清理，简单的做法是定期清空
    const cacheSize = this.messageCache.size
    if (cacheSize > this.MAX_CACHE_SIZE * 0.8) {
      this.messageCache.clear()
      this.logger.info(`IPC消息缓存已清理（清理前: ${cacheSize}）`)
    }
  }

  /**
   * 添加安全通道
   * @param channel 通道名称
   */
  addSecureChannel(channel: string): void {
    this.SECURE_CHANNELS.add(channel)
    this.logger.info(`已添加安全通道: ${channel}`)
  }

  /**
   * 移除安全通道
   * @param channel 通道名称
   */
  removeSecureChannel(channel: string): void {
    this.SECURE_CHANNELS.delete(channel)
    this.logger.info(`已移除安全通道: ${channel}`)
  }

  /**
   * 获取安全统计信息
   */
  getSecurityStats(): {
    secureChannels: number
    cachedMessages: number
    secretKeyLength: number
  } {
    return {
      secureChannels: this.SECURE_CHANNELS.size,
      cachedMessages: this.messageCache.size,
      secretKeyLength: this.secretKey.length
    }
  }

  /**
   * 重新生成密钥（用于密钥轮换）
   */
  rotateSecretKey(): void {
    const oldKeyLength = this.secretKey.length
    this.secretKey = this.generateSecretKey()
    
    // 清空消息缓存，因为旧签名将无效
    this.messageCache.clear()
    
    this.logger.info(`IPC密钥已轮换（旧密钥长度: ${oldKeyLength}，新密钥长度: ${this.secretKey.length}）`)
  }

  /**
   * 销毁安全管理器
   */
  destroy(): void {
    this.messageCache.clear()
    this.secretKey = ''
    this.logger.info('IPC安全管理器已销毁')
  }
}