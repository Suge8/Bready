import React, { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft,
  LogIn,
  Users,
  Clock,
  ChevronDown,
  Check,
  ChevronLeft,
  ChevronRight,
  Search,
  Mail,
  TrendingUp,
  Settings,
  CreditCard,
  MessageSquare,
  MessageCircle,
  Trash2,
} from 'lucide-react'
import { cn } from '../lib/utils'
import { useAuth } from '../contexts/AuthContext'
import {
  userProfileService,
  usageRecordService,
  settingsService,
  type UserProfile,
  type UserLevel,
  type InterviewUsageRecord,
  type AiConfigDisplay,
  type PaymentConfigDisplay,
  type SmsConfigDisplay,
  type LoginConfigDisplay,
} from '../lib/api-client'
import UserLevelBadge from './UserLevelBadge'
import { useI18n } from '../contexts/I18nContext'
import { useTheme } from './ui/theme-provider'
import { useToast } from '../contexts/ToastContext'
import { Modal, ConfirmDialog } from './ui/Modal'
import { FloatingLabelInput } from './ui/FloatingLabelInput'
import { Button } from './ui/button'

interface AdminPanelModalProps {
  onClose: () => void
  onBack?: () => void
}

type TabType = 'users' | 'usage' | 'ai' | 'payment' | 'login'

interface UsageRecordWithUser extends InterviewUsageRecord {
  full_name?: string
  username?: string
  email?: string
}

