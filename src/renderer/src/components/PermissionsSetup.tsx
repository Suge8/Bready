import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Settings,
  Mic,
  Monitor,
  Key,
  Volume2,
  RefreshCw,
  ExternalLink,
  Play,
  Loader2,
} from 'lucide-react'
import { useI18n } from '../contexts/I18nContext'
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
  onSkip: () => void
  isOpen: boolean
}

const PermissionsSetup: React.FC<PermissionsSetupProps> = ({ onComplete, onSkip, isOpen }) => {
  const { t } = useI18n()
  const [permissions, setPermissions] = useState<SystemPermissions | null>(null)
  const [loading, setLoading] = useState(true)
  const [testing, setTesting] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<Record<string, any>>({})

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
      // 等待用户设置权限后重新检查
      setTimeout(checkAllPermissions, 2000)
    } catch (error) {
      console.error('打开系统偏好设置失败:', error)
    }
  }

  const testAudioCapture = async () => {
    setTesting('audio')
    try {
      const result = await window.bready.testAudioCapture()
      setTestResults((prev) => ({ ...prev, audio: result }))

      // 测试后重新检查权限状态
      setTimeout(checkAllPermissions, 1000)
    } catch (error) {
      console.error('音频测试失败:', error)
      setTestResults((prev) => ({
        ...prev,
        audio: { success: false, message: t('permissionsSetup.testFailed') },
      }))
    } finally {
      setTesting(null)
    }
  }

  const requestMicrophonePermission = async () => {
    setTesting('microphone')
    try {
      const result = await window.bready.requestMicrophonePermission()
      setTestResults((prev) => ({ ...prev, microphone: result }))

      // 请求后重新检查权限状态
      setTimeout(checkAllPermissions, 1000)
    } catch (error) {
      console.error('请求麦克风权限失败:', error)
    } finally {
      setTesting(null)
    }
  }

  const getStatusIcon = (status: PermissionStatus) => {
    if (status.granted) {
      return <CheckCircle className="w-5 h-5 text-emerald-500" />
    } else if (status.canRequest) {
      return <AlertCircle className="w-5 h-5 text-amber-500" />
    } else {
      return <XCircle className="w-5 h-5 text-red-500" />
    }
  }

  const getStatusText = (status: PermissionStatus) => {
    if (status.granted) return t('permissionsSetup.status.granted')
    if (status.canRequest) return t('permissionsSetup.status.needsSetup')
    return t('permissionsSetup.status.denied')
  }

  const allPermissionsGranted =
    permissions &&
    permissions.screenRecording.granted &&
    permissions.microphone.granted &&
    permissions.apiKey.granted &&
    permissions.audioDevice.granted

  if (!isOpen) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onSkip}
      size="lg"
      className="p-0 max-w-2xl max-h-[90vh] flex flex-col overflow-hidden rounded-2xl"
    >
      <div className="bg-[var(--bready-surface)] flex flex-col flex-1 min-h-0">
        <div className="px-8 py-6 border-b border-[var(--bready-border)]/60 flex-shrink-0 bg-[var(--bready-surface)]">
          <h2 className="text-xl font-bold text-[var(--bready-text)] tracking-tight">设置</h2>
          <p className="text-sm text-[var(--bready-text-muted)] mt-1.5 leading-relaxed">
            {t('permissionsSetup.description')}
          </p>
        </div>

        <div className="flex-1 min-h-0 p-8 space-y-5 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
              <span className="text-sm font-medium text-[var(--bready-text-muted)]">
                {t('permissionsSetup.checking')}
              </span>
            </div>
          ) : permissions ? (
            <>
              {/* 屏幕录制权限 */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-[var(--bready-surface-2)]/30 border border-[var(--bready-border)]/60 rounded-xl p-5 hover:bg-[var(--bready-surface-2)]/50 transition-colors group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start space-x-4">
                    <div className="p-2.5 bg-[var(--bready-surface)] rounded-lg border border-[var(--bready-border)]/40 group-hover:border-emerald-500/20 transition-colors">
                      <Monitor className="w-5 h-5 text-[var(--bready-text)]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[var(--bready-text)] text-sm">
                        {t('permissionsSetup.screen.title')}
                      </h3>
                      <p className="text-xs text-[var(--bready-text-muted)] mt-1 leading-relaxed max-w-md">
                        {t('permissionsSetup.screen.description')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 bg-[var(--bready-surface)] px-2.5 py-1 rounded-full border border-[var(--bready-border)]/40">
                    {getStatusIcon(permissions.screenRecording)}
                    <span className="text-xs font-medium text-[var(--bready-text)]">
                      {getStatusText(permissions.screenRecording)}
                    </span>
                  </div>
                </div>

                <div className="pl-[52px]">
                  <p className="text-xs text-[var(--bready-text-muted)] mb-3 opacity-80">
                    {permissions.screenRecording.message}
                  </p>

                  {!permissions.screenRecording.granted && (
                    <Button
                      onClick={() => openSystemPreferences('screen-recording')}
                      size="sm"
                      className="h-8 text-xs font-medium"
                    >
                      <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                      <span>{t('permissionsSetup.screen.openSettings')}</span>
                    </Button>
                  )}
                </div>
              </motion.div>

              {/* 麦克风权限 */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-[var(--bready-surface-2)]/30 border border-[var(--bready-border)]/60 rounded-xl p-5 hover:bg-[var(--bready-surface-2)]/50 transition-colors group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start space-x-4">
                    <div className="p-2.5 bg-[var(--bready-surface)] rounded-lg border border-[var(--bready-border)]/40 group-hover:border-emerald-500/20 transition-colors">
                      <Mic className="w-5 h-5 text-[var(--bready-text)]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[var(--bready-text)] text-sm">
                        {t('permissionsSetup.microphone.title')}
                      </h3>
                      <p className="text-xs text-[var(--bready-text-muted)] mt-1 leading-relaxed max-w-md">
                        {t('permissionsSetup.microphone.description')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 bg-[var(--bready-surface)] px-2.5 py-1 rounded-full border border-[var(--bready-border)]/40">
                    {getStatusIcon(permissions.microphone)}
                    <span className="text-xs font-medium text-[var(--bready-text)]">
                      {getStatusText(permissions.microphone)}
                    </span>
                  </div>
                </div>

                <div className="pl-[52px]">
                  <p className="text-xs text-[var(--bready-text-muted)] mb-3 opacity-80">
                    {permissions.microphone.message}
                  </p>

                  <div className="flex space-x-2">
                    {!permissions.microphone.granted && permissions.microphone.canRequest && (
                      <Button
                        onClick={requestMicrophonePermission}
                        disabled={testing === 'microphone'}
                        size="sm"
                        className="h-8 text-xs font-medium"
                      >
                        {testing === 'microphone' ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                        ) : (
                          <Mic className="w-3.5 h-3.5 mr-1.5" />
                        )}
                        <span>{t('permissionsSetup.microphone.request')}</span>
                      </Button>
                    )}

                    {!permissions.microphone.granted && !permissions.microphone.canRequest && (
                      <Button
                        onClick={() => openSystemPreferences('microphone')}
                        size="sm"
                        className="h-8 text-xs font-medium"
                      >
                        <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                        <span>{t('permissionsSetup.microphone.openSettings')}</span>
                      </Button>
                    )}
                  </div>

                  {testResults.microphone && (
                    <div
                      className={`mt-3 p-3 rounded-lg text-xs ${
                        testResults.microphone.granted
                          ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                          : 'bg-red-500/10 text-red-600 border border-red-500/20'
                      }`}
                    >
                      {testResults.microphone.message}
                    </div>
                  )}
                </div>
              </motion.div>

              {/* API 密钥状态 */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-[var(--bready-surface-2)]/30 border border-[var(--bready-border)]/60 rounded-xl p-5 hover:bg-[var(--bready-surface-2)]/50 transition-colors group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start space-x-4">
                    <div className="p-2.5 bg-[var(--bready-surface)] rounded-lg border border-[var(--bready-border)]/40 group-hover:border-emerald-500/20 transition-colors">
                      <Key className="w-5 h-5 text-[var(--bready-text)]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[var(--bready-text)] text-sm">
                        {t('permissionsSetup.apiKey.title')}
                      </h3>
                      <p className="text-xs text-[var(--bready-text-muted)] mt-1 leading-relaxed max-w-md">
                        {t('permissionsSetup.apiKey.description')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 bg-[var(--bready-surface)] px-2.5 py-1 rounded-full border border-[var(--bready-border)]/40">
                    {getStatusIcon(permissions.apiKey)}
                    <span className="text-xs font-medium text-[var(--bready-text)]">
                      {getStatusText(permissions.apiKey)}
                    </span>
                  </div>
                </div>

                <div className="pl-[52px]">
                  <p className="text-xs text-[var(--bready-text-muted)] mb-3 opacity-80">
                    {permissions.apiKey.message}
                  </p>

                  {!permissions.apiKey.granted && (
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                      <p className="text-xs text-amber-700 dark:text-amber-400">
                        {t('permissionsSetup.apiKey.hint')}
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* 音频设备状态 */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-[var(--bready-surface-2)]/30 border border-[var(--bready-border)]/60 rounded-xl p-5 hover:bg-[var(--bready-surface-2)]/50 transition-colors group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start space-x-4">
                    <div className="p-2.5 bg-[var(--bready-surface)] rounded-lg border border-[var(--bready-border)]/40 group-hover:border-emerald-500/20 transition-colors">
                      <Volume2 className="w-5 h-5 text-[var(--bready-text)]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[var(--bready-text)] text-sm">
                        {t('permissionsSetup.audio.title')}
                      </h3>
                      <p className="text-xs text-[var(--bready-text-muted)] mt-1 leading-relaxed max-w-md">
                        {t('permissionsSetup.audio.description')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 bg-[var(--bready-surface)] px-2.5 py-1 rounded-full border border-[var(--bready-border)]/40">
                    {getStatusIcon(permissions.audioDevice)}
                    <span className="text-xs font-medium text-[var(--bready-text)]">
                      {getStatusText(permissions.audioDevice)}
                    </span>
                  </div>
                </div>

                <div className="pl-[52px]">
                  <p className="text-xs text-[var(--bready-text-muted)] mb-3 opacity-80">
                    {permissions.audioDevice.message}
                  </p>

                  <div className="flex space-x-2">
                    <Button
                      onClick={testAudioCapture}
                      disabled={testing === 'audio'}
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs font-medium"
                    >
                      {testing === 'audio' ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                      ) : (
                        <Play className="w-3.5 h-3.5 mr-1.5" />
                      )}
                      <span>{t('permissionsSetup.audio.test')}</span>
                    </Button>

                    {!permissions.audioDevice.granted && (
                      <Button
                        onClick={() => openSystemPreferences('privacy_ScreenCapture')}
                        size="sm"
                        className="h-8 text-xs font-medium"
                      >
                        <Settings className="w-3.5 h-3.5 mr-1.5" />
                        <span>{t('permissionsSetup.audio.setup')}</span>
                      </Button>
                    )}
                  </div>

                  {testResults.audio && (
                    <div
                      className={`mt-3 p-3 rounded-lg text-xs ${
                        testResults.audio.success
                          ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                          : 'bg-red-500/10 text-red-600 border border-red-500/20'
                      }`}
                    >
                      <div className="font-medium">{testResults.audio.message}</div>

                      {testResults.audio.audioData !== undefined && (
                        <div className="text-[10px] mt-1 opacity-80">
                          {t('permissionsSetup.metrics.capturedData', {
                            bytes: testResults.audio.audioData,
                          })}
                          {testResults.audio.silencePercentage !== undefined && (
                            <span className="ml-2">
                              {t('permissionsSetup.metrics.silence', {
                                percent: testResults.audio.silencePercentage.toFixed(1),
                              })}
                            </span>
                          )}
                        </div>
                      )}

                      {testResults.audio.recommendation && (
                        <div className="text-xs mt-2 p-2 bg-white/50 dark:bg-black/20 rounded border-l-2 border-current">
                          💡{' '}
                          {t('permissionsSetup.metrics.recommendation', {
                            text: testResults.audio.recommendation,
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            </>
          ) : (
            <div className="text-center py-8 text-[var(--bready-text-muted)]">
              {t('permissionsSetup.error.unableCheck')}
            </div>
          )}
        </div>

        <div className="px-8 py-6 border-t border-[var(--bready-border)]/60 bg-[var(--bready-surface)] flex justify-between items-center">
          <Button
            variant="ghost"
            onClick={onSkip}
            className="text-[var(--bready-text-muted)] hover:text-[var(--bready-text)]"
          >
            {t('permissionsSetup.actions.skip')}
          </Button>

          <div className="flex space-x-3">
            <Button
              onClick={checkAllPermissions}
              disabled={loading}
              variant="outline"
              className="border-[var(--bready-border)]/60"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              <span>{t('permissionsSetup.actions.recheck')}</span>
            </Button>

            <Button
              onClick={onComplete}
              disabled={!allPermissionsGranted}
              className={
                allPermissionsGranted
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                  : ''
              }
            >
              {allPermissionsGranted
                ? t('permissionsSetup.actions.start')
                : t('permissionsSetup.actions.complete')}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

export default PermissionsSetup
