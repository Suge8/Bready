import React, { useState, useEffect } from 'react'
import { User, Calendar, Clock, LogOut, Settings, Sun, Moon, Monitor, Globe } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { userProfileService, membershipService, type UserProfile, type MembershipPackage } from '../lib/supabase'
import { Button } from './ui/button'
import UserLevelBadge from './UserLevelBadge'
import { useTheme } from './ui/theme-provider'
import { useI18n } from '../contexts/I18nContext'
import { Modal } from './ui/Modal'

interface UserProfileModalProps {
  onClose: () => void
  onOpenAdminPanel?: () => void
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({ onClose, onOpenAdminPanel }) => {
  const { user, profile, signOut } = useAuth()
  const { theme, setTheme } = useTheme()
  const { t, languageOptions, language, setLanguage, locale } = useI18n()
  const [userProfile, setUserProfile] = useState<UserProfile | null>(profile)
  const [packages, setPackages] = useState<MembershipPackage[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadUserData()
    loadPackages()
  }, [user])

  const loadUserData = async () => {
    if (!user) return

    try {
      const profileData = await userProfileService.getProfile(user.id)
      setUserProfile(profileData)
    } catch (error) {
      console.error('Error loading user profile:', error)
    }
  }

  const loadPackages = async () => {
    try {
      const packagesData = await membershipService.getPackages()
      setPackages(packagesData)
    } catch (error) {
      console.error('Error loading packages:', error)
    }
  }

