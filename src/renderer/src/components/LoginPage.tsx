import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import { Button } from './ui/button'
import { Mail, Phone, Eye, EyeOff, Loader2, Sparkles } from 'lucide-react'
import { useI18n } from '../contexts/I18nContext'
import { useTheme } from './ui/theme-provider'

type LoginMode = 'email' | 'phone' | 'signup'

const LoginPage: React.FC = () => {
  const { signIn, signUp, signInWithPhone, verifyOtp, loading } = useAuth()
  const { t } = useI18n()
  const { resolvedTheme } = useTheme()
  const [mode, setMode] = useState<LoginMode>('email')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showOtpInput, setShowOtpInput] = useState(false)
  const [error, setError] = useState('')

  const isDarkMode = resolvedTheme === 'dark'

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      const { error } = await signIn(email, password)
      if (error) setError(error.message)
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
        setTimeout(() => signIn(email, password), 1000)
      }
    } catch (err: any) {
      setError(err.message || t('login.errors.signupFailed'))
    }
  }

  const handleWeChatLogin = () => {
    setError('微信登录暂不支持，请使用邮箱密码登录')
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
      if (error) setError(error.message)
    } catch (err: any) {
      setError(err.message || t('login.errors.verifyFailed'))
    }
  }

  const inputClass = `w-full h-12 px-4 rounded-xl border outline-none transition-all duration-200 ${
    isDarkMode
      ? 'bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500 focus:border-zinc-600 focus:ring-1 focus:ring-zinc-700'
      : 'bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:ring-1 focus:ring-gray-300'
  }`

  return (
    <div
      className={`h-screen w-screen overflow-hidden flex flex-col ${isDarkMode ? 'bg-black' : 'bg-white'}`}
    >
      <div className="h-10 w-full app-drag flex-shrink-0" />

      <div className="flex-1 flex items-center justify-center app-no-drag px-6">
        <motion.div
          className="w-full max-w-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            className="text-center mb-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div
              className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-5 ${
                isDarkMode ? 'bg-white' : 'bg-black'
              }`}
            >
              <Sparkles className={`w-7 h-7 ${isDarkMode ? 'text-black' : 'text-white'}`} />
            </div>
            <h1
              className={`text-2xl font-semibold tracking-tight ${isDarkMode ? 'text-white' : 'text-black'}`}
            >
              面宝 Bready
            </h1>
            <p className={`text-sm mt-1.5 ${isDarkMode ? 'text-zinc-500' : 'text-gray-500'}`}>
              {mode === 'signup' ? t('login.subtitleSignup') : t('login.subtitleLogin')}
            </p>
          </motion.div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mb-5 p-3 text-sm rounded-xl ${
                isDarkMode
                  ? 'bg-red-900/20 text-red-400 border border-red-900/30'
                  : 'bg-red-50 text-red-600 border border-red-100'
              }`}
            >
              {error}
            </motion.div>
          )}

          {(mode === 'email' || mode === 'signup') && (
            <form
              onSubmit={mode === 'signup' ? handleEmailSignup : handleEmailLogin}
              className="space-y-4"
            >
              {mode === 'signup' && (
                <input
                  type="text"
                  value={fullName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFullName(e.target.value)}
                  placeholder={t('login.placeholders.nickname')}
                  className={inputClass}
                  required
                />
              )}
              <input
                type="email"
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                placeholder={t('login.placeholders.email')}
                className={inputClass}
                required
              />
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                  placeholder={t('login.placeholders.password')}
                  className={inputClass}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer ${
                    isDarkMode
                      ? 'text-zinc-500 hover:text-zinc-300'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <Button
                type="submit"
                className="w-full h-12 text-base font-medium"
                disabled={loading}
              >
                {loading && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
                {mode === 'signup' ? t('login.signup') : t('login.login')}
              </Button>
            </form>
          )}

          {mode === 'phone' && !showOtpInput && (
            <form onSubmit={handlePhoneLogin} className="space-y-4">
              <input
                type="tel"
                value={phone}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPhone(e.target.value)}
                placeholder={t('login.placeholders.phone')}
                className={inputClass}
                required
              />
              <Button
                type="submit"
                className="w-full h-12 text-base font-medium"
                disabled={loading}
              >
                {loading && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
                {t('login.sendCode')}
              </Button>
            </form>
          )}

          {mode === 'phone' && showOtpInput && (
            <form onSubmit={handleOtpVerify} className="space-y-4">
              <input
                type="text"
                value={otp}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOtp(e.target.value)}
                placeholder={t('login.placeholders.code')}
                maxLength={6}
                className={inputClass}
                required
              />
              <Button
                type="submit"
                className="w-full h-12 text-base font-medium"
                disabled={loading}
              >
                {loading && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
                {t('login.verify')}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full h-11"
                onClick={() => setShowOtpInput(false)}
              >
                {t('login.resend')}
              </Button>
            </form>
          )}

          <div className="mt-6">
            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div
                  className={`w-full border-t ${isDarkMode ? 'border-zinc-800' : 'border-gray-200'}`}
                />
              </div>
              <div className="relative flex justify-center">
                <span
                  className={`px-3 text-xs ${isDarkMode ? 'bg-black text-zinc-600' : 'bg-white text-gray-400'}`}
                >
                  {t('login.or') || '或'}
                </span>
              </div>
            </div>

            <Button
              onClick={handleWeChatLogin}
              variant="outline"
              className="w-full h-11"
              disabled={loading}
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 mr-2" fill="#07C160">
                <path d="M9.5 4C5.36 4 2 6.69 2 10c0 1.89 1.08 3.56 2.78 4.66l-.7 2.1 2.46-1.23c.78.23 1.6.37 2.46.42-.16-.54-.25-1.1-.25-1.69 0-3.31 3.36-6 7.5-6 .39 0 .77.03 1.14.08C16.41 5.64 13.21 4 9.5 4zm-2.25 3.5c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm4.5 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM16.25 10c-3.58 0-6.5 2.24-6.5 5s2.92 5 6.5 5c.67 0 1.32-.09 1.93-.26l1.95.98-.56-1.68c1.36-.93 2.18-2.31 2.18-3.79 0-2.76-2.92-5-6.5-5zm-2.25 3c.41 0 .75.34.75.75s-.34.75-.75.75-.75-.34-.75-.75.34-.75.75-.75zm4.5 0c.41 0 .75.34.75.75s-.34.75-.75.75-.75-.34-.75-.75.34-.75.75-.75z" />
              </svg>
              微信登录
            </Button>
          </div>

          <div
            className={`flex justify-center gap-8 mt-6 text-sm ${isDarkMode ? 'text-zinc-500' : 'text-gray-500'}`}
          >
            <button
              onClick={() => {
                setMode('email')
                setShowOtpInput(false)
              }}
              className={`flex items-center gap-1.5 cursor-pointer transition-colors hover:${isDarkMode ? 'text-white' : 'text-black'} ${
                mode === 'email' || mode === 'signup'
                  ? isDarkMode
                    ? 'text-white'
                    : 'text-black'
                  : ''
              }`}
            >
              <Mail className="w-4 h-4" />
              <span>{t('login.switchEmail')}</span>
            </button>
            <button
              onClick={() => {
                setMode('phone')
                setShowOtpInput(false)
              }}
              className={`flex items-center gap-1.5 cursor-pointer transition-colors hover:${isDarkMode ? 'text-white' : 'text-black'} ${
                mode === 'phone' ? (isDarkMode ? 'text-white' : 'text-black') : ''
              }`}
            >
              <Phone className="w-4 h-4" />
              <span>{t('login.switchPhone')}</span>
            </button>
          </div>

          <div
            className={`text-center text-sm mt-5 ${isDarkMode ? 'text-zinc-500' : 'text-gray-500'}`}
          >
            {mode === 'signup' ? (
              <>
                {t('login.hasAccount')}
                <button
                  onClick={() => setMode('email')}
                  className={`ml-1 font-medium cursor-pointer ${isDarkMode ? 'text-white' : 'text-black'}`}
                >
                  {t('login.loginNow')}
                </button>
              </>
            ) : (
              <>
                {t('login.noAccount')}
                <button
                  onClick={() => setMode('signup')}
                  className={`ml-1 font-medium cursor-pointer ${isDarkMode ? 'text-white' : 'text-black'}`}
                >
                  {t('login.signupNow')}
                </button>
              </>
            )}
          </div>
        </motion.div>
      </div>

      <div
        className={`text-center text-xs py-4 flex-shrink-0 ${isDarkMode ? 'text-zinc-700' : 'text-gray-400'}`}
      >
        © 2024 Bready
      </div>
    </div>
  )
}

export default LoginPage