const AdminPanelModal: React.FC<AdminPanelModalProps> = ({ onClose, onBack }) => {
  const { user, profile } = useAuth()
  const { t, locale } = useI18n()
  const { resolvedTheme } = useTheme()
  const { showToast } = useToast()

  const [activeTab, setActiveTab] = useState<TabType>('users')
  const [expandedCard, setExpandedCard] = useState<'email' | 'phone' | 'wechat' | 'google' | null>(
    null,
  )
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(false)
  const [showRoleDropdown, setShowRoleDropdown] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const isDarkMode = resolvedTheme === 'dark'

  const [currentPage, setCurrentPage] = useState(1)
  const usersPerPage = 10

  const [usageRecords, setUsageRecords] = useState<UsageRecordWithUser[]>([])
  const [usageLoading, setUsageLoading] = useState(false)
  const [expandedUsageUsers, setExpandedUsageUsers] = useState<Set<string>>(new Set())

  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; user: UserProfile | null }>({
    show: false,
    user: null,
  })

  const [aiTestStatus, setAiTestStatus] = useState<{
    gemini: { tested: boolean; success: boolean; loading: boolean }
    doubaoChat: { tested: boolean; success: boolean; loading: boolean }
    doubaoAsr: { tested: boolean; success: boolean; loading: boolean }
  }>({
    gemini: { tested: false, success: false, loading: false },
    doubaoChat: { tested: false, success: false, loading: false },
    doubaoAsr: { tested: false, success: false, loading: false },
  })

  const [aiConfig, setAiConfig] = useState<AiConfigDisplay>({
    provider: 'gemini',
    geminiApiKey: '',
    doubaoChatApiKey: '',
    doubaoAsrAppId: '',
    doubaoAsrAccessKey: '',
    hasGeminiKey: false,
    hasDoubaoKey: false,
  })
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfigDisplay>({
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
  })
  const [smsConfig, setSmsConfig] = useState<SmsConfigDisplay>({
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
  })
  const [loginConfig, setLoginConfig] = useState<LoginConfigDisplay>({
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
  })

  useEffect(() => {
    if (activeTab === 'ai') {
      loadAiConfig()
      setAiTestStatus({
        gemini: { tested: false, success: false, loading: false },
        doubaoChat: { tested: false, success: false, loading: false },
        doubaoAsr: { tested: false, success: false, loading: false },
      })
    } else if (activeTab === 'payment') {
      loadPaymentConfig()
    } else if (activeTab === 'login') {
      loadLoginConfig()
      loadSmsConfig()
    }
  }, [activeTab])

  const loadAiConfig = async () => {
    try {
      const config = await settingsService.getAiConfig()
      if (config) setAiConfig(config)
    } catch (error) {
      console.error('Failed to load AI config', error)
    }
  }

  const loadPaymentConfig = async () => {
    try {
      const config = await settingsService.getPaymentConfig()
      if (config) setPaymentConfig(config)
    } catch (error) {
      console.error('Failed to load payment config', error)
    }
  }

  const loadSmsConfig = async () => {
    try {
      const config = await settingsService.getSmsConfig()
      if (config) setSmsConfig(config)
    } catch (error) {
      console.error('Failed to load SMS config', error)
    }
  }

  const loadLoginConfig = async () => {
    try {
      const config = await settingsService.getLoginConfig()
      if (config) setLoginConfig(config)
    } catch (error) {
      console.error('Failed to load login config', error)
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
      // Save Email Config (Local Storage)
      localStorage.setItem('email_config', JSON.stringify(emailConfig))

      // Save SMS & Login Config (API)
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

  const [emailConfig, setEmailConfig] = useState({
    smtpServer: '',
    port: '465',
    senderEmail: '',
    authCode: '',
    enableSsl: true,
    enableVerification: false,
  })
  const [emailTestLoading, setEmailTestLoading] = useState(false)
  const [emailConfigured, setEmailConfigured] = useState(false)

  useEffect(() => {
    if (activeTab === 'login') {
      loadSmtpConfig()
    }
  }, [activeTab])

  const loadSmtpConfig = async () => {
    try {
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
  }

  const handleEmailConfigChange = (key: string, value: any) => {
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
    } catch (error: any) {
      setEmailConfigured(false)
      showToast(error.message || '测试失败', 'error')
    } finally {
      setEmailTestLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers()
    }
    if (activeTab === 'usage') {
      loadUsageRecords()
    }
  }, [activeTab])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, activeTab])

  const loadUsers = async () => {
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
  }

  const loadUsageRecords = async () => {
    setUsageLoading(true)
    try {
      const records = await usageRecordService.getAllRecords()
      setUsageRecords(records)
    } catch (error) {
      console.error('Error loading usage records:', error)
    } finally {
      setUsageLoading(false)
    }
  }

  const handleUpdateUserLevel = async (userId: string, newLevel: UserLevel) => {
    if (profile?.user_level !== '超级' && profile?.user_level !== '管理') {
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

  const formatDate = (dateString?: string) => {
    if (!dateString) return t('common.none')
    return new Date(dateString).toLocaleDateString(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  }

  const formatNumber = (value: number) => value.toLocaleString(locale)

  const userLevels: UserLevel[] = ['小白', '螺丝钉', '大牛', '管理', '超级']
  const canManageUser = (targetUser: UserProfile) => {
    if (profile?.user_level === '超级') return true
    if (
      profile?.user_level === '管理' &&
      targetUser.user_level !== '超级' &&
      targetUser.user_level !== '管理'
    )
      return true
    return false
  }

  const tabs = [
    { id: 'users' as TabType, label: t('admin.tabs.users'), icon: Users },
    { id: 'usage' as TabType, label: t('admin.tabs.usage'), icon: Clock },
    { id: 'ai' as TabType, label: 'AI 设置', icon: Settings },
    { id: 'login' as TabType, label: '登录设置', icon: LogIn },
    { id: 'payment' as TabType, label: '支付设置', icon: CreditCard },
  ]

  const filteredUsers = users.filter((userItem) => {
    if (!searchTerm.trim()) return true
    const keyword = searchTerm.trim().toLowerCase()
    const name = userItem.full_name || userItem.username || ''
    return `${name} ${userItem.email}`.toLowerCase().includes(keyword)
  })

  const totalUsers = users.length
  const activeMembers = users.filter((userItem) => {
    if (!userItem.membership_expires_at) return false
    return new Date(userItem.membership_expires_at) >= new Date()
  }).length
  const remainingMinutes = users.reduce(
    (sum, userItem) => sum + (userItem.remaining_interview_minutes || 0),
    0,
  )

  const expiringSoon = users.filter((userItem) => {
    if (!userItem.membership_expires_at) return false
    const expires = new Date(userItem.membership_expires_at)
    const diffDays = (expires.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    return diffDays >= 0 && diffDays <= 7
  }).length

  const totalPages = Math.ceil(filteredUsers.length / usersPerPage)
  const startIndex = (currentPage - 1) * usersPerPage
  const endIndex = startIndex + usersPerPage
  const currentUsers = filteredUsers.slice(startIndex, endIndex)

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      onClose()
    }
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      size="xl"
      className="p-0 w-full max-w-[640px] h-[520px] flex flex-col overflow-hidden"
    >
      <div className={cn('h-full flex flex-col relative', isDarkMode ? 'bg-black' : 'bg-white')}>
        <div
          className={cn(
            'flex items-center justify-between px-4 py-3 border-b flex-shrink-0',
            isDarkMode ? 'border-neutral-800' : 'border-neutral-200',
          )}
        >
          <div className="flex items-center gap-2">
            <button
              onClick={handleBack}
              className={cn(
                'p-1.5 rounded-lg border transition-colors cursor-pointer',
                isDarkMode
                  ? 'border-neutral-800 text-white hover:bg-white/5'
                  : 'border-neutral-200 text-black hover:bg-black/5',
              )}
              aria-label={t('common.back')}
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h2 className={cn('text-sm font-semibold', isDarkMode ? 'text-white' : 'text-black')}>
              {t('admin.title')}
            </h2>
          </div>

          <div className="relative flex items-center gap-1 p-1 rounded-full bg-black/5 dark:bg-white/5">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors duration-200 cursor-pointer z-10',
                    isActive
                      ? isDarkMode
                        ? 'text-black'
                        : 'text-white'
                      : isDarkMode
                        ? 'text-gray-400 hover:text-gray-200'
                        : 'text-gray-500 hover:text-gray-700',
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="adminActiveTabBg"
                      className={cn(
                        'absolute inset-0 rounded-full',
                        isDarkMode ? 'bg-white' : 'bg-black',
                      )}
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}
                  <Icon className="w-3.5 h-3.5 relative z-10" />
                  <span className="relative z-10">{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex-1 overflow-hidden min-h-0 flex flex-col">
          {activeTab === 'login' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="flex-1 overflow-y-auto p-4"
            >
              <div className="max-w-2xl mx-auto space-y-3">
                <motion.div
                  whileHover={{ scale: 1.01, y: -2 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  className={cn(
                    'rounded-xl border transition-all duration-300 overflow-hidden',
                    isDarkMode
                      ? 'border-neutral-800 bg-neutral-900/50 hover:border-blue-500/20 hover:shadow-lg hover:shadow-blue-500/5'
                      : 'border-neutral-200 bg-neutral-50 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-500/10',
                    expandedCard === 'email' &&
                      (isDarkMode ? 'border-blue-500/30' : 'border-blue-200'),
                  )}
                >
                  <div
                    onClick={() => setExpandedCard(expandedCard === 'email' ? null : 'email')}
                    className="p-4 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'w-10 h-10 rounded-full flex items-center justify-center transition-colors',
                          isDarkMode ? 'bg-neutral-800' : 'bg-white shadow-sm border',
                          expandedCard === 'email' && 'text-blue-500',
                        )}
                      >
                        <Mail className="w-5 h-5" />
                      </div>
                      <div>
                        <div
                          className={cn(
                            'text-sm font-semibold',
                            isDarkMode ? 'text-white' : 'text-black',
                          )}
                        >
                          邮箱登录
                        </div>
                        <div className="text-xs text-gray-500">SMTP / 验证码配置</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEmailConfigChange(
                            'enableVerification',
                            !emailConfig.enableVerification,
                          )
                        }}
                        className={cn(
                          'w-10 h-6 rounded-full p-1 cursor-pointer transition-colors duration-300',
                          emailConfig.enableVerification
                            ? 'bg-green-500'
                            : isDarkMode
                              ? 'bg-neutral-800'
                              : 'bg-gray-200',
                        )}
                      >
                        <motion.div
                          className="w-4 h-4 bg-white rounded-full shadow-sm"
                          animate={{ x: emailConfig.enableVerification ? 16 : 0 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        />
                      </div>
                      <motion.div
                        animate={{ rotate: expandedCard === 'email' ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      </motion.div>
                    </div>
                  </div>

                  <AnimatePresence>
                    {expandedCard === 'email' && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                      >
                        <div className="p-4 pt-0 border-t border-dashed border-gray-200 dark:border-gray-800">
                          <div className="grid grid-cols-2 gap-4 mt-4">
                            <div className="space-y-3">
                              <FloatingLabelInput
                                label={t('admin.email.smtp.server')}
                                value={emailConfig.smtpServer}
                                placeholder={t('admin.email.smtp.placeholders.server')}
                                alwaysShowLabel
                                onChange={(value) => handleEmailConfigChange('smtpServer', value)}
                                className="text-xs"
                              />
                              <div className="flex gap-2">
                                <div className="w-24">
                                  <FloatingLabelInput
                                    label={t('admin.email.smtp.port')}
                                    value={emailConfig.port}
                                    placeholder={t('admin.email.smtp.placeholders.port')}
                                    alwaysShowLabel
                                    onChange={(value) => handleEmailConfigChange('port', value)}
                                    className="text-xs"
                                  />
                                </div>
                                <div className="flex items-end pb-2">
                                  <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <div
                                      onClick={() =>
                                        handleEmailConfigChange('enableSsl', !emailConfig.enableSsl)
                                      }
                                      className={cn(
                                        'w-8 h-5 rounded-full p-0.5 transition-colors duration-200 relative',
                                        emailConfig.enableSsl
                                          ? 'bg-blue-500'
                                          : isDarkMode
                                            ? 'bg-neutral-700'
                                            : 'bg-gray-300',
                                      )}
                                    >
                                      <motion.div
                                        className="w-4 h-4 bg-white rounded-full shadow-sm"
                                        animate={{ x: emailConfig.enableSsl ? 12 : 0 }}
                                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                      />
                                    </div>
                                    <span className="text-[10px] text-gray-500">SSL</span>
                                  </label>
                                </div>
                              </div>
                            </div>
                            <div className="space-y-3">
                              <FloatingLabelInput
                                label={t('admin.email.auth.email')}
                                value={emailConfig.senderEmail}
                                placeholder={t('admin.email.auth.placeholders.email')}
                                alwaysShowLabel
                                onChange={(value) => handleEmailConfigChange('senderEmail', value)}
                                className="text-xs"
                              />
                              <FloatingLabelInput
                                label={t('admin.email.auth.code')}
                                type="text"
                                value={emailConfig.authCode}
                                placeholder={t('admin.email.auth.placeholders.code')}
                                alwaysShowLabel
                                onChange={(value) => handleEmailConfigChange('authCode', value)}
                                className="text-xs"
                              />
                            </div>
                          </div>
                          <div className="flex justify-end mt-3 items-center gap-2">
                            {emailConfigured && (
                              <span className="text-xs text-emerald-500">✓ 已生效</span>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleTestEmailConnection}
                              disabled={emailTestLoading}
                              className="text-xs h-7"
                            >
                              {emailTestLoading ? '测试中...' : '测试连接'}
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.01, y: -2 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  className={cn(
                    'rounded-xl border transition-all duration-300 overflow-hidden',
                    isDarkMode
                      ? 'border-neutral-800 bg-neutral-900/50 hover:border-violet-500/20 hover:shadow-lg hover:shadow-violet-500/5'
                      : 'border-neutral-200 bg-neutral-50 hover:border-violet-300 hover:shadow-lg hover:shadow-violet-500/10',
                    expandedCard === 'phone' &&
                      (isDarkMode ? 'border-violet-500/30' : 'border-violet-200'),
                  )}
                >
                  <div
                    onClick={() => setExpandedCard(expandedCard === 'phone' ? null : 'phone')}
                    className="p-4 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'w-10 h-10 rounded-full flex items-center justify-center transition-colors',
                          isDarkMode ? 'bg-neutral-800' : 'bg-white shadow-sm border',
                          expandedCard === 'phone' && 'text-violet-500',
                        )}
                      >
                        <MessageSquare className="w-5 h-5" />
                      </div>
                      <div>
                        <div
                          className={cn(
                            'text-sm font-semibold',
                            isDarkMode ? 'text-white' : 'text-black',
                          )}
                        >
                          手机登录
                        </div>
                        <div className="text-xs text-gray-500">短信服务配置</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div
                        onClick={(e) => {
                          e.stopPropagation()
                          setLoginConfig({
                            ...loginConfig,
                            phone: { ...loginConfig.phone, enabled: !loginConfig.phone.enabled },
                          })
                        }}
                        className={cn(
                          'w-10 h-6 rounded-full p-1 cursor-pointer transition-colors duration-300',
                          loginConfig.phone.enabled
                            ? 'bg-green-500'
                            : isDarkMode
                              ? 'bg-neutral-800'
                              : 'bg-gray-200',
                        )}
                      >
                        <motion.div
                          className="w-4 h-4 bg-white rounded-full shadow-sm"
                          animate={{ x: loginConfig.phone.enabled ? 16 : 0 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        />
                      </div>
                      <motion.div
                        animate={{ rotate: expandedCard === 'phone' ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                        className="cursor-pointer"
                      >
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      </motion.div>
                    </div>
                  </div>

                  <AnimatePresence>
                    {expandedCard === 'phone' && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                      >
                        <div className="p-4 pt-0 border-t border-dashed border-gray-200 dark:border-gray-800">
                          <div className="mt-4 space-y-4">
                            <div className="flex gap-4 p-2 bg-black/5 dark:bg-white/5 rounded-lg w-fit">
                              <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                                <input
                                  type="radio"
                                  name="smsProvider"
                                  value="aliyun"
                                  checked={smsConfig.provider === 'aliyun'}
                                  onChange={(e) =>
                                    setSmsConfig({ ...smsConfig, provider: e.target.value as any })
                                  }
                                  className="accent-emerald-500"
                                />
                                <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
                                  阿里云
                                </span>
                              </label>
                              <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                                <input
                                  type="radio"
                                  name="smsProvider"
                                  value="tencent"
                                  checked={smsConfig.provider === 'tencent'}
                                  onChange={(e) =>
                                    setSmsConfig({ ...smsConfig, provider: e.target.value as any })
                                  }
                                  className="accent-emerald-500"
                                />
                                <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
                                  腾讯云
                                </span>
                              </label>
                            </div>

                            {smsConfig.provider === 'aliyun' && (
                              <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                                <FloatingLabelInput
                                  label={t('admin.sms.accessKeyId')}
                                  value={smsConfig.aliyun.accessKeyId}
                                  placeholder={t('admin.sms.placeholders.aliyun.accessKeyId')}
                                  alwaysShowLabel
                                  onChange={(value) =>
                                    setSmsConfig({
                                      ...smsConfig,
                                      aliyun: { ...smsConfig.aliyun, accessKeyId: value },
                                    })
                                  }
                                  className="text-xs"
                                />
                                <FloatingLabelInput
                                  label={t('admin.sms.accessKeySecret')}
                                  value={smsConfig.aliyun.accessKeySecret}
                                  placeholder={
                                    smsConfig.aliyun.hasCredentials
                                      ? t('admin.sms.placeholders.aliyun.accessKeySecretEmpty')
                                      : t('admin.sms.placeholders.aliyun.accessKeySecret')
                                  }
                                  alwaysShowLabel
                                  onChange={(value) =>
                                    setSmsConfig({
                                      ...smsConfig,
                                      aliyun: {
                                        ...smsConfig.aliyun,
                                        accessKeySecret: value,
                                      },
                                    })
                                  }
                                  className="text-xs"
                                />
                                <FloatingLabelInput
                                  alwaysShowLabel
                                  label={t('admin.sms.signName')}
                                  value={smsConfig.aliyun.signName}
                                  onChange={(value) =>
                                    setSmsConfig({
                                      ...smsConfig,
                                      aliyun: { ...smsConfig.aliyun, signName: value },
                                    })
                                  }
                                  className="text-xs"
                                />
                                <FloatingLabelInput
                                  alwaysShowLabel
                                  label={t('admin.sms.templateCode')}
                                  value={smsConfig.aliyun.templateCode}
                                  onChange={(value) =>
                                    setSmsConfig({
                                      ...smsConfig,
                                      aliyun: { ...smsConfig.aliyun, templateCode: value },
                                    })
                                  }
                                  className="text-xs"
                                />
                              </div>
                            )}

                            {smsConfig.provider === 'tencent' && (
                              <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                                <FloatingLabelInput
                                  alwaysShowLabel
                                  label={t('admin.sms.appId')}
                                  value={smsConfig.tencent.appId}
                                  onChange={(value) =>
                                    setSmsConfig({
                                      ...smsConfig,
                                      tencent: { ...smsConfig.tencent, appId: value },
                                    })
                                  }
                                  className="text-xs"
                                />
                                <FloatingLabelInput
                                  alwaysShowLabel
                                  label={t('admin.sms.secretId')}
                                  value={smsConfig.tencent.secretId}
                                  placeholder={t('admin.sms.placeholders.tencent.secretId')}
                                  onChange={(value) =>
                                    setSmsConfig({
                                      ...smsConfig,
                                      tencent: { ...smsConfig.tencent, secretId: value },
                                    })
                                  }
                                  className="text-xs"
                                />
                                <FloatingLabelInput
                                  alwaysShowLabel
                                  label={t('admin.sms.secretKey')}
                                  type="text"
                                  value={smsConfig.tencent.secretKey}
                                  placeholder={
                                    smsConfig.tencent.hasCredentials
                                      ? t('admin.sms.placeholders.tencent.secretKeyEmpty')
                                      : t('admin.sms.placeholders.tencent.secretKey')
                                  }
                                  onChange={(value) =>
                                    setSmsConfig({
                                      ...smsConfig,
                                      tencent: { ...smsConfig.tencent, secretKey: value },
                                    })
                                  }
                                  className="text-xs"
                                />
                                <FloatingLabelInput
                                  alwaysShowLabel
                                  label={t('admin.sms.signName')}
                                  value={smsConfig.tencent.signName}
                                  onChange={(value) =>
                                    setSmsConfig({
                                      ...smsConfig,
                                      tencent: { ...smsConfig.tencent, signName: value },
                                    })
                                  }
                                  className="text-xs"
                                />
                                <FloatingLabelInput
                                  alwaysShowLabel
                                  label={t('admin.sms.templateId')}
                                  value={smsConfig.tencent.templateId}
                                  onChange={(value) =>
                                    setSmsConfig({
                                      ...smsConfig,
                                      tencent: { ...smsConfig.tencent, templateId: value },
                                    })
                                  }
                                  className="text-xs"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.01, y: -2 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  className={cn(
                    'rounded-xl border transition-all duration-300 overflow-hidden',
                    isDarkMode
                      ? 'border-neutral-800 bg-neutral-900/50 hover:border-green-500/20 hover:shadow-lg hover:shadow-green-500/5'
                      : 'border-neutral-200 bg-neutral-50 hover:border-green-300 hover:shadow-lg hover:shadow-green-500/10',
                    expandedCard === 'wechat' &&
                      (isDarkMode ? 'border-green-500/30' : 'border-green-200'),
                  )}
                >
                  <div
                    onClick={() => setExpandedCard(expandedCard === 'wechat' ? null : 'wechat')}
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'w-10 h-10 rounded-full flex items-center justify-center transition-colors',
                          isDarkMode ? 'bg-neutral-800' : 'bg-white shadow-sm border',
                          expandedCard === 'wechat' && 'text-green-500',
                        )}
                      >
                        <MessageCircle className="w-5 h-5" />
                      </div>
                      <div>
                        <div
                          className={cn(
                            'text-sm font-semibold',
                            isDarkMode ? 'text-white' : 'text-black',
                          )}
                        >
                          微信登录
                        </div>
                        <div className="text-xs text-gray-500">开放平台 / 回调配置</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div
                        onClick={(e) => {
                          e.stopPropagation()
                          setLoginConfig((prev) => ({
                            ...prev,
                            wechat: { ...prev.wechat, enabled: !prev.wechat.enabled },
                            google: {
                              ...prev.google,
                              enabled: !prev.wechat.enabled ? false : prev.google.enabled,
                            },
                          }))
                        }}
                        className={cn(
                          'w-10 h-6 rounded-full p-1 cursor-pointer transition-colors duration-300',
                          loginConfig.wechat.enabled
                            ? 'bg-green-500'
                            : isDarkMode
                              ? 'bg-neutral-800'
                              : 'bg-gray-200',
                        )}
                      >
                        <motion.div
                          className="w-4 h-4 bg-white rounded-full shadow-sm"
                          animate={{ x: loginConfig.wechat.enabled ? 16 : 0 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        />
                      </div>
                      <motion.div
                        animate={{ rotate: expandedCard === 'wechat' ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                        className="cursor-pointer"
                      >
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      </motion.div>
                    </div>
                  </div>

                  <AnimatePresence>
                    {expandedCard === 'wechat' && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                      >
                        <div className="p-4 pt-0 border-t border-dashed border-gray-200 dark:border-gray-800">
                          <div className="mt-4 space-y-3">
                            <FloatingLabelInput
                              alwaysShowLabel
                              label={t('admin.login.wechat.appId')}
                              value={loginConfig.wechat.appId}
                              placeholder={t('admin.login.placeholders.wechat.appId')}
                              onChange={(value) =>
                                setLoginConfig({
                                  ...loginConfig,
                                  wechat: { ...loginConfig.wechat, appId: value },
                                })
                              }
                              className="text-xs"
                            />
                            <FloatingLabelInput
                              alwaysShowLabel
                              label={t('admin.login.wechat.appSecret')}
                              value={loginConfig.wechat.appSecret}
                              placeholder={
                                loginConfig.wechat.hasCredentials
                                  ? t('admin.login.placeholders.wechat.appSecretSet')
                                  : t('admin.login.placeholders.wechat.appSecret')
                              }
                              onChange={(value) =>
                                setLoginConfig({
                                  ...loginConfig,
                                  wechat: { ...loginConfig.wechat, appSecret: value },
                                })
                              }
                              className="text-xs"
                            />
                            <FloatingLabelInput
                              alwaysShowLabel
                              label={t('admin.login.wechat.redirectUri')}
                              value={loginConfig.wechat.redirectUri}
                              placeholder={t('admin.login.placeholders.wechat.redirectUri')}
                              onChange={(value) =>
                                setLoginConfig({
                                  ...loginConfig,
                                  wechat: { ...loginConfig.wechat, redirectUri: value },
                                })
                              }
                              className="text-xs"
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.01, y: -2 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  className={cn(
                    'rounded-xl border transition-all duration-300 overflow-hidden',
                    isDarkMode
                      ? 'border-neutral-800 bg-neutral-900/50 hover:border-orange-500/20 hover:shadow-lg hover:shadow-orange-500/5'
                      : 'border-neutral-200 bg-neutral-50 hover:border-orange-300 hover:shadow-lg hover:shadow-orange-500/10',
                    expandedCard === 'google' &&
                      (isDarkMode ? 'border-orange-500/30' : 'border-orange-200'),
                  )}
                >
                  <div
                    onClick={() => setExpandedCard(expandedCard === 'google' ? null : 'google')}
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'w-10 h-10 rounded-full flex items-center justify-center transition-colors',
                          isDarkMode ? 'bg-neutral-800' : 'bg-white shadow-sm border',
                          expandedCard === 'google' && 'text-orange-500',
                        )}
                      >
                        <div className="w-5 h-5 flex items-center justify-center font-bold text-sm">
                          G
                        </div>
                      </div>
                      <div>
                        <div
                          className={cn(
                            'text-sm font-semibold',
                            isDarkMode ? 'text-white' : 'text-black',
                          )}
                        >
                          Google 登录
                        </div>
                        <div className="text-xs text-gray-500">OAuth 2.0 / Client 配置</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div
                        onClick={(e) => {
                          e.stopPropagation()
                          setLoginConfig((prev) => ({
                            ...prev,
                            google: { ...prev.google, enabled: !prev.google.enabled },
                            wechat: {
                              ...prev.wechat,
                              enabled: !prev.google.enabled ? false : prev.wechat.enabled,
                            },
                          }))
                        }}
                        className={cn(
                          'w-10 h-6 rounded-full p-1 cursor-pointer transition-colors duration-300',
                          loginConfig.google.enabled
                            ? 'bg-green-500'
                            : isDarkMode
                              ? 'bg-neutral-800'
                              : 'bg-gray-200',
                        )}
                      >
                        <motion.div
                          className="w-4 h-4 bg-white rounded-full shadow-sm"
                          animate={{ x: loginConfig.google.enabled ? 16 : 0 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        />
                      </div>
                      <motion.div
                        animate={{ rotate: expandedCard === 'google' ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                        className="cursor-pointer"
                      >
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      </motion.div>
                    </div>
                  </div>

                  <AnimatePresence>
                    {expandedCard === 'google' && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                      >
                        <div className="p-4 pt-0 border-t border-dashed border-gray-200 dark:border-gray-800">
                          <div className="mt-4 space-y-3">
                            <FloatingLabelInput
                              alwaysShowLabel
                              label={t('admin.login.google.clientId')}
                              value={loginConfig.google.clientId}
                              placeholder={t('admin.login.placeholders.google.clientId')}
                              onChange={(value) =>
                                setLoginConfig({
                                  ...loginConfig,
                                  google: { ...loginConfig.google, clientId: value },
                                })
                              }
                              className="text-xs"
                            />
                            <FloatingLabelInput
                              alwaysShowLabel
                              label={t('admin.login.google.clientSecret')}
                              value={loginConfig.google.clientSecret}
                              placeholder={
                                loginConfig.google.hasCredentials
                                  ? t('admin.login.placeholders.google.clientSecretSet')
                                  : t('admin.login.placeholders.google.clientSecret')
                              }
                              onChange={(value) =>
                                setLoginConfig({
                                  ...loginConfig,
                                  google: { ...loginConfig.google, clientSecret: value },
                                })
                              }
                              className="text-xs"
                            />
                            <FloatingLabelInput
                              alwaysShowLabel
                              label={t('admin.login.google.redirectUri')}
                              value={loginConfig.google.redirectUri}
                              placeholder={t('admin.login.placeholders.google.redirectUri')}
                              onChange={(value) =>
                                setLoginConfig({
                                  ...loginConfig,
                                  google: { ...loginConfig.google, redirectUri: value },
                                })
                              }
                              className="text-xs"
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>

                <div className="flex justify-end pt-4 pb-8">
                  <Button onClick={handleSaveAllLoginSettings} className="w-full sm:w-auto px-8">
                    保存所有设置
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'users' && (
            <>
              <div
                className={cn(
                  'px-4 py-3 border-b flex-shrink-0',
                  isDarkMode ? 'border-neutral-800' : 'border-neutral-200',
                )}
              >
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {[
                    { label: t('admin.stats.totalUsers'), value: formatNumber(totalUsers) },
                    { label: t('admin.stats.activeMembers'), value: formatNumber(activeMembers) },
                    {
                      label: t('admin.stats.remainingMinutes'),
                      value: formatNumber(remainingMinutes),
                    },
                    { label: t('admin.stats.expiringSoon'), value: formatNumber(expiringSoon) },
                  ].map((stat, index) => (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={cn(
                        'p-2 rounded-lg border',
                        isDarkMode
                          ? 'border-neutral-800 bg-neutral-900/50'
                          : 'border-neutral-200 bg-neutral-50',
                      )}
                    >
                      <span className="text-[10px] text-gray-500 uppercase">{stat.label}</span>
                      <div
                        className={cn(
                          'text-lg font-semibold',
                          isDarkMode ? 'text-white' : 'text-black',
                        )}
                      >
                        {stat.value}
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder={t('admin.search')}
                    className={cn(
                      'w-full pl-9 pr-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-1 transition-all',
                      isDarkMode
                        ? 'border-neutral-800 bg-neutral-900 text-white focus:ring-white/20'
                        : 'border-neutral-200 bg-white text-black focus:ring-black/10',
                    )}
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div
                      className={cn(
                        'w-5 h-5 border-2 border-t-transparent rounded-full animate-spin',
                        isDarkMode ? 'border-white' : 'border-black',
                      )}
                    />
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-12 text-gray-400 text-sm"
                  >
                    {t('admin.empty')}
                  </motion.div>
                ) : (
                  currentUsers.map((userItem, index) => (
                    <motion.div
                      key={userItem.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className={cn(
                        'group flex items-center justify-between p-3 rounded-xl border transition-all',
                        isDarkMode
                          ? 'border-neutral-800 bg-neutral-900/30 hover:border-neutral-700'
                          : 'border-neutral-200 bg-white hover:border-neutral-300',
                      )}
                    >
                      <div className="min-w-0 flex-1 flex items-center gap-3">
                        <div
                          className={cn(
                            'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold',
                            isDarkMode ? 'bg-neutral-800 text-white' : 'bg-neutral-100 text-black',
                          )}
                        >
                          {userItem.full_name?.[0] ||
                            userItem.username?.[0] ||
                            userItem.email?.[0] ||
                            '?'}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                'font-medium text-sm truncate max-w-[120px]',
                                isDarkMode ? 'text-white' : 'text-black',
                              )}
                            >
                              {userItem.full_name || userItem.username || t('common.none')}
                            </span>
                            <UserLevelBadge
                              level={userItem.user_level}
                              size="sm"
                              showIcon={false}
                              isDarkMode={isDarkMode}
                            />
                          </div>
                          <div className="text-xs text-gray-500 truncate max-w-[180px]">
                            {userItem.email}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-gray-500 mr-4 hidden sm:flex">
                        <div className="flex flex-col items-end">
                          <span>{t('admin.remaining')}</span>
                          <span
                            className={
                              userItem.remaining_interview_minutes > 0
                                ? 'text-emerald-500 font-medium'
                                : 'text-red-500 font-medium'
                            }
                          >
                            {userItem.remaining_interview_minutes}m
                          </span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span>{t('admin.membership')}</span>
                          <span>
                            {userItem.membership_expires_at
                              ? formatDate(userItem.membership_expires_at)
                              : '-'}
                          </span>
                        </div>
                      </div>

                      {canManageUser(userItem) && userItem.id !== user?.id && (
                        <div className="relative flex items-center gap-1">
                          {profile?.user_level === '超级' && (
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => setDeleteConfirm({ show: true, user: userItem })}
                              className={cn(
                                'p-1.5 rounded-lg transition-colors',
                                isDarkMode
                                  ? 'hover:bg-red-500/20 text-gray-400 hover:text-red-400'
                                  : 'hover:bg-red-50 text-gray-500 hover:text-red-600',
                              )}
                              title={t('common.delete') || '删除用户'}
                            >
                              <Trash2 className="w-4 h-4" />
                            </motion.button>
                          )}
                          <button
                            onClick={() =>
                              setShowRoleDropdown(
                                showRoleDropdown === userItem.id ? null : userItem.id,
                              )
                            }
                            className={cn(
                              'p-1.5 rounded-lg transition-colors',
                              isDarkMode
                                ? 'hover:bg-white/5 text-gray-400'
                                : 'hover:bg-black/5 text-gray-500',
                            )}
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>

                          {showRoleDropdown === userItem.id && (
                            <div
                              className={cn(
                                'absolute top-full right-0 mt-1 w-28 rounded-lg shadow-xl z-20 py-1 border',
                                isDarkMode
                                  ? 'bg-neutral-900 border-neutral-800'
                                  : 'bg-white border-neutral-200',
                              )}
                            >
                              {userLevels.map((level) => {
                                if (
                                  profile?.user_level === '管理' &&
                                  (level === '超级' || level === '管理')
                                )
                                  return null
                                return (
                                  <button
                                    key={level}
                                    onClick={() => handleUpdateUserLevel(userItem.id, level)}
                                    className={cn(
                                      'w-full text-left px-3 py-1.5 text-xs transition-colors flex items-center justify-between',
                                      userItem.user_level === level
                                        ? isDarkMode
                                          ? 'bg-white/10 font-medium text-white'
                                          : 'bg-black/5 font-medium text-black'
                                        : isDarkMode
                                          ? 'text-gray-300 hover:bg-white/5'
                                          : 'text-gray-700 hover:bg-black/5',
                                    )}
                                  >
                                    <span>{level}</span>
                                    {userItem.user_level === level && <Check className="w-3 h-3" />}
                                  </button>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </motion.div>
                  ))
                )}
              </div>

              <div
                className={cn(
                  'px-4 py-2 border-t flex items-center justify-between text-xs',
                  isDarkMode
                    ? 'border-neutral-800 text-gray-500'
                    : 'border-neutral-200 text-gray-500',
                )}
              >
                <span>
                  {formatNumber(filteredUsers.length)} {t('admin.totalUsers')}
                </span>
                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className={cn(
                        'p-1 rounded transition-colors disabled:opacity-30',
                        isDarkMode ? 'hover:bg-white/5' : 'hover:bg-black/5',
                      )}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span>
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className={cn(
                        'p-1 rounded transition-colors disabled:opacity-30',
                        isDarkMode ? 'hover:bg-white/5' : 'hover:bg-black/5',
                      )}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'usage' && (
            <div className="flex-1 overflow-hidden flex flex-col">
              <div
                className={cn(
                  'px-4 py-3 border-b flex-shrink-0',
                  isDarkMode ? 'border-neutral-800' : 'border-neutral-200',
                )}
              >
                <div className="grid grid-cols-3 gap-2">
                  {[
                    {
                      label: t('admin.usageTitle') || '使用概览',
                      value: formatNumber(usageRecords.length),
                    },
                    {
                      label: t('admin.totalMinutes') || '总使用时长',
                      value: `${formatNumber(usageRecords.reduce((sum, r) => sum + r.minutes_used, 0))} min`,
                    },
                    {
                      label: t('admin.avgMinutes') || '人均使用',
                      value: `${usageRecords.length > 0 ? Math.round(usageRecords.reduce((sum, r) => sum + r.minutes_used, 0) / new Set(usageRecords.map((r) => r.user_id)).size) : 0} min`,
                    },
                  ].map((stat, index) => (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={cn(
                        'p-2 rounded-lg border',
                        isDarkMode
                          ? 'border-neutral-800 bg-neutral-900/50'
                          : 'border-neutral-200 bg-neutral-50',
                      )}
                    >
                      <span className="text-[10px] text-gray-500 uppercase">{stat.label}</span>
                      <div
                        className={cn(
                          'text-lg font-semibold',
                          isDarkMode ? 'text-white' : 'text-black',
                        )}
                      >
                        {stat.value}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {usageLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-6 h-6 border-2 border-black dark:border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : usageRecords.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                    <TrendingUp className="w-10 h-10 mb-2 opacity-30" />
                    <p className="text-sm">{t('admin.noUsage') || '暂无使用记录'}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(
                      usageRecords.reduce(
                        (acc, record) => {
                          const key = record.user_id
                          if (!acc[key]) {
                            acc[key] = {
                              name:
                                record.full_name || record.username || record.email || 'Unknown',
                              email: record.email || '',
                              totalMinutes: 0,
                              records: [],
                            }
                          }
                          acc[key].totalMinutes += record.minutes_used
                          acc[key].records.push(record)
                          return acc
                        },
                        {} as Record<
                          string,
                          {
                            name: string
                            email: string
                            totalMinutes: number
                            records: UsageRecordWithUser[]
                          }
                        >,
                      ),
                    )
                      .sort(([, a], [, b]) => b.totalMinutes - a.totalMinutes)
                      .map(([visitorId, data]) => (
                        <div
                          key={visitorId}
                          className={cn(
                            'p-3 rounded-xl border',
                            isDarkMode
                              ? 'border-neutral-800 bg-neutral-900/50'
                              : 'border-neutral-200 bg-white',
                          )}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div
                                className={cn(
                                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium',
                                  isDarkMode
                                    ? 'bg-neutral-800 text-white'
                                    : 'bg-neutral-100 text-black',
                                )}
                              >
                                {data.name[0]?.toUpperCase() || '?'}
                              </div>
                              <div>
                                <div
                                  className={cn(
                                    'text-sm font-medium',
                                    isDarkMode ? 'text-white' : 'text-black',
                                  )}
                                >
                                  {data.name}
                                </div>
                                <div className="text-xs text-gray-500">{data.email}</div>
                              </div>
                            </div>
                            <div
                              className={cn(
                                'text-sm font-semibold px-2 py-0.5 rounded-full',
                                isDarkMode
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : 'bg-emerald-100 text-emerald-600',
                              )}
                            >
                              {data.totalMinutes} min
                            </div>
                          </div>
                          <div className="space-y-1">
                            {data.records
                              .slice(0, expandedUsageUsers.has(visitorId) ? undefined : 3)
                              .map((record) => (
                                <div
                                  key={record.id}
                                  className={cn(
                                    'flex items-center justify-between text-xs py-1.5 px-2 rounded-lg',
                                    isDarkMode ? 'bg-neutral-800/50' : 'bg-neutral-50',
                                  )}
                                >
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={cn(
                                        'px-1.5 py-0.5 rounded text-[10px] font-medium',
                                        record.session_type === 'collaboration'
                                          ? isDarkMode
                                            ? 'bg-blue-500/20 text-blue-400'
                                            : 'bg-blue-100 text-blue-600'
                                          : isDarkMode
                                            ? 'bg-violet-500/20 text-violet-400'
                                            : 'bg-violet-100 text-violet-600',
                                      )}
                                    >
                                      {record.session_type === 'collaboration'
                                        ? t('profile.history.collaboration') || '协作'
                                        : t('profile.history.liveInterview') || '面试'}
                                    </span>
                                    <span className="text-gray-500">
                                      {new Date(record.started_at).toLocaleDateString(locale)}
                                    </span>
                                  </div>
                                  <span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
                                    {record.minutes_used} min
                                  </span>
                                </div>
                              ))}
                            {data.records.length > 3 && (
                              <motion.button
                                onClick={() => {
                                  setExpandedUsageUsers((prev) => {
                                    const next = new Set(prev)
                                    if (next.has(visitorId)) {
                                      next.delete(visitorId)
                                    } else {
                                      next.add(visitorId)
                                    }
                                    return next
                                  })
                                }}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className={cn(
                                  'w-full text-xs py-1.5 rounded-lg cursor-pointer transition-colors flex items-center justify-center gap-1',
                                  isDarkMode
                                    ? 'text-gray-400 hover:text-white hover:bg-white/5'
                                    : 'text-gray-500 hover:text-black hover:bg-black/5',
                                )}
                              >
                                {expandedUsageUsers.has(visitorId) ? (
                                  <>
                                    <ChevronDown className="w-3 h-3 rotate-180 transition-transform" />
                                    <span>{t('common.collapse') || '收起'}</span>
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown className="w-3 h-3 transition-transform" />
                                    <span>
                                      +{data.records.length - 3}{' '}
                                      {t('profile.history.loadMore') || '更多记录'}
                                    </span>
                                  </>
                                )}
                              </motion.button>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'ai' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="flex-1 overflow-y-auto p-4"
            >
              <div className="grid gap-3 max-w-md mx-auto">
                <div
                  className={cn(
                    'p-3 rounded-xl border',
                    isDarkMode
                      ? 'border-neutral-800 bg-neutral-900/50'
                      : 'border-neutral-200 bg-neutral-50',
                  )}
                >
                  <h4
                    className={cn(
                      'text-xs font-medium mb-3',
                      isDarkMode ? 'text-white' : 'text-black',
                    )}
                  >
                    AI 提供方
                  </h4>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                      <input
                        type="radio"
                        name="aiProvider"
                        value="gemini"
                        checked={aiConfig.provider === 'gemini'}
                        onChange={(e) =>
                          setAiConfig({ ...aiConfig, provider: e.target.value as any })
                        }
                      />
                      <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
                        Google Gemini
                      </span>
                    </label>
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                      <input
                        type="radio"
                        name="aiProvider"
                        value="doubao"
                        checked={aiConfig.provider === 'doubao'}
                        onChange={(e) =>
                          setAiConfig({ ...aiConfig, provider: e.target.value as any })
                        }
                      />
                      <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
                        字节豆包
                      </span>
                    </label>
                  </div>
                </div>

                <div
                  className={cn(
                    'p-3 rounded-xl border',
                    isDarkMode
                      ? 'border-neutral-800 bg-neutral-900/50'
                      : 'border-neutral-200 bg-neutral-50',
                  )}
                >
                  <h4
                    className={cn(
                      'text-xs font-medium mb-3',
                      isDarkMode ? 'text-white' : 'text-black',
                    )}
                  >
                    配置参数
                  </h4>
                  <div className="grid gap-3">
                    {aiConfig.provider === 'gemini' && (
                      <div className="flex items-end gap-2">
                        <div className="flex-1">
                          <FloatingLabelInput
                            alwaysShowLabel
                            label={t('admin.ai.gemini.apiKey')}
                            value={aiConfig.geminiApiKey}
                            placeholder={
                              aiConfig.hasGeminiKey
                                ? t('admin.ai.placeholders.gemini.apiKeySet')
                                : t('admin.ai.placeholders.gemini.apiKey')
                            }
                            onChange={(value) => setAiConfig({ ...aiConfig, geminiApiKey: value })}
                            className="text-xs"
                          />
                        </div>
                        {aiTestStatus.gemini.tested && aiTestStatus.gemini.success ? (
                          <motion.button
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleSaveAiConfig()}
                            className={cn(
                              'h-10 px-4 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 shrink-0',
                              isDarkMode
                                ? 'bg-white text-black hover:bg-neutral-200'
                                : 'bg-black text-white hover:bg-neutral-800',
                            )}
                          >
                            <Check className="w-3 h-3" />
                            保存设置
                          </motion.button>
                        ) : (
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleTestAiConnection()}
                            disabled={aiTestStatus.gemini.loading}
                            className={cn(
                              'h-10 px-4 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 shrink-0',
                              isDarkMode
                                ? 'bg-white text-black hover:bg-neutral-200'
                                : 'bg-black text-white hover:bg-neutral-800',
                            )}
                          >
                            {aiTestStatus.gemini.loading ? (
                              <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : null}
                            测试连接
                          </motion.button>
                        )}
                      </div>
                    )}

                    {aiConfig.provider === 'doubao' && (
                      <div className="space-y-3">
                        <div className="flex items-end gap-2">
                          <div className="flex-1">
                            <FloatingLabelInput
                              alwaysShowLabel
                              label={t('admin.ai.doubao.chatApiKey')}
                              value={aiConfig.doubaoChatApiKey}
                              placeholder={
                                aiConfig.hasDoubaoKey
                                  ? t('admin.ai.placeholders.doubao.chatApiKeySet')
                                  : t('admin.ai.placeholders.doubao.chatApiKey')
                              }
                              onChange={(value) =>
                                setAiConfig({ ...aiConfig, doubaoChatApiKey: value })
                              }
                              className="text-xs"
                            />
                          </div>
                          {aiTestStatus.doubaoChat.tested && aiTestStatus.doubaoChat.success ? (
                            <motion.button
                              initial={{ scale: 0.9, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => handleSaveAiConfig('chat')}
                              className={cn(
                                'h-10 px-4 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 shrink-0',
                                isDarkMode
                                  ? 'bg-white text-black hover:bg-neutral-200'
                                  : 'bg-black text-white hover:bg-neutral-800',
                              )}
                            >
                              <Check className="w-3 h-3" />
                              保存设置
                            </motion.button>
                          ) : (
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => handleTestAiConnection('chat')}
                              disabled={aiTestStatus.doubaoChat.loading}
                              className={cn(
                                'h-10 px-4 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 shrink-0',
                                isDarkMode
                                  ? 'bg-white text-black hover:bg-neutral-200'
                                  : 'bg-black text-white hover:bg-neutral-800',
                              )}
                            >
                              {aiTestStatus.doubaoChat.loading ? (
                                <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                              ) : null}
                              测试连接
                            </motion.button>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <div className="flex-1 space-y-2">
                            <FloatingLabelInput
                              alwaysShowLabel
                              label={t('admin.ai.doubao.asrAppId')}
                              value={aiConfig.doubaoAsrAppId}
                              placeholder={
                                aiConfig.hasDoubaoKey
                                  ? t('admin.ai.placeholders.doubao.asrAppIdSet')
                                  : t('admin.ai.placeholders.doubao.asrAppId')
                              }
                              onChange={(value) =>
                                setAiConfig({ ...aiConfig, doubaoAsrAppId: value })
                              }
                              className="text-xs"
                            />
                            <FloatingLabelInput
                              alwaysShowLabel
                              label={t('admin.ai.doubao.asrAccessKey')}
                              value={aiConfig.doubaoAsrAccessKey}
                              placeholder={
                                aiConfig.hasDoubaoKey
                                  ? t('admin.ai.placeholders.doubao.asrAccessKeySet')
                                  : t('admin.ai.placeholders.doubao.asrAccessKey')
                              }
                              onChange={(value) =>
                                setAiConfig({ ...aiConfig, doubaoAsrAccessKey: value })
                              }
                              className="text-xs"
                            />
                          </div>
                          <div className="flex items-center pt-5">
                            {aiTestStatus.doubaoAsr.tested && aiTestStatus.doubaoAsr.success ? (
                              <motion.button
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => handleSaveAiConfig('asr')}
                                className={cn(
                                  'h-10 px-4 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 shrink-0',
                                  isDarkMode
                                    ? 'bg-white text-black hover:bg-neutral-200'
                                    : 'bg-black text-white hover:bg-neutral-800',
                                )}
                              >
                                <Check className="w-3 h-3" />
                                保存设置
                              </motion.button>
                            ) : (
                              <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => handleTestAiConnection('asr')}
                                disabled={aiTestStatus.doubaoAsr.loading}
                                className={cn(
                                  'h-10 px-4 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 shrink-0',
                                  isDarkMode
                                    ? 'bg-white text-black hover:bg-neutral-200'
                                    : 'bg-black text-white hover:bg-neutral-800',
                                )}
                              >
                                {aiTestStatus.doubaoAsr.loading ? (
                                  <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                ) : null}
                                测试连接
                              </motion.button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'payment' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="flex-1 overflow-y-auto p-4"
            >
              <div className="grid gap-3 max-w-md mx-auto">
                <div
                  className={cn(
                    'p-3 rounded-xl border',
                    isDarkMode
                      ? 'border-neutral-800 bg-neutral-900/50'
                      : 'border-neutral-200 bg-neutral-50',
                  )}
                >
                  <h4
                    className={cn(
                      'text-xs font-medium mb-3',
                      isDarkMode ? 'text-white' : 'text-black',
                    )}
                  >
                    支付渠道
                  </h4>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                      <input
                        type="radio"
                        name="paymentProvider"
                        value="epay"
                        checked={paymentConfig.provider === 'epay'}
                        onChange={(e) =>
                          setPaymentConfig({ ...paymentConfig, provider: e.target.value as any })
                        }
                      />
                      <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>易支付</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                      <input
                        type="radio"
                        name="paymentProvider"
                        value="wechat"
                        checked={paymentConfig.provider === 'wechat'}
                        onChange={(e) =>
                          setPaymentConfig({ ...paymentConfig, provider: e.target.value as any })
                        }
                      />
                      <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
                        微信支付
                      </span>
                    </label>
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                      <input
                        type="radio"
                        name="paymentProvider"
                        value="alipay"
                        checked={paymentConfig.provider === 'alipay'}
                        onChange={(e) =>
                          setPaymentConfig({ ...paymentConfig, provider: e.target.value as any })
                        }
                      />
                      <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>支付宝</span>
                    </label>
                  </div>
                </div>

                <div
                  className={cn(
                    'p-3 rounded-xl border',
                    isDarkMode
                      ? 'border-neutral-800 bg-neutral-900/50'
                      : 'border-neutral-200 bg-neutral-50',
                  )}
                >
                  <h4
                    className={cn(
                      'text-xs font-medium mb-3',
                      isDarkMode ? 'text-white' : 'text-black',
                    )}
                  >
                    通用设置
                  </h4>
                  <FloatingLabelInput
                    alwaysShowLabel
                    label={t('admin.payment.notifyUrl')}
                    value={paymentConfig.notifyUrl}
                    onChange={(value) => setPaymentConfig({ ...paymentConfig, notifyUrl: value })}
                    className="text-xs"
                  />
                </div>

                {paymentConfig.provider === 'epay' && (
                  <div
                    className={cn(
                      'p-3 rounded-xl border',
                      isDarkMode
                        ? 'border-neutral-800 bg-neutral-900/50'
                        : 'border-neutral-200 bg-neutral-50',
                    )}
                  >
                    <h4
                      className={cn(
                        'text-xs font-medium mb-3',
                        isDarkMode ? 'text-white' : 'text-black',
                      )}
                    >
                      易支付配置
                    </h4>
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
                          paymentConfig.epay.hasCredentials
                            ? '已设置 (留空保持不变)'
                            : '请输入商户密钥'
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
                  <div
                    className={cn(
                      'p-3 rounded-xl border',
                      isDarkMode
                        ? 'border-neutral-800 bg-neutral-900/50'
                        : 'border-neutral-200 bg-neutral-50',
                    )}
                  >
                    <h4
                      className={cn(
                        'text-xs font-medium mb-3',
                        isDarkMode ? 'text-white' : 'text-black',
                      )}
                    >
                      微信支付配置
                    </h4>
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
                          paymentConfig.wechat.hasCredentials
                            ? '已设置 (留空保持不变)'
                            : '请输入 API Key'
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
                          paymentConfig.wechat.hasCredentials
                            ? '已设置 (留空保持不变)'
                            : '请输入私钥内容'
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
                  <div
                    className={cn(
                      'p-3 rounded-xl border',
                      isDarkMode
                        ? 'border-neutral-800 bg-neutral-900/50'
                        : 'border-neutral-200 bg-neutral-50',
                    )}
                  >
                    <h4
                      className={cn(
                        'text-xs font-medium mb-3',
                        isDarkMode ? 'text-white' : 'text-black',
                      )}
                    >
                      支付宝配置
                    </h4>
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
                          paymentConfig.alipay.hasCredentials
                            ? '已设置 (留空保持不变)'
                            : '请输入应用私钥'
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
                          paymentConfig.alipay.hasCredentials
                            ? '已设置 (留空保持不变)'
                            : '请输入支付宝公钥'
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
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={deleteConfirm.show}
        onClose={() => setDeleteConfirm({ show: false, user: null })}
        onConfirm={handleDeleteUser}
        title={t('admin.deleteUser.title')}
        message={
          t('admin.deleteUser.message') +
          (deleteConfirm.user
            ? `\n\n${deleteConfirm.user.full_name || deleteConfirm.user.username || deleteConfirm.user.email}`
            : '')
        }
        confirmText={t('admin.deleteUser.confirm')}
        cancelText={t('admin.deleteUser.cancel')}
        type="danger"
      />
    </Modal>
  )
}

export default AdminPanelModal
