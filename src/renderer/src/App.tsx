import React, { useState, useEffect } from 'react'
import { HashRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { OnboardingTour } from './components/onboarding/OnboardingTour'
import MainPage from './components/MainPage'
import FloatingWindow from './components/FloatingWindow'
import CollaborationMode from './components/CollaborationMode'
import LoginPage from './components/LoginPage'
import ErrorBoundary from './components/ErrorBoundary'

import { AuthProvider, useAuth } from './contexts/AuthContext'
import { preparationService, type Preparation } from './lib/api-client'
import { Volume2, Mic, CheckCircle } from 'lucide-react'
import { ThemeProvider } from './components/ui/theme-provider'
import { Button } from './components/ui/button'
import { I18nProvider, useI18n } from './contexts/I18nContext'
import { ToastProvider } from './contexts/ToastContext'

// 声明全局类型
declare global {
  interface Window {
    bready: {
      createFloatingWindow: () => Promise<boolean>
      closeFloatingWindow: () => Promise<boolean>
      enterCollaborationMode: () => Promise<boolean>
      exitCollaborationMode: () => Promise<boolean>

      // AI API（通用）
      checkAiReady: () => Promise<{ ready: boolean; provider: string; missingFields: string[] }>
      initializeAI: (
        apiKey: string,
        customPrompt?: string,
        profile?: string,
        language?: string,
      ) => Promise<boolean>
      reconnectAI: () => Promise<boolean>
      disconnectAI: () => Promise<boolean>

      // 旧方法（向后兼容）
      initializeGemini: (
        apiKey: string,
        customPrompt?: string,
        profile?: string,
        language?: string,
      ) => Promise<boolean>
      reconnectGemini: () => Promise<boolean>
      disconnectGemini: () => Promise<boolean>

      sendTextMessage: (message: string) => Promise<{ success: boolean; error?: string }>
      startAudioCapture: () => Promise<boolean>
      stopAudioCapture: () => Promise<boolean>
      switchAudioMode: (mode: 'system' | 'microphone') => Promise<boolean>
      getAudioStatus: () => Promise<{ capturing: boolean; mode: string; options: any }>
      manualReconnect: () => Promise<boolean>

      // 权限管理
      checkPermissions: () => Promise<any>
      checkScreenRecordingPermission: () => Promise<any>
      checkMicrophonePermission: () => Promise<any>
      checkApiKeyStatus: () => Promise<any>
      checkAudioDeviceStatus: () => Promise<any>
      openSystemPreferences: (pane: string) => Promise<boolean>
      testAudioCapture: () => Promise<any>
      requestMicrophonePermission: () => Promise<any>

      onStatusUpdate: (callback: (status: string) => void) => () => void
      onTranscriptionUpdate: (callback: (text: string) => void) => () => void
      onAIResponse: (callback: (response: string) => void) => () => void
      onAIResponseUpdate: (callback: (response: string) => void) => () => void
      onSessionInitializing: (callback: (initializing: boolean) => void) => () => void
      onSessionReady: (callback: () => void) => () => void
      onSessionError: (callback: (error: string) => void) => () => void
      onSessionClosed: (callback: () => void) => () => void
      onAudioModeChanged: (
        callback: (modeInfo: {
          mode: 'system' | 'microphone'
          fallback?: boolean
          reason?: string
        }) => void,
      ) => () => void
      onAudioDeviceChanged: (
        callback: (data: { deviceId: string; deviceLabel: string }) => void,
      ) => () => void
      onContextCompressed: (
        callback: (data: { previousCount: number; newCount: number }) => void,
      ) => () => void
      onAudioStreamInterrupted: (callback: () => void) => () => void
      onAudioStreamRestored: (callback: () => void) => () => void
      onTranscriptionComplete: (callback: (transcription: string) => void) => () => void
      onPerformanceMetrics: (callback: (metrics: any) => void) => () => void
      onCrashReport: (callback: (report: any) => void) => () => void
      analyzePreparation: (data: {
        name: string
        jobDescription: string
        resume?: string
      }) => Promise<{ success: boolean; analysis?: any; error?: string }>
      extractFileContent: (data: {
        fileName: string
        fileType: string
        base64Data: string
      }) => Promise<{ success: boolean; content?: string; error?: string }>
    }
  }
}

// 协作模式包装组件
const CollaborationModeWrapper: React.FC = () => {
  const navigate = useNavigate()

  const handleExit = async () => {
    try {
      // 断开 AI 连接
      await window.bready.disconnectAI()

      // 停止音频捕获
      await window.bready.stopAudioCapture()

      // 退出协作模式（调整窗口大小）
      await window.bready.exitCollaborationMode()

      console.log('Successfully cleaned up collaboration mode')
    } catch (error) {
      console.error('Error during collaboration mode cleanup:', error)
    } finally {
      // 无论清理是否成功，都导航回主页
      navigate('/')
    }
  }

  return <CollaborationMode onExit={handleExit} />
}

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading, isSigningOut } = useAuth()

  const showLoadingScreen = loading && !isSigningOut

  return (
    <AnimatePresence mode="wait">
      {showLoadingScreen ? (
        <motion.div
          key="auth-loading"
          className="h-screen w-screen bg-[var(--bready-bg)]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        />
      ) : user ? (
        <motion.div
          key="main"
          className="h-full w-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        >
          {children}
        </motion.div>
      ) : (
        <motion.div
          key="login"
          className="h-full w-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        >
          <LoginPage />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function AppContent() {
  const { user, profile, completeOnboarding } = useAuth()
  const { t } = useI18n()
  const [preparations, setPreparations] = useState<Preparation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showPermissionGuide, setShowPermissionGuide] = useState(false)
  const [permissionStatus, setPermissionStatus] = useState({
    screenRecording: false,
    microphone: false,
  })

  const isFirstTime = !profile?.has_completed_onboarding

  const handleWelcomeComplete = async () => {
    await completeOnboarding()
  }

  // 加载准备项数据
  const loadPreparations = async () => {
    setIsLoading(true)
    try {
      // 只加载当前用户的准备项
      const data = await preparationService.getAll(user?.id)
      setPreparations(data)
    } catch (error) {
      console.error('Failed to load preparations:', error)
      // 如果Supabase失败，回退到localStorage
      const preparationsData = localStorage.getItem('bready-preparations')
      if (preparationsData) {
        setPreparations(JSON.parse(preparationsData))
      }
    } finally {
      setIsLoading(false)
    }
  }

  // 检查系统权限
  const checkSystemPermissions = async () => {
    if (!window.bready) return

    try {
      const permissions = await window.bready.checkPermissions()
      console.log('🔐 权限检查结果:', permissions)

      // 更新权限状态
      setPermissionStatus({
        screenRecording: permissions.screenRecording?.granted || false,
        microphone: permissions.microphone?.granted || false,
      })

      // 检查是否所有必要权限都已授予
      const allPermissionsGranted =
        permissions.screenRecording?.granted && permissions.microphone?.granted

      // 只有当权限未全部授予时才显示引导
      if (!allPermissionsGranted) {
        setShowPermissionGuide(true)
      }
    } catch (error) {
      console.error('权限检查失败:', error)
    }
  }

  useEffect(() => {
    if (user) {
      loadPreparations()
      checkSystemPermissions()
    } else {
      setIsLoading(false)
    }
  }, [user])

  // 检查当前路由是否是悬浮窗
  const isFloatingWindow = window.location.hash === '#/floating'

  if (isFloatingWindow) {
    return <FloatingWindow />
  }

  return (
    <ErrorBoundary>
      <Router>
        <div className="h-screen w-screen overflow-hidden bg-[var(--bready-bg)]">
          <Routes>
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  {isFirstTime ? (
                    <OnboardingTour onComplete={handleWelcomeComplete} />
                  ) : (
                    <MainPage
                      preparations={preparations}
                      setPreparations={setPreparations}
                      onReloadData={loadPreparations}
                      isLoading={isLoading}
                    />
                  )}
                </ProtectedRoute>
              }
            />
            <Route
              path="/collaboration"
              element={
                <ProtectedRoute>
                  <CollaborationModeWrapper />
                </ProtectedRoute>
              }
            />
            <Route
              path="/create-preparation"
              element={
                <ProtectedRoute>
                  <Navigate to="/" replace />
                </ProtectedRoute>
              }
            />
            <Route
              path="/edit-preparation/:id"
              element={
                <ProtectedRoute>
                  <Navigate to="/" replace />
                </ProtectedRoute>
              }
            />
            <Route
              path="/preparation/:id"
              element={
                <ProtectedRoute>
                  <Navigate to="/" replace />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>

        {/* 权限引导模态框 */}
        {showPermissionGuide && !isFirstTime && (
          <div
            className="fixed inset-0 bg-white/30 dark:bg-black/30 backdrop-blur-md flex items-center justify-center z-[9999] p-4 cursor-pointer"
            onClick={() => setShowPermissionGuide(false)}
          >
            <div
              className="bg-[var(--bready-surface)] border border-[var(--bready-border)] rounded-2xl w-full max-w-md shadow-2xl cursor-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-black dark:text-white">
                    {t('permissionsGuide.title')}
                  </h2>
                </div>

                <div className="mb-6">
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    {t('permissionsGuide.description')}
                  </p>

                  <div className="space-y-3">
                    {/* 屏幕录制权限卡片 - 可点击 */}
                    <div
                      onClick={async () => {
                        if (window.bready) {
                          await window.bready.openSystemPreferences('security')
                        }
                      }}
                      className="bg-[var(--bready-surface-2)] rounded-lg p-4 cursor-pointer hover:bg-[var(--bready-surface-3)] transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Volume2 className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                          <span className="font-medium text-black dark:text-white">
                            {t('permissionsGuide.screen')}
                          </span>
                        </div>
                        <CheckCircle
                          className={`w-5 h-5 ${
                            permissionStatus.screenRecording
                              ? 'text-green-500 dark:text-green-400'
                              : 'text-gray-400'
                          }`}
                        />
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {t('permissionsGuide.screenDesc')}
                      </p>
                    </div>

                    {/* 麦克风权限卡片 - 可点击 */}
                    <div
                      onClick={async () => {
                        if (window.bready) {
                          await window.bready.openSystemPreferences('security')
                        }
                      }}
                      className="bg-[var(--bready-surface-2)] rounded-lg p-4 cursor-pointer hover:bg-[var(--bready-surface-3)] transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Mic className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                          <span className="font-medium text-black dark:text-white">
                            {t('permissionsGuide.mic')}
                          </span>
                        </div>
                        <CheckCircle
                          className={`w-5 h-5 ${
                            permissionStatus.microphone
                              ? 'text-green-500 dark:text-green-400'
                              : 'text-gray-400'
                          }`}
                        />
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {t('permissionsGuide.micDesc')}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col space-y-3">
                  <Button
                    onClick={() => {
                      setShowPermissionGuide(false)
                    }}
                    variant="outline"
                    className="w-full border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 cursor-pointer"
                  >
                    {t('permissionsGuide.later')}
                  </Button>
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 text-center">
                  {t('permissionsGuide.note')}
                </p>
              </div>
            </div>
          </div>
        )}
      </Router>
    </ErrorBoundary>
  )
}

// 主 App 组件，包装 AuthProvider 和 ThemeProvider
function App() {
  return (
    <I18nProvider>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <AppContent />
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </I18nProvider>
  )
}

export default App
