import React, { memo, useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Lock, Mail, Phone, Eye, EyeOff, Check, AlertCircle, Loader2 } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useI18n } from '../../contexts/I18nContext'
import { type UserProfile } from '../../lib/supabase'
import { Button } from '../ui/button'

interface SecuritySettingsProps {
    profile: UserProfile | null
    isDarkMode?: boolean
    onChangePassword: (oldPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>
    onSendPhoneCode: (phone: string) => Promise<{ success: boolean; error?: string; cooldownSeconds?: number }>
    onBindPhone: (phone: string, code: string) => Promise<{ success: boolean; error?: string }>
    onBindEmail: (email: string) => Promise<{ success: boolean; error?: string }>
}

type SecuritySection = 'password' | 'phone' | 'email' | null

export const SecuritySettings: React.FC<SecuritySettingsProps> = memo(({
    profile: _profile,
    isDarkMode = false,
    onChangePassword,
    onSendPhoneCode,
    onBindPhone,
    onBindEmail
}) => {
    const { t } = useI18n()
    const [activeSection, setActiveSection] = useState<SecuritySection>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const countdownTimerRef = useRef<NodeJS.Timeout | null>(null)

    // 组件卸载时清理倒计时
    useEffect(() => {
        return () => {
            if (countdownTimerRef.current) {
                clearInterval(countdownTimerRef.current)
            }
        }
    }, [])

    // 密码表单状态
    const [oldPassword, setOldPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showOldPassword, setShowOldPassword] = useState(false)
    const [showNewPassword, setShowNewPassword] = useState(false)

    // 手机绑定状态
    const [phone, setPhone] = useState('')
    const [phoneCode, setPhoneCode] = useState('')
    const [codeCountdown, setCodeCountdown] = useState(0)

    // 邮箱绑定状态
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
        // 清理倒计时
        if (countdownTimerRef.current) {
            clearInterval(countdownTimerRef.current)
            countdownTimerRef.current = null
        }
        setCodeCountdown(0)
    }, [])

    const handleSectionChange = useCallback((section: SecuritySection) => {
        resetForm()
        setActiveSection(section === activeSection ? null : section)
    }, [activeSection, resetForm])