  const handleSignOut = async () => {
    setLoading(true)
    try {
      await signOut()
      onClose()
    } catch (error) {
      console.error('Error signing out:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePurchasePackage = async (packageId: string) => {
    if (!user || !userProfile) return

    setLoading(true)
    try {
      await membershipService.purchasePackage(user.id, packageId, userProfile.user_level)
      await loadUserData() // 重新加载用户数据
    } catch (error) {
      console.error('Error purchasing package:', error)
      alert(t('alerts.purchaseFailed'))
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return t('common.none')
    return new Date(dateString).toLocaleDateString(locale)
  }



  const isAdmin = userProfile?.user_level === '管理' || userProfile?.user_level === '超级'
  const isExpired = userProfile?.membership_expires_at && new Date(userProfile.membership_expires_at) < new Date()
  const themeOptions = [
    { value: 'light' as const, label: t('profile.themeOptions.light'), icon: Sun },
    { value: 'dark' as const, label: t('profile.themeOptions.dark'), icon: Moon },
    { value: 'auto' as const, label: t('profile.themeOptions.auto'), icon: Monitor }
  ]

  // 判断是否为深色模式
  const isDarkMode = theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  return (
    <Modal
      isOpen
      onClose={onClose}
      size="xl"
      className="p-0 w-[85vw] max-w-[960px] max-h-[85vh] overflow-hidden"
    >
      <div className={`${isDarkMode ? 'bg-black border-gray-800' : 'bg-white border-gray-200'} h-full p-6 shadow-xl border overflow-y-auto`}>
        <div className="mb-6">
          <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{t('profile.title')}</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-6">
          <div className="space-y-6">
            <div className={`rounded-xl border ${isDarkMode ? 'border-gray-800 bg-gray-900/50' : 'border-gray-200 bg-gray-50'} p-5`}>
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 ${isDarkMode ? 'bg-white text-black' : 'bg-black text-white'} rounded-full flex items-center justify-center`}>
                  <User className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h3 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {userProfile?.full_name || userProfile?.username || t('common.currentUser')}
                  </h3>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{user?.email}</p>
                </div>
                <UserLevelBadge level={userProfile?.user_level || '小白'} size="md" showIcon={true} />
              </div>
              <div className={`mt-4 flex items-center justify-between text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                <span>{t('profile.identity')}</span>
                <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{userProfile?.user_level || '小白'}</span>
              </div>
            </div>

            <div className={`rounded-xl border ${isDarkMode ? 'border-gray-800 bg-black' : 'border-gray-200 bg-white'} p-5`}>
              <h4 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-4`}>{t('profile.membership')}</h4>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <div className={`flex items-center gap-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    <Clock className="w-4 h-4" />
                    <span>{t('profile.remainingTime')}</span>
                  </div>
                  <div className={`font-medium ${(userProfile?.remaining_interview_minutes || 0) > 0 ? (isDarkMode ? 'text-white' : 'text-gray-900') : 'text-red-500'}`}>
                    {t('profile.minutes', { count: userProfile?.remaining_interview_minutes || 0 })}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className={`flex items-center gap-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    <Calendar className="w-4 h-4" />
                    <span>{t('profile.expiry')}</span>
                  </div>
                  <div className={`font-medium ${isExpired ? 'text-red-500' : (isDarkMode ? 'text-white' : 'text-gray-900')}`}>
                    {formatDate(userProfile?.membership_expires_at)}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className={`flex items-center gap-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    <Clock className="w-4 h-4" />
                    <span>{t('profile.totalPurchased')}</span>
                  </div>
                  <div className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {t('profile.minutes', { count: userProfile?.total_purchased_minutes || 0 })}
                  </div>
                </div>
              </div>
            </div>

            {packages.length > 0 && (
              <div className={`rounded-xl border ${isDarkMode ? 'border-gray-800 bg-black' : 'border-gray-200 bg-white'} p-5`}>
                <h4 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-4`}>{t('profile.packages')}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {packages.map(pkg => {
                    const pricing = membershipService.calculatePrice(pkg.price, userProfile?.user_level || '小白')
                    const hasDiscount = pricing.discountRate < 1.00

                    return (
                      <div key={pkg.id} className={`flex items-center justify-between p-3 ${isDarkMode ? 'bg-gray-900/50 border-gray-800' : 'bg-gray-50 border-gray-200'} rounded-xl border`}>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{pkg.name}</span>
                            <span className={`text-xs ${isDarkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-200 text-gray-600'} px-2 py-1 rounded`}>
                              {t('profile.minutes', { count: pkg.interview_minutes })}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2 mt-1">
                            {hasDiscount && (
                              <span className="text-xs text-gray-400 line-through">¥{pkg.price}</span>
                            )}
                            <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>¥{pricing.actualPrice}</span>
                            {hasDiscount && (
                              <span className={`text-xs ${isDarkMode ? 'bg-white text-black' : 'bg-gray-900 text-white'} px-1.5 py-0.5 rounded`}>
                                {t('profile.discount', { percent: Math.round((1 - pricing.discountRate) * 100) })}
                              </span>
                            )}
                          </div>
                        </div>
                        <Button
                          onClick={() => handlePurchasePackage(pkg.id)}
                          disabled={loading}
                          size="sm"
                          className="ml-3"
                        >
                          {t('profile.buy')}
                        </Button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className={`rounded-xl border ${isDarkMode ? 'border-gray-800 bg-black' : 'border-gray-200 bg-white'} p-5`}>
              <h4 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-4`}>{t('profile.settings')}</h4>
              <div className="space-y-4">
                <div>
                  <div className={`flex items-center gap-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mb-2`}>
                    <Sun className="w-4 h-4" />
                    <span>{t('profile.theme')}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {themeOptions.map((option) => {
                      const Icon = option.icon
                      const isActive = theme === option.value
                      return (
                        <button
                          key={option.value}
                          onClick={() => setTheme(option.value)}
                          className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                            isActive
                              ? (isDarkMode ? 'bg-white text-black border-transparent' : 'bg-black text-white border-transparent')
                              : (isDarkMode ? 'bg-gray-900 text-gray-300 border-gray-800 hover:bg-gray-800' : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100')
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span>{option.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div>
                  <div className={`flex items-center gap-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mb-2`}>
                    <Globe className="w-4 h-4" />
                    <span>{t('profile.language')}</span>
                  </div>
                  <select
                    value={language}
                    onChange={(event) => setLanguage(event.target.value as typeof language)}
                    className={`w-full px-3 py-2 rounded-lg border ${isDarkMode ? 'border-gray-800 bg-gray-900 text-white focus:ring-white/10' : 'border-gray-200 bg-gray-50 text-gray-900 focus:ring-black/10'} text-sm focus:outline-none focus:ring-2 cursor-pointer`}
                  >
                    {languageOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className={`rounded-xl border ${isDarkMode ? 'border-gray-800 bg-black' : 'border-gray-200 bg-white'} p-4`}>
              <div className="flex gap-3">
                {isAdmin && onOpenAdminPanel && (
                  <Button
                    onClick={onOpenAdminPanel}
                    variant="outline"
                    className="flex-1"
                  >
                    <Settings className="w-4 h-4" />
                    {t('profile.admin')}
                  </Button>
                )}
                <Button
                  onClick={handleSignOut}
                  disabled={loading}
                  variant="danger"
                  className={isAdmin && onOpenAdminPanel ? 'flex-1' : 'w-full'}
                >
                  <LogOut className="w-4 h-4" />
                  {t('profile.logout')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}

export default UserProfileModal
