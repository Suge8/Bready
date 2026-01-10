import React, { memo } from 'react'
import { motion } from 'framer-motion'
import { Mic, Brain, Shield, Zap } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useI18n } from '../../contexts/I18nContext'

interface MembershipBenefitsProps {
  isDarkMode?: boolean
}

const benefits = [
  { icon: Mic, labelKey: 'profile.benefits.realtime', color: 'text-emerald-500' },
  { icon: Brain, labelKey: 'profile.benefits.ai', color: 'text-violet-500' },
  { icon: Shield, labelKey: 'profile.benefits.privacy', color: 'text-blue-500' },
  { icon: Zap, labelKey: 'profile.benefits.fast', color: 'text-amber-500' },
]

const fallbackLabels = ['实时语音转写', 'AI 智能辅助', '隐私数据保护', '极速响应']

export const MembershipBenefits: React.FC<MembershipBenefitsProps> = memo(
  ({ isDarkMode = false }) => {
    const { t } = useI18n()

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className={cn(
          'rounded-xl border p-3',
          isDarkMode
            ? 'border-neutral-800 bg-neutral-900/30'
            : 'border-neutral-200 bg-neutral-50/50',
        )}
      >
        <h4
          className={cn('font-medium text-xs mb-3', isDarkMode ? 'text-gray-500' : 'text-gray-400')}
        >
          {t('profile.benefits.title') || '会员权益'}
        </h4>

        <div className="grid grid-cols-4 gap-2">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 + index * 0.05 }}
                className={cn(
                  'flex flex-col items-center gap-1.5 p-2 rounded-lg',
                  isDarkMode ? 'bg-white/5' : 'bg-white',
                )}
              >
                <div
                  className={cn('p-1.5 rounded-lg', isDarkMode ? 'bg-white/10' : 'bg-neutral-100')}
                >
                  <Icon className={cn('w-3.5 h-3.5', benefit.color)} />
                </div>
                <span
                  className={cn(
                    'text-[10px] font-medium text-center leading-tight',
                    isDarkMode ? 'text-gray-400' : 'text-gray-600',
                  )}
                >
                  {t(benefit.labelKey) || fallbackLabels[index]}
                </span>
              </motion.div>
            )
          })}
        </div>
      </motion.div>
    )
  },
)

MembershipBenefits.displayName = 'MembershipBenefits'

export default MembershipBenefits
