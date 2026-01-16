import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence, Variants } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { authService } from '../lib/api-client'

import oppoSansFont from '../assets/fonts/OPPOSans-Regular.woff2'
import dingTalkJinBuTiFont from '../assets/fonts/DingTalk-JinBuTi.woff2'
import dingTalkSansFont from '../assets/fonts/DingTalk-Sans.woff2'
import {
  Mail,
  Phone,
  Loader2,
  ScanSearch,
  AudioLines,
  Lightbulb,
  Globe,
  Briefcase,
  TrendingUp,
  Users,
} from 'lucide-react'
import { useI18n } from '../contexts/I18nContext'
import { useTheme } from './ui/theme-provider'
import heroImage from '../assets/hero3.png'
import logoImage from '../assets/logo-bready.png'
import { ForgotPasswordModal } from './ForgotPasswordModal'
import { FloatingLabelInput } from './ui/FloatingLabelInput'

type FontStylesProps = {
  isDark: boolean
}

function FontStyles({ isDark }: FontStylesProps): React.ReactElement {
  return (
    <style>{`
      @font-face {
        font-family: '${oppoSansFont}';
        src: url('${oppoSansFont}') format('woff2');
        font-display: swap;
      }
      @font-face {
        font-family: '${dingTalkJinBuTiFont}';
        src: url('${dingTalkJinBuTiFont}') format('woff2');
        font-display: swap;
      }
      @font-face {
        font-family: '${dingTalkSansFont}';
        src: url('${dingTalkSansFont}') format('woff2');
        font-display: swap;
      }
      .font-sans { font-family: '${oppoSansFont}', 'Inter', sans-serif; }
      .font-display { font-family: '${oppoSansFont}', 'Outfit', sans-serif; }
      .font-body { font-family: '${oppoSansFont}', 'Space Grotesk', sans-serif; }
      .font-cn { font-family: '${oppoSansFont}', sans-serif; }
      .font-logo { font-family: '${dingTalkJinBuTiFont}', '${oppoSansFont}', sans-serif; }
      .font-logo-en { font-family: '${dingTalkSansFont}', 'Inter', sans-serif; }
      input, textarea, select {
        -webkit-appearance: none;
      }
      input::selection {
        background: ${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'};
      }
    `}</style>
  )
}

type LoginMode = 'email' | 'phone' | 'signup'

