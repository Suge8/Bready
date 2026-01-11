import React, { memo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, Sparkles, Crown, Rocket } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useI18n } from '../../contexts/I18nContext'
import { membershipService, type MembershipPackage, type UserLevel } from '../../lib/api-client'
import { PackageListSkeleton } from './SkeletonLoaders'

interface PackageListProps {
  packages: MembershipPackage[]
  userLevel: UserLevel
  loading?: boolean
  isDarkMode?: boolean
  onPurchase: (packageId: string) => Promise<void>
}

const cardThemes = [
  {
    icon: Zap,
    gradient: 'from-slate-100 to-slate-50',
    gradientDark: 'from-slate-800/50 to-slate-900/50',
    border: 'border-slate-200',
    borderDark: 'border-slate-700',
    accent: 'text-slate-600',
    accentDark: 'text-slate-400',
    iconBg: 'bg-slate-200',
    iconBgDark: 'bg-slate-700',
    label: '入门',
  },
  {
    icon: Sparkles,
    gradient: 'from-amber-100 via-orange-50 to-yellow-50',
    gradientDark: 'from-amber-900/40 via-orange-900/30 to-yellow-900/40',
    border: 'border-amber-300',
    borderDark: 'border-amber-600/50',
    accent: 'text-amber-600',
    accentDark: 'text-amber-400',
    iconBg: 'bg-amber-200',
    iconBgDark: 'bg-amber-800/50',
    label: '热门',
  },
  {
    icon: Crown,
    gradient: 'from-violet-100 via-purple-50 to-fuchsia-50',
    gradientDark: 'from-violet-900/40 via-purple-900/30 to-fuchsia-900/40',
    border: 'border-violet-300',
    borderDark: 'border-violet-600/50',
    accent: 'text-violet-600',
    accentDark: 'text-violet-400',
    iconBg: 'bg-violet-200',
    iconBgDark: 'bg-violet-800/50',
    label: '专业',
  },
  {
    icon: Rocket,
    gradient: 'from-emerald-100 via-teal-50 to-cyan-50',
    gradientDark: 'from-emerald-900/40 via-teal-900/30 to-cyan-900/40',
    border: 'border-emerald-300',
    borderDark: 'border-emerald-600/50',
    accent: 'text-emerald-600',
    accentDark: 'text-emerald-400',
    iconBg: 'bg-emerald-200',
    iconBgDark: 'bg-emerald-800/50',
    label: '企业',
  },
]

export const PackageList: React.FC<PackageListProps> = memo(
  ({ packages, userLevel, loading = false, isDarkMode = false, onPurchase }) => {
    const { t } = useI18n()
    const [purchasingId, setPurchasingId] = useState<string | null>(null)
    const [hoveredId, setHoveredId] = useState<string | null>(null)

    const handlePurchase = async (packageId: string) => {
      setPurchasingId(packageId)
      try {
        await onPurchase(packageId)
      } finally {
        setPurchasingId(null)
      }
    }

    if (loading) {
      return <PackageListSkeleton isDarkMode={isDarkMode} count={4} />
    }

    if (packages.length === 0) {
      return null
    }

    return (
      <div className="h-full flex flex-col gap-2">
        <h4
          className={cn('font-medium text-xs px-1', isDarkMode ? 'text-gray-500' : 'text-gray-400')}
        >
          {t('profile.packages')}
        </h4>

        <div className="flex-1 grid grid-cols-4 gap-2">
          {packages.map((pkg, index) => {
            const pricing = membershipService.calculatePrice(pkg.price, userLevel)
            const hasDiscount = pricing.discountRate < 1.0
            const isPurchasing = purchasingId === pkg.id
            const isHovered = hoveredId === pkg.id
            const theme = cardThemes[index % cardThemes.length]
            const Icon = theme.icon

            return (
              <motion.button
                key={pkg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.03, y: -3 }}
                whileTap={{ scale: 0.97 }}
                onHoverStart={() => setHoveredId(pkg.id)}
                onHoverEnd={() => setHoveredId(null)}
                onClick={() => !isPurchasing && handlePurchase(pkg.id)}
                disabled={isPurchasing}
                className={cn(
                  'relative flex flex-col items-center p-3 rounded-xl border cursor-pointer',
                  'transition-all duration-300 overflow-hidden bg-gradient-to-br',
                  isDarkMode ? theme.gradientDark : theme.gradient,
                  isDarkMode ? theme.borderDark : theme.border,
                  isPurchasing && 'opacity-70 cursor-wait',
                )}
              >
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: index * 0.05 + 0.1 }}
                  className={cn(
                    'absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider',
                    isDarkMode ? theme.iconBgDark : theme.iconBg,
                    isDarkMode ? theme.accentDark : theme.accent,
                  )}
                >
                  {theme.label}
                </motion.div>

                <AnimatePresence>
                  {hasDiscount && (
                    <motion.div
                      initial={{ rotate: -12, scale: 0 }}
                      animate={{ rotate: -12, scale: 1 }}
                      exit={{ scale: 0 }}
                      className="absolute -right-1 top-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-500 text-white shadow-lg"
                    >
                      -{Math.round((1 - pricing.discountRate) * 100)}%
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.div
                  animate={{ scale: isHovered ? 1.1 : 1, rotate: isHovered ? 5 : 0 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                  className={cn(
                    'mt-4 mb-1 p-1.5 rounded-lg',
                    isDarkMode ? theme.iconBgDark : theme.iconBg,
                  )}
                >
                  <Icon className={cn('w-4 h-4', isDarkMode ? theme.accentDark : theme.accent)} />
                </motion.div>

                <motion.div
                  animate={{ scale: isHovered ? 1.05 : 1 }}
                  className={cn(
                    'text-xl font-black tabular-nums',
                    isDarkMode ? 'text-white' : 'text-gray-900',
                  )}
                >
                  {pkg.interview_minutes}
                </motion.div>
                <div
                  className={cn(
                    'text-[10px] -mt-0.5 mb-2',
                    isDarkMode ? 'text-gray-500' : 'text-gray-500',
                  )}
                >
                  min
                </div>

                <div className="flex items-baseline gap-0.5">
                  <span className={cn('text-[10px]', isDarkMode ? theme.accentDark : theme.accent)}>
                    ¥
                  </span>
                  <span
                    className={cn(
                      'text-base font-bold',
                      isDarkMode ? 'text-white' : 'text-gray-900',
                    )}
                  >
                    {pricing.actualPrice}
                  </span>
                </div>

                {hasDiscount && (
                  <span className="text-[9px] text-gray-400 line-through">¥{pkg.price}</span>
                )}

                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: isHovered ? 1 : 0, y: isHovered ? 0 : 8 }}
                  className={cn(
                    'mt-1.5 flex items-center gap-0.5 text-[9px] font-semibold',
                    isDarkMode ? theme.accentDark : theme.accent,
                  )}
                >
                  <Zap className="w-2.5 h-2.5" />
                  {t('profile.buy') || '购买'}
                </motion.div>

                {isPurchasing && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-xl"
                  >
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </motion.div>
                )}
              </motion.button>
            )
          })}
        </div>
      </div>
    )
  },
)

PackageList.displayName = 'PackageList'

export default PackageList
