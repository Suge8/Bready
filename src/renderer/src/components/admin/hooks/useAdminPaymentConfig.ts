import { useState, useCallback } from 'react'
import { settingsService } from '../../../lib/api-client'
import { useToast } from '../../../contexts/ToastContext'
import { useI18n } from '../../../contexts/I18nContext'
import type { PaymentConfigDisplay } from '../types'

const initialPaymentConfig: PaymentConfigDisplay = {
  provider: '',
  notifyUrl: '',
  epay: { pid: '', key: '', apiUrl: '', hasCredentials: false },
  wechat: {
    mchid: '',
    appid: '',
    apiKey: '',
    certSerial: '',
    privateKey: '',
    hasCredentials: false,
  },
  alipay: { appId: '', privateKey: '', publicKey: '', hasCredentials: false },
}

export function useAdminPaymentConfig() {
  const { showToast } = useToast()
  const { t } = useI18n()

  const [paymentConfig, setPaymentConfig] = useState<PaymentConfigDisplay>(initialPaymentConfig)

  const loadPaymentConfig = useCallback(async () => {
    try {
      const config = await settingsService.getPaymentConfig()
      if (config) setPaymentConfig(config)
    } catch (error) {
      console.error('Failed to load payment config', error)
    }
  }, [])

  const handleSavePaymentConfig = async () => {
    try {
      const result = await settingsService.updatePaymentConfig(paymentConfig)
      if (result.success) {
        showToast(t('alerts.saveSuccess') || '保存成功', 'success')
      } else {
        showToast(result.error || t('alerts.saveFailed') || '保存失败', 'error')
      }
    } catch (error) {
      console.error('Failed to save payment config', error)
      showToast(t('alerts.saveFailed') || '保存失败', 'error')
    }
  }

  return {
    paymentConfig,
    setPaymentConfig,
    loadPaymentConfig,
    handleSavePaymentConfig,
  }
}