function LoginPage(): React.ReactElement {
  const { signIn, signUp, signInWithPhone, verifyOtp, loading } = useAuth()
  const { t, language, setLanguage, languageOptions } = useI18n()
  const { resolvedTheme } = useTheme()
  const { toast } = useToast()

  const [mode, setMode] = useState<LoginMode>('email')
  const [loginConfig, setLoginConfig] = useState({
    email: true,
    phone: false,
    wechat: false,
    google: false,
  })

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    phone: '',
    otp: '',
    emailOtp: '',
  })

  const [uiState, setUiState] = useState({
    isExiting: false,
    isSubmitting: false,
    showOtpInput: false,
    showEmailOtpInput: false,
    emailVerificationEnabled: false,
    showLangMenu: false,
    showForgotModal: false,
  })

  function updateForm(key: keyof typeof formData, value: string): void {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  function updateUi(key: keyof typeof uiState, value: boolean): void {
    setUiState((prev) => ({ ...prev, [key]: value }))
  }

  const isDarkMode = resolvedTheme === 'dark'

  useEffect(() => {
    authService.getLoginConfigPublic().then(setLoginConfig)
    authService.getEmailVerificationConfig().then((config) => {
      updateUi('emailVerificationEnabled', config.enabled)
    })
  }, [])

  function validateEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  function isNetworkErrorMessage(message: string): boolean {
    const normalized = message.toLowerCase()
    return normalized.includes('fetch failed') || normalized.includes('network error')
  }

  function resolveNetworkErrorMessage(message: string, fallback: string): string {
    if (isNetworkErrorMessage(message)) {
      return t('login.errors.networkError')
    }
    return message || fallback
  }

  function getLoginErrorMessage(message: string): string {
    const msg = message.toLowerCase()
    if (
      msg.includes('invalid') ||
      msg.includes('credentials') ||
      msg.includes('password') ||
      msg.includes('密码')
    ) {
      return t('login.errors.invalidCredentials')
    }
    if (
      msg.includes('not found') ||
      msg.includes('user') ||
      msg.includes('exist') ||
      msg.includes('不存在')
    ) {
      return t('login.errors.userNotFound')
    }
    return t('login.errors.serverError')
  }

  async function handleEmailLogin(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    if (uiState.isSubmitting || uiState.isExiting) return
    if (!formData.email.trim()) {
      toast(t('login.errors.emailRequired'), 'error')
      return
    }
    if (!validateEmail(formData.email)) {
      toast(t('login.errors.emailInvalid'), 'error')
      return
    }
    if (!formData.password) {
      toast(t('login.errors.passwordRequired'), 'error')
      return
    }
    updateUi('isSubmitting', true)
    try {
      const { error } = await signIn(formData.email, formData.password, 600)
      if (error) {
        toast(getLoginErrorMessage(error.message || ''), 'error')
        updateUi('isSubmitting', false)
      } else {
        toast(t('login.success.login'), 'success')
        updateUi('isExiting', true)
      }
    } catch {
      toast(t('login.errors.serverError'), 'error')
      updateUi('isSubmitting', false)
    }
  }

  async function handleEmailSignup(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    if (uiState.isSubmitting || uiState.isExiting) return
    if (!formData.fullName.trim()) {
      toast(t('login.errors.nicknameRequired'), 'error')
      return
    }
    if (!formData.email.trim()) {
      toast(t('login.errors.emailRequired'), 'error')
      return
    }
    if (!validateEmail(formData.email)) {
      toast(t('login.errors.emailInvalid'), 'error')
      return
    }
    if (!formData.password) {
      toast(t('login.errors.passwordRequired'), 'error')
      return
    }

    if (uiState.emailVerificationEnabled && !uiState.showEmailOtpInput) {
      updateUi('isSubmitting', true)
      try {
        const result = await authService.sendEmailCode(formData.email)
        if (result.success) {
          updateUi('showEmailOtpInput', true)
          toast(t('login.success.codeSent') || '验证码已发送', 'success')
        } else {
          toast(result.error || t('login.errors.sendCodeFailed'), 'error')
        }
      } catch (err: any) {
        toast(err.message || t('login.errors.sendCodeFailed'), 'error')
      } finally {
        updateUi('isSubmitting', false)
      }
      return
    }

    if (uiState.emailVerificationEnabled && uiState.showEmailOtpInput) {
      if (!formData.emailOtp || formData.emailOtp.length < 6) {
        toast(t('login.errors.otpRequired') || '请输入验证码', 'error')
        return
      }
      updateUi('isSubmitting', true)
      try {
        const verifyResult = await authService.verifyEmailCode(formData.email, formData.emailOtp)
        if (!verifyResult.success) {
          toast(verifyResult.error || t('login.errors.verifyFailed'), 'error')
          updateUi('isSubmitting', false)
          return
        }
      } catch (err: any) {
        toast(err.message || t('login.errors.verifyFailed'), 'error')
        updateUi('isSubmitting', false)
        return
      }
    } else {
      updateUi('isSubmitting', true)
    }

    try {
      const { error } = await signUp(formData.email, formData.password, {
        full_name: formData.fullName,
      })
      if (error) {
        const msg = (error.message || '').toLowerCase()
        if (
          msg.includes('already') ||
          msg.includes('exist') ||
          msg.includes('duplicate') ||
          msg.includes('已注册') ||
          msg.includes('已存在')
        ) {
          toast(t('login.errors.emailAlreadyExists'), 'error')
        } else {
          toast(error.message, 'error')
        }
        updateUi('isSubmitting', false)
      } else {
        toast(t('login.success.signup'), 'success')
        await new Promise((resolve) => setTimeout(resolve, 800))
        const { error: signInError } = await signIn(formData.email, formData.password, 600)
        if (signInError) {
          toast(signInError.message, 'error')
          updateUi('isSubmitting', false)
        } else {
          updateUi('isExiting', true)
        }
      }
    } catch (err: any) {
      const message = err?.message ? String(err.message) : ''
      toast(resolveNetworkErrorMessage(message, t('login.errors.signupFailed')), 'error')
      updateUi('isSubmitting', false)
    }
  }

  async function handleWeChatLogin(): Promise<void> {
    try {
      const result = await authService.getWechatAuthUrl()
      if (result.success && result.authUrl) {
        window.open(result.authUrl, 'wechat_login', 'width=600,height=600')
        const handleMessage = async (event: MessageEvent) => {
          if (event.data?.type === 'oauth-callback') {
            window.removeEventListener('message', handleMessage)
            if (event.data.error) {
              toast(event.data.error, 'error')
            } else if (event.data.token) {
              localStorage.setItem('auth_token', event.data.token)
              toast(t('login.success.login'), 'success')
              updateUi('isExiting', true)
              window.location.reload()
            }
          }
        }
        window.addEventListener('message', handleMessage)
      } else {
        toast(result.error || t('login.errors.wechatUnavailable'), 'error')
      }
    } catch {
      toast(t('login.errors.wechatUnavailable'), 'error')
    }
  }

  async function handleGoogleLogin(): Promise<void> {
    try {
      const result = await authService.getGoogleAuthUrl()
      if (result.success && result.authUrl) {
        window.open(result.authUrl, 'google_login', 'width=600,height=600')
        const handleMessage = async (event: MessageEvent) => {
          if (event.data?.type === 'oauth-callback') {
            window.removeEventListener('message', handleMessage)
            if (event.data.error) {
              toast(event.data.error, 'error')
            } else if (event.data.token) {
              localStorage.setItem('auth_token', event.data.token)
              toast(t('login.success.login'), 'success')
              updateUi('isExiting', true)
              window.location.reload()
            }
          }
        }
        window.addEventListener('message', handleMessage)
      } else {
        toast(result.error || t('login.errors.googleFailed'), 'error')
      }
    } catch {
      toast(t('login.errors.googleFailed'), 'error')
    }
  }

  async function handlePhoneLogin(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    if (!formData.phone.trim()) {
      toast(t('login.errors.phoneRequired'), 'error')
      return
    }
    if (!/^1[3-9]\d{9}$/.test(formData.phone)) {
      toast(t('login.errors.phoneInvalid'), 'error')
      return
    }
    try {
      const { error } = await signInWithPhone(formData.phone)
      if (error) {
        toast(error.message, 'error')
      } else {
        updateUi('showOtpInput', true)
      }
    } catch (err: any) {
      const message = err?.message ? String(err.message) : ''
      toast(resolveNetworkErrorMessage(message, t('login.errors.sendCodeFailed')), 'error')
    }
  }

  async function handleOtpVerify(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    if (!formData.otp || formData.otp.length < 6) {
      toast(t('login.errors.otpRequired'), 'error')
      return
    }
    try {
      const { error } = await verifyOtp(formData.phone, formData.otp)
      if (error) toast(error.message, 'error')
    } catch (err: any) {
      const message = err?.message ? String(err.message) : ''
      toast(resolveNetworkErrorMessage(message, t('login.errors.verifyFailed')), 'error')
    }
  }

  const fadeUp: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.6, ease: 'easeIn' } },
  }

  const stagger: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.15 } },
    exit: { opacity: 0, transition: { staggerChildren: 0.08, staggerDirection: -1 } },
  }

  const featureItem: Variants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: 'easeOut' } },
    exit: { opacity: 0, x: 20, transition: { duration: 0.5, ease: 'easeIn' } },
  }

  const heroImageVariants: Variants = {
    hidden: { opacity: 0, x: -100, y: 100 },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      transition: { type: 'spring', stiffness: 200, damping: 15 },
    },
    exit: { opacity: 0, x: -100, y: 100, transition: { duration: 0.6, ease: 'easeIn' } },
  }

  const cardVariants: Variants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: 'easeOut' } },
    exit: { opacity: 0, y: 20, scale: 0.95, transition: { duration: 0.5, ease: 'easeIn' } },
  }

  return (
    <div
      className={`h-screen w-screen flex font-sans overflow-hidden transition-colors duration-500 ${
        isDarkMode
          ? 'dark bg-gradient-to-br from-[#4a2010] via-[#2d1a35] to-[#1a1025] text-white'
          : 'bg-gradient-to-br from-[#ffeddb] via-[#fcc8b5] to-[#e0c4e8] text-black'
      }`}
    >
      <FontStyles isDark={isDarkMode} />

      <div className="absolute top-0 left-0 w-full h-10 app-drag z-50" />

      <div className="absolute inset-0 opacity-10 pointer-events-none z-0">
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

      <div className="hidden lg:flex flex-col w-[55%] relative bg-transparent">
        <motion.img
          src={heroImage}
          alt="Bready Hero"
          variants={heroImageVariants}
          initial="hidden"
          animate={uiState.isExiting ? 'exit' : 'visible'}
          whileHover={{ scale: 1.08, y: -10, zIndex: 100 }}
          whileTap={{ scale: 0.95, rotate: -2 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="absolute -bottom-[5%] -left-[5%] w-[70%] max-w-[550px] h-auto z-10 cursor-pointer select-none hover:z-[100]"
        />

        <div className="absolute top-12 right-12 z-20 max-w-md text-right">
          <motion.div
            initial="hidden"
            animate={uiState.isExiting ? 'exit' : 'visible'}
            variants={stagger}
          >
            <motion.h1
              variants={fadeUp}
              whileHover={{ scale: 1.08, x: -5 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="text-7xl font-display font-extrabold tracking-tighter leading-[1.05] mb-3 whitespace-pre-line"
            >
              {t('login.hero.title')}
            </motion.h1>
            <motion.p
              variants={fadeUp}
              whileHover={{ scale: 1.08, x: -3 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className={`text-base font-body mb-4 ${isDarkMode ? 'text-[#888]' : 'text-[#666]'}`}
            >
              {t('login.hero.subtitle').replace(/。$/, '').replace(/\.$/, '')}
            </motion.p>
            <motion.div variants={fadeUp} className="flex items-center gap-2 justify-end">
              <motion.span
                whileHover={{ scale: 1.08, y: -2 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-display font-medium rounded-full transition-all duration-300 border ${
                  isDarkMode
                    ? 'border-blue-500/30 bg-white/90 text-blue-600 hover:bg-white'
                    : 'border-blue-400/40 bg-white text-blue-600 hover:bg-blue-50'
                }`}
              >
                <Briefcase className={`w-3.5 h-3.5 stroke-[2.5] text-blue-500`} />
                {language === 'cmn-CN' ? '面试' : 'Interview'}
              </motion.span>
              <motion.span
                whileHover={{ scale: 1.08, y: -2 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-display font-medium rounded-full transition-all duration-300 border ${
                  isDarkMode
                    ? 'border-emerald-500/30 bg-white/90 text-emerald-600 hover:bg-white'
                    : 'border-emerald-400/40 bg-white text-emerald-600 hover:bg-emerald-50'
                }`}
              >
                <TrendingUp className={`w-3.5 h-3.5 stroke-[2.5] text-emerald-500`} />
                {language === 'cmn-CN' ? '销售' : 'Sales'}
              </motion.span>
              <motion.span
                whileHover={{ scale: 1.08, y: -2 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-display font-medium rounded-full transition-all duration-300 border ${
                  isDarkMode
                    ? 'border-violet-500/30 bg-white/90 text-violet-600 hover:bg-white'
                    : 'border-violet-400/40 bg-white text-violet-600 hover:bg-violet-50'
                }`}
              >
                <Users className={`w-3.5 h-3.5 stroke-[2.5] text-violet-500`} />
                {language === 'cmn-CN' ? '会议' : 'Meeting'}
              </motion.span>
            </motion.div>
          </motion.div>
        </div>

        <div className="absolute bottom-24 right-12 z-20">
          <div>
            <motion.div
              initial="hidden"
              animate={uiState.isExiting ? 'exit' : 'visible'}
              variants={stagger}
              className="space-y-3"
            >
              <motion.div
                variants={featureItem}
                whileHover={{ x: -5, scale: 1.02 }}
                className="flex items-center gap-4 justify-end cursor-default"
              >
                <span className="font-display font-medium">
                  {t('login.hero.features.analysis')}
                </span>
                <div className={`p-2.5 rounded-full ${isDarkMode ? 'bg-white/10' : 'bg-black/5'}`}>
                  <ScanSearch className={`w-5 h-5 ${isDarkMode ? 'text-white' : 'text-black'}`} />
                </div>
              </motion.div>
              <motion.div
                variants={featureItem}
                whileHover={{ x: -5, scale: 1.02 }}
                className="flex items-center gap-4 justify-end cursor-default"
              >
                <span className="font-display font-medium">
                  {t('login.hero.features.transcription')}
                </span>
                <div className={`p-2.5 rounded-full ${isDarkMode ? 'bg-white/10' : 'bg-black/5'}`}>
                  <AudioLines className={`w-5 h-5 ${isDarkMode ? 'text-white' : 'text-black'}`} />
                </div>
              </motion.div>
              <motion.div
                variants={featureItem}
                whileHover={{ x: -5, scale: 1.02 }}
                className="flex items-center gap-4 justify-end cursor-default"
              >
                <span className="font-display font-medium">
                  {t('login.hero.features.suggestions')}
                </span>
                <div className={`p-2.5 rounded-full ${isDarkMode ? 'bg-white/10' : 'bg-black/5'}`}>
                  <Lightbulb className={`w-5 h-5 ${isDarkMode ? 'text-white' : 'text-black'}`} />
                </div>
              </motion.div>
              <motion.div
                variants={featureItem}
                whileHover={{ x: -5, scale: 1.02 }}
                className="flex items-center gap-4 justify-end cursor-default"
              >
                <span className="font-display font-medium">{t('login.hero.features.sales')}</span>
                <div className={`p-2.5 rounded-full ${isDarkMode ? 'bg-white/10' : 'bg-black/5'}`}>
                  <TrendingUp className={`w-5 h-5 ${isDarkMode ? 'text-white' : 'text-black'}`} />
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={uiState.isExiting ? { opacity: 0 } : { opacity: 1 }}
          transition={{ duration: 0.3 }}
          className={`absolute bottom-4 right-6 text-[10px] z-20 ${isDarkMode ? 'text-[#333]' : 'text-[#BBB]'}`}
        >
          {t('login.hero.footer')}
        </motion.div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 relative bg-transparent">
        <div className="w-full max-w-[420px] relative z-10">
          <motion.div
            layout
            variants={cardVariants}
            initial="hidden"
            animate={uiState.isExiting ? 'exit' : 'visible'}
            transition={{
              layout: { duration: 0.3, type: 'spring', stiffness: 300, damping: 30 },
            }}
            className={`rounded-3xl overflow-hidden ${
              isDarkMode
                ? 'bg-[#1a1418] shadow-[0_25px_100px_-15px_rgba(45,24,16,0.8)]'
                : 'bg-[#fffcfa] shadow-[0_25px_100px_-15px_rgba(0,0,0,0.22)]'
            }`}
          >
            <div className="px-8 pt-6 pb-2 relative">
              <div className="absolute top-6 right-6">
                <div className="relative">
                  <button
                    onClick={() => updateUi('showLangMenu', !uiState.showLangMenu)}
                    className={`p-2 rounded-xl transition-all duration-200 cursor-pointer ${
                      isDarkMode
                        ? 'hover:bg-[#222] text-[#666] hover:text-white'
                        : 'hover:bg-gray-100 text-[#999] hover:text-black'
                    }`}
                  >
                    <Globe className="w-4 h-4" />
                  </button>
                  <AnimatePresence>
                    {uiState.showLangMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.15 }}
                        className={`absolute right-0 mt-2 w-36 rounded-xl shadow-xl border overflow-hidden z-50 ${
                          isDarkMode ? 'bg-[#111] border-[#333]' : 'bg-white border-gray-200'
                        }`}
                      >
                        {languageOptions.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => {
                              setLanguage(opt.value)
                              updateUi('showLangMenu', false)
                            }}
                            className={`w-full text-left px-4 py-2.5 text-sm transition-colors cursor-pointer ${
                              isDarkMode
                                ? 'text-[#CCC] hover:bg-[#222] hover:text-white'
                                : 'text-[#666] hover:bg-gray-50 hover:text-black'
                            } ${language === opt.value ? (isDarkMode ? 'bg-[#1A1A1A] text-white' : 'bg-gray-50 text-black') : ''}`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 mb-6">
                <img src={logoImage} alt="Logo" className="w-10 h-10 object-contain" />
                <span
                  className={`text-lg tracking-tight ${language === 'cmn-CN' ? 'font-logo font-semibold' : 'font-logo-en font-semibold'}`}
                >
                  {language === 'cmn-CN' ? '面宝' : 'Bready'}
                </span>
              </div>

              <div className="relative h-10 mb-4 overflow-hidden">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.h2
                    key={mode === 'signup' ? 'signup' : 'login'}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.2 }}
                    className={`absolute inset-0 flex items-center justify-center text-2xl font-display font-bold tracking-tight text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
                  >
                    {mode === 'signup' ? t('login.welcomeSignup') : t('login.welcomeTitle')}
                  </motion.h2>
                </AnimatePresence>
              </div>
            </div>

            <AnimatePresence>
              {mode !== 'signup' && loginConfig.phone && (
                <motion.div
                  initial={{ height: 0, opacity: 0, marginBottom: 0 }}
                  animate={{ height: 'auto', opacity: 1, marginBottom: 24 }}
                  exit={{ height: 0, opacity: 0, marginBottom: 0 }}
                  transition={{ duration: 0.2 }}
                  className="px-16 overflow-hidden"
                >
                  <div
                    className={`grid grid-cols-2 p-1 rounded-2xl ${isDarkMode ? 'bg-zinc-800' : 'bg-zinc-100'}`}
                  >
                    {['email', 'phone']
                      .filter((m) => m === 'email' || loginConfig.phone)
                      .map((m) => (
                        <button
                          key={m}
                          onClick={() => {
                            setMode(m as LoginMode)
                            updateUi('showOtpInput', false)
                          }}
                          className={`relative py-2.5 text-xs font-medium rounded-xl transition-all duration-300 cursor-pointer ${
                            mode === m
                              ? 'text-zinc-900'
                              : isDarkMode
                                ? 'text-zinc-500 hover:text-zinc-300'
                                : 'text-zinc-500 hover:text-zinc-300'
                          }`}
                        >
                          {mode === m && (
                            <motion.div
                              layoutId="activeTab"
                              className="absolute inset-0.5 rounded-xl bg-white"
                              transition={{ duration: 0.2, ease: 'easeOut' }}
                            />
                          )}
                          <span className="relative z-10 flex items-center justify-center gap-2">
                            {m === 'email' ? (
                              <Mail className="w-3.5 h-3.5" />
                            ) : (
                              <Phone className="w-3.5 h-3.5" />
                            )}
                            {m === 'email' ? t('login.switchEmail') : t('login.switchPhone')}
                          </span>
                        </button>
                      ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="px-16 pb-8">
              <AnimatePresence mode="popLayout" initial={false}>
                {(mode === 'email' || mode === 'signup') && (
                  <motion.form
                    layout
                    key="auth-form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    onSubmit={mode === 'signup' ? handleEmailSignup : handleEmailLogin}
                    className="space-y-4"
                  >
                    <AnimatePresence mode="popLayout" initial={false}>
                      {mode === 'signup' && (
                        <motion.div
                          key="nickname-field"
                          layout
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <FloatingLabelInput
                            label={t('login.nickname')}
                            value={formData.fullName}
                            onChange={(v) => updateForm('fullName', v)}
                            placeholder={t('login.placeholders.nickname')}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <motion.div layout>
                      <FloatingLabelInput
                        label={t('login.email')}
                        value={formData.email}
                        onChange={(v) => updateForm('email', v)}
                        placeholder={t('login.placeholders.email')}
                      />
                    </motion.div>

                    <motion.div layout>
                      <FloatingLabelInput
                        label={t('login.password')}
                        type="password"
                        value={formData.password}
                        onChange={(v) => updateForm('password', v)}
                        placeholder={t('login.placeholders.password')}
                      />
                      {mode === 'email' && (
                        <div className="flex justify-end mt-1">
                          <button
                            type="button"
                            onClick={() => updateUi('showForgotModal', true)}
                            className={`text-xs cursor-pointer transition-colors ${
                              isDarkMode
                                ? 'text-gray-500 hover:text-white'
                                : 'text-gray-400 hover:text-black'
                            }`}
                          >
                            {t('login.forgotPassword') || '忘记密码?'}
                          </button>
                        </div>
                      )}
                    </motion.div>

                    <AnimatePresence mode="popLayout" initial={false}>
                      {mode === 'signup' &&
                        uiState.emailVerificationEnabled &&
                        uiState.showEmailOtpInput && (
                          <motion.div
                            key="email-otp-field"
                            layout
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <FloatingLabelInput
                              label={t('login.verificationCode') || '验证码'}
                              value={formData.emailOtp}
                              onChange={(v) => updateForm('emailOtp', v)}
                              placeholder={
                                t('login.placeholders.verificationCode') || '请输入6位验证码'
                              }
                            />
                          </motion.div>
                        )}
                    </AnimatePresence>

                    <motion.button
                      layout
                      type="submit"
                      disabled={
                        loading ||
                        (mode === 'signup'
                          ? !formData.email || !formData.password || !formData.fullName
                          : !formData.email || !formData.password)
                      }
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.1 }}
                      whileHover={
                        loading ||
                        (mode === 'signup'
                          ? !formData.email || !formData.password || !formData.fullName
                          : !formData.email || !formData.password)
                          ? {}
                          : { scale: 1.02, y: -1 }
                      }
                      whileTap={
                        loading ||
                        (mode === 'signup'
                          ? !formData.email || !formData.password || !formData.fullName
                          : !formData.email || !formData.password)
                          ? {}
                          : { scale: 0.95 }
                      }
                      className={`w-full h-11 mt-2 rounded-xl text-sm font-display font-semibold transition-all duration-300 ${
                        loading ||
                        (mode === 'signup'
                          ? !formData.email || !formData.password || !formData.fullName
                          : !formData.email || !formData.password)
                          ? isDarkMode
                            ? 'bg-[#333] text-gray-500 cursor-not-allowed'
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          : isDarkMode
                            ? 'bg-white text-black hover:bg-gray-100 shadow-lg cursor-pointer'
                            : 'bg-black text-white hover:bg-gray-900 shadow-lg cursor-pointer'
                      }`}
                    >
                      {loading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : mode === 'signup' ? (
                        t('login.signup')
                      ) : (
                        t('login.login')
                      )}
                    </motion.button>
                  </motion.form>
                )}

                {mode === 'phone' && !uiState.showOtpInput && (
                  <motion.form
                    key="phone-form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    onSubmit={handlePhoneLogin}
                    className="space-y-4"
                  >
                    <FloatingLabelInput
                      label={t('login.phone')}
                      type="tel"
                      value={formData.phone}
                      onChange={(v) => updateForm('phone', v)}
                      placeholder={t('login.placeholders.phone')}
                    />
                    <motion.button
                      type="submit"
                      disabled={loading || !formData.phone}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.1 }}
                      whileHover={loading || !formData.phone ? {} : { scale: 1.02, y: -1 }}
                      whileTap={loading || !formData.phone ? {} : { scale: 0.95 }}
                      className={`w-full h-11 mt-2 rounded-xl text-sm font-display font-semibold transition-all duration-300 ${
                        loading || !formData.phone
                          ? isDarkMode
                            ? 'bg-[#333] text-gray-500 cursor-not-allowed'
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          : isDarkMode
                            ? 'bg-white text-black hover:bg-gray-100 shadow-lg cursor-pointer'
                            : 'bg-black text-white hover:bg-gray-900 shadow-lg cursor-pointer'
                      }`}
                    >
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : t('login.sendCode')}
                    </motion.button>
                  </motion.form>
                )}

                {mode === 'phone' && uiState.showOtpInput && (
                  <motion.form
                    key="otp-form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    onSubmit={handleOtpVerify}
                    className="space-y-4"
                  >
                    <div
                      className={`text-center text-sm mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}
                    >
                      {t('login.codeSentTo') || 'Code sent to'}{' '}
                      <span className={isDarkMode ? 'text-white' : 'text-black'}>
                        {formData.phone}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <div
                        className={`group relative rounded-xl transition-all duration-300 ring-1 ring-inset ${
                          isDarkMode
                            ? 'bg-[#111] ring-[#333] focus-within:ring-2 focus-within:ring-white focus-within:bg-[#161616]'
                            : 'bg-transparent ring-black/20 focus-within:ring-2 focus-within:ring-black'
                        }`}
                      >
                        <input
                          type="text"
                          value={formData.otp}
                          onChange={(e) => updateForm('otp', e.target.value)}
                          placeholder="••••••"
                          maxLength={6}
                          className="w-full h-14 px-4 bg-transparent border-none outline-none text-2xl font-mono text-center tracking-[0.5em] placeholder:tracking-normal placeholder:text-gray-400/30"
                          autoFocus
                        />
                      </div>
                    </div>

                    <motion.button
                      type="submit"
                      disabled={loading || !formData.otp || formData.otp.length < 6}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.1 }}
                      whileHover={
                        loading || !formData.otp || formData.otp.length < 6
                          ? {}
                          : { scale: 1.02, y: -1 }
                      }
                      whileTap={
                        loading || !formData.otp || formData.otp.length < 6 ? {} : { scale: 0.95 }
                      }
                      className={`w-full h-11 mt-2 rounded-xl text-sm font-display font-semibold transition-all duration-300 ${
                        loading || !formData.otp || formData.otp.length < 6
                          ? isDarkMode
                            ? 'bg-[#333] text-gray-500 cursor-not-allowed'
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          : isDarkMode
                            ? 'bg-white text-black hover:bg-gray-100 shadow-lg cursor-pointer'
                            : 'bg-black text-white hover:bg-gray-900 shadow-lg cursor-pointer'
                      }`}
                    >
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : t('login.verify')}
                    </motion.button>

                    <button
                      type="button"
                      onClick={() => updateUi('showOtpInput', false)}
                      className={`w-full text-xs py-2 cursor-pointer transition-colors duration-200 ${
                        isDarkMode
                          ? 'text-gray-500 hover:text-white'
                          : 'text-gray-400 hover:text-black'
                      }`}
                    >
                      {t('login.resend')}
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className={`mt-6 pt-6 border-t border-dashed ${isDarkMode ? 'border-[#222]' : 'border-gray-200'}`}
              >
                {(loginConfig.wechat || loginConfig.google) && (
                  <div className="space-y-3">
                    {loginConfig.wechat && (
                      <motion.button
                        onClick={handleWeChatLogin}
                        disabled={loading}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.15 }}
                        whileHover={{ scale: 1.02, y: -1 }}
                        whileTap={{ scale: 0.95 }}
                        className="w-full h-11 rounded-xl cursor-pointer transition-all duration-300 border border-emerald-500 bg-emerald-500 hover:bg-emerald-600 text-white hover:border-emerald-600 flex items-center justify-center"
                      >
                        <svg viewBox="0 0 24 24" className="w-5 h-5 mr-2" fill="white">
                          <path d="M9.5 4C5.36 4 2 6.69 2 10c0 1.89 1.08 3.56 2.78 4.66l-.7 2.1 2.46-1.23c.78.23 1.6.37 2.46.42-.16-.54-.25-1.1-.25-1.69 0-3.31 3.36-6 7.5-6 .39 0 .77.03 1.14.08C16.41 5.64 13.21 4 9.5 4zm-2.25 3.5c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm4.5 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM16.25 10c-3.58 0-6.5 2.24-6.5 5s2.92 5 6.5 5c.67 0 1.32-.09 1.93-.26l1.95.98-.56-1.68c1.36-.93 2.18-2.31 2.18-3.79 0-2.76-2.92-5-6.5-5zm-2.25 3c.41 0 .75.34.75.75s-.34.75-.75.75-.75-.34-.75-.75.34-.75.75-.75zm4.5 0c.41 0 .75.34.75.75s-.34.75-.75.75-.75-.34-.75-.75.34-.75.75-.75z" />
                        </svg>
                        <span className="font-normal">{t('login.wechat')}</span>
                      </motion.button>
                    )}
                    {loginConfig.google && (
                      <motion.button
                        onClick={handleGoogleLogin}
                        disabled={loading}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.2 }}
                        whileHover={{ scale: 1.02, y: -1 }}
                        whileTap={{ scale: 0.95 }}
                        className="w-full h-11 rounded-xl cursor-pointer transition-all duration-300 border border-emerald-500 bg-emerald-500 hover:bg-emerald-600 text-white hover:border-emerald-600 flex items-center justify-center"
                      >
                        <svg viewBox="0 0 24 24" className="w-5 h-5 mr-2" fill="white">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        <span className="font-normal">{t('login.google')}</span>
                      </motion.button>
                    )}
                  </div>
                )}

                <div
                  className={`mt-6 text-center text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}
                >
                  {mode === 'signup' ? (
                    <div className="flex items-center justify-center gap-1.5">
                      <span>{t('login.hasAccount')}</span>
                      <button
                        onClick={() => setMode('email')}
                        className={`font-semibold cursor-pointer transition-colors hover:underline ${isDarkMode ? 'text-white' : 'text-black'}`}
                      >
                        {t('login.loginNow')}
                      </button>
                    </div>
                  ) : mode === 'email' ? (
                    <div className="flex items-center justify-center gap-1.5">
                      <span>{t('login.noAccount')}</span>
                      <button
                        onClick={() => setMode('signup')}
                        className={`font-semibold cursor-pointer transition-colors hover:underline ${isDarkMode ? 'text-white' : 'text-black'}`}
                      >
                        {t('login.signupNow')}
                      </button>
                    </div>
                  ) : null}
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
      <ForgotPasswordModal
        isOpen={uiState.showForgotModal}
        onClose={() => updateUi('showForgotModal', false)}
      />
    </div>
  )
}

export default LoginPage
