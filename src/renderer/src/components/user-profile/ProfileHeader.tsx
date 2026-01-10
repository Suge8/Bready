import React, { memo, useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { User, Pencil, Check, X, Loader2 } from 'lucide-react'
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
  onNameChange?: (name: string) => Promise<boolean>
  editable?: boolean
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = memo(
  ({
    profile,
    loading = false,
    isDarkMode = false,
    onAvatarChange,
    onNameChange,
    editable = false,
  }) => {
    const { t } = useI18n()
    const [avatarSelectorOpen, setAvatarSelectorOpen] = useState(false)
    const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false)

    const [isEditingName, setIsEditingName] = useState(false)
    const [editedName, setEditedName] = useState(profile?.full_name || '')
    const [isSavingName, setIsSavingName] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
      if (isEditingName && inputRef.current) {
        inputRef.current.focus()
      }
    }, [isEditingName])

    useEffect(() => {
      setEditedName(profile?.full_name || '')
    }, [profile?.full_name])

    const handleAvatarSelect = async (avatarId: string) => {
      if (!onAvatarChange) return

      setIsUpdatingAvatar(true)
      try {
        await onAvatarChange(avatarId)
      } finally {
        setIsUpdatingAvatar(false)
      }
    }

    const handleNameSave = async () => {
      if (!onNameChange) return
      if (!editedName.trim() || editedName === profile?.full_name) {
        setIsEditingName(false)
        setEditedName(profile?.full_name || '')
        return
      }

      setIsSavingName(true)
      try {
        const success = await onNameChange(editedName.trim())
        if (success) {
          setIsEditingName(false)
        }
      } finally {
        setIsSavingName(false)
      }
    }

    const handleNameCancel = () => {
      setIsEditingName(false)
      setEditedName(profile?.full_name || '')
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleNameSave()
      } else if (e.key === 'Escape') {
        handleNameCancel()
      }
    }

    if (loading) {
      return (
        <div
          className={cn(
            'rounded-xl border p-3',
            isDarkMode ? 'border-neutral-800 bg-neutral-900/50' : 'border-neutral-200 bg-white',
          )}
        >
          <ProfileSkeleton isDarkMode={isDarkMode} />
        </div>
      )
    }

    return (
      <>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            'rounded-xl border p-3',
            isDarkMode ? 'border-neutral-800 bg-neutral-900/50' : 'border-neutral-200 bg-white',
          )}
        >
          <div className="flex items-center gap-4">
            <div className="relative flex-shrink-0">
              {profile?.avatar_url ? (
                <AvatarDisplay
                  avatarId={profile.avatar_url}
                  size="md"
                  onClick={editable ? () => setAvatarSelectorOpen(true) : undefined}
                  className="w-12 h-12"
                />
              ) : (
                <motion.div
                  whileHover={editable ? { scale: 1.05 } : undefined}
                  whileTap={editable ? { scale: 0.95 } : undefined}
                  onClick={editable ? () => setAvatarSelectorOpen(true) : undefined}
                  className={cn(
                    'w-12 h-12 rounded-full flex items-center justify-center',
                    isDarkMode ? 'bg-white text-black' : 'bg-black text-white',
                    editable && 'cursor-pointer',
                  )}
                >
                  <User className="w-5 h-5" />
                </motion.div>
              )}

              {isUpdatingAvatar && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}

              {editable && !isUpdatingAvatar && (
                <motion.div
                  initial={{ opacity: 0 }}
                  whileHover={{ opacity: 1 }}
                  className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full cursor-pointer"
                  onClick={() => setAvatarSelectorOpen(true)}
                >
                  <Pencil className="w-4 h-4 text-white" />
                </motion.div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                {isEditingName ? (
                  <div className="flex items-center gap-2">
                    <input
                      ref={inputRef}
                      type="text"
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={isSavingName}
                      className={cn(
                        'h-7 px-2 rounded text-sm font-semibold min-w-[120px]',
                        'focus:outline-none focus:ring-2 focus:ring-opacity-50',
                        isDarkMode
                          ? 'bg-gray-800 text-white focus:ring-white'
                          : 'bg-gray-100 text-gray-900 focus:ring-black',
                      )}
                    />
                    <button
                      onClick={handleNameSave}
                      disabled={isSavingName}
                      className="p-1 rounded-full hover:bg-green-500/20 text-green-500"
                    >
                      {isSavingName ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={handleNameCancel}
                      disabled={isSavingName}
                      className="p-1 rounded-full hover:bg-red-500/20 text-red-500"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <motion.div
                    layout
                    className="flex items-center gap-2 group cursor-pointer"
                    onClick={() => editable && onNameChange && setIsEditingName(true)}
                  >
                    <h3
                      className={cn(
                        'font-semibold text-base truncate max-w-[200px]',
                        isDarkMode ? 'text-white' : 'text-gray-900',
                      )}
                    >
                      {profile?.full_name || profile?.username || t('common.currentUser')}
                    </h3>
                    {editable && onNameChange && (
                      <Pencil
                        className={cn(
                          'w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity',
                          isDarkMode ? 'text-gray-500' : 'text-gray-400',
                        )}
                      />
                    )}
                  </motion.div>
                )}

                <UserLevelBadge
                  level={profile?.user_level || '小白'}
                  size="sm"
                  showIcon={true}
                  isDarkMode={isDarkMode}
                />
              </div>

              <div className="flex items-center gap-2">
                <p className={cn('text-xs', isDarkMode ? 'text-gray-500' : 'text-gray-500')}>
                  {profile?.email}
                </p>
                <span className={isDarkMode ? 'text-gray-700' : 'text-gray-300'}>•</span>
                <p className={cn('text-xs', isDarkMode ? 'text-gray-500' : 'text-gray-500')}>
                  {t('profile.joined')} {new Date(profile?.created_at || '').toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

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
