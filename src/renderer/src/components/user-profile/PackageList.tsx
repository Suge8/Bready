import React, { memo, useState } from 'react'
import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useI18n } from '../../contexts/I18nContext'
import { membershipService, type MembershipPackage, type UserLevel } from '../../lib/supabase'
import { PackageListSkeleton } from './SkeletonLoaders'

interface PackageListProps {
  packages: MembershipPackage[]
  userLevel: UserLevel
  loading?: boolean
  isDarkMode?: boolean
  onPurchase: (packageId: string) => Promise<void>
}

// 按钮波纹效果组件
const RippleButton: React.FC<{
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  loading?: boolean
  className?: string
}> = memo(({ children, onClick, disabled, loading, className }) => {
  const [ripples, setRipples] = useState<Array<{ x: number; y: number; id: number }>>([])

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || loading) return

    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const id = Date.now()

    setRipples((prev) => [...prev, { x, y, id }])
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id))
    }, 600)

    onClick()
  }

  return (
    <button
      onClick={handleClick}
      disabled={disabled || loading}
      className={cn('relative overflow-hidden', className)}
    >
      {ripples.map((ripple) => (
        <motion.span
          key={ripple.id}
          initial={{ scale: 0, opacity: 0.5 }}
          animate={{ scale: 4, opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="absolute rounded-full bg-white/30 pointer-events-none"
          style={{
            left: ripple.x - 10,
            top: ripple.y - 10,
            width: 20,
            height: 20,
          }}
        />
      ))}
      {children}
    </button>
  )
})

RippleButton.displayName = 'RippleButton'

export const PackageList: React.FC<PackageListProps> = memo(
  ({ packages, userLevel, loading = false, isDarkMode = false, onPurchase }) => {
    const { t } = useI18n()
    const [purchasingId, setPurchasingId] = useState<string | null>(null)

    const handlePurchase = async (packageId: string) => {
      setPurchasingId(packageId)
      try {
        await onPurchase(packageId)
      } finally {
        setPurchasingId(null)
      }
    }

    if (loading) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className={cn(
            'rounded-xl border p-5',
            isDarkMode ? 'border-gray-800 bg-black' : 'border-gray-200 bg-white',
          )}
        >
          <PackageListSkeleton isDarkMode={isDarkMode} count={4} />
        </motion.div>
      )
    }

    if (packages.length === 0) {
      return null
    }

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className={cn(
          'rounded-xl border p-5',
          isDarkMode ? 'border-gray-800 bg-black' : 'border-gray-200 bg-white',
        )}
      >
        <h4 className={cn('font-medium mb-4', isDarkMode ? 'text-white' : 'text-gray-900')}>
          {t('profile.packages')}
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {packages.map((pkg, index) => {
            const pricing = membershipService.calculatePrice(pkg.price, userLevel)
            const hasDiscount = pricing.discountRate < 1.0
            const isPurchasing = purchasingId === pkg.id

            return (
              <motion.div
                key={pkg.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 + index * 0.05 }}
                whileHover={{ scale: 1.02 }}
                className={cn(
                  'group relative flex items-center justify-between p-4 rounded-xl border',
                  'transition-all duration-300',
                  isDarkMode
                    ? 'bg-gray-900/50 border-gray-800 hover:border-gray-600'
                    : 'bg-gray-50 border-gray-200 hover:border-gray-300',
                  // Hover 发光效果
                  'hover:shadow-lg',
                  isDarkMode ? 'hover:shadow-white/5' : 'hover:shadow-black/5',
                )}
              >
                {/* 发光边框效果 */}
                <div
                  className={cn(
                    'absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300',
                    'bg-gradient-to-r from-transparent via-white/5 to-transparent',
                    'pointer-events-none',
                  )}
                />

                <div className="flex-1 relative">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn('font-medium', isDarkMode ? 'text-white' : 'text-gray-900')}
                    >
                      {pkg.name}
                    </span>
                    <span
                      className={cn(
                        'text-xs px-2 py-1 rounded',
                        isDarkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-200 text-gray-600',
                      )}
                    >
                      {t('profile.minutes', { count: pkg.interview_minutes })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mt-1">
                    {hasDiscount && (
                      <span className="text-xs text-gray-400 line-through">¥{pkg.price}</span>
                    )}
                    <span
                      className={cn(
                        'text-sm font-semibold',
                        isDarkMode ? 'text-white' : 'text-gray-900',
                      )}
                    >
                      ¥{pricing.actualPrice}
                    </span>
                    {hasDiscount && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className={cn(
                          'flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded',
                          isDarkMode ? 'bg-white text-black' : 'bg-gray-900 text-white',
                        )}
                      >
                        <Sparkles className="w-3 h-3" />
                        {t('profile.discount', {
                          percent: Math.round((1 - pricing.discountRate) * 100),
                        })}
                      </motion.span>
                    )}
                  </div>
                </div>

                <RippleButton
                  onClick={() => handlePurchase(pkg.id)}
                  disabled={isPurchasing}
                  loading={isPurchasing}
                  className={cn(
                    'ml-3 px-4 py-2 rounded-lg text-sm font-medium',
                    'transition-colors',
                    isDarkMode
                      ? 'bg-white text-black hover:bg-gray-200 disabled:bg-gray-600'
                      : 'bg-black text-white hover:bg-gray-800 disabled:bg-gray-400',
                    'disabled:cursor-not-allowed',
                  )}
                >
                  {isPurchasing ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    </span>
                  ) : (
                    t('profile.buy')
                  )}
                </RippleButton>
              </motion.div>
            )
          })}
        </div>
      </motion.div>
    )
  },
)

PackageList.displayName = 'PackageList'

export default PackageList
