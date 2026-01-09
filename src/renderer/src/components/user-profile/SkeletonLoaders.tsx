import React, { memo } from 'react'
import { motion } from 'framer-motion'
import { cn } from '../../lib/utils'

// 骨架屏基础动画
const shimmerAnimation = {
  animate: {
    backgroundPosition: ['200% 0', '-200% 0'],
  },
  transition: {
    duration: 1.5,
    repeat: Infinity,
    ease: 'linear' as const,
  },
}

interface SkeletonBaseProps {
  className?: string
  isDarkMode?: boolean
}

const SkeletonBase: React.FC<SkeletonBaseProps> = memo(({ className, isDarkMode = false }) => (
  <motion.div
    className={cn(
      'rounded-lg',
      isDarkMode
        ? 'bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800'
        : 'bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200',
      'bg-[length:200%_100%]',
      className,
    )}
    {...shimmerAnimation}
  />
))

SkeletonBase.displayName = 'SkeletonBase'

// 个人资料骨架屏
export const ProfileSkeleton: React.FC<{ isDarkMode?: boolean }> = memo(({ isDarkMode }) => (
  <div className="space-y-4">
    {/* 头像和名称 */}
    <div className="flex items-center gap-4">
      <SkeletonBase className="w-16 h-16 rounded-full" isDarkMode={isDarkMode} />
      <div className="flex-1 space-y-2">
        <SkeletonBase className="h-5 w-32" isDarkMode={isDarkMode} />
        <SkeletonBase className="h-4 w-48" isDarkMode={isDarkMode} />
      </div>
      <SkeletonBase className="h-8 w-20 rounded-full" isDarkMode={isDarkMode} />
    </div>
    {/* 身份信息 */}
    <div className="flex justify-between pt-4">
      <SkeletonBase className="h-4 w-16" isDarkMode={isDarkMode} />
      <SkeletonBase className="h-4 w-12" isDarkMode={isDarkMode} />
    </div>
  </div>
))

ProfileSkeleton.displayName = 'ProfileSkeleton'

// 会员信息骨架屏
export const MembershipSkeleton: React.FC<{ isDarkMode?: boolean }> = memo(({ isDarkMode }) => (
  <div className="space-y-4">
    <SkeletonBase className="h-5 w-24" isDarkMode={isDarkMode} />
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <SkeletonBase className="w-4 h-4 rounded" isDarkMode={isDarkMode} />
            <SkeletonBase className="h-4 w-20" isDarkMode={isDarkMode} />
          </div>
          <SkeletonBase className="h-4 w-16" isDarkMode={isDarkMode} />
        </div>
      ))}
    </div>
  </div>
))

MembershipSkeleton.displayName = 'MembershipSkeleton'

// 套餐列表骨架屏
export const PackageListSkeleton: React.FC<{ isDarkMode?: boolean; count?: number }> = memo(
  ({ isDarkMode, count = 4 }) => (
    <div className="space-y-4">
      <SkeletonBase className="h-5 w-24" isDarkMode={isDarkMode} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'p-3 rounded-xl border',
              isDarkMode ? 'border-gray-800' : 'border-gray-200',
            )}
          >
            <div className="flex justify-between items-center">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <SkeletonBase className="h-4 w-16" isDarkMode={isDarkMode} />
                  <SkeletonBase className="h-5 w-12 rounded" isDarkMode={isDarkMode} />
                </div>
                <SkeletonBase className="h-4 w-20" isDarkMode={isDarkMode} />
              </div>
              <SkeletonBase className="h-9 w-14 rounded-lg" isDarkMode={isDarkMode} />
            </div>
          </div>
        ))}
      </div>
    </div>
  ),
)

PackageListSkeleton.displayName = 'PackageListSkeleton'

// 历史记录列表骨架屏
export const HistoryListSkeleton: React.FC<{ isDarkMode?: boolean; count?: number }> = memo(
  ({ isDarkMode, count = 5 }) => (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className={cn(
            'p-4 rounded-xl border',
            isDarkMode ? 'border-gray-800 bg-gray-900/30' : 'border-gray-200 bg-gray-50/50',
          )}
        >
          <div className="flex justify-between items-start">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-3">
                <SkeletonBase className="w-8 h-8 rounded-lg" isDarkMode={isDarkMode} />
                <div className="space-y-1">
                  <SkeletonBase className="h-4 w-24" isDarkMode={isDarkMode} />
                  <SkeletonBase className="h-3 w-32" isDarkMode={isDarkMode} />
                </div>
              </div>
            </div>
            <div className="text-right space-y-1">
              <SkeletonBase className="h-4 w-16 ml-auto" isDarkMode={isDarkMode} />
              <SkeletonBase className="h-3 w-12 ml-auto" isDarkMode={isDarkMode} />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  ),
)

HistoryListSkeleton.displayName = 'HistoryListSkeleton'

// 设置项骨架屏
export const SettingsSkeleton: React.FC<{ isDarkMode?: boolean }> = memo(({ isDarkMode }) => (
  <div className="space-y-6">
    {/* 主题设置 */}
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <SkeletonBase className="w-4 h-4 rounded" isDarkMode={isDarkMode} />
        <SkeletonBase className="h-4 w-12" isDarkMode={isDarkMode} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[1, 2, 3].map((i) => (
          <SkeletonBase key={i} className="h-10 rounded-lg" isDarkMode={isDarkMode} />
        ))}
      </div>
    </div>
    {/* 语言设置 */}
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <SkeletonBase className="w-4 h-4 rounded" isDarkMode={isDarkMode} />
        <SkeletonBase className="h-4 w-12" isDarkMode={isDarkMode} />
      </div>
      <SkeletonBase className="h-10 w-full rounded-lg" isDarkMode={isDarkMode} />
    </div>
  </div>
))

SettingsSkeleton.displayName = 'SettingsSkeleton'

// Tab 导航骨架屏
export const TabSkeleton: React.FC<{ isDarkMode?: boolean }> = memo(({ isDarkMode }) => (
  <div className="flex gap-1 p-1 rounded-xl border border-gray-200 dark:border-gray-800">
    {[1, 2, 3, 4].map((i) => (
      <SkeletonBase key={i} className="h-9 flex-1 rounded-lg" isDarkMode={isDarkMode} />
    ))}
  </div>
))

TabSkeleton.displayName = 'TabSkeleton'
