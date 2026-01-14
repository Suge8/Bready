import { useState, useEffect, useCallback } from 'react'
import { userProfileService, usageRecordService, settingsService } from '../../lib/api-client'
import { useToast } from '../../contexts/ToastContext'
import { useI18n } from '../../contexts/I18nContext'
import type {
  TabType,
  UsageRecordWithUser,
  AiTestStatus,
  EmailConfig,
  DeleteConfirm,
  UserProfile,
  UserLevel,
  AiConfigDisplay,
  PaymentConfigDisplay,
  SmsConfigDisplay,
  LoginConfigDisplay,
} from './types'

const initialAiTestStatus: AiTestStatus = {
  gemini: { tested: false, success: false, loading: false },
  doubaoChat: { tested: false, success: false, loading: false },
  doubaoAsr: { tested: false, success: false, loading: false },
}

const initialAiConfig: AiConfigDisplay = {
  provider: 'gemini',
  geminiApiKey: '',
  doubaoChatApiKey: '',
  doubaoAsrAppId: '',
  doubaoAsrAccessKey: '',
  hasGeminiKey: false,
  hasDoubaoKey: false,
}

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

export function useAdminPanel() {
  const { showToast } = useToast()
  const { t } = useI18n()

  const [activeTab, setActiveTab] = useState<TabType>('users')

  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [showRoleDropdown, setShowRoleDropdown] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirm>({
    show: false,
    user: null,
  })

  const [usageRecords, setUsageRecords] = useState<UsageRecordWithUser[]>([])
  const [usageLoading, setUsageLoading] = useState(false)
  const [expandedUsageUsers, setExpandedUsageUsers] = useState<Set<string>>(new Set())

  const [aiConfig, setAiConfig] = useState<AiConfigDisplay>(initialAiConfig)
  const [aiTestStatus, setAiTestStatus] = useState<AiTestStatus>(initialAiTestStatus)

  const [paymentConfig, setPaymentConfig] = useState<PaymentConfigDisplay>(initialPaymentConfig)

  const [smsConfig, setSmsConfig] = useState<SmsConfigDisplay>(initialSmsConfig)

  const [loginConfig, setLoginConfig] = useState<LoginConfigDisplay>(initialLoginConfig)

  const [emailConfig, setEmailConfig] = useState<EmailConfig>(initialEmailConfig)
  const [emailTestLoading, setEmailTestLoading] = useState(false)
  const [emailConfigured, setEmailConfigured] = useState(false)

  const [expandedCard, setExpandedCard] = useState<'email' | 'phone' | 'wechat' | 'google' | null>(
    null,
  )

  const loadUsers = useCallback(async () => {
    setLoading(true)
    try {
      const usersData = await userProfileService.getAllUsers()
      setUsers(usersData)
    } catch (error) {
      console.error('Error loading users:', error)
      showToast(t('alerts.loadUsersFailed'), 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast, t])

  const loadUsageRecords = useCallback(async () => {
    setUsageLoading(true)
    try {
      const records = await usageRecordService.getAllRecords()
      setUsageRecords(records)
    } catch (error) {
      console.error('Error loading usage records:', error)
    } finally {
      setUsageLoading(false)
    }
  }, [])

  const loadAiConfig = useCallback(async () => {
    try {
      const config = await settingsService.getAiConfig()
      if (config) setAiConfig(config)
    } catch (error) {
      console.error('Failed to load AI config', error)
    }
  }, [])

  const loadPaymentConfig = useCallback(async () => {
    try {
      const config = await settingsService.getPaymentConfig()
      if (config) setPaymentConfig(config)
    } catch (error) {
      console.error('Failed to load payment config', error)
    }
  }, [])

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
        try {
          const parsed = JSON.parse(savedEmailConfig)
          if (typeof parsed.enableVerification === 'boolean') {
            setEmailConfig((prev) => ({
              ...prev,
              enableVerification: parsed.enableVerification,
            }))
          }
        } catch {
          // localStorage data may be corrupted, ignore and use defaults
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

  useEffect(() => {
    if (activeTab === 'users') loadUsers()
    if (activeTab === 'usage') loadUsageRecords()
    if (activeTab === 'ai') {
      loadAiConfig()
      setAiTestStatus(initialAiTestStatus)
    }
    if (activeTab === 'payment') loadPaymentConfig()
    if (activeTab === 'login') {
      loadLoginConfig()
      loadSmsConfig()
      loadSmtpConfig()
    }
  }, [
    activeTab,
    loadUsers,
    loadUsageRecords,
    loadAiConfig,
    loadPaymentConfig,
    loadLoginConfig,
    loadSmsConfig,
    loadSmtpConfig,
  ])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, activeTab])

  const handleUpdateUserLevel = async (
    userId: string,
    newLevel: UserLevel,
    profileLevel?: UserLevel,
  ) => {
    if (profileLevel !== '超级' && profileLevel !== '管理') {
      showToast(t('alerts.onlyAdmin'), 'warning')
      return
    }

    setLoading(true)
    try {
      await userProfileService.updateUserLevel(userId, newLevel)
      await loadUsers()
      setShowRoleDropdown(null)
    } catch (error) {
      console.error('Error updating user level:', error)
      showToast(t('alerts.updateRoleFailed'), 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteUser = async () => {
    if (!deleteConfirm.user) return

    try {
      await userProfileService.deleteUser(deleteConfirm.user.id)
      showToast(t('alerts.deleteSuccess') || '用户已删除', 'success')
      setDeleteConfirm({ show: false, user: null })
      loadUsers()
    } catch (error) {
      console.error('Error deleting user:', error)
      showToast(t('alerts.deleteFailed') || '删除失败', 'error')
    }
  }

  const handleSaveAiConfig = async (saveType?: 'chat' | 'asr') => {
    try {
      const result = await settingsService.updateAiConfig(aiConfig)
      if (result.success) {
        const msg =
          saveType === 'chat'
            ? 'Chat 配置已保存'
            : saveType === 'asr'
              ? 'ASR 配置已保存'
              : '保存成功'
        showToast(msg, 'success')
      } else {
        showToast(result.error || t('alerts.saveFailed') || '保存失败', 'error')
      }
    } catch (error) {
      console.error('Failed to save AI config', error)
      showToast(t('alerts.saveFailed') || '保存失败', 'error')
    }
  }

  const handleTestAiConnection = async (testType?: 'chat' | 'asr') => {
    const statusKey =
      aiConfig.provider === 'gemini' ? 'gemini' : testType === 'asr' ? 'doubaoAsr' : 'doubaoChat'

    setAiTestStatus((prev) => ({
      ...prev,
      [statusKey]: { ...prev[statusKey], loading: true },
    }))

    try {
      const result = await settingsService.testAiConnection(aiConfig.provider, testType, {
        geminiApiKey: aiConfig.geminiApiKey,
        doubaoChatApiKey: aiConfig.doubaoChatApiKey,
        doubaoAsrAppId: aiConfig.doubaoAsrAppId,
        doubaoAsrAccessKey: aiConfig.doubaoAsrAccessKey,
      })
      setAiTestStatus((prev) => ({
        ...prev,
        [statusKey]: { tested: true, success: result.success, loading: false },
      }))
      if (result.success) {
        showToast(t('alerts.testSuccess') || '连接测试成功', 'success')
      } else {
        showToast(result.error || '连接测试失败', 'error')
      }
    } catch (error) {
      console.error('Failed to test AI connection', error)
      setAiTestStatus((prev) => ({
        ...prev,
        [statusKey]: { tested: true, success: false, loading: false },
      }))
      showToast('测试失败', 'error')
    }
  }

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
    activeTab,
    setActiveTab,

    users,
    loading,
    searchTerm,
    setSearchTerm,
    currentPage,
    setCurrentPage,
    showRoleDropdown,
    setShowRoleDropdown,
    deleteConfirm,
    setDeleteConfirm,
    handleUpdateUserLevel,
    handleDeleteUser,
    loadUsers,

    usageRecords,
    usageLoading,
    expandedUsageUsers,
    setExpandedUsageUsers,

    aiConfig,
    setAiConfig,
    aiTestStatus,
    handleSaveAiConfig,
    handleTestAiConnection,

    paymentConfig,
    setPaymentConfig,
    handleSavePaymentConfig,

    smsConfig,
    setSmsConfig,

    loginConfig,
    setLoginConfig,
    handleSaveAllLoginSettings,

    emailConfig,
    emailTestLoading,
    emailConfigured,
    handleEmailConfigChange,
    handleTestEmailConnection,

    expandedCard,
    setExpandedCard,
  }
}
