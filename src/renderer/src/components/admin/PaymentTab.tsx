import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '../../lib/utils'
import { FloatingLabelInput } from '../ui/FloatingLabelInput'
import { Button } from '../ui/button'
import type { PaymentConfigDisplay } from './types'

interface PaymentTabProps {
  isDarkMode: boolean
  paymentConfig: PaymentConfigDisplay
  setPaymentConfig: (config: PaymentConfigDisplay) => void
  handleSavePaymentConfig: () => void
  t: (key: string) => string
}

export const PaymentTab: React.FC<PaymentTabProps> = ({
  isDarkMode,
  paymentConfig,
  setPaymentConfig,
  handleSavePaymentConfig,
  t,
}) => {
  const cardClass = cn(
    'p-3 rounded-xl border',
    isDarkMode ? 'border-neutral-800 bg-neutral-900/50' : 'border-neutral-200 bg-neutral-50',
  )
  const titleClass = cn('text-xs font-medium mb-3', isDarkMode ? 'text-white' : 'text-black')
  const labelClass = isDarkMode ? 'text-gray-300' : 'text-gray-700'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex-1 overflow-y-auto p-4"
    >
      <div className="grid gap-3 max-w-md mx-auto">
        <div className={cardClass}>
          <h4 className={titleClass}>支付渠道</h4>
          <div className="flex gap-4">
            {[
              { value: 'epay', label: '易支付' },
              { value: 'wechat', label: '微信支付' },
              { value: 'alipay', label: '支付宝' },
            ].map((p) => (
              <label key={p.value} className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="radio"
                  name="paymentProvider"
                  value={p.value}
                  checked={paymentConfig.provider === p.value}
                  onChange={(e) =>
                    setPaymentConfig({ ...paymentConfig, provider: e.target.value as any })
                  }
                />
                <span className={labelClass}>{p.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className={cardClass}>
          <h4 className={titleClass}>通用设置</h4>
          <FloatingLabelInput
            alwaysShowLabel
            label={t('admin.payment.notifyUrl')}
            value={paymentConfig.notifyUrl}
            onChange={(value) => setPaymentConfig({ ...paymentConfig, notifyUrl: value })}
            className="text-xs"
          />
        </div>

        {paymentConfig.provider === 'epay' && (
          <div className={cardClass}>
            <h4 className={titleClass}>易支付配置</h4>
            <div className="grid gap-2">
              <FloatingLabelInput
                alwaysShowLabel
                label={t('admin.payment.epay.pid')}
                value={paymentConfig.epay.pid}
                onChange={(value) =>
                  setPaymentConfig({
                    ...paymentConfig,
                    epay: { ...paymentConfig.epay, pid: value },
                  })
                }
                className="text-xs"
              />
              <FloatingLabelInput
                alwaysShowLabel
                label={t('admin.payment.epay.key')}
                value={paymentConfig.epay.key}
                placeholder={
                  paymentConfig.epay.hasCredentials ? '已设置 (留空保持不变)' : '请输入商户密钥'
                }
                onChange={(value) =>
                  setPaymentConfig({
                    ...paymentConfig,
                    epay: { ...paymentConfig.epay, key: value },
                  })
                }
                className="text-xs"
              />
              <FloatingLabelInput
                alwaysShowLabel
                label={t('admin.payment.epay.apiUrl')}
                value={paymentConfig.epay.apiUrl}
                onChange={(value) =>
                  setPaymentConfig({
                    ...paymentConfig,
                    epay: { ...paymentConfig.epay, apiUrl: value },
                  })
                }
                className="text-xs"
              />
            </div>
          </div>
        )}

        {paymentConfig.provider === 'wechat' && (
          <div className={cardClass}>
            <h4 className={titleClass}>微信支付配置</h4>
            <div className="grid gap-2">
              <FloatingLabelInput
                alwaysShowLabel
                label={t('admin.payment.wechat.appId')}
                value={paymentConfig.wechat.appid}
                onChange={(value) =>
                  setPaymentConfig({
                    ...paymentConfig,
                    wechat: { ...paymentConfig.wechat, appid: value },
                  })
                }
                className="text-xs"
              />
              <FloatingLabelInput
                alwaysShowLabel
                label={t('admin.payment.wechat.mchId')}
                value={paymentConfig.wechat.mchid}
                onChange={(value) =>
                  setPaymentConfig({
                    ...paymentConfig,
                    wechat: { ...paymentConfig.wechat, mchid: value },
                  })
                }
                className="text-xs"
              />
              <FloatingLabelInput
                alwaysShowLabel
                label={t('admin.payment.wechat.apiKey')}
                value={paymentConfig.wechat.apiKey}
                placeholder={
                  paymentConfig.wechat.hasCredentials ? '已设置 (留空保持不变)' : '请输入 API Key'
                }
                onChange={(value) =>
                  setPaymentConfig({
                    ...paymentConfig,
                    wechat: { ...paymentConfig.wechat, apiKey: value },
                  })
                }
                className="text-xs"
              />
              <FloatingLabelInput
                alwaysShowLabel
                label={t('admin.payment.wechat.certSerial')}
                value={paymentConfig.wechat.certSerial}
                onChange={(value) =>
                  setPaymentConfig({
                    ...paymentConfig,
                    wechat: { ...paymentConfig.wechat, certSerial: value },
                  })
                }
                className="text-xs"
              />
              <FloatingLabelInput
                alwaysShowLabel
                label={t('admin.payment.wechat.privateKey')}
                value={paymentConfig.wechat.privateKey}
                placeholder={
                  paymentConfig.wechat.hasCredentials ? '已设置 (留空保持不变)' : '请输入私钥内容'
                }
                onChange={(value) =>
                  setPaymentConfig({
                    ...paymentConfig,
                    wechat: { ...paymentConfig.wechat, privateKey: value },
                  })
                }
                className="text-xs"
              />
            </div>
          </div>
        )}

        {paymentConfig.provider === 'alipay' && (
          <div className={cardClass}>
            <h4 className={titleClass}>支付宝配置</h4>
            <div className="grid gap-2">
              <FloatingLabelInput
                alwaysShowLabel
                label={t('admin.payment.alipay.appId')}
                value={paymentConfig.alipay.appId}
                onChange={(value) =>
                  setPaymentConfig({
                    ...paymentConfig,
                    alipay: { ...paymentConfig.alipay, appId: value },
                  })
                }
                className="text-xs"
              />
              <FloatingLabelInput
                alwaysShowLabel
                label={t('admin.payment.alipay.privateKey')}
                value={paymentConfig.alipay.privateKey}
                placeholder={
                  paymentConfig.alipay.hasCredentials ? '已设置 (留空保持不变)' : '请输入应用私钥'
                }
                onChange={(value) =>
                  setPaymentConfig({
                    ...paymentConfig,
                    alipay: { ...paymentConfig.alipay, privateKey: value },
                  })
                }
                className="text-xs"
              />
              <FloatingLabelInput
                alwaysShowLabel
                label={t('admin.payment.alipay.publicKey')}
                value={paymentConfig.alipay.publicKey}
                placeholder={
                  paymentConfig.alipay.hasCredentials ? '已设置 (留空保持不变)' : '请输入支付宝公钥'
                }
                onChange={(value) =>
                  setPaymentConfig({
                    ...paymentConfig,
                    alipay: { ...paymentConfig.alipay, publicKey: value },
                  })
                }
                className="text-xs"
              />
            </div>
          </div>
        )}

        <Button onClick={handleSavePaymentConfig} className="w-full text-xs">
          保存支付设置
        </Button>
      </div>
    </motion.div>
  )
}
