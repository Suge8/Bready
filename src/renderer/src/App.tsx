import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import WelcomePage from './components/WelcomePage'
import MainPage from './components/MainPage'
import CreatePreparationPage from './components/CreatePreparationPage'
import FloatingWindow from './components/FloatingWindow'
import CollaborationMode from './components/CollaborationMode'
import TestPage from './components/TestPage'

// 声明全局类型
declare global {
  interface Window {
    bready: {
      createFloatingWindow: () => Promise<boolean>
      closeFloatingWindow: () => Promise<boolean>
      enterCollaborationMode: () => Promise<boolean>
      exitCollaborationMode: () => Promise<boolean>
      initializeGemini: (apiKey: string, customPrompt?: string, profile?: string, language?: string) => Promise<boolean>
      startAudioCapture: () => Promise<boolean>
      stopAudioCapture: () => Promise<boolean>
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

  const handleExit = () => {
    navigate('/')
  }

  return <CollaborationMode onExit={handleExit} />
}

function App() {
  const [isFirstTime, setIsFirstTime] = useState(true)
  const [preparations, setPreparations] = useState<any[]>([])

  useEffect(() => {
    // 检查是否是首次访问
    const hasPreparations = localStorage.getItem('bready-preparations')
    if (hasPreparations) {
      setIsFirstTime(false)
      setPreparations(JSON.parse(hasPreparations))
    }
  }, [])

  // 检查当前路由是否是悬浮窗
  const isFloatingWindow = window.location.hash === '#/floating'

  if (isFloatingWindow) {
    return <FloatingWindow />
  }

  return (
    <Router>
      <div className="min-h-screen bg-vercel-white">
        <Routes>
          <Route
            path="/"
            element={
              isFirstTime ? (
                <WelcomePage onComplete={() => setIsFirstTime(false)} />
              ) : (
                <MainPage preparations={preparations} setPreparations={setPreparations} />
              )
            }
          />
          <Route
            path="/collaboration"
            element={<CollaborationModeWrapper />}
          />
          <Route
            path="/create-preparation"
            element={
              <CreatePreparationPage
                preparations={preparations}
                setPreparations={setPreparations}
              />
            }
          />
          <Route
            path="/edit-preparation/:id"
            element={
              <CreatePreparationPage
                preparations={preparations}
                setPreparations={setPreparations}
              />
            }
          />
          <Route path="/test" element={<TestPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
