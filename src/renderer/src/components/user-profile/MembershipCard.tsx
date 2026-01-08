import React, { memo, useEffect, useState } from 'react'
import { motion, useSpring, useTransform } from 'framer-motion'
import { Clock, Calendar, TrendingUp } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useI18n } from '../../contexts/I18nContext'
import { type UserProfile } from '../../lib/supabase'
import { MembershipSkeleton } from './SkeletonLoaders'

interface MembershipCardProps {
    profile: UserProfile | null
    loading?: boolean
    isDarkMode?: boolean
}

// 数字计数动画组件
const AnimatedNumber: React.FC<{
    value: number
    duration?: number
    className?: string
}> = memo(({ value, duration = 1, className }) => {
    const spring = useSpring(0, { duration: duration * 1000 })
    const display = useTransform(spring, (current) => Math.round(current))
    const [displayValue, setDisplayValue] = useState(0)

    useEffect(() => {
        spring.set(value)
    }, [value, spring])

    useEffect(() => {
        const unsubscribe = display.on('change', (v) => {
            setDisplayValue(v)
        })
        return () => unsubscribe()
    }, [display])

    return <span className={className}>{displayValue}</span>
})

AnimatedNumber.displayName = 'AnimatedNumber'

export const MembershipCard: React.FC<MembershipCardProps> = memo(({
    profile,
    loading = false,
    isDarkMode = false
}) => {
    const { t, locale } = useI18n()

    const formatDate = (dateString?: string) => {
        if (!dateString) return t('common.none')
        return new Date(dateString).toLocaleDateString(locale)
    }

    const isExpired = profile?.membership_expires_at &&
        new Date(profile.membership_expires_at) < new Date()

    const remainingMinutes = profile?.remaining_interview_minutes || 0
    const totalMinutes = profile?.total_purchased_minutes || 0

    if (loading) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.15 }}
                className={cn(
                    'rounded-xl border p-5',
                    isDarkMode ? 'border-gray-800 bg-black' : 'border-gray-200 bg-white'
                )}
            >
                <MembershipSkeleton isDarkMode={isDarkMode} />
            </motion.div>
        )
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
            className={cn(
                'rounded-xl border p-5',
                isDarkMode ? 'border-gray-800 bg-black' : 'border-gray-200 bg-white'
            )}
        >
            <h4 className={cn(
                'font-medium mb-4',
                isDarkMode ? 'text-white' : 'text-gray-900'
            )}>
                {t('profile.membership')}
            </h4>

            <div className="space-y-3 text-sm">
                {/* 剩余面试时间 - 带数字动画 */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="flex items-center justify-between"
                >
                    <div className={cn(
                        'flex items-center gap-2',
                        isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    )}>
                        <Clock className="w-4 h-4" />
                        <span>{t('profile.remainingTime')}</span>
                    </div>
                    <div className={cn(
                        'font-medium',
                        remainingMinutes > 0
                            ? (isDarkMode ? 'text-white' : 'text-gray-900')
                            : 'text-red-500'
                    )}>
                        <AnimatedNumber value={remainingMinutes} duration={0.8} />
                        <span className="ml-1">{t('common.minutes', { count: '' }).replace('{{count}}', '').trim()}</span>
                    </div>
                </motion.div>

                {/* 会员到期时间 */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.25 }}
                    className="flex items-center justify-between"
                >
                    <div className={cn(
                        'flex items-center gap-2',
                        isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    )}>
                        <Calendar className="w-4 h-4" />
                        <span>{t('profile.expiry')}</span>
                    </div>
                    <div className={cn(
                        'font-medium',
                        isExpired ? 'text-red-500' : (isDarkMode ? 'text-white' : 'text-gray-900')
                    )}>
                        {formatDate(profile?.membership_expires_at)}
                        {isExpired && (
                            <span className="ml-1 text-xs">({t('profile.expired') || '已过期'})</span>
                        )}
                    </div>
                </motion.div>

                {/* 累计购买时间 - 带数字动画 */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="flex items-center justify-between"
                >
                    <div className={cn(
                        'flex items-center gap-2',
                        isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    )}>
                        <TrendingUp className="w-4 h-4" />
                        <span>{t('profile.totalPurchased')}</span>
                    </div>
                    <div className={cn(
                        'font-medium',
                        isDarkMode ? 'text-white' : 'text-gray-900'
                    )}>
                        <AnimatedNumber value={totalMinutes} duration={1} />
                        <span className="ml-1">{t('common.minutes', { count: '' }).replace('{{count}}', '').trim()}</span>
                    </div>
                </motion.div>

                {/* 使用进度条 */}
                {totalMinutes > 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.35 }}
                        className="pt-2"
                    >
                        <div className="flex justify-between text-xs mb-1">
                            <span className={isDarkMode ? 'text-gray-500' : 'text-gray-400'}>
                                {t('profile.usageProgress') || '使用进度'}
                            </span>
                            <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
                                {Math.round((1 - remainingMinutes / totalMinutes) * 100)}%
                            </span>
                        </div>
                        <div className={cn(
                            'h-2 rounded-full overflow-hidden',
                            isDarkMode ? 'bg-gray-800' : 'bg-gray-200'
                        )}>
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.max(0, Math.min(100, (1 - remainingMinutes / totalMinutes) * 100))}%` }}
                                transition={{ duration: 1, delay: 0.4, ease: 'easeOut' }}
                                className={cn(
                                    'h-full rounded-full',
                                    remainingMinutes > totalMinutes * 0.2
                                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                                        : remainingMinutes > totalMinutes * 0.1
                                            ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                                            : 'bg-gradient-to-r from-red-500 to-rose-500'
                                )}
                            />
                        </div>
                    </motion.div>
                )}
            </div>
        </motion.div>
    )
})

MembershipCard.displayName = 'MembershipCard'

export default MembershipCard
