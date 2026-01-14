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
import { ThemeProvider } from './components/ui/theme-provider'
import { I18nProvider } from './contexts/I18nContext'
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
  const [preparations, setPreparations] = useState<Preparation[]>([])
  const [isLoading, setIsLoading] = useState(true)

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

  useEffect(() => {
    if (user) {
      loadPreparations()
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
