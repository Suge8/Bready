import { ipcMain } from 'electron'
import { api } from '../utils/api-client'
import { createPaymentOrder, queryPaymentOrder, type PaymentChannel } from '../services/payment'
import { getPaymentConfig } from '../services/settings-service'
import crypto from 'crypto'

function generateOrderNo(): string {
  const timestamp = Date.now().toString()
  const random = crypto.randomBytes(4).toString('hex')
  return `BR${timestamp}${random}`
}

ipcMain.handle(
  'payment:create-order',
  async (
    _,
    {
      userId,
      packageId,
      channel,
    }: {
      userId: string
      packageId: string
      channel?: PaymentChannel
    },
  ) => {
    try {
      const config = await getPaymentConfig()
      if (!config.provider) {
        return { success: false, error: '支付服务未配置' }
      }

      const result = await api.payment.createOrder(userId, packageId, channel)
      if (result.error) {
        return { success: false, error: result.error }
      }

      const orderData = result.data as any
      if (!orderData) {
        return { success: false, error: '创建订单失败' }
      }
      const orderNo = orderData.orderNo || generateOrderNo()
      const amount = orderData.amount

      const paymentResult = await createPaymentOrder({
        orderNo,
        amount,
        productName: `面宝会员套餐`,
        channel: channel || 'alipay',
      })

      return {
        success: paymentResult.success,
        orderNo,
        payUrl: paymentResult.payUrl,
        qrcodeUrl: paymentResult.qrcodeUrl,
        amount,
        error: paymentResult.error,
      }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  },
)

ipcMain.handle('payment:query-order', async (_, orderNo: string) => {
  try {
    const result = await api.payment.queryOrder(orderNo)
    if (result.error) {
      return { success: false, error: result.error }
    }

    const order = result.data as any
    if (!order) {
      return { success: false, error: '订单不存在' }
    }
    if (order.status === 'paid' || order.status === 'expired') {
      return {
        success: true,
        orderNo: order.orderNo,
        status: order.status,
        paidAt: order.paidAt,
      }
    }

    const paymentResult = await queryPaymentOrder(orderNo)

    if (paymentResult.status === 'paid' && order.status !== 'paid') {
      await api.payment.processSuccess(orderNo, paymentResult.tradeNo, paymentResult.paidAt)
    }

    return {
      success: true,
      orderNo: paymentResult.orderNo,
      status: paymentResult.status,
      paidAt: paymentResult.paidAt,
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('payment:get-user-orders', async (_, userId: string) => {
  try {
    const result = await api.payment.getUserOrders(userId)
    if (result.error) {
      return { success: false, error: result.error, orders: [] }
    }
    const data = result.data as any
    return { success: true, orders: data?.orders || data || [] }
  } catch (error: any) {
    return { success: false, error: error.message, orders: [] }
  }
})
