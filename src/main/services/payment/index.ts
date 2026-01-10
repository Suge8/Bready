import { getPaymentConfig } from '../settings-service'
import { EpayService } from './epay'
import { WechatPayService } from './wechat'
import { AlipayService } from './alipay'
import {
  type PaymentService,
  type PaymentProvider,
  type CreateOrderParams,
  type CreateOrderResult,
  type QueryOrderResult,
  type NotifyResult,
} from './types'

export * from './types'

let cachedService: PaymentService | null = null
let cachedProvider: PaymentProvider | null = null

export async function getPaymentService(): Promise<PaymentService | null> {
  const config = await getPaymentConfig()

  if (!config.provider) {
    return null
  }

  if (cachedService && cachedProvider === config.provider) {
    return cachedService
  }

  switch (config.provider) {
    case 'epay':
      if (!config.epay.pid || !config.epay.key) return null
      cachedService = new EpayService({
        pid: config.epay.pid,
        key: config.epay.key,
        apiUrl: config.epay.apiUrl,
        notifyUrl: config.notifyUrl,
      })
      break

    case 'wechat':
      if (!config.wechat.mchid || !config.wechat.apiKey || !config.wechat.privateKey) return null
      cachedService = new WechatPayService({
        mchid: config.wechat.mchid,
        appid: config.wechat.appid,
        apiKey: config.wechat.apiKey,
        certSerial: config.wechat.certSerial,
        privateKey: config.wechat.privateKey,
        notifyUrl: config.notifyUrl,
      })
      break

    case 'alipay':
      if (!config.alipay.appId || !config.alipay.privateKey) return null
      cachedService = new AlipayService({
        appId: config.alipay.appId,
        privateKey: config.alipay.privateKey,
        publicKey: config.alipay.publicKey,
        notifyUrl: config.notifyUrl,
      })
      break

    default:
      return null
  }

  cachedProvider = config.provider
  return cachedService
}

export function clearPaymentServiceCache(): void {
  cachedService = null
  cachedProvider = null
}

export async function createPaymentOrder(params: CreateOrderParams): Promise<CreateOrderResult> {
  const service = await getPaymentService()
  if (!service) {
    return {
      success: false,
      orderNo: params.orderNo,
      error: '支付服务未配置',
    }
  }
  return service.createOrder(params)
}

export async function queryPaymentOrder(orderNo: string): Promise<QueryOrderResult> {
  const service = await getPaymentService()
  if (!service) {
    return {
      success: false,
      orderNo,
      status: 'pending',
      error: '支付服务未配置',
    }
  }
  return service.queryOrder(orderNo)
}

export async function verifyPaymentNotify(
  provider: PaymentProvider,
  data: any,
): Promise<NotifyResult> {
  const config = await getPaymentConfig()

  let service: PaymentService

  switch (provider) {
    case 'epay':
      service = new EpayService({
        pid: config.epay.pid,
        key: config.epay.key,
        apiUrl: config.epay.apiUrl,
        notifyUrl: config.notifyUrl,
      })
      break

    case 'wechat':
      service = new WechatPayService({
        mchid: config.wechat.mchid,
        appid: config.wechat.appid,
        apiKey: config.wechat.apiKey,
        certSerial: config.wechat.certSerial,
        privateKey: config.wechat.privateKey,
        notifyUrl: config.notifyUrl,
      })
      break

    case 'alipay':
      service = new AlipayService({
        appId: config.alipay.appId,
        privateKey: config.alipay.privateKey,
        publicKey: config.alipay.publicKey,
        notifyUrl: config.notifyUrl,
      })
      break

    default:
      return { success: false, orderNo: '', status: 'failed' }
  }

  return service.verifyNotify(data)
}
