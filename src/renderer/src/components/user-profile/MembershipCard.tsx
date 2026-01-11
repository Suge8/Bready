import React, { memo, useEffect, useState } from 'react'
import { motion, useSpring, useTransform } from 'framer-motion'
import { Clock, Calendar, TrendingUp } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useI18n } from '../../contexts/I18nContext'
import { membershipService, type UserProfile } from '../../lib/api-client'
import { MembershipSkeleton } from './SkeletonLoaders'

interface MembershipCardProps {
  profile: UserProfile | null
  loading?: boolean
  isDarkMode?: boolean
}

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

export const MembershipCard: React.FC<MembershipCardProps> = memo(
  ({ profile, loading = false, isDarkMode = false }) => {
    const { t, locale } = useI18n()
    const [calculatedTotal, setCalculatedTotal] = useState<number | null>(null)

    useEffect(() => {
      if (profile?.id) {
        membershipService.getTotalPurchasedMinutes(profile.id).then(setCalculatedTotal)
      }
    }, [profile?.id])

    const formatDate = (dateString?: string) => {
      if (!dateString) return t('common.none')
      return new Date(dateString).toLocaleDateString(locale)
    }

    const isExpired =
      profile?.membership_expires_at && new Date(profile.membership_expires_at) < new Date()

    const remainingMinutes = profile?.remaining_interview_minutes || 0
    const totalMinutes = calculatedTotal ?? profile?.total_purchased_minutes ?? 0

    if (loading) {
      return (
        <div
          className={cn(
            'rounded-xl border p-3',
            isDarkMode ? 'border-neutral-800 bg-neutral-900/50' : 'border-neutral-200 bg-white',
          )}
        >
          <MembershipSkeleton isDarkMode={isDarkMode} />
        </div>
      )
    }

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'rounded-xl border p-3 relative overflow-hidden',
          isDarkMode ? 'border-neutral-800 bg-neutral-900/50' : 'border-neutral-200 bg-white',
        )}
      >
        <div className="flex items-center justify-between mb-3">
          <h4 className={cn('font-medium text-xs', isDarkMode ? 'text-gray-400' : 'text-gray-500')}>
            {t('profile.membership')}
          </h4>
          {totalMinutes > 0 && remainingMinutes > 0 && (
            <div
              className={cn(
                'text-[10px] font-medium px-2 py-0.5 rounded-full',
                isDarkMode ? 'bg-neutral-800 text-gray-400' : 'bg-neutral-100 text-gray-500',
              )}
            >
              {Math.round((remainingMinutes / totalMinutes) * 100)}%{' '}
              {t('profile.remaining') || t('common.remaining')}
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1 text-[10px] text-gray-500">
              <Clock className="w-3 h-3" />
              <span>{t('profile.remainingTime')}</span>
            </div>
            <div
              className={cn(
                'text-base font-bold',
                remainingMinutes > 0 ? (isDarkMode ? 'text-white' : 'text-black') : 'text-red-500',
              )}
            >
              <AnimatedNumber value={remainingMinutes} duration={0.8} />
              <span className="text-[10px] font-normal text-gray-500 ml-0.5">min</span>
            </div>
          </div>

          <div
            className={cn(
              'space-y-0.5 border-l pl-3',
              isDarkMode ? 'border-neutral-800' : 'border-neutral-200',
            )}
          >
            <div className="flex items-center gap-1 text-[10px] text-gray-500">
              <Calendar className="w-3 h-3" />
              <span>{t('profile.expiry')}</span>
            </div>
            <div
              className={cn(
                'text-sm font-semibold',
                isExpired ? 'text-red-500' : isDarkMode ? 'text-white' : 'text-black',
              )}
            >
              {formatDate(profile?.membership_expires_at)}
            </div>
          </div>

          <div
            className={cn(
              'space-y-0.5 border-l pl-3',
              isDarkMode ? 'border-neutral-800' : 'border-neutral-200',
            )}
          >
            <div className="flex items-center gap-1 text-[10px] text-gray-500">
              <TrendingUp className="w-3 h-3" />
              <span>{t('profile.totalPurchased')}</span>
            </div>
            <div className={cn('text-base font-bold', isDarkMode ? 'text-white' : 'text-black')}>
              <AnimatedNumber value={totalMinutes} duration={1} />
              <span className="text-[10px] font-normal text-gray-500 ml-0.5">min</span>
            </div>
          </div>
        </div>

        {totalMinutes > 0 && (
          <div
            className={cn(
              'absolute bottom-0 left-0 right-0 h-0.5',
              isDarkMode ? 'bg-neutral-800' : 'bg-neutral-200',
            )}
          >
            <motion.div
              initial={{ width: 0 }}
              animate={{
                width: `${Math.max(0, Math.min(100, (remainingMinutes / totalMinutes) * 100))}%`,
              }}
              transition={{ duration: 1, delay: 0.4, ease: 'easeOut' }}
              className={cn(
                'h-full',
                remainingMinutes > totalMinutes * 0.2
                  ? 'bg-emerald-500'
                  : remainingMinutes > totalMinutes * 0.1
                    ? 'bg-amber-500'
                    : 'bg-red-500',
              )}
            />
          </div>
        )}
      </motion.div>
    )
  },
)

MembershipCard.displayName = 'MembershipCard'

export default MembershipCard
