import React, { memo, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Pencil, Check, X, Loader2 } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useI18n } from '../../contexts/I18nContext'
import { type UserProfile } from '../../lib/supabase'
import { Button } from '../ui/button'
import { AvatarDisplay, AvatarSelector } from './AvatarSelector'

interface ProfileEditorProps {
  profile: UserProfile | null
  isDarkMode?: boolean
  onSave: (updates: Partial<UserProfile>) => Promise<boolean>
}

export const ProfileEditor: React.FC<ProfileEditorProps> = memo(
  ({ profile, isDarkMode = false, onSave }) => {
    const { t } = useI18n()
    const [isEditingName, setIsEditingName] = useState(false)
    const [editedName, setEditedName] = useState(profile?.full_name || '')
    const [avatarSelectorOpen, setAvatarSelectorOpen] = useState(false)
    const [saving, setSaving] = useState(false)

    const handleNameSave = useCallback(async () => {
      if (!editedName.trim() || editedName === profile?.full_name) {
        setIsEditingName(false)
        setEditedName(profile?.full_name || '')
        return
      }

      setSaving(true)
      const success = await onSave({ full_name: editedName.trim() })
      setSaving(false)

      if (success) {
        setIsEditingName(false)
      }
    }, [editedName, profile?.full_name, onSave])

    const handleNameCancel = useCallback(() => {
      setIsEditingName(false)
      setEditedName(profile?.full_name || '')
    }, [profile?.full_name])

    const handleAvatarSelect = useCallback(
      async (avatarId: string) => {
        setSaving(true)
        await onSave({ avatar_url: avatarId })
        setSaving(false)
      },
      [onSave],
    )

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
          handleNameSave()
        } else if (e.key === 'Escape') {
          handleNameCancel()
        }
      },
      [handleNameSave, handleNameCancel],
    )

    return (
      <>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className={cn(
            'rounded-xl border p-5',
            isDarkMode ? 'border-gray-800 bg-black' : 'border-gray-200 bg-white',
          )}
        >
          <h4 className={cn('font-medium mb-4', isDarkMode ? 'text-white' : 'text-gray-900')}>
            {t('profile.editor.title') || '编辑资料'}
          </h4>

          <div className="space-y-4">
            {/* 头像编辑 */}
            <div className="flex items-center justify-between">
              <span className={cn('text-sm', isDarkMode ? 'text-gray-400' : 'text-gray-500')}>
                {t('profile.avatar.label') || '头像'}
              </span>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setAvatarSelectorOpen(true)}
                disabled={saving}
                className="flex items-center gap-2 group"
              >
                <AvatarDisplay
                  avatarId={profile?.avatar_url}
                  size="md"
                  className="group-hover:ring-2 group-hover:ring-offset-2 transition-all"
                />
                <Pencil
                  className={cn(
                    'w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity',
                    isDarkMode ? 'text-gray-400' : 'text-gray-500',
                  )}
                />
              </motion.button>
            </div>

            {/* 昵称编辑 */}
            <div className="flex items-center justify-between">
              <span className={cn('text-sm', isDarkMode ? 'text-gray-400' : 'text-gray-500')}>
                {t('profile.editor.nickname') || '昵称'}
              </span>

              <AnimatePresence mode="wait">
                {isEditingName ? (
                  <motion.div
                    key="editing"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex items-center gap-2"
                  >
                    <input
                      type="text"
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      onKeyDown={handleKeyDown}
                      autoFocus
                      disabled={saving}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-sm w-36',
                        'border focus:outline-none focus:ring-2',
                        isDarkMode
                          ? 'bg-gray-900 border-gray-700 text-white focus:ring-white/20'
                          : 'bg-gray-50 border-gray-200 text-gray-900 focus:ring-black/10',
                      )}
                      placeholder={t('profile.editor.nicknamePlaceholder') || '请输入昵称'}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleNameSave}
                      disabled={saving}
                      className="p-1.5 h-auto"
                    >
                      {saving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4 text-green-500" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleNameCancel}
                      disabled={saving}
                      className="p-1.5 h-auto"
                    >
                      <X className="w-4 h-4 text-red-500" />
                    </Button>
                  </motion.div>
                ) : (
                  <motion.button
                    key="display"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    onClick={() => {
                      setEditedName(profile?.full_name || '')
                      setIsEditingName(true)
                    }}
                    className={cn(
                      'flex items-center gap-2 group px-3 py-1.5 rounded-lg',
                      'hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors',
                    )}
                  >
                    <span
                      className={cn(
                        'text-sm font-medium',
                        isDarkMode ? 'text-white' : 'text-gray-900',
                      )}
                    >
                      {profile?.full_name || t('profile.editor.notSet') || '未设置'}
                    </span>
                    <Pencil
                      className={cn(
                        'w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity',
                        isDarkMode ? 'text-gray-400' : 'text-gray-500',
                      )}
                    />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>

            {/* 邮箱（只读） */}
            <div className="flex items-center justify-between">
              <span className={cn('text-sm', isDarkMode ? 'text-gray-400' : 'text-gray-500')}>
                {t('profile.editor.email') || '邮箱'}
              </span>
              <span
                className={cn('text-sm font-medium', isDarkMode ? 'text-white' : 'text-gray-900')}
              >
                {profile?.email || '-'}
              </span>
            </div>

            {/* 注册时间（只读） */}
            <div className="flex items-center justify-between">
              <span className={cn('text-sm', isDarkMode ? 'text-gray-400' : 'text-gray-500')}>
                {t('profile.editor.createdAt') || '注册时间'}
              </span>
              <span className={cn('text-sm', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
                {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : '-'}
              </span>
            </div>
          </div>
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

ProfileEditor.displayName = 'ProfileEditor'

export default ProfileEditor
