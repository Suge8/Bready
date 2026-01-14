import React, { useState, useEffect, lazy, Suspense, useCallback, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CreditCard, History, Settings, LogOut, Shield } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useI18n } from '../../contexts/I18nContext'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../ui/theme-provider'
import {
  authService,
  membershipService,
  paymentService,
  type MembershipPackage,
} from '../../lib/api-client'
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
  isOpen: boolean
  onClose: () => void
  onOpenAdminPanel?: () => void
  onSignOutStart?: () => void
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

const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  onOpenAdminPanel,
  onSignOutStart,
}) => {
  const { user, signOut } = useAuth()
  const { resolvedTheme } = useTheme()
  const { t } = useI18n()
  const { profile, loading: profileLoading, updateProfile, refreshProfile } = useUserProfile()

  const [activeTab, setActiveTab] = useState<TabId>('membership')
  const [historySubTab, setHistorySubTab] = useState<HistorySubTab>('usage')
  const [packages, setPackages] = useState<MembershipPackage[]>([])
  const [packagesLoading, setPackagesLoading] = useState(true)
  const [signingOut, setSigningOut] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
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

  const handleSignOutClick = useCallback(() => {
    setShowLogoutConfirm(true)
  }, [])

  const executeSignOut = useCallback(async () => {
    if (signingOut) return
    setSigningOut(true)

    setShowLogoutConfirm(false)
    await new Promise((resolve) => setTimeout(resolve, 100))

    onClose()
    await new Promise((resolve) => setTimeout(resolve, 50))

    onSignOutStart?.()
    await new Promise((resolve) => setTimeout(resolve, 400))

    try {
      await signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    } finally {
      setSigningOut(false)
    }
  }, [signOut, onClose, onSignOutStart, signingOut])

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
        onClose()
        try {
          await signOut(600)
        } finally {
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
          className="h-full flex flex-col"
        >
          {activeTab === 'membership' && (
            <div className="h-full flex flex-col gap-2">
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
              <div className="flex-1 min-h-0">
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
            <div className="h-full flex flex-col">
              <HistorySubTabs
                activeSubTab={historySubTab}
                onSubTabChange={setHistorySubTab}
                isDarkMode={isDarkMode}
              />
              <div className="flex-1 overflow-y-auto overflow-x-hidden pr-1 -mr-1">
                <Suspense fallback={<HistoryListSkeleton isDarkMode={isDarkMode} count={5} />}>
                  {historySubTab === 'usage' ? (
                    <UsageHistory isDarkMode={isDarkMode} />
                  ) : (
                    <PurchaseHistory isDarkMode={isDarkMode} />
                  )}
                </Suspense>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="h-full flex flex-col gap-2">
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
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      className="p-0 w-full max-w-[560px] h-[520px] flex flex-col overflow-hidden"
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
                    ? 'text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 border border-violet-500/30'
                    : 'text-violet-600 hover:text-violet-700 hover:bg-violet-50 border border-violet-200',
                )}
              >
                <Shield className="w-3.5 h-3.5" />
                {t('profile.admin')}
              </button>
            )}
            <button
              onClick={handleSignOutClick}
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

        <div className="flex-1 overflow-hidden p-4 flex flex-col">{renderTabContent()}</div>
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

      <AnimatePresence>
        {showLogoutConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 z-[100] flex items-center justify-center bg-black/50"
            onClick={() => !signingOut && setShowLogoutConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0, y: -30 }}
              transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
              className={cn(
                'w-[340px] rounded-2xl overflow-hidden relative',
                isDarkMode ? 'bg-[#0a0a0a] text-white' : 'bg-white text-black',
              )}
              style={{
                boxShadow: isDarkMode
                  ? '0 0 0 1px rgba(255,255,255,0.08), 0 24px 48px -12px rgba(0,0,0,0.8)'
                  : '0 0 0 1px rgba(0,0,0,0.06), 0 24px 48px -12px rgba(0,0,0,0.25)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <motion.div
                className={cn(
                  'h-1 w-full',
                  isDarkMode
                    ? 'bg-gradient-to-r from-red-500/80 via-orange-500/80 to-red-500/80'
                    : 'bg-gradient-to-r from-red-400 via-orange-400 to-red-400',
                )}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.1, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              />

              <div className="p-6 flex flex-col gap-5">
                <motion.div
                  className="flex justify-center"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{
                    type: 'spring',
                    stiffness: 400,
                    damping: 20,
                    delay: 0.15,
                  }}
                >
                  <div
                    className={cn(
                      'w-14 h-14 rounded-full flex items-center justify-center',
                      isDarkMode ? 'bg-red-500/10' : 'bg-red-50',
                    )}
                  >
                    <LogOut
                      className={cn('w-6 h-6', isDarkMode ? 'text-red-400' : 'text-red-500')}
                    />
                  </div>
                </motion.div>

                <motion.div
                  className="flex flex-col gap-2 text-center"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.3 }}
                >
                  <h3 className="font-semibold text-lg tracking-tight">
                    {t('profile.signOutConfirm.title')}
                  </h3>
                  <p
                    className={cn(
                      'text-sm leading-relaxed',
                      isDarkMode ? 'text-neutral-400' : 'text-neutral-500',
                    )}
                  >
                    {t('profile.signOutConfirm.description')}
                  </p>
                </motion.div>

                <motion.div
                  className="flex gap-3 pt-1"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25, duration: 0.3 }}
                >
                  <motion.button
                    onClick={() => setShowLogoutConfirm(false)}
                    className={cn(
                      'flex-1 px-4 py-3 rounded-xl text-sm font-medium cursor-pointer relative overflow-hidden group',
                      isDarkMode
                        ? 'bg-neutral-900 text-neutral-300'
                        : 'bg-neutral-100 text-neutral-600',
                    )}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  >
                    <span
                      className={cn(
                        'absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300',
                        isDarkMode ? 'bg-neutral-800' : 'bg-neutral-200',
                      )}
                    />
                    <span className="relative z-10 group-hover:text-current transition-colors duration-200">
                      {t('profile.signOutConfirm.cancel')}
                    </span>
                  </motion.button>

                  <motion.button
                    onClick={executeSignOut}
                    disabled={signingOut}
                    className={cn(
                      'flex-1 px-4 py-3 rounded-xl text-sm font-medium cursor-pointer flex items-center justify-center gap-2 relative overflow-hidden group',
                      isDarkMode ? 'bg-white text-black' : 'bg-black text-white',
                      signingOut && 'opacity-70 cursor-not-allowed',
                    )}
                    whileHover={signingOut ? {} : { scale: 1.02, y: -2 }}
                    whileTap={signingOut ? {} : { scale: 0.98 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    style={{
                      boxShadow: isDarkMode
                        ? '0 4px 12px rgba(255,255,255,0.15)'
                        : '0 4px 12px rgba(0,0,0,0.2)',
                    }}
                  >
                    <motion.span
                      className={cn(
                        'absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300',
                        isDarkMode
                          ? 'bg-gradient-to-r from-neutral-200 to-white'
                          : 'bg-gradient-to-r from-neutral-800 to-black',
                      )}
                    />
                    <span className="relative z-10 flex items-center gap-2">
                      {signingOut ? (
                        <motion.span
                          className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
                          animate={{ rotate: 360 }}
                          transition={{
                            duration: 0.8,
                            repeat: Infinity,
                            ease: 'linear',
                          }}
                        />
                      ) : (
                        <LogOut className="w-4 h-4" />
                      )}
                      {t('profile.signOutConfirm.confirm')}
                    </span>
                  </motion.button>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  )
}

export default UserProfileModal
