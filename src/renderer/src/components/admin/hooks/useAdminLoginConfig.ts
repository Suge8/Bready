import { useState, useCallback } from 'react'
import { settingsService } from '../../../lib/api-client'
import { useToast } from '../../../contexts/ToastContext'
import { useI18n } from '../../../contexts/I18nContext'
import type { SmsConfigDisplay, LoginConfigDisplay, EmailConfig } from '../types'

const initialSmsConfig: SmsConfigDisplay = {
  provider: '',
  aliyun: {
    accessKeyId: '',
    accessKeySecret: '',
    signName: '',
    templateCode: '',
    hasCredentials: false,
  },
  tencent: {
    secretId: '',
    secretKey: '',
    appId: '',
    signName: '',
    templateId: '',
    hasCredentials: false,
  },
}

const initialLoginConfig: LoginConfigDisplay = {
  email: { enabled: true },
  phone: { enabled: false },
  wechat: {
    enabled: false,
    appId: '',
    appSecret: '',
    redirectUri: '',
    hasCredentials: false,
  },
  google: {
    enabled: false,
    clientId: '',
    clientSecret: '',
    redirectUri: '',
    hasCredentials: false,
  },
}

const initialEmailConfig: EmailConfig = {
  smtpServer: '',
  port: '465',
  senderEmail: '',
  authCode: '',
  enableSsl: true,
  enableVerification: false,
}

export function useAdminLoginConfig() {
  const { showToast } = useToast()
  const { t } = useI18n()

  const [smsConfig, setSmsConfig] = useState<SmsConfigDisplay>(initialSmsConfig)
  const [loginConfig, setLoginConfig] = useState<LoginConfigDisplay>(initialLoginConfig)
  const [emailConfig, setEmailConfig] = useState<EmailConfig>(initialEmailConfig)
  const [emailTestLoading, setEmailTestLoading] = useState(false)
  const [emailConfigured, setEmailConfigured] = useState(false)
  const [expandedCard, setExpandedCard] = useState<'email' | 'phone' | 'wechat' | 'google' | null>(
    null,
  )

  const loadSmsConfig = useCallback(async () => {
    try {
      const config = await settingsService.getSmsConfig()
      if (config) setSmsConfig(config)
    } catch (error) {
      console.error('Failed to load SMS config', error)
    }
  }, [])

  const loadLoginConfig = useCallback(async () => {
    try {
      const config = await settingsService.getLoginConfig()
      if (config) setLoginConfig(config)
    } catch (error) {
      console.error('Failed to load login config', error)
    }
  }, [])

  const loadSmtpConfig = useCallback(async () => {
    try {
      const savedEmailConfig = localStorage.getItem('email_config')
      if (savedEmailConfig) {
        const parsed = JSON.parse(savedEmailConfig)
        if (typeof parsed.enableVerification === 'boolean') {
          setEmailConfig((prev) => ({ ...prev, enableVerification: parsed.enableVerification }))
        }
      }

      const config = await settingsService.getSmtpConfig()
      if (config) {
        setEmailConfig((prev) => ({
          ...prev,
          smtpServer: config.host || '',
          port: config.port || '465',
          senderEmail: config.user || '',
          enableSsl: config.secure !== false,
        }))
        setEmailConfigured(config.hasPassword && !!config.host && !!config.user)
      }
    } catch (e) {
      console.error('Failed to load SMTP config', e)
    }
  }, [])

  const handleSaveAllLoginSettings = async () => {
    try {
      localStorage.setItem('email_config', JSON.stringify(emailConfig))

      const [smsResult, loginResult] = await Promise.all([
        settingsService.updateSmsConfig(smsConfig),
        settingsService.updateLoginConfig(loginConfig),
      ])

      if (smsResult.success && loginResult.success) {
        showToast(t('alerts.saveSuccess') || '所有设置已保存', 'success')
      } else {
        const errorMsg = smsResult.error || loginResult.error || '保存失败'
        showToast(errorMsg, 'error')
      }
    } catch (error) {
      console.error('Failed to save settings', error)
      showToast('保存失败', 'error')
    }
  }

  const handleEmailConfigChange = <K extends keyof EmailConfig>(key: K, value: EmailConfig[K]) => {
    setEmailConfig((prev) => ({ ...prev, [key]: value }))
    if (key !== 'enableVerification') {
      setEmailConfigured(false)
    }
  }

  const handleTestEmailConnection = async () => {
    if (!emailConfig.smtpServer || !emailConfig.senderEmail || !emailConfig.authCode) {
      showToast('请填写完整的邮箱配置', 'warning')
      return
    }

    setEmailTestLoading(true)
    try {
      const result = await settingsService.testSmtpConnection({
        host: emailConfig.smtpServer,
        port: emailConfig.port,
        secure: emailConfig.enableSsl,
        user: emailConfig.senderEmail,
        pass: emailConfig.authCode,
      })

      if (result.success) {
        await settingsService.updateSmtpConfig({
          host: emailConfig.smtpServer,
          port: emailConfig.port,
          secure: emailConfig.enableSsl,
          user: emailConfig.senderEmail,
          pass: emailConfig.authCode,
        })
        setEmailConfigured(true)
        showToast('邮箱登录已生效', 'success')
      } else {
        setEmailConfigured(false)
        showToast(result.error || '连接失败', 'error')
      }
    } catch (error: unknown) {
      setEmailConfigured(false)
      const message = error instanceof Error ? error.message : '测试失败'
      showToast(message, 'error')
    } finally {
      setEmailTestLoading(false)
    }
  }

  return {
    smsConfig,
    setSmsConfig,
    loginConfig,
    setLoginConfig,
    emailConfig,
    emailTestLoading,
    emailConfigured,
    expandedCard,
    setExpandedCard,
    loadSmsConfig,
    loadLoginConfig,
    loadSmtpConfig,
    handleSaveAllLoginSettings,
    handleEmailConfigChange,
    handleTestEmailConnection,
  }
}