    // 修改密码
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
            setTimeout(() => {
                setActiveSection(null)
                setSuccess(null)
            }, 2000)
        } else {
            setError(result.error || t('profile.security.passwordChangeFailed') || '密码修改失败')
        }
    }, [oldPassword, newPassword, confirmPassword, onChangePassword, resetForm, t])

    // 发送验证码
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
                setCodeCountdown(prev => {
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

    // 绑定手机
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
            setTimeout(() => {
                setActiveSection(null)
                setSuccess(null)
            }, 2000)
        } else {
            setError(result.error || t('profile.security.phoneBindFailed') || '手机绑定失败')
        }
    }, [phone, phoneCode, onBindPhone, resetForm, t])

    // 绑定邮箱
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
            setTimeout(() => {
                setActiveSection(null)
                setSuccess(null)
            }, 2000)
        } else {
            setError(result.error || t('profile.security.emailBindFailed') || '邮箱绑定失败')
        }
    }, [email, onBindEmail, resetForm, t])

    const inputClassName = cn(
        'w-full px-3 py-2.5 rounded-lg text-sm border',
        'focus:outline-none focus:ring-2 transition-all',
        isDarkMode
            ? 'bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 focus:ring-white/20 focus:border-gray-600'
            : 'bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:ring-black/10 focus:border-gray-300'
    )

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={cn(
                'rounded-xl border p-5',
                isDarkMode ? 'border-gray-800 bg-black' : 'border-gray-200 bg-white'
            )}
        >
            <h4 className={cn(
                'font-medium mb-4',
                isDarkMode ? 'text-white' : 'text-gray-900'
            )}>
                {t('profile.security.title') || '账户安全'}
            </h4>

            <div className="space-y-3">
                {/* 修改密码 */}
                <div className={cn(
                    'rounded-lg border overflow-hidden',
                    isDarkMode ? 'border-gray-800' : 'border-gray-200'
                )}>
                    <button
                        onClick={() => handleSectionChange('password')}
                        className={cn(
                            'w-full flex items-center justify-between p-3',
                            'transition-colors',
                            isDarkMode ? 'hover:bg-gray-900/50' : 'hover:bg-gray-50'
                        )}
                    >
                        <div className="flex items-center gap-3">
                            <Lock className={cn(
                                'w-5 h-5',
                                isDarkMode ? 'text-gray-400' : 'text-gray-500'
                            )} />
                            <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                                {t('profile.security.changePassword') || '修改密码'}
                            </span>
                        </div>
                        <motion.div
                            animate={{ rotate: activeSection === 'password' ? 180 : 0 }}
                            className={isDarkMode ? 'text-gray-500' : 'text-gray-400'}
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </motion.div>
                    </button>

                    <AnimatePresence>
                        {activeSection === 'password' && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                            >
                                <div className={cn(
                                    'p-4 space-y-3 border-t',
                                    isDarkMode ? 'border-gray-800' : 'border-gray-200'
                                )}>
                                    {/* 当前密码 */}
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
                                                'absolute right-3 top-1/2 -translate-y-1/2',
                                                isDarkMode ? 'text-gray-500' : 'text-gray-400'
                                            )}
                                        >
                                            {showOldPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>

                                    {/* 新密码 */}
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
                                                'absolute right-3 top-1/2 -translate-y-1/2',
                                                isDarkMode ? 'text-gray-500' : 'text-gray-400'
                                            )}
                                        >
                                            {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>

                                    {/* 确认密码 */}
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder={t('profile.security.confirmPassword') || '确认新密码'}
                                        className={inputClassName}
                                    />

                                    <Button
                                        onClick={handleChangePassword}
                                        disabled={loading || !oldPassword || !newPassword || !confirmPassword}
                                        className="w-full"
                                    >
                                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('common.confirm')}
                                    </Button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* 绑定手机 */}
                <div className={cn(
                    'rounded-lg border overflow-hidden',
                    isDarkMode ? 'border-gray-800' : 'border-gray-200'
                )}>
                    <button
                        onClick={() => handleSectionChange('phone')}
                        className={cn(
                            'w-full flex items-center justify-between p-3',
                            'transition-colors',
                            isDarkMode ? 'hover:bg-gray-900/50' : 'hover:bg-gray-50'
                        )}
                    >
                        <div className="flex items-center gap-3">
                            <Phone className={cn(
                                'w-5 h-5',
                                isDarkMode ? 'text-gray-400' : 'text-gray-500'
                            )} />
                            <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                                {t('profile.security.bindPhone') || '绑定手机'}
                            </span>
                        </div>
                        <motion.div
                            animate={{ rotate: activeSection === 'phone' ? 180 : 0 }}
                            className={isDarkMode ? 'text-gray-500' : 'text-gray-400'}
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </motion.div>
                    </button>

                    <AnimatePresence>
                        {activeSection === 'phone' && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                            >
                                <div className={cn(
                                    'p-4 space-y-3 border-t',
                                    isDarkMode ? 'border-gray-800' : 'border-gray-200'
                                )}>
                                    <input
                                        type="tel"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        placeholder={t('profile.security.phonePlaceholder') || '请输入手机号'}
                                        className={inputClassName}
                                    />

                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={phoneCode}
                                            onChange={(e) => setPhoneCode(e.target.value)}
                                            placeholder={t('profile.security.codePlaceholder') || '验证码'}
                                            maxLength={6}
                                            className={cn(inputClassName, 'flex-1')}
                                        />
                                        <Button
                                            variant="outline"
                                            onClick={handleSendCode}
                                            disabled={loading || codeCountdown > 0}
                                            className="whitespace-nowrap"
                                        >
                                            {codeCountdown > 0 ? `${codeCountdown}s` : (t('profile.security.sendCode') || '发送验证码')}
                                        </Button>
                                    </div>

                                    <Button
                                        onClick={handleBindPhone}
                                        disabled={loading || !phone || !phoneCode}
                                        className="w-full"
                                    >
                                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('common.confirm')}
                                    </Button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* 绑定邮箱 */}
                <div className={cn(
                    'rounded-lg border overflow-hidden',
                    isDarkMode ? 'border-gray-800' : 'border-gray-200'
                )}>
                    <button
                        onClick={() => handleSectionChange('email')}
                        className={cn(
                            'w-full flex items-center justify-between p-3',
                            'transition-colors',
                            isDarkMode ? 'hover:bg-gray-900/50' : 'hover:bg-gray-50'
                        )}
                    >
                        <div className="flex items-center gap-3">
                            <Mail className={cn(
                                'w-5 h-5',
                                isDarkMode ? 'text-gray-400' : 'text-gray-500'
                            )} />
                            <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                                {t('profile.security.bindEmail') || '绑定邮箱'}
                            </span>
                        </div>
                        <motion.div
                            animate={{ rotate: activeSection === 'email' ? 180 : 0 }}
                            className={isDarkMode ? 'text-gray-500' : 'text-gray-400'}
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </motion.div>
                    </button>

                    <AnimatePresence>
                        {activeSection === 'email' && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                            >
                                <div className={cn(
                                    'p-4 space-y-3 border-t',
                                    isDarkMode ? 'border-gray-800' : 'border-gray-200'
                                )}>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder={t('profile.security.emailPlaceholder') || '请输入邮箱地址'}
                                        className={inputClassName}
                                    />

                                    <Button
                                        onClick={handleBindEmail}
                                        disabled={loading || !email}
                                        className="w-full"
                                    >
                                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('common.confirm')}
                                    </Button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* 错误/成功提示 */}
            <AnimatePresence>
                {(error || success) && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className={cn(
                            'mt-4 p-3 rounded-lg flex items-center gap-2 text-sm',
                            error
                                ? 'bg-red-500/10 text-red-500'
                                : 'bg-emerald-500/10 text-emerald-500'
                        )}
                    >
                        {error ? <AlertCircle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                        <span>{error || success}</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    )
})

SecuritySettings.displayName = 'SecuritySettings'

export default SecuritySettings
