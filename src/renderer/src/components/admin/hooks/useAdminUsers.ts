import { useState, useCallback } from 'react'
import { userProfileService } from '../../../lib/api-client'
import { useToast } from '../../../contexts/ToastContext'
import { useI18n } from '../../../contexts/I18nContext'
import type { UserProfile, UserLevel, DeleteConfirm } from '../types'

export function useAdminUsers() {
  const { showToast } = useToast()
  const { t } = useI18n()

  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [showRoleDropdown, setShowRoleDropdown] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirm>({
    show: false,
    user: null,
  })

  const loadUsers = useCallback(async () => {
    setLoading(true)
    try {
      const usersData = await userProfileService.getAllUsers()
      setUsers(usersData)
    } catch (error) {
      console.error('Error loading users:', error)
      showToast(t('alerts.loadUsersFailed'), 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast, t])

  const handleUpdateUserLevel = async (
    userId: string,
    newLevel: UserLevel,
    profileLevel?: UserLevel,
  ) => {
    if (profileLevel !== '超级' && profileLevel !== '管理') {
      showToast(t('alerts.onlyAdmin'), 'warning')
      return
    }

    setLoading(true)
    try {
      await userProfileService.updateUserLevel(userId, newLevel)
      await loadUsers()
      setShowRoleDropdown(null)
    } catch (error) {
      console.error('Error updating user level:', error)
      showToast(t('alerts.updateRoleFailed'), 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteUser = async () => {
    if (!deleteConfirm.user) return

    try {
      await userProfileService.deleteUser(deleteConfirm.user.id)
      showToast(t('alerts.deleteSuccess') || '用户已删除', 'success')
      setDeleteConfirm({ show: false, user: null })
      loadUsers()
    } catch (error) {
      console.error('Error deleting user:', error)
      showToast(t('alerts.deleteFailed') || '删除失败', 'error')
    }
  }

  const resetPage = useCallback(() => setCurrentPage(1), [])

  return {
    users,
    loading,
    searchTerm,
    setSearchTerm,
    currentPage,
    setCurrentPage,
    showRoleDropdown,
    setShowRoleDropdown,
    deleteConfirm,
    setDeleteConfirm,
    loadUsers,
    handleUpdateUserLevel,
    handleDeleteUser,
    resetPage,
  }
}
