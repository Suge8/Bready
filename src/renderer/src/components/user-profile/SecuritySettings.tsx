import React, { memo, useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Lock,
  Mail,
  Phone,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  Loader2,
  ShieldCheck,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { useI18n } from '../../contexts/I18nContext'
import { type UserProfile } from '../../lib/api-client'
import { Button } from '../ui/button'

interface SecuritySettingsProps {
  profile: UserProfile | null
  isDarkMode?: boolean
  onChangePassword: (
    oldPassword: string,
    newPassword: string,
  ) => Promise<{ success: boolean; error?: string }>
  onSendPhoneCode: (
    phone: string,
  ) => Promise<{ success: boolean; error?: string; cooldownSeconds?: number }>
  onBindPhone: (phone: string, code: string) => Promise<{ success: boolean; error?: string }>
  onBindEmail: (email: string) => Promise<{ success: boolean; error?: string }>
}

type SecuritySection = 'password' | 'phone' | 'email' | null

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 300, damping: 24 },
  },
}

export const SecuritySettings: React.FC<SecuritySettingsProps> = memo(
  ({
    profile: _profile,
    isDarkMode = false,
    onChangePassword,
    onSendPhoneCode,
    onBindPhone,
    onBindEmail,
  }) => {
    const { t } = useI18n()
    const [activeSection, setActiveSection] = useState<SecuritySection>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
      return () => {
        if (countdownTimerRef.current) {
          clearInterval(countdownTimerRef.current)
        }
        if (successTimeoutRef.current) {
          clearTimeout(successTimeoutRef.current)
        }
      }
    }, [])

    const [oldPassword, setOldPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showOldPassword, setShowOldPassword] = useState(false)
    const [showNewPassword, setShowNewPassword] = useState(false)

    const [phone, setPhone] = useState('')
    const [phoneCode, setPhoneCode] = useState('')
    const [codeCountdown, setCodeCountdown] = useState(0)

    const [email, setEmail] = useState('')

    const resetForm = useCallback((options?: { keepStatus?: boolean }) => {
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPhone('')
      setPhoneCode('')
      setEmail('')
      setError(null)
      if (!options?.keepStatus) {
        setSuccess(null)
      }
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current)
        countdownTimerRef.current = null
      }
      setCodeCountdown(0)
    }, [])

    const handleSectionChange = useCallback(
      (section: SecuritySection) => {
        resetForm()
        setActiveSection(section === activeSection ? null : section)
      },
      [activeSection, resetForm],
    )

    const handleChangePassword = useCallback(async () => {
      if (newPassword !== confirmPassword) {
        setError(t('profile.security.passwordMismatch') || '两次输入的密码不一致')
        return
      }
      if (newPassword.length < 6) {
        setError(t('profile.security.passwordTooShort') || '密码长度至少6位')
        return
      }

      setLoading(true)
      setError(null)
      setSuccess(null)

      const result = await onChangePassword(oldPassword, newPassword)

      setLoading(false)
      if (result.success) {
        setSuccess(t('profile.security.passwordChanged') || '密码修改成功')
        resetForm({ keepStatus: true })
        successTimeoutRef.current = setTimeout(() => {
          setActiveSection(null)
          setSuccess(null)
        }, 2000)
      } else {
        setError(result.error || t('profile.security.passwordChangeFailed') || '密码修改失败')
      }
    }, [oldPassword, newPassword, confirmPassword, onChangePassword, resetForm, t])

    const handleSendCode = useCallback(async () => {
      if (!phone || phone.length < 11) {
        setError(t('profile.security.invalidPhone') || '请输入有效的手机号')
        return
      }

      setLoading(true)
      setError(null)
      setSuccess(null)

      const result = await onSendPhoneCode(phone)

      setLoading(false)

      const cooldownSeconds = result.cooldownSeconds || 60
      const startCountdown = () => {
        setCodeCountdown(cooldownSeconds)
        if (countdownTimerRef.current) {
          clearInterval(countdownTimerRef.current)
        }
        countdownTimerRef.current = setInterval(() => {
          setCodeCountdown((prev) => {
            if (prev <= 1) {
              if (countdownTimerRef.current) {
                clearInterval(countdownTimerRef.current)
                countdownTimerRef.current = null
              }
              return 0
            }
            return prev - 1
          })
        }, 1000)
      }

      if (!result.success) {
        if (result.cooldownSeconds) {
          startCountdown()
        }
        setError(result.error || t('profile.security.phoneBindFailed') || '验证码发送失败')
        return
      }

      setSuccess(t('profile.security.codeSent') || '验证码已发送')
      startCountdown()
    }, [phone, onSendPhoneCode, t])

    const handleBindPhone = useCallback(async () => {
      if (!phoneCode || phoneCode.length !== 6) {
        setError(t('profile.security.invalidCode') || '请输入6位验证码')
        return
      }

      setLoading(true)
      setError(null)
      setSuccess(null)

      const result = await onBindPhone(phone, phoneCode)

      setLoading(false)
      if (result.success) {
        setSuccess(t('profile.security.phoneBound') || '手机绑定成功')
        resetForm({ keepStatus: true })
        successTimeoutRef.current = setTimeout(() => {
          setActiveSection(null)
          setSuccess(null)
        }, 2000)
      } else {
        setError(result.error || t('profile.security.phoneBindFailed') || '手机绑定失败')
      }
    }, [phone, phoneCode, onBindPhone, resetForm, t])

    const handleBindEmail = useCallback(async () => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        setError(t('profile.security.invalidEmail') || '请输入有效的邮箱地址')
        return
      }

      setLoading(true)
      setError(null)
      setSuccess(null)

      const result = await onBindEmail(email)

      setLoading(false)
      if (result.success) {
        setSuccess(t('profile.security.emailBound') || '邮箱绑定成功')
        resetForm({ keepStatus: true })
        successTimeoutRef.current = setTimeout(() => {
          setActiveSection(null)
          setSuccess(null)
        }, 2000)
      } else {
        setError(result.error || t('profile.security.emailBindFailed') || '邮箱绑定失败')
      }
    }, [email, onBindEmail, resetForm, t])

    const inputClassName = cn(
      'w-full px-2.5 h-7 rounded-lg text-xs border transition-all duration-200',
      'focus:outline-none focus:ring-1',
      isDarkMode
        ? 'bg-gray-900 border-gray-800 text-white placeholder:text-gray-600 focus:ring-gray-500 focus:border-gray-700'
        : 'bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:ring-black focus:border-gray-300',
    )

    const sections = [
      {
        id: 'password' as const,
        icon: Lock,
        label: t('profile.security.changePassword') || '修改密码',
        desc: '更新账户密码',
        color: 'text-blue-500',
      },
      {
        id: 'phone' as const,
        icon: Phone,
        label: t('profile.security.bindPhone') || '绑定手机',
        desc: '绑定手机号码',
        color: 'text-emerald-500',
      },
      {
        id: 'email' as const,
        icon: Mail,
        label: t('profile.security.bindEmail') || '绑定邮箱',
        desc: '绑定邮箱地址',
        color: 'text-purple-500',
      },
    ]

    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className={cn(
          'rounded-xl border overflow-hidden relative transition-all duration-300',
          isDarkMode ? 'border-gray-800 bg-black' : 'border-gray-200 bg-white shadow-sm',
        )}
      >
        <div className="p-2.5 space-y-2.5">
          <motion.div variants={itemVariants} className="flex items-center gap-1.5">
            <ShieldCheck
              className={cn('w-4 h-4', isDarkMode ? 'text-emerald-400' : 'text-emerald-600')}
            />
            <h4
              className={cn(
                'text-sm font-semibold tracking-tight',
                isDarkMode ? 'text-white' : 'text-gray-900',
              )}
            >
              {t('profile.security.title')}
            </h4>
          </motion.div>

          <motion.div variants={itemVariants} className="grid grid-cols-3 gap-2">
            {sections.map((section) => {
              const Icon = section.icon
              const isActive = activeSection === section.id
              return (
                <button
                  key={section.id}
                  onClick={() => handleSectionChange(section.id)}
                  className={cn(
                    'group relative flex flex-col items-center justify-center gap-1.5 py-2.5 px-1 rounded-lg border transition-all duration-300',
                    isActive
                      ? isDarkMode
                        ? 'bg-gray-800 border-gray-700 shadow-md shadow-black/50'
                        : 'bg-black border-black text-white shadow-md shadow-gray-200'
                      : isDarkMode
                        ? 'bg-gray-900/50 border-gray-800 hover:bg-gray-800'
                        : 'bg-white border-gray-200 hover:border-gray-300 hover:text-gray-900',
                  )}
                >
                  <Icon
                    className={cn(
                      'w-4 h-4 transition-transform duration-300 group-hover:scale-110',
                      isActive ? 'text-white scale-110' : section.color,
                    )}
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                  <span
                    className={cn(
                      'text-[10px] font-medium transition-colors',
                      isActive
                        ? 'text-white'
                        : isDarkMode
                          ? 'text-gray-400 group-hover:text-gray-200'
                          : 'text-gray-500 group-hover:text-gray-900',
                    )}
                  >
                    {section.desc}
                  </span>
                  {isActive && (
                    <motion.div
                      layoutId="activeSecurityCheck"
                      className={cn(
                        'absolute top-1.5 right-1.5 w-1 h-1 rounded-full',
                        isDarkMode ? 'bg-white' : 'bg-white',
                      )}
                    />
                  )}
                </button>
              )
            })}
          </motion.div>

          <AnimatePresence mode="wait">
            {activeSection && (
              <motion.div
                key={activeSection}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="overflow-hidden"
              >
                <div
                  className={cn(
                    'rounded-lg border p-2.5 mt-1 space-y-1.5',
                    isDarkMode ? 'bg-gray-900/30 border-gray-800' : 'bg-gray-50/50 border-gray-100',
                  )}
                >
                  {activeSection === 'password' && (
                    <>
                      <div className="relative">
                        <input
                          type={showOldPassword ? 'text' : 'password'}
                          value={oldPassword}
                          onChange={(e) => setOldPassword(e.target.value)}
                          placeholder={t('profile.security.currentPassword') || '当前密码'}
                          className={inputClassName}
                        />
                        <button
                          type="button"
                          onClick={() => setShowOldPassword(!showOldPassword)}
                          className={cn(
                            'absolute right-2.5 top-1/2 -translate-y-1/2 transition-colors',
                            isDarkMode
                              ? 'text-gray-600 hover:text-gray-400'
                              : 'text-gray-400 hover:text-gray-600',
                          )}
                        >
                          {showOldPassword ? (
                            <EyeOff className="w-3.5 h-3.5" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      <div className="relative">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder={t('profile.security.newPassword') || '新密码'}
                          className={inputClassName}
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className={cn(
                            'absolute right-2.5 top-1/2 -translate-y-1/2 transition-colors',
                            isDarkMode
                              ? 'text-gray-600 hover:text-gray-400'
                              : 'text-gray-400 hover:text-gray-600',
                          )}
                        >
                          {showNewPassword ? (
                            <EyeOff className="w-3.5 h-3.5" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      <div className="flex gap-2">
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder={t('profile.security.confirmPassword') || '确认新密码'}
                          className={cn(inputClassName, 'flex-1')}
                        />
                        <Button
                          onClick={handleChangePassword}
                          disabled={loading || !oldPassword || !newPassword || !confirmPassword}
                          className={cn(
                            'h-7 px-4 rounded-lg text-[10px] font-medium transition-all duration-200 shrink-0',
                            isDarkMode
                              ? 'bg-white text-black hover:bg-blue-500 hover:text-white disabled:bg-gray-800 disabled:text-gray-600'
                              : 'bg-black text-white hover:bg-blue-500 hover:text-white disabled:bg-gray-100 disabled:text-gray-400',
                          )}
                        >
                          {loading ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            t('common.confirm')
                          )}
                        </Button>
                      </div>
                    </>
                  )}

                  {activeSection === 'phone' && (
                    <>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder={t('profile.security.phonePlaceholder') || '请输入手机号'}
                        className={inputClassName}
                      />

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={handleSendCode}
                          disabled={loading || codeCountdown > 0}
                          className={cn(
                            'h-7 px-3 rounded-lg text-[10px] font-medium border transition-all duration-200 shrink-0',
                            isDarkMode
                              ? 'border-gray-700 text-gray-300 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 disabled:border-gray-800 disabled:text-gray-600'
                              : 'border-gray-200 text-gray-700 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 disabled:border-gray-100 disabled:text-gray-400',
                          )}
                        >
                          {codeCountdown > 0
                            ? `${codeCountdown}s`
                            : t('profile.security.sendCode') || '发送验证码'}
                        </Button>

                        <input
                          type="text"
                          value={phoneCode}
                          onChange={(e) => setPhoneCode(e.target.value)}
                          placeholder={t('profile.security.codePlaceholder') || '验证码'}
                          maxLength={6}
                          className={cn(inputClassName, 'flex-1 text-center')}
                        />

                        <Button
                          onClick={handleBindPhone}
                          disabled={loading || !phone || !phoneCode}
                          className={cn(
                            'h-7 px-4 rounded-lg text-[10px] font-medium transition-all duration-200 shrink-0',
                            isDarkMode
                              ? 'bg-white text-black hover:bg-blue-500 hover:text-white disabled:bg-gray-800 disabled:text-gray-600'
                              : 'bg-black text-white hover:bg-blue-500 hover:text-white disabled:bg-gray-100 disabled:text-gray-400',
                          )}
                        >
                          {loading ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            t('common.confirm')
                          )}
                        </Button>
                      </div>
                    </>
                  )}

                  {activeSection === 'email' && (
                    <div className="flex gap-2">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={t('profile.security.emailPlaceholder') || '请输入邮箱地址'}
                        className={cn(inputClassName, 'flex-1')}
                      />
                      <Button
                        onClick={handleBindEmail}
                        disabled={loading || !email}
                        className={cn(
                          'h-7 px-4 rounded-lg text-[10px] font-medium transition-all duration-200 shrink-0',
                          isDarkMode
                            ? 'bg-white text-black hover:bg-blue-500 hover:text-white disabled:bg-gray-800 disabled:text-gray-600'
                            : 'bg-black text-white hover:bg-blue-500 hover:text-white disabled:bg-gray-100 disabled:text-gray-400',
                        )}
                      >
                        {loading ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          t('common.confirm')
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {(error || success) && (
              <motion.div
                initial={{ opacity: 0, height: 0, scale: 0.9 }}
                animate={{ opacity: 1, height: 'auto', scale: 1 }}
                exit={{ opacity: 0, height: 0, scale: 0.9 }}
                className="overflow-hidden"
              >
                <div
                  className={cn(
                    'mt-1 p-2 rounded-lg flex items-center gap-2 text-[10px] font-medium border',
                    error
                      ? isDarkMode
                        ? 'bg-red-500/10 border-red-500/20 text-red-400'
                        : 'bg-red-50 border-red-100 text-red-600'
                      : isDarkMode
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        : 'bg-emerald-50 border-emerald-100 text-emerald-600',
                  )}
                >
                  {error ? (
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <Check className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span>{error || success}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    )
  },
)

SecuritySettings.displayName = 'SecuritySettings'

export default SecuritySettings
