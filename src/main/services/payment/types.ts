export type PaymentProvider = 'epay' | 'wechat' | 'alipay'
export type PaymentChannel = 'alipay' | 'wxpay'
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'expired' | 'refunded'

export interface CreateOrderParams {
  orderNo: string
  amount: number
  productName: string
  channel?: PaymentChannel
  clientIp?: string
  returnUrl?: string
}

export interface CreateOrderResult {
  success: boolean
  orderNo: string
  tradeNo?: string
  payUrl?: string
  qrcodeUrl?: string
  error?: string
}

export interface QueryOrderResult {
  success: boolean
  orderNo: string
  tradeNo?: string
  status: PaymentStatus
  paidAt?: Date
  error?: string
}

export interface NotifyResult {
  success: boolean
  orderNo: string
  tradeNo?: string
  amount?: number
  status: PaymentStatus
  rawData?: any
}

export interface PaymentService {
  createOrder(params: CreateOrderParams): Promise<CreateOrderResult>
  queryOrder(orderNo: string): Promise<QueryOrderResult>
  verifyNotify(data: any): Promise<NotifyResult>
}

export interface EpayConfig {
  pid: string
  key: string
  apiUrl: string
  notifyUrl: string
}

export interface WechatConfig {
  mchid: string
  appid: string
  apiKey: string
  certSerial: string
  privateKey: string
  notifyUrl: string
}

export interface AlipayConfig {
  appId: string
  privateKey: string
  publicKey: string
  notifyUrl: string
}
