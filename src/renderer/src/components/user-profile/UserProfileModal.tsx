import React, { useState, useEffect, lazy, Suspense, useCallback, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CreditCard, History, Settings, LogOut } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useI18n } from '../../contexts/I18nContext'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../ui/theme-provider'
import {
  authService,
  membershipService,
  paymentService,
  type MembershipPackage,
} from '../../lib/supabase'
import { Modal } from '../ui/Modal'
import { PaymentModal } from '../PaymentModal'
import { useUserProfile } from './hooks/useUserProfile'
import ProfileHeader from './ProfileHeader'
import MembershipCard from './MembershipCard'
import PackageList from './PackageList'
import AppearanceSettings from './AppearanceSettings'
import SecuritySettings from './SecuritySettings'
import { HistoryListSkeleton } from './SkeletonLoaders'

const UsageHistory = lazy(() => import('./UsageHistory'))
const PurchaseHistory = lazy(() => import('./PurchaseHistory'))

type TabId = 'membership' | 'history' | 'settings'
type HistorySubTab = 'usage' | 'purchase'

interface UserProfileModalProps {
  onClose: () => void
  onOpenAdminPanel?: () => void
}

const tabs: Array<{ id: TabId; icon: typeof CreditCard; labelKey: string }> = [
  { id: 'membership', icon: CreditCard, labelKey: 'profile.tabs.membership' },
  { id: 'history', icon: History, labelKey: 'profile.tabs.history' },
  { id: 'settings', icon: Settings, labelKey: 'profile.tabs.settings' },
]

const TabNavigation: React.FC<{
  activeTab: TabId
  onTabChange: (tab: TabId) => void
  isDarkMode: boolean
}> = memo(({ activeTab, onTabChange, isDarkMode }) => {
  const { t } = useI18n()

  return (
    <div className="relative flex items-center gap-1 p-1 rounded-full bg-black/5 dark:bg-white/5 flex-shrink-0">
      {tabs.map((tab) => {
        const Icon = tab.icon
        const isActive = activeTab === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              'relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors duration-200 cursor-pointer whitespace-nowrap z-10',
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
                layoutId="activeTabBg"
                className={cn(
                  'absolute inset-0 rounded-full',
                  isDarkMode ? 'bg-white' : 'bg-black',
                )}
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
            <Icon className="w-3.5 h-3.5 flex-shrink-0 relative z-10" />
            <span className="truncate max-w-[60px] relative z-10">{t(tab.labelKey) || tab.id}</span>
          </button>
        )
      })}
    </div>
  )
})

TabNavigation.displayName = 'TabNavigation'

const HistorySubTabs: React.FC<{
  activeSubTab: HistorySubTab
  onSubTabChange: (tab: HistorySubTab) => void
  isDarkMode: boolean
}> = memo(({ activeSubTab, onSubTabChange, isDarkMode }) => {
  const { t } = useI18n()

  return (
    <div className="relative flex gap-1 p-1 rounded-lg bg-black/5 dark:bg-white/5 mb-3">
      {(['usage', 'purchase'] as HistorySubTab[]).map((subTab) => (
        <button
          key={subTab}
          onClick={() => onSubTabChange(subTab)}
          className={cn(
            'relative px-3 py-1.5 rounded-md text-xs font-medium transition-colors duration-200 cursor-pointer z-10',
            activeSubTab === subTab
              ? isDarkMode
                ? 'text-black'
                : 'text-white'
              : isDarkMode
                ? 'text-gray-400 hover:text-gray-200'
                : 'text-gray-500 hover:text-gray-700',
          )}
        >
          {activeSubTab === subTab && (
            <motion.div
              layoutId="activeSubTabBg"
              className={cn('absolute inset-0 rounded-md', isDarkMode ? 'bg-white' : 'bg-black')}
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            />
          )}
          <span className="relative z-10">
            {subTab === 'usage'
              ? t('profile.history.usage') || '使用记录'
              : t('profile.history.purchase') || '购买记录'}
          </span>
        </button>
      ))}
    </div>
  )
})

HistorySubTabs.displayName = 'HistorySubTabs'

