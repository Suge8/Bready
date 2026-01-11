import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Mail, ArrowRight, CheckCircle2, Loader2, AlertCircle } from 'lucide-react'
import { useI18n } from '../contexts/I18nContext'
import { useTheme } from './ui/theme-provider'
import { useToast } from '../contexts/ToastContext'
import { authService } from '../lib/api-client'

interface ForgotPasswordModalProps {
  isOpen: boolean
  onClose: () => void
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({ isOpen, onClose }) => {
  const { t } = useI18n()
  const { resolvedTheme } = useTheme()
  const { toast } = useToast()
  const isDarkMode = resolvedTheme === 'dark'

  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState('')

  const tSafe = (key: string, fallback: string) => {
    const val = t(key)
    return val === key ? fallback : val
  }

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email.trim()) {
      setError(t('login.errors.emailRequired'))
      return
    }

    if (!validateEmail(email)) {
      setError(t('login.errors.emailInvalid'))
      return
    }

    setIsLoading(true)

    try {
      const result = await authService.forgotPassword(email)
      if (result.success) {
        setIsSuccess(true)
        toast(
          tSafe('login.forgotPasswordModal.emailSent', 'Reset email sent successfully'),
          'success',
        )
      } else {
        setError(
          result.error || tSafe('login.errors.generic', 'Something went wrong. Please try again.'),
        )
      }
    } catch (err) {
      setError(tSafe('login.errors.generic', 'Something went wrong. Please try again.'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    onClose()
    setTimeout(() => {
      setEmail('')
      setIsSuccess(false)
      setError('')
      setIsLoading(false)
    }, 300)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleClose}
            className="fixed inset-0 z-50 bg-black/40"
          />

          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', duration: 0.4, bounce: 0 }}
              className={`w-full max-w-md pointer-events-auto rounded-3xl shadow-2xl overflow-hidden border ${
                isDarkMode
                  ? 'bg-[#0A0A0A] border-[#222] shadow-black/40'
                  : 'bg-white border-white/40 shadow-xl'
              }`}
            >
              <div className="relative px-8 pt-6 pb-2">
                <button
                  onClick={handleClose}
                  className={`absolute right-6 top-6 p-2 rounded-full transition-colors cursor-pointer ${
                    isDarkMode
                      ? 'hover:bg-[#222] text-[#666] hover:text-white'
                      : 'hover:bg-gray-100 text-[#999] hover:text-black'
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="flex flex-col items-center justify-center text-center mt-2">
                  <div
                    className={`mb-4 p-3 rounded-2xl ${
                      isSuccess
                        ? isDarkMode
                          ? 'bg-green-500/10 text-green-500'
                          : 'bg-green-50 text-green-600'
                        : isDarkMode
                          ? 'bg-[#1A1A1A] text-white'
                          : 'bg-gray-50 text-black'
                    }`}
                  >
                    {isSuccess ? (
                      <CheckCircle2 className="w-8 h-8" />
                    ) : (
                      <Mail className="w-8 h-8" />
                    )}
                  </div>

                  <h2
                    className={`text-2xl font-display font-bold tracking-tight mb-2 ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}
                  >
                    {isSuccess
                      ? tSafe('login.forgotPasswordModal.checkEmail', 'Check your email')
                      : t('login.forgotPassword')}
                  </h2>

                  <p
                    className={`text-sm max-w-[280px] leading-relaxed ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}
                  >
                    {isSuccess
                      ? tSafe(
                          'login.forgotPasswordModal.sentDesc',
                          `We've sent a password reset link to ${email}`,
                        )
                      : tSafe(
                          'login.forgotPasswordModal.desc',
                          'Enter your email address and we will send you a link to reset your password.',
                        )}
                  </p>
                </div>
              </div>

              <div className="p-8 pt-6">
                <AnimatePresence mode="wait">
                  {isSuccess ? (
                    <motion.div
                      key="success"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
                        <button
                          onClick={handleClose}
                          className={`w-full h-11 rounded-xl text-sm font-display font-semibold transition-all duration-300 shadow-lg cursor-pointer flex items-center justify-center gap-2 ${
                            isDarkMode
                              ? 'bg-white text-black hover:bg-gray-100'
                              : 'bg-black text-white hover:bg-gray-900'
                          }`}
                        >
                          {tSafe('login.forgotPasswordModal.backToLogin', 'Back to login')}
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </motion.div>

                      <button
                        onClick={() => {
                          setIsSuccess(false)
                          setIsLoading(false)
                        }}
                        className={`w-full mt-4 text-xs cursor-pointer transition-colors ${
                          isDarkMode
                            ? 'text-gray-500 hover:text-white'
                            : 'text-gray-400 hover:text-black'
                        }`}
                      >
                        {tSafe(
                          'login.forgotPasswordModal.tryAgain',
                          'Did not receive email? Try again',
                        )}
                      </button>
                    </motion.div>
                  ) : (
                    <motion.form
                      key="form"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      onSubmit={handleSubmit}
                      className="space-y-4"
                    >
                      <div className="space-y-1.5">
                        <label
                          className={`text-xs font-display font-medium ml-1 ${
                            isDarkMode ? 'text-gray-400' : 'text-gray-500'
                          }`}
                        >
                          {t('login.email')}
                        </label>
                        <div
                          className={`group relative rounded-xl transition-all duration-300 ring-1 ring-inset ${
                            error
                              ? isDarkMode
                                ? 'bg-[#1A1111] ring-red-500/50'
                                : 'bg-red-50 ring-red-200'
                              : isDarkMode
                                ? 'bg-[#111] ring-[#333] focus-within:ring-blue-500/50 focus-within:bg-[#161616]'
                                : 'bg-gray-50 ring-gray-200 focus-within:ring-blue-500/30 focus-within:bg-white focus-within:shadow-md'
                          }`}
                        >
                          <input
                            type="text"
                            value={email}
                            onChange={(e) => {
                              setEmail(e.target.value)
                              if (error) setError('')
                            }}
                            placeholder={t('login.placeholders.email')}
                            className={`w-full h-11 px-4 bg-transparent border-none outline-none text-sm placeholder:text-gray-400/50 ${
                              isDarkMode ? 'text-white' : 'text-black'
                            }`}
                            autoFocus
                          />
                        </div>
                        {error && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="flex items-center gap-1.5 ml-1 text-xs text-red-500"
                          >
                            <AlertCircle className="w-3 h-3" />
                            {error}
                          </motion.div>
                        )}
                      </div>

                      <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
                        <button
                          type="submit"
                          disabled={isLoading || !email}
                          className={`w-full h-11 mt-2 rounded-xl text-sm font-display font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
                            isLoading || !email
                              ? isDarkMode
                                ? 'bg-[#333] text-gray-500 cursor-not-allowed'
                                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                              : isDarkMode
                                ? 'bg-white text-black hover:bg-gray-100 shadow-lg cursor-pointer'
                                : 'bg-black text-white hover:bg-gray-900 shadow-lg cursor-pointer'
                          }`}
                        >
                          {isLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <>
                              {tSafe('login.forgotPasswordModal.send', 'Send Reset Link')}
                              <ArrowRight className="w-4 h-4" />
                            </>
                          )}
                        </button>
                      </motion.div>
                    </motion.form>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
