import React, { useState, useEffect, lazy, Suspense, useCallback, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { User, CreditCard, History, Settings, LogOut } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useI18n } from '../../contexts/I18nContext'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../ui/theme-provider'
import { authService, membershipService, type MembershipPackage } from '../../lib/supabase'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/button'
import { useUserProfile } from './hooks/useUserProfile'
import ProfileHeader from './ProfileHeader'
import ProfileEditor from './ProfileEditor'
import MembershipCard from './MembershipCard'
import PackageList from './PackageList'
import AppearanceSettings from './AppearanceSettings'
import SecuritySettings from './SecuritySettings'
import { HistoryListSkeleton } from './SkeletonLoaders'

// 懒加载历史记录组件
const UsageHistory = lazy(() => import('./UsageHistory'))
const PurchaseHistory = lazy(() => import('./PurchaseHistory'))

type TabId = 'profile' | 'membership' | 'history' | 'settings'
type HistorySubTab = 'usage' | 'purchase'

interface UserProfileModalProps {
  onClose: () => void
  onOpenAdminPanel?: () => void
}

// Tab 配置
const tabs: Array<{ id: TabId; icon: typeof User; labelKey: string }> = [
  { id: 'profile', icon: User, labelKey: 'profile.tabs.profile' },
  { id: 'membership', icon: CreditCard, labelKey: 'profile.tabs.membership' },
  { id: 'history', icon: History, labelKey: 'profile.tabs.history' },
  { id: 'settings', icon: Settings, labelKey: 'profile.tabs.settings' },
]

// Tab 导航组件
const TabNavigation: React.FC<{
  activeTab: TabId
  onTabChange: (tab: TabId) => void
  isDarkMode: boolean
}> = memo(({ activeTab, onTabChange, isDarkMode }) => {
  const { t } = useI18n()

  return (
    <div
      className={cn(
        'flex gap-1 p-1 rounded-xl border mb-6',
        isDarkMode ? 'border-gray-800 bg-gray-900/50' : 'border-gray-200 bg-gray-50',
      )}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon
        const isActive = activeTab === tab.id

        return (
          <motion.button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              'relative flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg',
              'text-sm font-medium transition-colors cursor-pointer',
              isActive
                ? ''
                : isDarkMode
                  ? 'text-gray-400 hover:text-gray-200'
                  : 'text-gray-500 hover:text-gray-700',
            )}
          >
            {/* 活动指示器动画 */}
            {isActive && (
              <motion.div
                layoutId="activeTabIndicator"
                className={cn('absolute inset-0 rounded-lg', isDarkMode ? 'bg-white' : 'bg-black')}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              />
            )}

            <Icon
              className={cn(
                'relative w-4 h-4',
                isActive && (isDarkMode ? 'text-black' : 'text-white'),
              )}
            />
            <span
              className={cn(
                'relative hidden sm:inline',
                isActive && (isDarkMode ? 'text-black' : 'text-white'),
              )}
            >
              {t(tab.labelKey) || tab.id}
            </span>
          </motion.button>
        )
      })}
    </div>
  )
})

TabNavigation.displayName = 'TabNavigation'

// 历史记录子 Tab
const HistorySubTabs: React.FC<{
  activeSubTab: HistorySubTab
  onSubTabChange: (tab: HistorySubTab) => void
  isDarkMode: boolean
}> = memo(({ activeSubTab, onSubTabChange, isDarkMode }) => {
  const { t } = useI18n()

  return (
    <div className={cn('flex gap-2 mb-4')}>
      {(['usage', 'purchase'] as HistorySubTab[]).map((subTab) => (
        <motion.button
          key={subTab}
          onClick={() => onSubTabChange(subTab)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-medium transition-all',
            activeSubTab === subTab
              ? isDarkMode
                ? 'bg-white text-black'
                : 'bg-black text-white'
              : isDarkMode
                ? 'bg-gray-900 text-gray-400 hover:bg-gray-800'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
          )}
        >
          {subTab === 'usage'
            ? t('profile.history.usage') || '使用记录'
            : t('profile.history.purchase') || '购买记录'}
        </motion.button>
      ))}
    </div>
  )
})

HistorySubTabs.displayName = 'HistorySubTabs'

