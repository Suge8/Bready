import { useState, useEffect } from 'react'
import type { TabType } from './types'
import {
  useAdminUsers,
  useAdminUsage,
  useAdminAiConfig,
  useAdminPaymentConfig,
  useAdminLoginConfig,
} from './hooks'

export function useAdminPanel() {
  const [activeTab, setActiveTab] = useState<TabType>('users')

  const users = useAdminUsers()
  const usage = useAdminUsage()
  const aiConfig = useAdminAiConfig()
  const paymentConfig = useAdminPaymentConfig()
  const loginConfig = useAdminLoginConfig()

  useEffect(() => {
    if (activeTab === 'users') users.loadUsers()
    if (activeTab === 'usage') usage.loadUsageRecords()
    if (activeTab === 'ai') {
      aiConfig.loadAiConfig()
      aiConfig.resetTestStatus()
    }
    if (activeTab === 'payment') paymentConfig.loadPaymentConfig()
    if (activeTab === 'login') {
      loginConfig.loadLoginConfig()
      loginConfig.loadSmsConfig()
      loginConfig.loadSmtpConfig()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  useEffect(() => {
    users.resetPage()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users.searchTerm, activeTab])

  return {
    activeTab,
    setActiveTab,

    users: users.users,
    loading: users.loading,
    searchTerm: users.searchTerm,
    setSearchTerm: users.setSearchTerm,
    currentPage: users.currentPage,
    setCurrentPage: users.setCurrentPage,
    showRoleDropdown: users.showRoleDropdown,
    setShowRoleDropdown: users.setShowRoleDropdown,
    deleteConfirm: users.deleteConfirm,
    setDeleteConfirm: users.setDeleteConfirm,
    handleUpdateUserLevel: users.handleUpdateUserLevel,
    handleDeleteUser: users.handleDeleteUser,
    loadUsers: users.loadUsers,

    usageRecords: usage.usageRecords,
    usageLoading: usage.usageLoading,
    expandedUsageUsers: usage.expandedUsageUsers,
    setExpandedUsageUsers: usage.setExpandedUsageUsers,

    aiConfig: aiConfig.aiConfig,
    setAiConfig: aiConfig.setAiConfig,
    aiTestStatus: aiConfig.aiTestStatus,
    handleSaveAiConfig: aiConfig.handleSaveAiConfig,
    handleTestAiConnection: aiConfig.handleTestAiConnection,

    paymentConfig: paymentConfig.paymentConfig,
    setPaymentConfig: paymentConfig.setPaymentConfig,
    handleSavePaymentConfig: paymentConfig.handleSavePaymentConfig,

    smsConfig: loginConfig.smsConfig,
    setSmsConfig: loginConfig.setSmsConfig,

    loginConfig: loginConfig.loginConfig,
    setLoginConfig: loginConfig.setLoginConfig,
    handleSaveAllLoginSettings: loginConfig.handleSaveAllLoginSettings,

    emailConfig: loginConfig.emailConfig,
    emailTestLoading: loginConfig.emailTestLoading,
    emailConfigured: loginConfig.emailConfigured,
    handleEmailConfigChange: loginConfig.handleEmailConfigChange,
    handleTestEmailConnection: loginConfig.handleTestEmailConnection,

    expandedCard: loginConfig.expandedCard,
    setExpandedCard: loginConfig.setExpandedCard,
  }
}