const UserProfileModal: React.FC<UserProfileModalProps> = ({ onClose, onOpenAdminPanel }) => {
  const { user, signOut } = useAuth()
  const { resolvedTheme } = useTheme()
  const { t } = useI18n()
  const { profile, loading: profileLoading, updateProfile, refreshProfile } = useUserProfile()

  const [activeTab, setActiveTab] = useState<TabId>('membership')
  const [historySubTab, setHistorySubTab] = useState<HistorySubTab>('usage')
  const [packages, setPackages] = useState<MembershipPackage[]>([])
  const [packagesLoading, setPackagesLoading] = useState(true)
  const [signingOut, setSigningOut] = useState(false)
  const [paymentModal, setPaymentModal] = useState<{
    isOpen: boolean
    orderNo: string
    payUrl?: string
    qrcodeUrl?: string
    amount: number
  } | null>(null)

  const isDarkMode = resolvedTheme === 'dark'
  const isAdmin = profile?.user_level === '管理' || profile?.user_level === '超级'

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

  const handlePurchase = useCallback(
    async (packageId: string) => {
      if (!user || !profile) return
      try {
        const result = await paymentService.createOrder(user.id, packageId)
        if (result.success && result.orderNo) {
          setPaymentModal({
            isOpen: true,
            orderNo: result.orderNo,
            payUrl: result.payUrl,
            qrcodeUrl: result.qrcodeUrl,
            amount: result.amount || 0,
          })
        } else {
          alert(result.error || t('alerts.purchaseFailed'))
        }
      } catch (error) {
        console.error('Error creating payment order:', error)
        alert(t('alerts.purchaseFailed'))
      }
    },
    [user, profile, refreshProfile, t],
  )

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

  const renderTabContent = () => {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.15 }}
        >
          {activeTab === 'membership' && (
            <div className="h-full flex flex-col gap-3">
              <ProfileHeader
                profile={profile}
                loading={profileLoading}
                isDarkMode={isDarkMode}
                onAvatarChange={async (avatarId) => {
                  await updateProfile({ avatar_url: avatarId })
                }}
                onNameChange={async (name) => {
                  return await updateProfile({ full_name: name })
                }}
                editable={true}
              />
              <MembershipCard profile={profile} loading={profileLoading} isDarkMode={isDarkMode} />
              <div className="flex-1">
                <PackageList
                  packages={packages}
                  userLevel={profile?.user_level || '小白'}
                  loading={packagesLoading}
                  isDarkMode={isDarkMode}
                  onPurchase={handlePurchase}
                />
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div>
              <HistorySubTabs
                activeSubTab={historySubTab}
                onSubTabChange={setHistorySubTab}
                isDarkMode={isDarkMode}
              />
              <Suspense fallback={<HistoryListSkeleton isDarkMode={isDarkMode} count={3} />}>
                {historySubTab === 'usage' ? (
                  <UsageHistory isDarkMode={isDarkMode} />
                ) : (
                  <PurchaseHistory isDarkMode={isDarkMode} />
                )}
              </Suspense>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-3">
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
      className="p-0 w-full max-w-[560px] h-auto max-h-[90vh] flex flex-col overflow-hidden"
    >
      <div className={cn('h-full flex flex-col', isDarkMode ? 'bg-black' : 'bg-white')}>
        <div
          className={cn(
            'flex items-center justify-between px-4 py-3 border-b flex-shrink-0',
            isDarkMode ? 'border-neutral-800' : 'border-neutral-200',
          )}
        >
          <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} isDarkMode={isDarkMode} />
          <div className="flex items-center gap-2">
            {isAdmin && onOpenAdminPanel && (
              <button
                onClick={onOpenAdminPanel}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer',
                  isDarkMode
                    ? 'text-gray-400 hover:text-white hover:bg-white/5 border border-neutral-800'
                    : 'text-gray-500 hover:text-black hover:bg-black/5 border border-neutral-200',
                )}
              >
                <Settings className="w-3.5 h-3.5" />
                {t('profile.admin')}
              </button>
            )}
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer',
                isDarkMode
                  ? 'text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-neutral-800'
                  : 'text-red-500 hover:text-red-600 hover:bg-red-50 border border-neutral-200',
                signingOut && 'opacity-50 cursor-not-allowed',
              )}
            >
              {signingOut ? (
                <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <LogOut className="w-3.5 h-3.5" />
              )}
              {t('profile.logout')}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden p-4">{renderTabContent()}</div>
      </div>

      {paymentModal && (
        <PaymentModal
          isOpen={paymentModal.isOpen}
          onClose={() => setPaymentModal(null)}
          orderNo={paymentModal.orderNo}
          payUrl={paymentModal.payUrl}
          qrcodeUrl={paymentModal.qrcodeUrl}
          amount={paymentModal.amount}
          onPaymentSuccess={async () => {
            setPaymentModal(null)
            await refreshProfile()
          }}
        />
      )}
    </Modal>
  )
}

export default UserProfileModal
