import React, { useState, useEffect } from 'react'
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
      return <CheckCircle className="w-5 h-5 text-green-500" />
    } else if (status.canRequest) {
      return <AlertCircle className="w-5 h-5 text-yellow-500" />
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
      className="p-0 max-w-2xl max-h-[90vh] flex flex-col"
    >
      <div className="bg-[var(--bready-surface)] border border-[var(--bready-border)] flex flex-col flex-1 min-h-0">
        <div className="p-6 border-b border-[var(--bready-border)] flex-shrink-0">
          <h2 className="text-2xl font-semibold text-[var(--bready-text)]">
            {t('permissionsSetup.title')}
          </h2>
          <p className="text-[var(--bready-text-muted)] mt-2">
            {t('permissionsSetup.description')}
          </p>
        </div>

        <div className="flex-1 min-h-0 p-6 space-y-6 overflow-y-auto scrollbar-thin">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              <span className="ml-2 text-[var(--bready-text-muted)]">
                {t('permissionsSetup.checking')}
              </span>
            </div>
          ) : permissions ? (
            <>
              {/* 屏幕录制权限 */}
              <div className="border border-[var(--bready-border)] rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <Monitor className="w-6 h-6 text-[var(--bready-text)]" />
                    <div>
                      <h3 className="font-medium text-[var(--bready-text)]">
                        {t('permissionsSetup.screen.title')}
                      </h3>
                      <p className="text-sm text-[var(--bready-text-muted)]">
                        {t('permissionsSetup.screen.description')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(permissions.screenRecording)}
                    <span className="text-sm font-medium">
                      {getStatusText(permissions.screenRecording)}
                    </span>
                  </div>
                </div>

                <p className="text-sm text-[var(--bready-text-muted)] mb-3">
                  {permissions.screenRecording.message}
                </p>

                {!permissions.screenRecording.granted && (
                  <Button onClick={() => openSystemPreferences('screen-recording')} size="sm">
                    <ExternalLink className="w-4 h-4" />
                    <span>{t('permissionsSetup.screen.openSettings')}</span>
                  </Button>
                )}
              </div>

              {/* 麦克风权限 */}
              <div className="border border-[var(--bready-border)] rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <Mic className="w-6 h-6 text-[var(--bready-text)]" />
                    <div>
                      <h3 className="font-medium text-[var(--bready-text)]">
                        {t('permissionsSetup.microphone.title')}
                      </h3>
                      <p className="text-sm text-[var(--bready-text-muted)]">
                        {t('permissionsSetup.microphone.description')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(permissions.microphone)}
                    <span className="text-sm font-medium">
                      {getStatusText(permissions.microphone)}
                    </span>
                  </div>
                </div>

                <p className="text-sm text-[var(--bready-text-muted)] mb-3">
                  {permissions.microphone.message}
                </p>

                <div className="flex space-x-2">
                  {!permissions.microphone.granted && permissions.microphone.canRequest && (
                    <Button
                      onClick={requestMicrophonePermission}
                      disabled={testing === 'microphone'}
                      size="sm"
                    >
                      {testing === 'microphone' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Mic className="w-4 h-4" />
                      )}
                      <span>{t('permissionsSetup.microphone.request')}</span>
                    </Button>
                  )}

                  {!permissions.microphone.granted && !permissions.microphone.canRequest && (
                    <Button onClick={() => openSystemPreferences('microphone')} size="sm">
                      <ExternalLink className="w-4 h-4" />
                      <span>{t('permissionsSetup.microphone.openSettings')}</span>
                    </Button>
                  )}
                </div>

                {testResults.microphone && (
                  <div
                    className={`mt-3 p-3 rounded-lg ${
                      testResults.microphone.granted
                        ? 'bg-green-50 text-green-800'
                        : 'bg-red-50 text-red-800'
                    }`}
                  >
                    {testResults.microphone.message}
                  </div>
                )}
              </div>

              {/* API 密钥状态 */}
              <div className="border border-[var(--bready-border)] rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <Key className="w-6 h-6 text-[var(--bready-text)]" />
                    <div>
                      <h3 className="font-medium text-[var(--bready-text)]">
                        {t('permissionsSetup.apiKey.title')}
                      </h3>
                      <p className="text-sm text-[var(--bready-text-muted)]">
                        {t('permissionsSetup.apiKey.description')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(permissions.apiKey)}
                    <span className="text-sm font-medium">{getStatusText(permissions.apiKey)}</span>
                  </div>
                </div>

                <p className="text-sm text-[var(--bready-text-muted)] mb-3">
                  {permissions.apiKey.message}
                </p>

                {!permissions.apiKey.granted && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-sm text-yellow-800">{t('permissionsSetup.apiKey.hint')}</p>
                  </div>
                )}
              </div>

              {/* 音频设备状态 */}
              <div className="border border-[var(--bready-border)] rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <Volume2 className="w-6 h-6 text-[var(--bready-text)]" />
                    <div>
                      <h3 className="font-medium text-[var(--bready-text)]">
                        {t('permissionsSetup.audio.title')}
                      </h3>
                      <p className="text-sm text-[var(--bready-text-muted)]">
                        {t('permissionsSetup.audio.description')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(permissions.audioDevice)}
                    <span className="text-sm font-medium">
                      {getStatusText(permissions.audioDevice)}
                    </span>
                  </div>
                </div>

                <p className="text-sm text-[var(--bready-text-muted)] mb-3">
                  {permissions.audioDevice.message}
                </p>

                <div className="flex space-x-2">
                  <Button
                    onClick={testAudioCapture}
                    disabled={testing === 'audio'}
                    variant="outline"
                    size="sm"
                  >
                    {testing === 'audio' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                    <span>{t('permissionsSetup.audio.test')}</span>
                  </Button>

                  {!permissions.audioDevice.granted && (
                    <Button
                      onClick={() => openSystemPreferences('privacy_ScreenCapture')}
                      size="sm"
                    >
                      <Settings className="w-4 h-4" />
                      <span>{t('permissionsSetup.audio.setup')}</span>
                    </Button>
                  )}
                </div>

                {testResults.audio && (
                  <div
                    className={`mt-3 p-3 rounded-lg ${
                      testResults.audio.success
                        ? 'bg-green-50 text-green-800'
                        : 'bg-red-50 text-red-800'
                    }`}
                  >
                    <div className="font-medium">{testResults.audio.message}</div>

                    {testResults.audio.audioData !== undefined && (
                      <div className="text-xs mt-1">
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
                      <div className="text-sm mt-2 p-2 bg-white bg-opacity-50 rounded border-l-2 border-current">
                        💡{' '}
                        {t('permissionsSetup.metrics.recommendation', {
                          text: testResults.audio.recommendation,
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-[var(--bready-text-muted)]">
              {t('permissionsSetup.error.unableCheck')}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-[var(--bready-border)] flex justify-between">
          <Button variant="ghost" onClick={onSkip}>
            {t('permissionsSetup.actions.skip')}
          </Button>

          <div className="flex space-x-3">
            <Button onClick={checkAllPermissions} disabled={loading} variant="outline">
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              <span>{t('permissionsSetup.actions.recheck')}</span>
            </Button>

            <Button onClick={onComplete} disabled={!allPermissionsGranted}>
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
