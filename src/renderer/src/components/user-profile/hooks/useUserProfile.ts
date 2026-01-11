import { useState, useEffect, useCallback } from 'react'
import { userProfileService, type UserProfile } from '../../../lib/api-client'
import { useAuth } from '../../../contexts/AuthContext'

interface UseUserProfileReturn {
  profile: UserProfile | null
  loading: boolean
  error: string | null
  updateProfile: (updates: Partial<UserProfile>) => Promise<boolean>
  updateAvatar: (avatarId: string) => Promise<boolean>
  refreshProfile: () => Promise<void>
}

export function useUserProfile(): UseUserProfileReturn {
  const { user, profile: authProfile } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(authProfile)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refreshProfile = useCallback(async () => {
    if (!user?.id) return

    try {
      const data = await userProfileService.getProfile(user.id)
      if (data) {
        setProfile(data)
        setError(null)
      }
    } catch (err) {
      console.error('Failed to refresh profile:', err)
      setError('加载用户资料失败')
    }
  }, [user?.id])

  // 初始加载
  useEffect(() => {
    if (!user?.id) return

    refreshProfile()
  }, [user?.id, refreshProfile])

  // 同步 authProfile 变化
  useEffect(() => {
    if (authProfile) {
      setProfile(authProfile)
    }
  }, [authProfile])

  const updateProfile = useCallback(
    async (updates: Partial<UserProfile>): Promise<boolean> => {
      if (!user?.id || !profile) return false

      setLoading(true)
      setError(null)

      // 乐观更新
      const previousProfile = profile
      setProfile({ ...profile, ...updates } as UserProfile)

      try {
        await userProfileService.upsertProfile({
          id: user.id,
          ...updates,
        })
        return true
      } catch (err) {
        console.error('Failed to update profile:', err)
        setError('更新资料失败')
        // 回滚乐观更新
        setProfile(previousProfile)
        return false
      } finally {
        setLoading(false)
      }
    },
    [user?.id, profile],
  )

  const updateAvatar = useCallback(
    async (avatarId: string): Promise<boolean> => {
      return updateProfile({ avatar_url: avatarId })
    },
    [updateProfile],
  )

  return {
    profile,
    loading,
    error,
    updateProfile,
    updateAvatar,
    refreshProfile,
  }
}
