import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Mail, Phone, Eye, EyeOff, Loader2 } from 'lucide-react'
import { useI18n } from '../contexts/I18nContext'

type LoginMode = 'email' | 'phone' | 'signup'

const LoginPage: React.FC = () => {
  const { signIn, signUp, signInWithGoogle, signInWithPhone, verifyOtp, loading } = useAuth()
  const { t } = useI18n()
  const [mode, setMode] = useState<LoginMode>('email')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showOtpInput, setShowOtpInput] = useState(false)
  const [error, setError] = useState('')

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      const { error } = await signIn(email, password)
      if (error) {
        setError(error.message)
      }
    } catch (err: any) {
      setError(err.message || t('login.errors.loginFailed'))
    }
  }

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      const { error } = await signUp(email, password, { full_name: fullName })
      if (error) {
        setError(error.message)
      } else {
        setError(t('login.errors.signupSuccess'))
        // 注册成功后自动登录
        setTimeout(() => {
          signIn(email, password)
        }, 1000)
      }
    } catch (err: any) {
      setError(err.message || t('login.errors.signupFailed'))
    }
  }

  const handleGoogleLogin = async () => {
    setError('')
    try {
      const { error } = await signInWithGoogle()
      if (error) {
        setError(error.message)
      }
    } catch (err: any) {
      setError(err.message || t('login.errors.googleFailed'))
    }
  }

  const handlePhoneLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      const { error } = await signInWithPhone(phone)
      if (error) {
        setError(error.message)
      } else {
        setShowOtpInput(true)
      }
    } catch (err: any) {
      setError(err.message || t('login.errors.sendCodeFailed'))
    }
  }

  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      const { error } = await verifyOtp(phone, otp)
      if (error) {
        setError(error.message)
      }
    } catch (err: any) {
      setError(err.message || t('login.errors.verifyFailed'))
    }
  }

  const handleTestLogin = async () => {
    console.log('🔐 handleTestLogin: Starting test login...')
    setError('')
    try {
      // 使用测试管理员账号
      console.log('🔐 handleTestLogin: Calling signIn...')
      const { error } = await signIn('admin@bready.app', 'admin123')
      console.log('🔐 handleTestLogin: signIn result:', { error })
      if (error) {
        console.error('🔐 handleTestLogin: Login error:', error.message)
        setError(error.message)
      } else {
        console.log('✅ handleTestLogin: Login successful!')
      }
    } catch (err: any) {
      console.error('❌ handleTestLogin: Exception:', err)
      setError(err.message || t('login.errors.testLoginFailed'))
    }
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-[var(--bready-bg)] text-[var(--bready-text)] flex flex-col">
      {/* 拖拽区域 */}
      <div className="h-12 w-full app-drag"></div>

      {/* 主要内容 */}
      <div className="flex-1 overflow-y-auto app-no-drag">
        <div className="min-h-full flex items-center justify-center p-4">
          <Card className="w-full max-w-md border border-[var(--bready-border)] bg-[var(--bready-surface)] shadow-xl">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold">{t('login.title')}</CardTitle>
              <CardDescription>
                {mode === 'signup' ? t('login.subtitleSignup') : t('login.subtitleLogin')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <div className="p-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-lg">
                  {error}
                </div>
              )}

              {/* 邮箱登录/注册 */}
              {mode === 'email' || mode === 'signup' ? (
                <form onSubmit={mode === 'signup' ? handleEmailSignup : handleEmailLogin} className="space-y-4">
                  {mode === 'signup' && (
                    <div>
                      <label className="block text-sm font-medium text-[var(--bready-text-muted)] mb-1">{t('login.nickname')}</label>
                      <Input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder={t('login.placeholders.nickname')}
                        required
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-[var(--bready-text-muted)] mb-1">{t('login.email')}</label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t('login.placeholders.email')}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--bready-text-muted)] mb-1">{t('login.password')}</label>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={t('login.placeholders.password')}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--bready-text-muted)] hover:text-[var(--bready-text)] cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {mode === 'signup' ? t('login.signup') : t('login.login')}
                  </Button>
                </form>
              ) : null}

              {/* 手机号登录 */}
              {mode === 'phone' && !showOtpInput && (
                <form onSubmit={handlePhoneLogin} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--bready-text-muted)] mb-1">{t('login.phone')}</label>
                    <Input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder={t('login.placeholders.phone')}
                      required
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {t('login.sendCode')}
                  </Button>
                </form>
              )}

              {/* OTP 验证 */}
              {mode === 'phone' && showOtpInput && (
                <form onSubmit={handleOtpVerify} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--bready-text-muted)] mb-1">{t('login.code')}</label>
                    <Input
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder={t('login.placeholders.code')}
                      maxLength={6}
                      required
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {t('login.verify')}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowOtpInput(false)}
                  >
                    {t('login.resend')}
                  </Button>
                </form>
              )}

              {/* Google 登录 */}
              <Button
                onClick={handleGoogleLogin}
                variant="outline"
                className="w-full"
                disabled={loading}
              >
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                {t('login.google')}
              </Button>

              {/* 测试登录按钮 */}
              <Button
                onClick={handleTestLogin}
                variant="outline"
                className="w-full text-sm"
                disabled={loading}
              >
                {t('login.adminTest')}
              </Button>

              {/* 切换登录方式 */}
              <div className="flex justify-center space-x-4 text-sm">
                <button
                  onClick={() => setMode('email')}
                  className={`flex items-center space-x-1 cursor-pointer transition-colors ${mode === 'email' ? 'text-[var(--bready-text)]' : 'text-[var(--bready-text-muted)]'}`}
                >
                  <Mail className="w-4 h-4" />
                  <span>{t('login.switchEmail')}</span>
                </button>
                <button
                  onClick={() => setMode('phone')}
                  className={`flex items-center space-x-1 cursor-pointer transition-colors ${mode === 'phone' ? 'text-[var(--bready-text)]' : 'text-[var(--bready-text-muted)]'}`}
                >
                  <Phone className="w-4 h-4" />
                  <span>{t('login.switchPhone')}</span>
                </button>
              </div>

              {/* 注册/登录切换 */}
              <div className="text-center text-sm">
                {mode === 'signup' ? (
                  <span>
                    {t('login.hasAccount')}
                    <button
                      onClick={() => setMode('email')}
                      className="ml-1 text-[var(--bready-text)] hover:underline cursor-pointer"
                    >
                      {t('login.loginNow')}
                    </button>
                  </span>
                ) : (
                  <span>
                    {t('login.noAccount')}
                    <button
                      onClick={() => setMode('signup')}
                      className="ml-1 text-[var(--bready-text)] hover:underline cursor-pointer"
                    >
                      {t('login.signupNow')}
                    </button>
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
