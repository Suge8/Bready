import React, { useState, useEffect } from 'react'
import { User, Crown, Calendar, Clock, LogOut, Settings } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { userProfileService, membershipService, type UserProfile, type MembershipPackage } from '../lib/supabase'
import { Button } from './ui/button'
import UserLevelBadge from './UserLevelBadge'

interface UserProfileModalProps {
  onClose: () => void
  onOpenAdminPanel?: () => void
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({ onClose, onOpenAdminPanel }) => {
  const { user, profile, signOut } = useAuth()
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
      alert('购买失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return '无'
    return new Date(dateString).toLocaleDateString('zh-CN')
  }



  const isAdmin = userProfile?.user_level === '管理' || userProfile?.user_level === '超级'
  const isExpired = userProfile?.membership_expires_at && new Date(userProfile.membership_expires_at) < new Date()

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 cursor-pointer"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl w-full max-w-xl p-6 shadow-xl animate-fade-in border border-gray-200 cursor-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-black">个人中心</h2>
        </div>

        {/* 主要内容区域 - 水平布局 */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* 左侧：用户基本信息 */}
          <div className="space-y-4">
            {/* 基本信息 */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-12 h-12 bg-gradient-to-br from-black to-gray-800 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-medium text-black">
                    {userProfile?.full_name || userProfile?.username || '用户'}
                  </h3>
                  <p className="text-sm text-gray-600">{user?.email}</p>
                </div>
              </div>

              {/* 身份等级 */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">身份等级</span>
                <UserLevelBadge
                  level={userProfile?.user_level || '小白'}
                  size="md"
                  showIcon={true}
                />
              </div>
            </div>
          </div>

          {/* 右侧：会员信息 */}
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-black mb-3">会员信息</h4>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-600">剩余面试时间</span>
                  </div>
                  <div className={`font-medium ${(userProfile?.remaining_interview_minutes || 0) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {userProfile?.remaining_interview_minutes || 0} 分钟
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-600">会员到期时间</span>
                  </div>
                  <div className={`font-medium ${isExpired ? 'text-red-600' : 'text-green-600'}`}>
                    {formatDate(userProfile?.membership_expires_at)}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-600">累计购买时间</span>
                  </div>
                  <div className="font-medium text-gray-800">
                    {userProfile?.total_purchased_minutes || 0} 分钟
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 套餐购买 */}
        {packages.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h4 className="font-medium text-black mb-3">购买套餐</h4>
            <div className="grid grid-cols-2 gap-3">
              {packages.map(pkg => {
                const pricing = membershipService.calculatePrice(pkg.price, userProfile?.user_level || '小白')
                const hasDiscount = pricing.discountRate < 1.00

                return (
                  <div key={pkg.id} className="flex items-center justify-between p-3 bg-white rounded border border-gray-200">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-black">{pkg.name}</span>
                        <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">
                          {pkg.interview_minutes}分钟
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        {hasDiscount && (
                          <span className="text-xs text-gray-500 line-through">¥{pkg.price}</span>
                        )}
                        <span className="text-sm font-medium text-black">¥{pricing.actualPrice}</span>
                        {hasDiscount && (
                          <span className="text-xs bg-red-100 text-red-600 px-1 py-0.5 rounded">
                            {Math.round((1 - pricing.discountRate) * 100)}%折扣
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handlePurchasePackage(pkg.id)}
                      disabled={loading}
                      className="ml-3 cursor-pointer"
                    >
                      购买
                    </Button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 操作按钮 - 水平排列 */}
        <div className="flex gap-3">
          {/* 管理员入口 */}
          {isAdmin && onOpenAdminPanel && (
            <Button
              variant="outline"
              className="flex-1 justify-center cursor-pointer"
              onClick={onOpenAdminPanel}
            >
              <Settings className="w-4 h-4 mr-2" />
              管理后台
            </Button>
          )}

          {/* 退出登录 */}
          <Button
            variant="outline"
            className="flex-1 justify-center text-red-600 border-red-200 hover:bg-red-50 cursor-pointer"
            onClick={handleSignOut}
            disabled={loading}
          >
            <LogOut className="w-4 h-4 mr-2" />
            退出登录
          </Button>
        </div>
      </div>
    </div>
  )
}

export default UserProfileModal