const UserProfileModal: React.FC<UserProfileModalProps> = ({ onClose, onOpenAdminPanel }) => {
  const { user, signOut } = useAuth()
  const { theme } = useTheme()
  const { t } = useI18n()
  const { profile, loading: profileLoading, updateProfile, refreshProfile } = useUserProfile()

  const [activeTab, setActiveTab] = useState<TabId>('profile')
  const [historySubTab, setHistorySubTab] = useState<HistorySubTab>('usage')
  const [packages, setPackages] = useState<MembershipPackage[]>([])
  const [packagesLoading, setPackagesLoading] = useState(true)
  const [signingOut, setSigningOut] = useState(false)

  // 判断深色模式
  const isDarkMode =
    theme === 'dark' ||
    (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  // 是否管理员
  const isAdmin = profile?.user_level === '管理' || profile?.user_level === '超级'

  // 加载套餐
  useEffect(() => {
    const loadPackages = async () => {
      try {
        const data = await membershipService.getPackages()
        setPackages(data)
      } catch (error) {
        console.error('Error loading packages:', error)
      } finally {
        setPackagesLoading(false)
      }
    }
    loadPackages()
  }, [])

  // 处理登出
  const handleSignOut = useCallback(async () => {
    setSigningOut(true)
    try {
      await signOut()
      onClose()
    } catch (error) {
      console.error('Error signing out:', error)
    } finally {
      setSigningOut(false)
    }
  }, [signOut, onClose])

  // 处理购买套餐
  const handlePurchase = useCallback(
    async (packageId: string) => {
      if (!user || !profile) return

      try {
        await membershipService.purchasePackage(user.id, packageId, profile.user_level)
        await refreshProfile()
      } catch (error) {
        console.error('Error purchasing package:', error)
        alert(t('alerts.purchaseFailed'))
      }
    },
    [user, profile, refreshProfile, t],
  )

  // 安全设置处理器 - 待后端 API 接入
  const handleChangePassword = useCallback(
    async (oldPassword: string, newPassword: string) => {
      const result = await authService.changePassword(oldPassword, newPassword)
      if (result.success) {
        try {
          await signOut()
        } finally {
          onClose()
        }
      }
      return result
    },
    [signOut, onClose],
  )

  const handleSendPhoneCode = useCallback(async (phone: string) => {
    return await authService.sendPhoneCode(phone)
  }, [])

  const handleBindPhone = useCallback(
    async (phone: string, code: string) => {
      const result = await authService.bindPhone(phone, code)
      if (result.success) {
        await refreshProfile()
      }
      return result
    },
    [refreshProfile],
  )

  const handleBindEmail = useCallback(
    async (email: string) => {
      const result = await authService.bindEmail(email)
      if (result.success) {
        await refreshProfile()
      }
      return result
    },
    [refreshProfile],
  )

  // Tab 内容渲染
  const renderTabContent = () => {
    const contentVariants = {
      initial: { opacity: 0, x: 20 },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: -20 },
    }

    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          variants={contentVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.2 }}
          className="flex-1 overflow-y-auto scrollbar-thin"
        >
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <ProfileHeader
                profile={profile}
                loading={profileLoading}
                isDarkMode={isDarkMode}
                onAvatarChange={async (avatarId) => {
                  await updateProfile({ avatar_url: avatarId })
                }}
                editable={true}
              />
              <ProfileEditor profile={profile} isDarkMode={isDarkMode} onSave={updateProfile} />
            </div>
          )}

          {activeTab === 'membership' && (
            <div className="space-y-4">
              <MembershipCard profile={profile} loading={profileLoading} isDarkMode={isDarkMode} />
              <PackageList
                packages={packages}
                userLevel={profile?.user_level || '小白'}
                loading={packagesLoading}
                isDarkMode={isDarkMode}
                onPurchase={handlePurchase}
              />
            </div>
          )}

          {activeTab === 'history' && (
            <div>
              <HistorySubTabs
                activeSubTab={historySubTab}
                onSubTabChange={setHistorySubTab}
                isDarkMode={isDarkMode}
              />
              <Suspense fallback={<HistoryListSkeleton isDarkMode={isDarkMode} count={5} />}>
                <AnimatePresence mode="wait">
                  {historySubTab === 'usage' ? (
                    <motion.div
                      key="usage"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <UsageHistory isDarkMode={isDarkMode} />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="purchase"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <PurchaseHistory isDarkMode={isDarkMode} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </Suspense>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-4">
              <AppearanceSettings loading={false} isDarkMode={isDarkMode} />
              <SecuritySettings
                profile={profile}
                isDarkMode={isDarkMode}
                onChangePassword={handleChangePassword}
                onSendPhoneCode={handleSendPhoneCode}
                onBindPhone={handleBindPhone}
                onBindEmail={handleBindEmail}
              />
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    )
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      size="xl"
      className="p-0 w-[90vw] max-w-[1024px] h-[85vh] flex flex-col overflow-hidden"
    >
      <div className={cn('flex-1 min-h-0 flex flex-col p-6', isDarkMode ? 'bg-black' : 'bg-white')}>
        {/* 标题栏 */}
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <h2 className={cn('text-xl font-semibold', isDarkMode ? 'text-white' : 'text-gray-900')}>
            {t('profile.title')}
          </h2>
        </div>

        {/* Tab 导航 */}
        <div className="flex-shrink-0">
          <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} isDarkMode={isDarkMode} />
        </div>

        {/* Tab 内容区域 - 确保可滚动 */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">{renderTabContent()}</div>

        {/* 底部操作栏 */}
        <div
          className={cn(
            'mt-4 pt-4 border-t flex-shrink-0',
            isDarkMode ? 'border-gray-800' : 'border-gray-200',
          )}
        >
          <div className="flex gap-3">
            {isAdmin && onOpenAdminPanel && (
              <Button onClick={onOpenAdminPanel} variant="outline" className="flex-1">
                <Settings className="w-4 h-4" />
                {t('profile.admin')}
              </Button>
            )}
            <Button
              onClick={handleSignOut}
              disabled={signingOut}
              variant="danger"
              className={isAdmin && onOpenAdminPanel ? 'flex-1' : 'w-full'}
            >
              {signingOut ? (
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <LogOut className="w-4 h-4" />
              )}
              {t('profile.logout')}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

export default UserProfileModal
