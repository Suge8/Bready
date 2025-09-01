import React, { useState, useEffect } from 'react'
import { HashRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import WelcomePage from './components/WelcomePage'
import MainPage from './components/MainPage'
import CreatePreparationPage from './components/CreatePreparationPage'
import PreparationDetailPage from './components/PreparationDetailPage'
import FloatingWindow from './components/FloatingWindow'
import CollaborationMode from './components/CollaborationMode'
import LoginPage from './components/LoginPage'
import ErrorBoundary from './components/ErrorBoundary'
import TestPage from './components/TestPage'
import AuthTestPage from './components/AuthTestPage'
import DebugPage from './components/DebugPage'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { preparationService, type Preparation } from './lib/supabase'
import { Loader2 } from 'lucide-react'

// 声明全局类型
declare global {
  interface Window {
    bready: {
      createFloatingWindow: () => Promise<boolean>
      closeFloatingWindow: () => Promise<boolean>
      enterCollaborationMode: () => Promise<boolean>
      exitCollaborationMode: () => Promise<boolean>
      initializeGemini: (apiKey: string, customPrompt?: string, profile?: string, language?: string) => Promise<boolean>
      sendTextMessage: (message: string) => Promise<{ success: boolean; error?: string }>
      startAudioCapture: () => Promise<boolean>
      stopAudioCapture: () => Promise<boolean>
      switchAudioMode: (mode: 'system' | 'microphone') => Promise<boolean>
      getAudioStatus: () => Promise<{ capturing: boolean; mode: string; options: any }>
      reconnectGemini: () => Promise<boolean>
      manualReconnect: () => Promise<boolean>
      disconnectGemini: () => Promise<boolean>

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
      onSessionInitializing: (callback: (initializing: boolean) => void) => () => void
      onSessionError: (callback: (error: string) => void) => () => void
      onSessionClosed: (callback: () => void) => () => void
      onContextCompressed: (callback: (data: {previousCount: number, newCount: number}) => void) => () => void
      onAudioStreamInterrupted: (callback: () => void) => () => void
      onAudioStreamRestored: (callback: () => void) => () => void
      analyzePreparation: (data: { name: string; jobDescription: string; resume?: string }) => Promise<{ success: boolean; analysis?: any; error?: string }>
    }
    env: {
      GEMINI_API_KEY?: string
      SUPABASE_URL?: string
      SUPABASE_ANON_KEY?: string
      DEV_MODE?: string
    }
  }
}



// 协作模式包装组件
const CollaborationModeWrapper: React.FC = () => {
  const navigate = useNavigate()

  const handleExit = async () => {
    try {
      // 断开 Gemini API 连接
      await window.bready.disconnectGemini()

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

// 受保护的路由组件
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth()

  console.log('ProtectedRoute: user =', user, 'loading =', loading)

  if (loading) {
    console.log('ProtectedRoute: Showing loading state')
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-600" />
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    console.log('ProtectedRoute: No user, showing LoginPage')
    return <LoginPage />
  }

  console.log('ProtectedRoute: User authenticated, showing children')
  return <>{children}</>
}

function AppContent() {
  const { user } = useAuth()
  const [isFirstTime, setIsFirstTime] = useState(true)
  const [preparations, setPreparations] = useState<Preparation[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // 移除全局音频初始化，改为在协作模式组件中按需初始化

  const handleWelcomeComplete = () => {
    // 标记欢迎流程已完成
    localStorage.setItem('bready-welcome-completed', 'true')
    setIsFirstTime(false)
  }

  // 加载准备项数据
  const loadPreparations = async () => {
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
    // 检查是否已经完成欢迎流程
    const hasCompletedWelcome = localStorage.getItem('bready-welcome-completed')
    if (hasCompletedWelcome === 'true') {
      setIsFirstTime(false)
    }
  }, [])

  // 当用户变化时重新加载数据
  useEffect(() => {
    if (user) {
      loadPreparations()
    } else {
      // 如果没有用户，直接设置加载完成
      setIsLoading(false)
    }
  }, [user])

  // 检查当前路由是否是悬浮窗
  const isFloatingWindow = window.location.hash === '#/floating'

  if (isFloatingWindow) {
    return <FloatingWindow />
  }

  // 如果正在加载，显示加载状态
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">正在加载...</p>
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <Router>
        <div className="min-h-screen bg-white">
          <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                {isFirstTime ? (
                  <WelcomePage onComplete={handleWelcomeComplete} />
                ) : (
                  <MainPage
                    preparations={preparations}
                    setPreparations={setPreparations}
                    onReloadData={loadPreparations}
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
                <CreatePreparationPage
                  preparations={preparations}
                  setPreparations={setPreparations}
                  onReloadData={loadPreparations}
                />
              </ProtectedRoute>
            }
          />
          <Route
            path="/edit-preparation/:id"
            element={
              <ProtectedRoute>
                <CreatePreparationPage
                  preparations={preparations}
                  setPreparations={setPreparations}
                  onReloadData={loadPreparations}
                />
              </ProtectedRoute>
            }
          />
          <Route
            path="/preparation/:id"
            element={
              <ProtectedRoute>
                <PreparationDetailPage
                  preparations={preparations}
                />
              </ProtectedRoute>
            }
          />
          <Route path="/test" element={<TestPage />} />
          <Route path="/auth-test" element={<AuthTestPage />} />
          <Route path="/debug" element={<DebugPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
    </ErrorBoundary>
  )
}

// 主 App 组件，包装 AuthProvider
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
