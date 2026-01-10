import crypto from 'crypto'
import {
  type PaymentService,
  type CreateOrderParams,
  type CreateOrderResult,
  type QueryOrderResult,
  type NotifyResult,
  type EpayConfig,
} from './types'

function generateSign(params: Record<string, string>, key: string): string {
  const sortedKeys = Object.keys(params).sort()
  const signStr = sortedKeys
    .filter((k) => k !== 'sign' && k !== 'sign_type' && params[k])
    .map((k) => `${k}=${params[k]}`)
    .join('&')
  return crypto
    .createHash('md5')
    .update(signStr + key)
    .digest('hex')
}

export class EpayService implements PaymentService {
  private config: EpayConfig

  constructor(config: EpayConfig) {
    this.config = config
  }

  async createOrder(params: CreateOrderParams): Promise<CreateOrderResult> {
    const requestParams: Record<string, string> = {
      pid: this.config.pid,
      type: params.channel || 'alipay',
      out_trade_no: params.orderNo,
      notify_url: this.config.notifyUrl,
      name: params.productName,
      money: params.amount.toFixed(2),
      clientip: params.clientIp || '127.0.0.1',
      sign_type: 'MD5',
    }

    requestParams.sign = generateSign(requestParams, this.config.key)

    try {
      const response = await fetch(`${this.config.apiUrl}/mapi.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(requestParams).toString(),
        signal: AbortSignal.timeout(15000),
      })

      const data = await response.json()

      if (data.code === 1 || data.code === '1') {
        return {
          success: true,
          orderNo: params.orderNo,
          tradeNo: data.trade_no,
          payUrl: data.payurl,
          qrcodeUrl: data.qrcode || data.img,
        }
      }

      return {
        success: false,
        orderNo: params.orderNo,
        error: data.msg || '创建订单失败',
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
    const url = `${this.config.apiUrl}/api.php?act=order&pid=${this.config.pid}&key=${this.config.key}&out_trade_no=${orderNo}`

    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(10000) })
      const data = await response.json()

      if (data.code === 1 || data.code === '1') {
        return {
          success: true,
          orderNo: data.out_trade_no,
          tradeNo: data.trade_no,
          status: data.status === 1 || data.status === '1' ? 'paid' : 'pending',
          paidAt: data.endtime ? new Date(data.endtime) : undefined,
        }
      }

      return {
        success: false,
        orderNo,
        status: 'pending',
        error: data.msg || '查询失败',
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
    const receivedSign = data.sign
    const calculatedSign = generateSign(data, this.config.key)

    if (receivedSign !== calculatedSign) {
      return {
        success: false,
        orderNo: data.out_trade_no || '',
        status: 'failed',
      }
    }

    const isPaid = data.trade_status === 'TRADE_SUCCESS'

    return {
      success: true,
      orderNo: data.out_trade_no,
      tradeNo: data.trade_no,
      amount: parseFloat(data.money),
      status: isPaid ? 'paid' : 'pending',
      rawData: data,
    }
  }
}
