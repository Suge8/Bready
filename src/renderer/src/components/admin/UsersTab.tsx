import React from 'react'
import { motion } from 'framer-motion'
import { ChevronDown, ChevronLeft, ChevronRight, Check, Search, Trash2 } from 'lucide-react'
import { cn } from '../../lib/utils'
import UserLevelBadge from '../UserLevelBadge'
import type { UserProfile, UserLevel, DeleteConfirm } from './types'

interface UsersTabProps {
  isDarkMode: boolean
  users: UserProfile[]
  loading: boolean
  searchTerm: string
  setSearchTerm: (term: string) => void
  currentPage: number
  setCurrentPage: (page: number) => void
  showRoleDropdown: string | null
  setShowRoleDropdown: (id: string | null) => void
  setDeleteConfirm: (confirm: DeleteConfirm) => void
  handleUpdateUserLevel: (userId: string, level: UserLevel) => void
  currentUserId?: string
  profileLevel?: UserLevel
  t: (key: string) => string
  locale: string
}

const userLevels: UserLevel[] = ['小白', '螺丝钉', '大牛', '管理', '超级']
const usersPerPage = 10

export const UsersTab: React.FC<UsersTabProps> = ({
  isDarkMode,
  users,
  loading,
  searchTerm,
  setSearchTerm,
  currentPage,
  setCurrentPage,
  showRoleDropdown,
  setShowRoleDropdown,
  setDeleteConfirm,
  handleUpdateUserLevel,
  currentUserId,
  profileLevel,
  t,
  locale,
}) => {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' })
  }

  const formatNumber = (num: number) => num.toLocaleString(locale)

  const canManageUser = (targetUser: UserProfile) => {
    if (profileLevel === '超级') return true
    if (profileLevel === '管理') {
      return targetUser.user_level !== '超级' && targetUser.user_level !== '管理'
    }
    return false
  }

  const filteredUsers = users.filter((u) => {
    if (!searchTerm) return true
    const keyword = searchTerm.toLowerCase()
    const name = (u.full_name || u.username || '').toLowerCase()
    return name.includes(keyword) || u.email?.toLowerCase().includes(keyword)
  })

  const totalUsers = users.length
  const activeMembers = users.filter((u) => (u.remaining_interview_minutes || 0) > 0).length
  const remainingMinutes = users.reduce((sum, u) => sum + (u.remaining_interview_minutes || 0), 0)
  const expiringSoon = users.filter((u) => {
    if (!u.membership_expires_at) return false
    const expires = new Date(u.membership_expires_at)
    const diffDays = Math.ceil((expires.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    return diffDays >= 0 && diffDays <= 7
  }).length

  const totalPages = Math.ceil(filteredUsers.length / usersPerPage)
  const startIndex = (currentPage - 1) * usersPerPage
  const currentUsers = filteredUsers.slice(startIndex, startIndex + usersPerPage)

  const stats = [
    { label: t('admin.stats.totalUsers'), value: formatNumber(totalUsers) },
    { label: t('admin.stats.activeMembers'), value: formatNumber(activeMembers) },
    { label: t('admin.stats.remainingMinutes'), value: formatNumber(remainingMinutes) },
    { label: t('admin.stats.expiringSoon'), value: formatNumber(expiringSoon) },
  ]

  return (
    <>
      <div
        className={cn(
          'px-4 py-3 border-b flex-shrink-0',
          isDarkMode ? 'border-neutral-800' : 'border-neutral-200',
        )}
      >
        <div className="grid grid-cols-4 gap-2 mb-3">
          {stats.map((stat, index) => (
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
                className={cn('text-lg font-semibold', isDarkMode ? 'text-white' : 'text-black')}
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
            onChange={(e) => setSearchTerm(e.target.value)}
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
                  {userItem.full_name?.[0] || userItem.username?.[0] || userItem.email?.[0] || '?'}
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

              {canManageUser(userItem) && userItem.id !== currentUserId && (
                <div className="relative flex items-center gap-1">
                  {profileLevel === '超级' && (
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setDeleteConfirm({ show: true, user: userItem })}
                      className={cn(
                        'p-1.5 rounded-lg transition-colors cursor-pointer',
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
                      setShowRoleDropdown(showRoleDropdown === userItem.id ? null : userItem.id)
                    }
                    className={cn(
                      'p-1.5 rounded-lg transition-colors cursor-pointer',
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
                        if (profileLevel === '管理' && (level === '超级' || level === '管理'))
                          return null
                        return (
                          <button
                            key={level}
                            onClick={() => handleUpdateUserLevel(userItem.id, level)}
                            className={cn(
                              'w-full text-left px-3 py-1.5 text-xs transition-colors flex items-center justify-between cursor-pointer',
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
          isDarkMode ? 'border-neutral-800 text-gray-500' : 'border-neutral-200 text-gray-500',
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
                'p-1 rounded transition-colors disabled:opacity-30 cursor-pointer',
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
                'p-1 rounded transition-colors disabled:opacity-30 cursor-pointer',
                isDarkMode ? 'hover:bg-white/5' : 'hover:bg-black/5',
              )}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </>
  )
}
