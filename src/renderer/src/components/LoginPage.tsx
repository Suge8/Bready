import React, { useState } from 'react'
import { motion, AnimatePresence, Variants } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { Button } from './ui/button'
import {
  Mail,
  Phone,
  Eye,
  EyeOff,
  Loader2,
  Sparkles,
  Cpu,
  Mic,
  MessageSquareText,
  Globe,
} from 'lucide-react'
import { useI18n } from '../contexts/I18nContext'
import { useTheme } from './ui/theme-provider'
import heroImage from '../assets/hero3.png'

const FontStyles = ({ isDark }: { isDark: boolean }) => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;700&display=swap');
    
    .font-sans { font-family: 'Inter', sans-serif; }
    .font-display { font-family: 'Space Grotesk', sans-serif; }
    
    input:focus, textarea:focus, select:focus {
      outline: none !important;
      border-color: ${isDark ? '#fff' : '#000'} !important;
      box-shadow: 0 0 0 1px ${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'} !important;
    }
    
    input::selection {
      background: ${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'};
    }
  `}</style>
)

type LoginMode = 'email' | 'phone' | 'signup'

const LoginPage: React.FC = () => {
  const { signIn, signUp, signInWithPhone, verifyOtp, loading } = useAuth()
  const { t, language, setLanguage, languageOptions } = useI18n()
  const { resolvedTheme } = useTheme()
  const [mode, setMode] = useState<LoginMode>('email')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')

  const [showPassword, setShowPassword] = useState(false)
  const [showOtpInput, setShowOtpInput] = useState(false)
  const [showLangMenu, setShowLangMenu] = useState(false)
  const { toast } = useToast()

  const isDarkMode = resolvedTheme === 'dark'

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { error } = await signIn(email, password)
      if (error) {
        toast(error.message, 'error')
      }
    } catch (err: any) {
      const msg = err.message || ''
      if (msg.includes('fetch failed') || msg.includes('network error')) {
        toast(t('login.errors.networkError'), 'error')
      } else {
        toast(msg || t('login.errors.loginFailed'), 'error')
      }
    }
  }

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { error } = await signUp(email, password, { full_name: fullName })
      if (error) {
        toast(error.message, 'error')
      } else {
        toast(t('login.errors.signupSuccess'), 'success')
        setTimeout(() => signIn(email, password), 1000)
      }
    } catch (err: any) {
      const msg = err.message || ''
      if (msg.includes('fetch failed') || msg.includes('network error')) {
        toast(t('login.errors.networkError'), 'error')
      } else {
        toast(msg || t('login.errors.signupFailed'), 'error')
      }
    }
  }

  const handleWeChatLogin = () => {
    toast(t('login.errors.wechatUnavailable'), 'warning')
  }

  const handlePhoneLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { error } = await signInWithPhone(phone)
      if (error) {
        toast(error.message, 'error')
      } else {
        setShowOtpInput(true)
      }
    } catch (err: any) {
      const msg = err.message || ''
      if (msg.includes('fetch failed') || msg.includes('network error')) {
        toast(t('login.errors.networkError'), 'error')
      } else {
        toast(msg || t('login.errors.sendCodeFailed'), 'error')
      }
    }
  }

  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { error } = await verifyOtp(phone, otp)
      if (error) toast(error.message, 'error')
    } catch (err: any) {
      const msg = err.message || ''
      if (msg.includes('fetch failed') || msg.includes('network error')) {
        toast(t('login.errors.networkError'), 'error')
      } else {
        toast(msg || t('login.errors.verifyFailed'), 'error')
      }
    }
  }

  const fadeUp: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
  }

  const stagger: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.15 } },
  }

  const featureItem: Variants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: 'easeOut' } },
  }

  const bgClass = isDarkMode ? 'bg-black text-white' : 'bg-white text-black'
  const inputClass = `w-full h-10 px-3 rounded-xl border text-[14px] bg-transparent transition-all duration-200 outline-none ${
    isDarkMode
      ? 'border-[#333] placeholder:text-[#666]'
      : 'border-[#EAEAEA] placeholder:text-[#888]'
  }`

  const buttonClass = `w-full h-10 rounded-xl text-[14px] font-medium transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
    isDarkMode
      ? 'bg-white text-black hover:bg-[#E5E5E5] hover:scale-[1.02]'
      : 'bg-black text-white hover:bg-[#333] hover:scale-[1.02]'
  }`

  const secondaryButtonClass = `w-full h-10 rounded-xl text-[14px] font-medium transition-all duration-200 flex items-center justify-center gap-2 border cursor-pointer ${
    isDarkMode
      ? 'border-[#333] hover:border-[#555] hover:bg-[#111] text-[#888] hover:text-white bg-transparent'
      : 'border-[#EAEAEA] hover:border-[#CCC] hover:bg-[#F5F5F5] text-[#666] hover:text-black bg-transparent'
  }`

  return (
    <div className={`h-screen w-screen flex font-sans overflow-hidden ${bgClass}`}>
      <FontStyles isDark={isDarkMode} />

      <div className="absolute top-0 left-0 w-full h-10 app-drag z-50" />

      <div
        className={`hidden lg:flex flex-col w-[55%] relative overflow-hidden ${
          isDarkMode ? 'bg-[#050505]' : 'bg-[#FAFAFA]'
        } border-r ${isDarkMode ? 'border-[#111]' : 'border-[#EAEAEA]'}`}
      >
        <motion.img
          src={heroImage}
          alt="Bready Hero"
          initial={{ opacity: 0, x: -100, y: 100 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          transition={{ type: 'spring', stiffness: 50, damping: 20, delay: 0.3 }}
          className="absolute -bottom-[5%] -left-[5%] w-[70%] max-w-[550px] h-auto z-10 pointer-events-none select-none"
        />

        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <svg className="w-full h-full" width="100%" height="100%">
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke={isDarkMode ? '#333' : '#CCC'}
                strokeWidth="0.5"
              />
            </pattern>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        <div className="absolute top-12 left-12 z-20">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-3"
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDarkMode ? 'bg-white' : 'bg-black'}`}
            >
              <Sparkles className={`w-4 h-4 ${isDarkMode ? 'text-black' : 'text-white'}`} />
            </div>
            <span className="text-xl font-bold tracking-tight">Bready</span>
          </motion.div>
        </div>

        <div className="flex-1 flex items-center justify-end pr-16 z-20">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="max-w-md text-right"
          >
            <motion.h1
              variants={fadeUp}
              className="text-5xl font-bold tracking-tighter leading-[1.1] mb-6 whitespace-pre-line"
            >
              {t('login.hero.title')}
            </motion.h1>
            <motion.p
              variants={fadeUp}
              className={`text-base mb-10 ${isDarkMode ? 'text-[#888]' : 'text-[#666]'}`}
            >
              {t('login.hero.subtitle')}
            </motion.p>

            <motion.div variants={stagger} className="space-y-4">
              <motion.div
                variants={featureItem}
                whileHover={{ x: -5, scale: 1.02 }}
                className="flex items-center gap-4 justify-end cursor-default"
              >
                <span className="font-medium">{t('login.hero.features.analysis')}</span>
                <div className={`p-2 rounded-full ${isDarkMode ? 'bg-[#111]' : 'bg-[#EAEAEA]'}`}>
                  <Cpu className="w-5 h-5" />
                </div>
              </motion.div>
              <motion.div
                variants={featureItem}
                whileHover={{ x: -5, scale: 1.02 }}
                className="flex items-center gap-4 justify-end cursor-default"
              >
                <span className="font-medium">{t('login.hero.features.transcription')}</span>
                <div className={`p-2 rounded-full ${isDarkMode ? 'bg-[#111]' : 'bg-[#EAEAEA]'}`}>
                  <Mic className="w-5 h-5" />
                </div>
              </motion.div>
              <motion.div
                variants={featureItem}
                whileHover={{ x: -5, scale: 1.02 }}
                className="flex items-center gap-4 justify-end cursor-default"
              >
                <span className="font-medium">{t('login.hero.features.suggestions')}</span>
                <div className={`p-2 rounded-full ${isDarkMode ? 'bg-[#111]' : 'bg-[#EAEAEA]'}`}>
                  <MessageSquareText className="w-5 h-5" />
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className={`absolute bottom-8 right-12 text-xs z-20 ${isDarkMode ? 'text-[#444]' : 'text-[#999]'}`}
        >
          {t('login.hero.footer')}
        </motion.div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-8 relative">
        <div className="absolute top-8 right-8 z-20">
          <div className="relative">
            <button
              onClick={() => setShowLangMenu(!showLangMenu)}
              className={`p-2 rounded-xl transition-all duration-200 cursor-pointer ${isDarkMode ? 'hover:bg-[#111]' : 'hover:bg-[#F5F5F5]'}`}
            >
              <Globe className={`w-5 h-5 ${isDarkMode ? 'text-[#666]' : 'text-[#999]'}`} />
            </button>
            <AnimatePresence>
              {showLangMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`absolute right-0 mt-2 w-40 rounded-xl shadow-xl border overflow-hidden ${
                    isDarkMode ? 'bg-[#0A0A0A] border-[#222]' : 'bg-white border-[#EAEAEA]'
                  }`}
                >
                  {languageOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setLanguage(opt.value)
                        setShowLangMenu(false)
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-all duration-200 flex items-center justify-between cursor-pointer ${
                        isDarkMode
                          ? 'text-[#CCC] hover:bg-[#111] hover:text-white'
                          : 'text-[#666] hover:bg-[#F5F5F5] hover:text-black'
                      } ${language === opt.value ? (isDarkMode ? 'bg-[#111] text-white' : 'bg-[#F5F5F5] text-black') : ''}`}
                    >
                      {opt.label}
                      {language === opt.value && (
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      )}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="w-full max-w-[320px]">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 text-center"
          >
            <h2 className="text-2xl font-bold tracking-tight mb-2">
              {mode === 'signup' ? t('login.subtitleSignup') : t('login.subtitleLogin')}
            </h2>
          </motion.div>

          <div className="relative min-h-[100px]">
            <AnimatePresence mode="wait">
              {(mode === 'email' || mode === 'signup') && (
                <motion.form
                  key="email-form"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={mode === 'signup' ? handleEmailSignup : handleEmailLogin}
                  className="space-y-4"
                >
                  {mode === 'signup' && (
                    <div className="space-y-1">
                      <label
                        className={`text-xs font-medium ${isDarkMode ? 'text-[#888]' : 'text-[#666]'}`}
                      >
                        {t('login.nickname')}
                      </label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder={t('login.placeholders.nickname')}
                        className={inputClass}
                        required
                      />
                    </div>
                  )}
                  <div className="space-y-1">
                    <label
                      className={`text-xs font-medium ${isDarkMode ? 'text-[#888]' : 'text-[#666]'}`}
                    >
                      {t('login.email')}
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t('login.placeholders.email')}
                      className={inputClass}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label
                      className={`text-xs font-medium ${isDarkMode ? 'text-[#888]' : 'text-[#666]'}`}
                    >
                      {t('login.password')}
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={t('login.placeholders.password')}
                        className={inputClass}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className={`absolute right-3 top-1/2 -translate-y-1/2 transition-all duration-200 cursor-pointer ${
                          isDarkMode
                            ? 'text-[#666] hover:text-white'
                            : 'text-[#999] hover:text-black'
                        }`}
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <Button type="submit" className={buttonClass} disabled={loading}>
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : mode === 'signup' ? (
                      t('login.signup')
                    ) : (
                      t('login.login')
                    )}
                  </Button>
                </motion.form>
              )}

              {mode === 'phone' && !showOtpInput && (
                <motion.form
                  key="phone-form"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={handlePhoneLogin}
                  className="space-y-4"
                >
                  <div className="space-y-1">
                    <label
                      className={`text-xs font-medium ${isDarkMode ? 'text-[#888]' : 'text-[#666]'}`}
                    >
                      {t('login.phone')}
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder={t('login.placeholders.phone')}
                      className={inputClass}
                      required
                    />
                  </div>
                  <Button type="submit" className={buttonClass} disabled={loading}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('login.sendCode')}
                  </Button>
                </motion.form>
              )}

              {mode === 'phone' && showOtpInput && (
                <motion.form
                  key="otp-form"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={handleOtpVerify}
                  className="space-y-4"
                >
                  <div
                    className={`text-center text-sm mb-2 ${isDarkMode ? 'text-[#888]' : 'text-[#666]'}`}
                  >
                    {t('login.codeSentTo') || 'Code sent to'} {phone}
                  </div>
                  <div className="space-y-1">
                    <input
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder={t('login.placeholders.code')}
                      maxLength={6}
                      className={`${inputClass} text-center tracking-widest text-lg font-mono`}
                      required
                      autoFocus
                    />
                  </div>
                  <Button type="submit" className={buttonClass} disabled={loading}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('login.verify')}
                  </Button>
                  <button
                    type="button"
                    onClick={() => setShowOtpInput(false)}
                    className={`w-full text-xs cursor-pointer transition-all duration-200 hover:underline ${isDarkMode ? 'text-[#666] hover:text-white' : 'text-[#999] hover:text-black'}`}
                  >
                    {t('login.resend')}
                  </button>
                </motion.form>
              )}
            </AnimatePresence>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-8 pt-8 border-t border-[#333]/10 dark:border-[#fff]/10"
          >
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button
                onClick={() => {
                  setMode('email')
                  setShowOtpInput(false)
                }}
                className={secondaryButtonClass}
              >
                <Mail className="w-4 h-4" />
                <span>{t('login.switchEmail')}</span>
              </button>
              <button
                onClick={() => {
                  setMode('phone')
                  setShowOtpInput(false)
                }}
                className={secondaryButtonClass}
              >
                <Phone className="w-4 h-4" />
                <span>{t('login.switchPhone')}</span>
              </button>
            </div>

            <Button
              onClick={handleWeChatLogin}
              variant="outline"
              className={`w-full h-10 rounded-xl border-dashed cursor-pointer transition-all duration-200 ${
                isDarkMode
                  ? 'border-[#333] hover:bg-[#111] hover:border-[#555] text-[#888] hover:text-white'
                  : 'border-[#EAEAEA] hover:bg-[#F5F5F5] hover:border-[#CCC] text-[#666] hover:text-black'
              }`}
              disabled={loading}
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 mr-2 opacity-80" fill="#07C160">
                <path d="M9.5 4C5.36 4 2 6.69 2 10c0 1.89 1.08 3.56 2.78 4.66l-.7 2.1 2.46-1.23c.78.23 1.6.37 2.46.42-.16-.54-.25-1.1-.25-1.69 0-3.31 3.36-6 7.5-6 .39 0 .77.03 1.14.08C16.41 5.64 13.21 4 9.5 4zm-2.25 3.5c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm4.5 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM16.25 10c-3.58 0-6.5 2.24-6.5 5s2.92 5 6.5 5c.67 0 1.32-.09 1.93-.26l1.95.98-.56-1.68c1.36-.93 2.18-2.31 2.18-3.79 0-2.76-2.92-5-6.5-5zm-2.25 3c.41 0 .75.34.75.75s-.34.75-.75.75-.75-.34-.75-.75.34-.75.75-.75zm4.5 0c.41 0 .75.34.75.75s-.34.75-.75.75-.75-.34-.75-.75.34-.75.75-.75z" />
              </svg>
              {t('login.wechat')}
            </Button>

            <div
              className={`mt-6 text-center text-sm ${isDarkMode ? 'text-[#666]' : 'text-[#888]'}`}
            >
              {mode === 'signup' ? (
                <>
                  {t('login.hasAccount')}
                  <button
                    onClick={() => setMode('email')}
                    className={`ml-1.5 font-medium cursor-pointer transition-all duration-200 hover:underline ${isDarkMode ? 'text-white' : 'text-black'}`}
                  >
                    {t('login.loginNow')}
                  </button>
                </>
              ) : (
                <>
                  {t('login.noAccount')}
                  <button
                    onClick={() => setMode('signup')}
                    className={`ml-1.5 font-medium cursor-pointer transition-all duration-200 hover:underline ${isDarkMode ? 'text-white' : 'text-black'}`}
                  >
                    {t('login.signupNow')}
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
