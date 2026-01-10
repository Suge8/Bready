import crypto from 'crypto'
import {
  type PaymentService,
  type CreateOrderParams,
  type CreateOrderResult,
  type QueryOrderResult,
  type NotifyResult,
  type WechatConfig,
} from './types'

function generateNonce(): string {
  return crypto.randomBytes(16).toString('hex')
}

function generateSignature(
  method: string,
  url: string,
  timestamp: string,
  nonce: string,
  body: string,
  privateKey: string,
): string {
  const message = `${method}\n${url}\n${timestamp}\n${nonce}\n${body}\n`
  const sign = crypto.createSign('RSA-SHA256')
  sign.update(message)
  return sign.sign(privateKey, 'base64')
}

function buildAuthHeader(
  mchid: string,
  certSerial: string,
  signature: string,
  timestamp: string,
  nonce: string,
): string {
  return `WECHATPAY2-SHA256-RSA2048 mchid="${mchid}",nonce_str="${nonce}",signature="${signature}",timestamp="${timestamp}",serial_no="${certSerial}"`
}

export class WechatPayService implements PaymentService {
  private config: WechatConfig
  private baseUrl = 'https://api.mch.weixin.qq.com'

  constructor(config: WechatConfig) {
    this.config = config
  }

  private async request(method: string, path: string, body?: object): Promise<any> {
    const timestamp = Math.floor(Date.now() / 1000).toString()
    const nonce = generateNonce()
    const bodyStr = body ? JSON.stringify(body) : ''

    const signature = generateSignature(
      method,
      path,
      timestamp,
      nonce,
      bodyStr,
      this.config.privateKey,
    )
    const authHeader = buildAuthHeader(
      this.config.mchid,
      this.config.certSerial,
      signature,
      timestamp,
      nonce,
    )

    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: authHeader,
      },
      body: bodyStr || undefined,
      signal: AbortSignal.timeout(15000),
    })

    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.message || `HTTP ${response.status}`)
    }
    return data
  }

  async createOrder(params: CreateOrderParams): Promise<CreateOrderResult> {
    try {
      const data = await this.request('POST', '/v3/pay/transactions/native', {
        appid: this.config.appid,
        mchid: this.config.mchid,
        description: params.productName,
        out_trade_no: params.orderNo,
        notify_url: this.config.notifyUrl,
        amount: {
          total: Math.round(params.amount * 100),
          currency: 'CNY',
        },
      })

      return {
        success: true,
        orderNo: params.orderNo,
        qrcodeUrl: data.code_url,
      }
    } catch (err: any) {
      return {
        success: false,
        orderNo: params.orderNo,
        error: err.message || '创建订单失败',
      }
    }
  }

  async queryOrder(orderNo: string): Promise<QueryOrderResult> {
    try {
      const data = await this.request(
        'GET',
        `/v3/pay/transactions/out-trade-no/${orderNo}?mchid=${this.config.mchid}`,
      )

      let status: QueryOrderResult['status'] = 'pending'
      if (data.trade_state === 'SUCCESS') status = 'paid'
      else if (data.trade_state === 'CLOSED' || data.trade_state === 'REVOKED') status = 'failed'
      else if (data.trade_state === 'REFUND') status = 'refunded'

      return {
        success: true,
        orderNo: data.out_trade_no,
        tradeNo: data.transaction_id,
        status,
        paidAt: data.success_time ? new Date(data.success_time) : undefined,
      }
    } catch (err: any) {
      return {
        success: false,
        orderNo,
        status: 'pending',
        error: err.message || '查询失败',
      }
    }
  }

  async verifyNotify(data: {
    resource: any
    headers: Record<string, string>
  }): Promise<NotifyResult> {
    try {
      const { resource } = data
      const decrypted = this.decryptResource(resource)

      const isPaid = decrypted.trade_state === 'SUCCESS'

      return {
        success: true,
        orderNo: decrypted.out_trade_no,
        tradeNo: decrypted.transaction_id,
        amount: decrypted.amount?.total ? decrypted.amount.total / 100 : 0,
        status: isPaid ? 'paid' : 'pending',
        rawData: decrypted,
      }
    } catch {
      return {
        success: false,
        orderNo: '',
        status: 'failed',
      }
    }
  }

  private decryptResource(resource: {
    ciphertext: string
    nonce: string
    associated_data: string
  }): any {
    const { ciphertext, nonce, associated_data } = resource
    const key = Buffer.from(this.config.apiKey)
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(nonce))
    decipher.setAAD(Buffer.from(associated_data))

    const ciphertextBuffer = Buffer.from(ciphertext, 'base64')
    const authTag = ciphertextBuffer.subarray(-16)
    const encryptedData = ciphertextBuffer.subarray(0, -16)

    decipher.setAuthTag(authTag)
    const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()])
    return JSON.parse(decrypted.toString('utf8'))
  }
}
