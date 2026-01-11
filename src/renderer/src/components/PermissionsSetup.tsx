import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Mic, Monitor, Loader2, ArrowRight, ShieldCheck, RefreshCw } from 'lucide-react'
import { useI18n } from '../contexts/I18nContext'
import { useToast } from '../contexts/ToastContext'
import { Modal } from './ui/Modal'
import { Button } from './ui/button'

interface PermissionStatus {
  granted: boolean
  canRequest: boolean
  message: string
}

interface SystemPermissions {
  screenRecording: PermissionStatus
  microphone: PermissionStatus
  apiKey: PermissionStatus
  audioDevice: PermissionStatus
}

interface PermissionsSetupProps {
  onComplete: () => void
  onClose: () => void
  isOpen: boolean
}

const PermissionsSetup: React.FC<PermissionsSetupProps> = ({ onComplete, onClose, isOpen }) => {
  const { t } = useI18n()
  const { showToast } = useToast()
  const [permissions, setPermissions] = useState<SystemPermissions | null>(null)
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(false)
  const [hasChecked, setHasChecked] = useState(false)

  useEffect(() => {
    if (isOpen) {
      checkAllPermissions()
    }
  }, [isOpen])

  const checkAllPermissions = async () => {
    setLoading(true)
    try {
      const result = await window.bready.checkPermissions()
      setPermissions(result)
    } catch (error) {
      console.error('检查权限失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const openSystemPreferences = async (pane: string) => {
    try {
      await window.bready.openSystemPreferences(pane)
    } catch (error) {
      console.error('打开系统偏好设置失败:', error)
    }
  }

  const requestMicrophonePermission = async () => {
    try {
      await window.bready.requestMicrophonePermission()
      setTimeout(checkAllPermissions, 1000)
    } catch (error) {
      console.error('请求麦克风权限失败:', error)
    }
  }

  const handleCheckPermissions = async () => {
    setChecking(true)
    setHasChecked(true)
    try {
      const result = await window.bready.checkPermissions()
      setPermissions(result)

      const allGranted = result.screenRecording.granted && result.microphone.granted

      if (allGranted) {
        showToast(t('permissionsSetup.toast.allGranted'), 'success')
      } else {
        const missing: string[] = []
        if (!result.screenRecording.granted) missing.push(t('permissionsSetup.screen.title'))
        if (!result.microphone.granted) missing.push(t('permissionsSetup.microphone.title'))
        showToast(t('permissionsSetup.toast.missing', { items: missing.join('、') }), 'error')
      }
    } catch (error) {
      showToast(t('permissionsSetup.toast.checkFailed'), 'error')
    } finally {
      setChecking(false)
    }
  }

  const allPermissionsGranted =
    permissions && permissions.screenRecording.granted && permissions.microphone.granted

  if (!isOpen) return null

  const cardVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: 0.1 + i * 0.1,
        type: 'spring' as const,
        stiffness: 400,
        damping: 25,
      },
    }),
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      className="max-w-sm p-0 rounded-[24px] overflow-hidden border border-[var(--bready-border)] shadow-2xl"
    >
      <div className="bg-[var(--bready-surface)] flex flex-col relative">
        <div className="pt-8 px-6 pb-6 text-center relative z-10">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-12 h-12 mx-auto mb-4 bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center text-zinc-900 dark:text-zinc-100"
          >
            <ShieldCheck className="w-6 h-6" />
          </motion.div>
          <h2 className="text-xl font-bold tracking-tight text-[var(--bready-text)]">
            {t('permissionsSetup.title')}
          </h2>
          <p className="mt-2 text-sm text-[var(--bready-text-muted)] leading-relaxed">
            {t('permissionsSetup.subtitle')}
          </p>
        </div>

        <div className="px-5 pb-2 space-y-3 relative z-10">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-[var(--bready-text-muted)]" />
            </div>
          ) : permissions ? (
            <>
              <motion.div
                custom={0}
                initial="hidden"
                animate="visible"
                variants={cardVariants}
                whileHover={{ scale: 1.02 }}
                onClick={() =>
                  !permissions.screenRecording.granted && openSystemPreferences('screen-recording')
                }
                className={`group relative flex items-center justify-between p-4 rounded-xl border transition-all duration-300 cursor-pointer ${
                  permissions.screenRecording.granted
                    ? 'bg-emerald-500/5 border-emerald-500/30'
                    : 'bg-[var(--bready-surface-2)]/50 border-[var(--bready-border)] hover:border-[var(--bready-border-hover)] hover:bg-[var(--bready-surface-2)]'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors duration-300 ${
                      permissions.screenRecording.granted
                        ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/20'
                        : 'bg-[var(--bready-surface)] text-[var(--bready-text-muted)] border border-[var(--bready-border)]'
                    }`}
                  >
                    <Monitor className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-[var(--bready-text)]">
                      {t('permissionsSetup.screen.title')}
                    </span>
                    <span
                      className={`text-xs ${
                        permissions.screenRecording.granted
                          ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                          : 'text-[var(--bready-text-muted)]'
                      }`}
                    >
                      {permissions.screenRecording.granted
                        ? t('permissionsSetup.status.granted')
                        : t('permissionsSetup.screen.hint')}
                    </span>
                  </div>
                </div>
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center transition-all duration-300 ${
                    permissions.screenRecording.granted
                      ? 'bg-emerald-500 text-white scale-100 opacity-100'
                      : 'bg-transparent border border-[var(--bready-border)] scale-90 opacity-50 group-hover:border-[var(--bready-text-muted)]'
                  }`}
                >
                  {permissions.screenRecording.granted && <Check className="w-3 h-3" />}
                </div>
              </motion.div>

              <motion.div
                custom={1}
                initial="hidden"
                animate="visible"
                variants={cardVariants}
                whileHover={{ scale: 1.02 }}
                onClick={() => {
                  if (!permissions.microphone.granted) {
                    permissions.microphone.canRequest
                      ? requestMicrophonePermission()
                      : openSystemPreferences('microphone')
                  }
                }}
                className={`group relative flex items-center justify-between p-4 rounded-xl border transition-all duration-300 cursor-pointer ${
                  permissions.microphone.granted
                    ? 'bg-emerald-500/5 border-emerald-500/30'
                    : 'bg-[var(--bready-surface-2)]/50 border-[var(--bready-border)] hover:border-[var(--bready-border-hover)] hover:bg-[var(--bready-surface-2)]'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors duration-300 ${
                      permissions.microphone.granted
                        ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/20'
                        : 'bg-[var(--bready-surface)] text-[var(--bready-text-muted)] border border-[var(--bready-border)]'
                    }`}
                  >
                    <Mic className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-[var(--bready-text)]">
                      {t('permissionsSetup.microphone.title')}
                    </span>
                    <span
                      className={`text-xs ${
                        permissions.microphone.granted
                          ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                          : 'text-[var(--bready-text-muted)]'
                      }`}
                    >
                      {permissions.microphone.granted
                        ? t('permissionsSetup.status.granted')
                        : t('permissionsSetup.microphone.hint')}
                    </span>
                  </div>
                </div>
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center transition-all duration-300 ${
                    permissions.microphone.granted
                      ? 'bg-emerald-500 text-white scale-100 opacity-100'
                      : 'bg-transparent border border-[var(--bready-border)] scale-90 opacity-50 group-hover:border-[var(--bready-text-muted)]'
                  }`}
                >
                  {permissions.microphone.granted && <Check className="w-3 h-3" />}
                </div>
              </motion.div>
            </>
          ) : (
            <div className="text-center py-6 text-sm text-[var(--bready-text-muted)]">
              {t('permissionsSetup.error.unableCheck')}
            </div>
          )}
        </div>

        <div className="p-6 mt-2 relative z-10">
          <AnimatePresence mode="wait">
            {allPermissionsGranted && hasChecked ? (
              <motion.div
                key="complete"
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <Button
                  onClick={onComplete}
                  className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl shadow-lg shadow-emerald-500/25 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span>{t('permissionsSetup.actions.start')}</span>
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="check"
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <Button
                  onClick={handleCheckPermissions}
                  disabled={checking || loading}
                  variant="outline"
                  className="w-full h-12 font-medium rounded-xl border-[var(--bready-border)] hover:bg-[var(--bready-surface-2)] text-[var(--bready-text)] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                >
                  {checking ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  {t('permissionsSetup.actions.recheck')}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </Modal>
  )
}

export default PermissionsSetup
