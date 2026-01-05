import React, { useState, useEffect } from 'react'
import { ArrowLeft, Users, Clock, ChevronDown, Check, ChevronLeft, ChevronRight, Search, UserCheck, Timer, TrendingUp } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { userProfileService, type UserProfile, type UserLevel } from '../lib/supabase'
import UserLevelBadge from './UserLevelBadge'
import { useI18n } from '../contexts/I18nContext'
import { Modal } from './ui/Modal'

interface AdminPanelModalProps {
  onClose: () => void
  onBack?: () => void // 返回个人中心
}

type TabType = 'users' | 'usage'

const AdminPanelModal: React.FC<AdminPanelModalProps> = ({ onClose, onBack }) => {
  const { user, profile } = useAuth()
  const { t, locale } = useI18n()
  const [activeTab, setActiveTab] = useState<TabType>('users')
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(false)
  const [showRoleDropdown, setShowRoleDropdown] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1)
  const usersPerPage = 10

  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers()
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
      alert(t('alerts.loadUsersFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateUserLevel = async (userId: string, newLevel: UserLevel) => {
    if (profile?.user_level !== '超级' && profile?.user_level !== '管理') {
      alert(t('alerts.onlyAdmin'))
      return
    }

    setLoading(true)
    try {
      await userProfileService.updateUserLevel(userId, newLevel)
      await loadUsers() // 重新加载用户列表
      setShowRoleDropdown(null)
    } catch (error) {
      console.error('Error updating user level:', error)
      alert(t('alerts.updateRoleFailed'))
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
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatNumber = (value: number) => value.toLocaleString(locale)



  const userLevels: UserLevel[] = ['小白', '螺丝钉', '大牛', '管理', '超级']
  const canManageUser = (targetUser: UserProfile) => {
    if (profile?.user_level === '超级') return true
    if (profile?.user_level === '管理' && targetUser.user_level !== '超级' && targetUser.user_level !== '管理') return true
    return false
  }

  const tabs = [
    { id: 'users' as TabType, label: t('admin.tabs.users'), icon: Users },
    { id: 'usage' as TabType, label: t('admin.tabs.usage'), icon: Clock }
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
  const remainingMinutes = users.reduce((sum, userItem) => sum + (userItem.remaining_interview_minutes || 0), 0)
  const totalPurchasedMinutes = users.reduce((sum, userItem) => sum + (userItem.total_purchased_minutes || 0), 0)
  const averageRemaining = totalUsers ? Math.round(remainingMinutes / totalUsers) : 0
  const expiringSoon = users.filter((userItem) => {
    if (!userItem.membership_expires_at) return false
    const expires = new Date(userItem.membership_expires_at)
    const diffDays = (expires.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    return diffDays >= 0 && diffDays <= 7
  }).length

  // 分页计算
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage)
  const startIndex = (currentPage - 1) * usersPerPage
  const endIndex = startIndex + usersPerPage
  const currentUsers = filteredUsers.slice(startIndex, endIndex)

  // 处理返回按钮点击
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
      className="p-0 w-[90vw] max-w-[1100px] h-[85vh] max-h-[85vh] flex flex-col"
    >
      <div className="h-full bg-[var(--bready-surface)] border border-[var(--bready-border)] flex flex-col min-h-0">
        <div className="px-6 pt-6 pb-4 border-b border-[var(--bready-border)]">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={handleBack}
                className="p-2 rounded-lg border border-[var(--bready-border)] bg-[var(--bready-surface-2)] text-[var(--bready-text)] hover:bg-[var(--bready-surface-3)] transition-colors cursor-pointer"
                aria-label={t('common.back')}
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <h2 className="text-xl font-semibold text-[var(--bready-text)]">{t('admin.title')}</h2>
            </div>
            <div className="flex items-center gap-2 text-xs text-[var(--bready-text-muted)]">
              <Users className="w-4 h-4" />
              <span>{t('admin.stats.totalUsers')} {formatNumber(totalUsers)}</span>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            {tabs.map(tab => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all cursor-pointer ${activeTab === tab.id
                    ? 'bg-[var(--bready-accent)] text-[var(--bready-accent-contrast)]'
                    : 'text-[var(--bready-text-muted)] hover:text-[var(--bready-text)] hover:bg-black/5 dark:hover:bg-white/10'
                    }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex-1 overflow-hidden min-h-0">
          {activeTab === 'users' && (
            <div className="h-full flex flex-col">
              <div className="px-6 pt-5 pb-4 space-y-4">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="rounded-xl border border-[var(--bready-border)] bg-[var(--bready-surface-2)] p-3">
                    <div className="flex items-center gap-2 text-xs text-[var(--bready-text-muted)]">
                      <Users className="w-4 h-4" />
                      <span>{t('admin.stats.totalUsers')}</span>
                    </div>
                    <div className="mt-2 text-xl font-semibold text-[var(--bready-text)]">{formatNumber(totalUsers)}</div>
                  </div>
                  <div className="rounded-xl border border-[var(--bready-border)] bg-[var(--bready-surface-2)] p-3">
                    <div className="flex items-center gap-2 text-xs text-[var(--bready-text-muted)]">
                      <UserCheck className="w-4 h-4" />
                      <span>{t('admin.stats.activeMembers')}</span>
                    </div>
                    <div className="mt-2 text-xl font-semibold text-[var(--bready-text)]">{formatNumber(activeMembers)}</div>
                  </div>
                  <div className="rounded-xl border border-[var(--bready-border)] bg-[var(--bready-surface-2)] p-3">
                    <div className="flex items-center gap-2 text-xs text-[var(--bready-text-muted)]">
                      <Timer className="w-4 h-4" />
                      <span>{t('admin.stats.remainingMinutes')}</span>
                    </div>
                    <div className="mt-2 text-xl font-semibold text-[var(--bready-text)]">
                      {t('common.minutes', { count: formatNumber(remainingMinutes) })}
                    </div>
                  </div>
                  <div className="rounded-xl border border-[var(--bready-border)] bg-[var(--bready-surface-2)] p-3">
                    <div className="flex items-center gap-2 text-xs text-[var(--bready-text-muted)]">
                      <Clock className="w-4 h-4" />
                      <span>{t('admin.stats.expiringSoon')}</span>
                    </div>
                    <div className="mt-2 text-xl font-semibold text-[var(--bready-text)]">{formatNumber(expiringSoon)}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-[var(--bready-text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder={t('admin.search')}
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-[var(--bready-border)] bg-[var(--bready-surface-2)] text-sm text-[var(--bready-text)] focus:outline-none focus:ring-2 focus:ring-black/10"
                    />
                  </div>
                  <div className="text-xs text-[var(--bready-text-muted)]">
                    {formatNumber(filteredUsers.length)}
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-6 pb-4">
                <div className="space-y-3 admin-data-content">
                  {loading ? (
                    <div className="text-center py-8 text-[var(--bready-text-muted)]">{t('admin.loading')}</div>
                  ) : filteredUsers.length === 0 ? (
                    <div className="text-center py-8 text-[var(--bready-text-muted)]">{t('admin.empty')}</div>
                  ) : (
                    currentUsers.map(userItem => (
                      <div key={userItem.id} className="rounded-xl border border-[var(--bready-border)] bg-[var(--bready-surface)]/80 p-4 transition-all hover:shadow-lg">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-medium text-[var(--bready-text)] text-sm truncate">
                                {userItem.full_name || userItem.username || t('common.none')}
                              </h3>
                              <UserLevelBadge level={userItem.user_level} size="sm" showIcon={true} />
                              {userItem.id === user?.id && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-700 flex-shrink-0">
                                  {t('admin.currentUser')}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-[var(--bready-text-muted)] truncate">{userItem.email}</div>
                            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-[var(--bready-text-muted)]">
                              <span>
                                {t('admin.registered')}: {formatDate(userItem.created_at)}
                              </span>
                              <span>
                                {t('admin.remaining')}: <span className={userItem.remaining_interview_minutes > 0 ? 'text-emerald-600 font-medium' : 'text-red-500 font-medium'}>
                                  {t('common.minutes', { count: userItem.remaining_interview_minutes || 0 })}
                                </span>
                              </span>
                              <span>
                                {t('admin.membership')}: {userItem.membership_expires_at ? formatDate(userItem.membership_expires_at) : t('common.none')}
                              </span>
                            </div>
                          </div>

                          {canManageUser(userItem) && userItem.id !== user?.id && (
                            <div className="flex items-center space-x-2 ml-3 flex-shrink-0">
                              <div className="relative">
                                <button
                                  onClick={() => setShowRoleDropdown(showRoleDropdown === userItem.id ? null : userItem.id)}
                                  className="flex items-center space-x-1 px-3 py-1.5 bg-[var(--bready-surface-2)] border border-[var(--bready-border)] rounded-full text-xs hover:shadow-sm transition-colors cursor-pointer"
                                >
                                  <span>{t('admin.changeRole')}</span>
                                  <ChevronDown className="w-3 h-3" />
                                </button>

                                {showRoleDropdown === userItem.id && (
                                  <div className="absolute top-full right-0 mt-1 bg-[var(--bready-surface)] border border-[var(--bready-border)] rounded-lg shadow-lg z-10 min-w-20">
                                    {userLevels.map(level => {
                                      if (profile?.user_level === '管理' && (level === '超级' || level === '管理')) {
                                        return null
                                      }

                                      return (
                                        <button
                                          key={level}
                                          onClick={() => handleUpdateUserLevel(userItem.id, level)}
                                          className={`w-full text-left px-2 py-1.5 text-xs text-[var(--bready-text)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors first:rounded-t-lg last:rounded-b-lg cursor-pointer ${userItem.user_level === level ? 'bg-black/10 dark:bg-white/15 font-medium' : ''
                                            }`}
                                        >
                                          <div className="flex items-center justify-between">
                                            <span>{level}</span>
                                            {userItem.user_level === level && <Check className="w-3 h-3" />}
                                          </div>
                                        </button>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="border-t border-[var(--bready-border)] px-6 py-3 text-xs text-[var(--bready-text-muted)] flex items-center justify-between">
                <div>{formatNumber(filteredUsers.length)}</div>
                {filteredUsers.length > usersPerPage && (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-2 py-1 text-sm text-[var(--bready-text)] border border-[var(--bready-border)] rounded hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm text-[var(--bready-text-muted)]">
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="px-2 py-1 text-sm text-[var(--bready-text)] border border-[var(--bready-border)] rounded hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'usage' && (
            <div className="h-full overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-2xl border border-[var(--bready-border)] bg-[var(--bready-surface-2)] p-4">
                  <div className="flex items-center gap-2 text-xs text-[var(--bready-text-muted)]">
                    <TrendingUp className="w-4 h-4" />
                    <span>{t('admin.totalMinutes')}</span>
                  </div>
                  <div className="mt-3 text-2xl font-semibold text-[var(--bready-text)]">
                    {t('common.minutes', { count: formatNumber(totalPurchasedMinutes) })}
                  </div>
                </div>
                <div className="rounded-2xl border border-[var(--bready-border)] bg-[var(--bready-surface-2)] p-4">
                  <div className="flex items-center gap-2 text-xs text-[var(--bready-text-muted)]">
                    <Timer className="w-4 h-4" />
                    <span>{t('admin.avgMinutes')}</span>
                  </div>
                  <div className="mt-3 text-2xl font-semibold text-[var(--bready-text)]">
                    {t('common.minutes', { count: formatNumber(averageRemaining) })}
                  </div>
                </div>
                <div className="rounded-2xl border border-[var(--bready-border)] bg-[var(--bready-surface-2)] p-4">
                  <div className="flex items-center gap-2 text-xs text-[var(--bready-text-muted)]">
                    <Clock className="w-4 h-4" />
                    <span>{t('admin.stats.expiringSoon')}</span>
                  </div>
                  <div className="mt-3 text-2xl font-semibold text-[var(--bready-text)]">{formatNumber(expiringSoon)}</div>
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--bready-border)] bg-[var(--bready-surface)] p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-[var(--bready-text)]">{t('admin.usageHint')}</h3>
                </div>
                <div className="h-40 rounded-xl bg-[linear-gradient(90deg,rgba(0,0,0,0.05)_0%,rgba(0,0,0,0.02)_50%,rgba(0,0,0,0.05)_100%)] dark:bg-[linear-gradient(90deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.04)_50%,rgba(255,255,255,0.08)_100%)] animate-pulse" />
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}

export default AdminPanelModal
