import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Users,
  Clock,
  ChevronDown,
  Check,
  ChevronLeft,
  ChevronRight,
  Search,
  UserCheck,
  Mail,
  TrendingUp,
  Settings,
  CreditCard,
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
} from '../lib/supabase'
import UserLevelBadge from './UserLevelBadge'
import { useI18n } from '../contexts/I18nContext'
import { useTheme } from './ui/theme-provider'
import { Modal } from './ui/Modal'
import { ToastNotification } from './ui/notifications'
import { Input } from './ui/input'
import { Button } from './ui/button'

interface AdminPanelModalProps {
  onClose: () => void
  onBack?: () => void
}

type TabType = 'users' | 'usage' | 'email' | 'ai' | 'payment'

interface UsageRecordWithUser extends InterviewUsageRecord {
  full_name?: string
  username?: string
  email?: string
}

const AdminPanelModal: React.FC<AdminPanelModalProps> = ({ onClose, onBack }) => {
  const { user, profile } = useAuth()
  const { t, locale } = useI18n()
  const { resolvedTheme } = useTheme()
  const [toast, setToast] = useState<{
    message: string
    type: 'success' | 'error' | 'warning' | 'info'
  } | null>(null)

  const showToast = (
    message: string,
    type: 'success' | 'error' | 'warning' | 'info' = 'success',
  ) => {
    setToast({ message, type })
  }

  const [activeTab, setActiveTab] = useState<TabType>('users')
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(false)
  const [showRoleDropdown, setShowRoleDropdown] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const isDarkMode = resolvedTheme === 'dark'

  const [currentPage, setCurrentPage] = useState(1)
  const usersPerPage = 10

  const [usageRecords, setUsageRecords] = useState<UsageRecordWithUser[]>([])
  const [usageLoading, setUsageLoading] = useState(false)

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

  useEffect(() => {
    if (activeTab === 'ai') {
      loadAiConfig()
    } else if (activeTab === 'payment') {
      loadPaymentConfig()
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

  const handleSaveAiConfig = async () => {
    try {
      const result = await settingsService.updateAiConfig(aiConfig)
      if (result.success) {
        showToast(t('alerts.saveSuccess') || '保存成功', 'success')
      } else {
        showToast(result.error || t('alerts.saveFailed') || '保存失败', 'error')
      }
    } catch (error) {
      console.error('Failed to save AI config', error)
      showToast(t('alerts.saveFailed') || '保存失败', 'error')
    }
  }

  const handleTestAiConnection = async () => {
    try {
      const result = await settingsService.testAiConnection(aiConfig.provider)
      if (result.success) {
        showToast(t('alerts.testSuccess') || '连接测试成功', 'success')
      } else {
        showToast(result.error || '连接测试失败', 'error')
      }
    } catch (error) {
      console.error('Failed to test AI connection', error)
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

  const [emailConfig, setEmailConfig] = useState({
    smtpServer: 'smtp.qq.com',
    port: '465',
    senderEmail: 'nnyless@foxmail.com',
    authCode: 'myckcqpjqedgdjhi',
    enableSsl: true,
  })

  useEffect(() => {
    const savedConfig = localStorage.getItem('email_config')
    if (savedConfig) {
      try {
        setEmailConfig((prev) => ({ ...prev, ...JSON.parse(savedConfig) }))
      } catch (e) {
        console.error('Failed to parse email config', e)
      }
    }
  }, [])

  const handleEmailConfigChange = (key: string, value: any) => {
    setEmailConfig((prev) => ({ ...prev, [key]: value }))
  }

  const handleSaveEmailConfig = () => {
    localStorage.setItem('email_config', JSON.stringify(emailConfig))
    showToast('设置已保存', 'success')
  }

  const handleTestEmailConnection = () => {
    showToast('测试连接功能尚未实现', 'warning')
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
    { id: 'email' as TabType, label: t('admin.tabs.email') || '邮箱设置', icon: Mail },
    { id: 'ai' as TabType, label: 'AI 设置', icon: Settings },
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
                        <div className="relative">
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
                            {data.records.slice(0, 3).map((record) => (
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
                              <div className="text-xs text-gray-400 text-center py-1">
                                +{data.records.length - 3}{' '}
                                {t('profile.history.loadMore') || '更多记录'}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'email' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="flex-1 p-4 flex flex-col"
            >
              <div className="text-center mb-4">
                <h3
                  className={cn(
                    'text-sm font-semibold',
                    isDarkMode ? 'text-white' : 'text-gray-900',
                  )}
                >
                  {t('admin.email.title')}
                </h3>
                <p
                  className={cn(
                    'text-[10px] mt-0.5',
                    isDarkMode ? 'text-zinc-500' : 'text-gray-400',
                  )}
                >
                  {t('admin.email.subtitle')}
                </p>
              </div>

              <div className="flex gap-3 flex-1">
                <div
                  className={cn(
                    'flex-1 p-3 rounded-xl border',
                    isDarkMode ? 'border-zinc-800 bg-zinc-900/50' : 'border-gray-200 bg-gray-50/50',
                  )}
                >
                  <h4
                    className={cn(
                      'text-[11px] font-medium mb-2.5 flex items-center gap-1.5',
                      isDarkMode ? 'text-zinc-300' : 'text-gray-700',
                    )}
                  >
                    <Mail className="w-3 h-3" />
                    {t('admin.email.smtp.title')}
                  </h4>
                  <div className="space-y-2">
                    <Input
                      label={t('admin.email.smtp.server')}
                      value={emailConfig.smtpServer}
                      placeholder={t('admin.email.smtp.serverPlaceholder')}
                      onChange={(e) => handleEmailConfigChange('smtpServer', e.target.value)}
                      className="text-xs"
                    />
                    <div className="flex gap-2">
                      <div className="w-20">
                        <Input
                          label={t('admin.email.smtp.port')}
                          value={emailConfig.port}
                          onChange={(e) => handleEmailConfigChange('port', e.target.value)}
                          className="text-xs"
                        />
                      </div>
                      <div className="flex items-end pb-1.5">
                        <label
                          className={cn(
                            'flex items-center gap-1.5 text-[10px] cursor-pointer',
                            isDarkMode ? 'text-zinc-400' : 'text-gray-500',
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={emailConfig.enableSsl}
                            onChange={(e) => handleEmailConfigChange('enableSsl', e.target.checked)}
                            className="rounded w-3 h-3"
                          />
                          {t('admin.email.smtp.ssl')}
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  className={cn(
                    'flex-1 p-3 rounded-xl border',
                    isDarkMode ? 'border-zinc-800 bg-zinc-900/50' : 'border-gray-200 bg-gray-50/50',
                  )}
                >
                  <h4
                    className={cn(
                      'text-[11px] font-medium mb-2.5 flex items-center gap-1.5',
                      isDarkMode ? 'text-zinc-300' : 'text-gray-700',
                    )}
                  >
                    <UserCheck className="w-3 h-3" />
                    {t('admin.email.auth.title')}
                  </h4>
                  <div className="space-y-2">
                    <Input
                      label={t('admin.email.auth.email')}
                      value={emailConfig.senderEmail}
                      placeholder={t('admin.email.auth.emailPlaceholder')}
                      onChange={(e) => handleEmailConfigChange('senderEmail', e.target.value)}
                      className="text-xs"
                    />
                    <Input
                      label={t('admin.email.auth.code')}
                      type="password"
                      value={emailConfig.authCode}
                      placeholder={t('admin.email.auth.codePlaceholder')}
                      onChange={(e) => handleEmailConfigChange('authCode', e.target.value)}
                      className="text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mt-3">
                <Button
                  variant="outline"
                  onClick={handleTestEmailConnection}
                  className="flex-1 text-xs h-8"
                >
                  {t('admin.email.actions.test')}
                </Button>
                <Button onClick={handleSaveEmailConfig} className="flex-1 text-xs h-8">
                  {t('admin.email.actions.save')}
                </Button>
              </div>
            </motion.div>
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
                  <div className="grid gap-2">
                    {aiConfig.provider === 'gemini' && (
                      <Input
                        label="API Key"
                        type="password"
                        value={aiConfig.geminiApiKey}
                        placeholder={
                          aiConfig.hasGeminiKey ? '已设置 (留空保持不变)' : '请输入 API Key'
                        }
                        onChange={(e) => setAiConfig({ ...aiConfig, geminiApiKey: e.target.value })}
                        className="text-xs"
                      />
                    )}

                    {aiConfig.provider === 'doubao' && (
                      <>
                        <Input
                          label="Chat API Key"
                          type="password"
                          value={aiConfig.doubaoChatApiKey}
                          placeholder={
                            aiConfig.hasDoubaoKey ? '已设置 (留空保持不变)' : '请输入 Chat API Key'
                          }
                          onChange={(e) =>
                            setAiConfig({ ...aiConfig, doubaoChatApiKey: e.target.value })
                          }
                          className="text-xs"
                        />
                        <Input
                          label="ASR App ID"
                          value={aiConfig.doubaoAsrAppId}
                          placeholder={
                            aiConfig.hasDoubaoKey ? '已设置 (留空保持不变)' : '请输入 ASR App ID'
                          }
                          onChange={(e) =>
                            setAiConfig({ ...aiConfig, doubaoAsrAppId: e.target.value })
                          }
                          className="text-xs"
                        />
                        <Input
                          label="ASR Access Key"
                          type="password"
                          value={aiConfig.doubaoAsrAccessKey}
                          placeholder={
                            aiConfig.hasDoubaoKey
                              ? '已设置 (留空保持不变)'
                              : '请输入 ASR Access Key'
                          }
                          onChange={(e) =>
                            setAiConfig({ ...aiConfig, doubaoAsrAccessKey: e.target.value })
                          }
                          className="text-xs"
                        />
                      </>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <Button
                    variant="outline"
                    onClick={handleTestAiConnection}
                    className="flex-1 text-xs"
                  >
                    测试连接
                  </Button>
                  <Button onClick={handleSaveAiConfig} className="flex-1 text-xs">
                    保存设置
                  </Button>
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
                  <Input
                    label="回调地址 (Notify URL)"
                    value={paymentConfig.notifyUrl}
                    onChange={(e) =>
                      setPaymentConfig({ ...paymentConfig, notifyUrl: e.target.value })
                    }
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
                      <Input
                        label="商户ID (PID)"
                        value={paymentConfig.epay.pid}
                        onChange={(e) =>
                          setPaymentConfig({
                            ...paymentConfig,
                            epay: { ...paymentConfig.epay, pid: e.target.value },
                          })
                        }
                        className="text-xs"
                      />
                      <Input
                        label="商户密钥 (Key)"
                        type="password"
                        value={paymentConfig.epay.key}
                        placeholder={
                          paymentConfig.epay.hasCredentials
                            ? '已设置 (留空保持不变)'
                            : '请输入商户密钥'
                        }
                        onChange={(e) =>
                          setPaymentConfig({
                            ...paymentConfig,
                            epay: { ...paymentConfig.epay, key: e.target.value },
                          })
                        }
                        className="text-xs"
                      />
                      <Input
                        label="API 接口地址"
                        value={paymentConfig.epay.apiUrl}
                        onChange={(e) =>
                          setPaymentConfig({
                            ...paymentConfig,
                            epay: { ...paymentConfig.epay, apiUrl: e.target.value },
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
                      <Input
                        label="AppID"
                        value={paymentConfig.wechat.appid}
                        onChange={(e) =>
                          setPaymentConfig({
                            ...paymentConfig,
                            wechat: { ...paymentConfig.wechat, appid: e.target.value },
                          })
                        }
                        className="text-xs"
                      />
                      <Input
                        label="商户号 (MCHID)"
                        value={paymentConfig.wechat.mchid}
                        onChange={(e) =>
                          setPaymentConfig({
                            ...paymentConfig,
                            wechat: { ...paymentConfig.wechat, mchid: e.target.value },
                          })
                        }
                        className="text-xs"
                      />
                      <Input
                        label="API Key"
                        type="password"
                        value={paymentConfig.wechat.apiKey}
                        placeholder={
                          paymentConfig.wechat.hasCredentials
                            ? '已设置 (留空保持不变)'
                            : '请输入 API Key'
                        }
                        onChange={(e) =>
                          setPaymentConfig({
                            ...paymentConfig,
                            wechat: { ...paymentConfig.wechat, apiKey: e.target.value },
                          })
                        }
                        className="text-xs"
                      />
                      <Input
                        label="证书序列号 (Cert Serial)"
                        value={paymentConfig.wechat.certSerial}
                        onChange={(e) =>
                          setPaymentConfig({
                            ...paymentConfig,
                            wechat: { ...paymentConfig.wechat, certSerial: e.target.value },
                          })
                        }
                        className="text-xs"
                      />
                      <Input
                        label="私钥 (Private Key)"
                        type="password"
                        value={paymentConfig.wechat.privateKey}
                        placeholder={
                          paymentConfig.wechat.hasCredentials
                            ? '已设置 (留空保持不变)'
                            : '请输入私钥内容'
                        }
                        onChange={(e) =>
                          setPaymentConfig({
                            ...paymentConfig,
                            wechat: { ...paymentConfig.wechat, privateKey: e.target.value },
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
                      <Input
                        label="App ID"
                        value={paymentConfig.alipay.appId}
                        onChange={(e) =>
                          setPaymentConfig({
                            ...paymentConfig,
                            alipay: { ...paymentConfig.alipay, appId: e.target.value },
                          })
                        }
                        className="text-xs"
                      />
                      <Input
                        label="应用私钥 (Private Key)"
                        type="password"
                        value={paymentConfig.alipay.privateKey}
                        placeholder={
                          paymentConfig.alipay.hasCredentials
                            ? '已设置 (留空保持不变)'
                            : '请输入应用私钥'
                        }
                        onChange={(e) =>
                          setPaymentConfig({
                            ...paymentConfig,
                            alipay: { ...paymentConfig.alipay, privateKey: e.target.value },
                          })
                        }
                        className="text-xs"
                      />
                      <Input
                        label="支付宝公钥 (Public Key)"
                        type="password"
                        value={paymentConfig.alipay.publicKey}
                        placeholder={
                          paymentConfig.alipay.hasCredentials
                            ? '已设置 (留空保持不变)'
                            : '请输入支付宝公钥'
                        }
                        onChange={(e) =>
                          setPaymentConfig({
                            ...paymentConfig,
                            alipay: { ...paymentConfig.alipay, publicKey: e.target.value },
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
      {toast && (
        <ToastNotification
          message={toast.message}
          type={toast.type}
          duration={toast.type === 'error' ? 5000 : 3000}
          onClose={() => setToast(null)}
          attachToBody={false}
          className="absolute top-4 left-1/2 -translate-x-1/2 w-auto min-w-[300px]"
        />
      )}
    </Modal>
  )
}

export default AdminPanelModal
