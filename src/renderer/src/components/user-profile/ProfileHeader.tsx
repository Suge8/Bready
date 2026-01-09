import React, { memo, useState } from 'react'
import { motion } from 'framer-motion'
import { User } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useI18n } from '../../contexts/I18nContext'
import { type UserProfile } from '../../lib/supabase'
import UserLevelBadge from '../UserLevelBadge'
import { AvatarDisplay, AvatarSelector } from './AvatarSelector'
import { ProfileSkeleton } from './SkeletonLoaders'

interface ProfileHeaderProps {
  profile: UserProfile | null
  loading?: boolean
  isDarkMode?: boolean
  onAvatarChange?: (avatarId: string) => Promise<void>
  editable?: boolean
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = memo(
  ({ profile, loading = false, isDarkMode = false, onAvatarChange, editable = false }) => {
    const { t } = useI18n()
    const [avatarSelectorOpen, setAvatarSelectorOpen] = useState(false)
    const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false)

    const handleAvatarSelect = async (avatarId: string) => {
      if (!onAvatarChange) return

      setIsUpdatingAvatar(true)
      try {
        await onAvatarChange(avatarId)
      } finally {
        setIsUpdatingAvatar(false)
      }
    }

    if (loading) {
      return (
        <div
          className={cn(
            'rounded-xl border p-5',
            isDarkMode ? 'border-gray-800 bg-gray-900/50' : 'border-gray-200 bg-gray-50',
          )}
        >
          <ProfileSkeleton isDarkMode={isDarkMode} />
        </div>
      )
    }

    return (
      <>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className={cn(
            'rounded-xl border p-5',
            isDarkMode ? 'border-gray-800 bg-gray-900/50' : 'border-gray-200 bg-gray-50',
          )}
        >
          <div className="flex items-center gap-4">
            {/* 头像 - 带呼吸动效 */}
            <div className="relative">
              {profile?.avatar_url ? (
                <AvatarDisplay
                  avatarId={profile.avatar_url}
                  size="lg"
                  onClick={editable ? () => setAvatarSelectorOpen(true) : undefined}
                  showPulse={true}
                />
              ) : (
                <motion.div
                  whileHover={editable ? { scale: 1.05 } : undefined}
                  whileTap={editable ? { scale: 0.95 } : undefined}
                  onClick={editable ? () => setAvatarSelectorOpen(true) : undefined}
                  className={cn(
                    'w-16 h-16 rounded-full flex items-center justify-center',
                    isDarkMode ? 'bg-white text-black' : 'bg-black text-white',
                    editable && 'cursor-pointer',
                  )}
                >
                  <User className="w-7 h-7" />
                </motion.div>
              )}

              {/* 加载指示器 */}
              {isUpdatingAvatar && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}

              {/* 编辑提示 */}
              {editable && !isUpdatingAvatar && (
                <motion.div
                  initial={{ opacity: 0 }}
                  whileHover={{ opacity: 1 }}
                  className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full cursor-pointer"
                  onClick={() => setAvatarSelectorOpen(true)}
                >
                  <span className="text-white text-xs font-medium">
                    {t('profile.avatar.change') || '更换'}
                  </span>
                </motion.div>
              )}
            </div>

            {/* 用户信息 */}
            <div className="flex-1 min-w-0">
              <motion.h3
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className={cn(
                  'font-semibold truncate',
                  isDarkMode ? 'text-white' : 'text-gray-900',
                )}
              >
                {profile?.full_name || profile?.username || t('common.currentUser')}
              </motion.h3>
              <motion.p
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 }}
                className={cn('text-sm truncate', isDarkMode ? 'text-gray-400' : 'text-gray-500')}
              >
                {profile?.email}
              </motion.p>
            </div>

            {/* 等级徽章 - 带闪烁效果 */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
            >
              <UserLevelBadge
                level={profile?.user_level || '小白'}
                size="md"
                showIcon={true}
                showShimmer={true}
                isDarkMode={isDarkMode}
              />
            </motion.div>
          </div>

          {/* 身份信息行 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            className={cn(
              'mt-4 flex items-center justify-between text-sm',
              isDarkMode ? 'text-gray-400' : 'text-gray-500',
            )}
          >
            <span>{t('profile.identity')}</span>
            <span className={cn('font-medium', isDarkMode ? 'text-white' : 'text-gray-900')}>
              {profile?.user_level || '小白'}
            </span>
          </motion.div>
        </motion.div>

        {/* 头像选择器 */}
        <AvatarSelector
          isOpen={avatarSelectorOpen}
          onClose={() => setAvatarSelectorOpen(false)}
          currentAvatar={profile?.avatar_url}
          onSelect={handleAvatarSelect}
          isDarkMode={isDarkMode}
        />
      </>
    )
  },
)

ProfileHeader.displayName = 'ProfileHeader'

export default ProfileHeader
