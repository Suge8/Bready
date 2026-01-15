import { useState, useEffect } from 'react'
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

const CollaborationModeWrapper = () => {
  const navigate = useNavigate()

  const handleExit = async () => {
    try {
      await window.bready.disconnectAI()
      await window.bready.stopAudioCapture()
      await window.bready.exitCollaborationMode()
    } catch (error) {
      console.error('Collaboration mode cleanup error:', error)
    } finally {
      navigate('/')
    }
  }

  return <CollaborationMode onExit={handleExit} />
}

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
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
      const data = await preparationService.getAll(user?.id)
      setPreparations(data)
    } catch (error) {
      console.error('Failed to load preparations:', error)
      const cached = localStorage.getItem('bready-preparations')
      if (cached) setPreparations(JSON.parse(cached))
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
            {['/create-preparation', '/edit-preparation/:id', '/preparation/:id'].map((path) => (
              <Route
                key={path}
                path={path}
                element={
                  <ProtectedRoute>
                    <Navigate to="/" replace />
                  </ProtectedRoute>
                }
              />
            ))}

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    </ErrorBoundary>
  )
}

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
