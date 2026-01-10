import crypto from 'crypto'
import {
  type PaymentService,
  type CreateOrderParams,
  type CreateOrderResult,
  type QueryOrderResult,
  type NotifyResult,
  type AlipayConfig,
} from './types'

function formatPrivateKey(key: string): string {
  if (key.includes('-----BEGIN')) return key
  const formatted = key.replace(/(.{64})/g, '$1\n')
  return `-----BEGIN RSA PRIVATE KEY-----\n${formatted}\n-----END RSA PRIVATE KEY-----`
}

function formatPublicKey(key: string): string {
  if (key.includes('-----BEGIN')) return key
  const formatted = key.replace(/(.{64})/g, '$1\n')
  return `-----BEGIN PUBLIC KEY-----\n${formatted}\n-----END PUBLIC KEY-----`
}

function generateSign(params: Record<string, string>, privateKey: string): string {
  const sortedParams = Object.keys(params)
    .sort()
    .filter((k) => params[k] && k !== 'sign')
    .map((k) => `${k}=${params[k]}`)
    .join('&')

  const sign = crypto.createSign('RSA-SHA256')
  sign.update(sortedParams)
  return sign.sign(formatPrivateKey(privateKey), 'base64')
}

function verifySign(params: Record<string, string>, sign: string, publicKey: string): boolean {
  const sortedParams = Object.keys(params)
    .sort()
    .filter((k) => params[k] && k !== 'sign' && k !== 'sign_type')
    .map((k) => `${k}=${params[k]}`)
    .join('&')

  const verify = crypto.createVerify('RSA-SHA256')
  verify.update(sortedParams)
  return verify.verify(formatPublicKey(publicKey), sign, 'base64')
}

export class AlipayService implements PaymentService {
  private config: AlipayConfig
  private gateway = 'https://openapi.alipay.com/gateway.do'

  constructor(config: AlipayConfig) {
    this.config = config
  }

  private buildCommonParams(method: string): Record<string, string> {
    return {
      app_id: this.config.appId,
      method,
      format: 'JSON',
      charset: 'utf-8',
      sign_type: 'RSA2',
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      version: '1.0',
    }
  }

  async createOrder(params: CreateOrderParams): Promise<CreateOrderResult> {
    try {
      const bizContent = {
        out_trade_no: params.orderNo,
        total_amount: params.amount.toFixed(2),
        subject: params.productName,
      }

      const requestParams: Record<string, string> = {
        ...this.buildCommonParams('alipay.trade.precreate'),
        notify_url: this.config.notifyUrl,
        biz_content: JSON.stringify(bizContent),
      }

      requestParams.sign = generateSign(requestParams, this.config.privateKey)

      const response = await fetch(this.gateway, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(requestParams).toString(),
        signal: AbortSignal.timeout(15000),
      })

      const data = await response.json()
      const result = data.alipay_trade_precreate_response

      if (result.code === '10000') {
        return {
          success: true,
          orderNo: params.orderNo,
          qrcodeUrl: result.qr_code,
        }
      }

      return {
        success: false,
        orderNo: params.orderNo,
        error: result.sub_msg || result.msg || '创建订单失败',
      }
    } catch (err: any) {
      return {
        success: false,
        orderNo: params.orderNo,
        error: err.message || '网络请求失败',
      }
    }
  }

  async queryOrder(orderNo: string): Promise<QueryOrderResult> {
    try {
      const bizContent = { out_trade_no: orderNo }

      const requestParams: Record<string, string> = {
        ...this.buildCommonParams('alipay.trade.query'),
        biz_content: JSON.stringify(bizContent),
      }

      requestParams.sign = generateSign(requestParams, this.config.privateKey)

      const response = await fetch(this.gateway, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(requestParams).toString(),
        signal: AbortSignal.timeout(10000),
      })

      const data = await response.json()
      const result = data.alipay_trade_query_response

      if (result.code === '10000') {
        let status: QueryOrderResult['status'] = 'pending'
        if (result.trade_status === 'TRADE_SUCCESS' || result.trade_status === 'TRADE_FINISHED') {
          status = 'paid'
        } else if (result.trade_status === 'TRADE_CLOSED') {
          status = 'failed'
        }

        return {
          success: true,
          orderNo: result.out_trade_no,
          tradeNo: result.trade_no,
          status,
          paidAt: result.send_pay_date ? new Date(result.send_pay_date) : undefined,
        }
      }

      return {
        success: false,
        orderNo,
        status: 'pending',
        error: result.sub_msg || result.msg || '查询失败',
      }
    } catch (err: any) {
      return {
        success: false,
        orderNo,
        status: 'pending',
        error: err.message || '网络请求失败',
      }
    }
  }

  async verifyNotify(data: Record<string, string>): Promise<NotifyResult> {
    const sign = data.sign
    if (!sign) {
      return { success: false, orderNo: '', status: 'failed' }
    }

    const isValid = verifySign(data, sign, this.config.publicKey)
    if (!isValid) {
      return { success: false, orderNo: data.out_trade_no || '', status: 'failed' }
    }

    const isPaid = data.trade_status === 'TRADE_SUCCESS' || data.trade_status === 'TRADE_FINISHED'

    return {
      success: true,
      orderNo: data.out_trade_no,
      tradeNo: data.trade_no,
      amount: parseFloat(data.total_amount || '0'),
      status: isPaid ? 'paid' : 'pending',
      rawData: data,
    }
  }
}
