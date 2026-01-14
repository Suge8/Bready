import React from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Users, Clock, Settings, CreditCard, LogIn } from 'lucide-react'
import { cn } from '../lib/utils'
import { useAuth } from '../contexts/AuthContext'
import { useI18n } from '../contexts/I18nContext'
import { useTheme } from './ui/theme-provider'
import { Modal, ConfirmDialog } from './ui/Modal'
import { useAdminPanel, UsersTab, UsageTab, AiTab, PaymentTab, LoginTab } from './admin'
import type { TabType } from './admin/types'

interface AdminPanelModalProps {
  onClose: () => void
  onBack?: () => void
}

const AdminPanelModal: React.FC<AdminPanelModalProps> = ({ onClose, onBack }) => {
  const { user, profile } = useAuth()
  const { t, locale } = useI18n()
  const { resolvedTheme } = useTheme()
  const isDarkMode = resolvedTheme === 'dark'

  const admin = useAdminPanel()

  const tabs: { id: TabType; label: string; icon: React.ElementType }[] = [
    { id: 'users', label: t('admin.tabs.users'), icon: Users },
    { id: 'usage', label: t('admin.tabs.usage'), icon: Clock },
    { id: 'ai', label: t('admin.tabs.ai'), icon: Settings },
    { id: 'payment', label: t('admin.tabs.payment'), icon: CreditCard },
    { id: 'login', label: t('admin.tabs.login'), icon: LogIn },
  ]

  const handleBack = () => (onBack ? onBack() : onClose())

  return (
    <Modal
      isOpen
      onClose={onClose}
      size="xl"
      className="p-0 w-full max-w-[640px] h-[520px] flex flex-col overflow-hidden"
    >
      <div className={cn('h-full flex flex-col relative', isDarkMode ? 'bg-black' : 'bg-white')}>
        <div
          className={cn(
            'flex items-center justify-between px-4 py-3 border-b flex-shrink-0',
            isDarkMode ? 'border-neutral-800' : 'border-neutral-200',
          )}
        >
          <div className="flex items-center gap-2">
            <button
              onClick={handleBack}
              className={cn(
                'p-1.5 rounded-lg border transition-colors cursor-pointer',
                isDarkMode
                  ? 'border-neutral-800 text-white hover:bg-white/5'
                  : 'border-neutral-200 text-black hover:bg-black/5',
              )}
              aria-label={t('common.back')}
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h2 className={cn('text-sm font-semibold', isDarkMode ? 'text-white' : 'text-black')}>
              {t('admin.title')}
            </h2>
          </div>

          <div className="relative flex items-center gap-1 p-1 rounded-full bg-black/5 dark:bg-white/5">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = admin.activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => admin.setActiveTab(tab.id)}
                  className={cn(
                    'relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors duration-200 cursor-pointer z-10',
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
                      layoutId="adminActiveTabBg"
                      className={cn(
                        'absolute inset-0 rounded-full',
                        isDarkMode ? 'bg-white' : 'bg-black',
                      )}
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}
                  <Icon className="w-3.5 h-3.5 relative z-10" />
                  <span className="relative z-10">{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex-1 overflow-hidden min-h-0 flex flex-col">
          {admin.activeTab === 'users' && (
            <UsersTab
              isDarkMode={isDarkMode}
              users={admin.users}
              loading={admin.loading}
              searchTerm={admin.searchTerm}
              setSearchTerm={admin.setSearchTerm}
              currentPage={admin.currentPage}
              setCurrentPage={admin.setCurrentPage}
              showRoleDropdown={admin.showRoleDropdown}
              setShowRoleDropdown={admin.setShowRoleDropdown}
              setDeleteConfirm={admin.setDeleteConfirm}
              handleUpdateUserLevel={admin.handleUpdateUserLevel}
              currentUserId={user?.id}
              profileLevel={profile?.user_level}
              t={t}
              locale={locale}
            />
          )}

          {admin.activeTab === 'usage' && (
            <UsageTab
              isDarkMode={isDarkMode}
              usageRecords={admin.usageRecords}
              usageLoading={admin.usageLoading}
              expandedUsageUsers={admin.expandedUsageUsers}
              setExpandedUsageUsers={admin.setExpandedUsageUsers}
              t={t}
              locale={locale}
            />
          )}

          {admin.activeTab === 'ai' && (
            <AiTab
              isDarkMode={isDarkMode}
              aiConfig={admin.aiConfig}
              setAiConfig={admin.setAiConfig}
              aiTestStatus={admin.aiTestStatus}
              handleSaveAiConfig={admin.handleSaveAiConfig}
              handleTestAiConnection={admin.handleTestAiConnection}
              t={t}
            />
          )}

          {admin.activeTab === 'payment' && (
            <PaymentTab
              isDarkMode={isDarkMode}
              paymentConfig={admin.paymentConfig}
              setPaymentConfig={admin.setPaymentConfig}
              handleSavePaymentConfig={admin.handleSavePaymentConfig}
              t={t}
            />
          )}

          {admin.activeTab === 'login' && (
            <LoginTab
              isDarkMode={isDarkMode}
              expandedCard={admin.expandedCard}
              setExpandedCard={admin.setExpandedCard}
              emailConfig={admin.emailConfig}
              handleEmailConfigChange={admin.handleEmailConfigChange}
              emailTestLoading={admin.emailTestLoading}
              emailConfigured={admin.emailConfigured}
              handleTestEmailConnection={admin.handleTestEmailConnection}
              loginConfig={admin.loginConfig}
              setLoginConfig={admin.setLoginConfig}
              smsConfig={admin.smsConfig}
              setSmsConfig={admin.setSmsConfig}
              handleSaveAllLoginSettings={admin.handleSaveAllLoginSettings}
              t={t}
            />
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={admin.deleteConfirm.show}
        onClose={() => admin.setDeleteConfirm({ show: false, user: null })}
        onConfirm={admin.handleDeleteUser}
        title={t('admin.deleteUser.title')}
        message={
          t('admin.deleteUser.message') +
          (admin.deleteConfirm.user
            ? `\n\n${admin.deleteConfirm.user.full_name || admin.deleteConfirm.user.username || admin.deleteConfirm.user.email}`
            : '')
        }
        confirmText={t('admin.deleteUser.confirm')}
        cancelText={t('admin.deleteUser.cancel')}
        type="danger"
      />
    </Modal>
  )
}

export default AdminPanelModal
