import React, { memo } from 'react'
import { User, Crown, Star, Shield, Zap } from 'lucide-react'
import { cn } from '../lib/utils'
import { UserLevel } from '../lib/supabase'

interface UserLevelBadgeProps {
  level: UserLevel
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
  className?: string
  showShimmer?: boolean
  isDarkMode?: boolean // 优先使用应用主题
}

// 等级配置 - 同时支持浅色和深色模式
const levelConfigs: Record<UserLevel, {
  icon: typeof User
  light: { bg: string; text: string; border: string; iconColor: string }
  dark: { bg: string; text: string; border: string; iconColor: string }
}> = {
  '小白': {
    icon: User,
    light: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200', iconColor: 'text-gray-500' },
    dark: { bg: 'bg-gray-800', text: 'text-gray-300', border: 'border-gray-700', iconColor: 'text-gray-400' }
  },
  '螺丝钉': {
    icon: Zap,
    light: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', iconColor: 'text-blue-500' },
    dark: { bg: 'bg-blue-900/50', text: 'text-blue-300', border: 'border-blue-800', iconColor: 'text-blue-400' }
  },
  '大牛': {
    icon: Star,
    light: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200', iconColor: 'text-purple-500' },
    dark: { bg: 'bg-purple-900/50', text: 'text-purple-300', border: 'border-purple-800', iconColor: 'text-purple-400' }
  },
  '管理': {
    icon: Shield,
    light: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200', iconColor: 'text-orange-500' },
    dark: { bg: 'bg-orange-900/50', text: 'text-orange-300', border: 'border-orange-800', iconColor: 'text-orange-400' }
  },
  '超级': {
    icon: Crown,
    light: { bg: 'bg-gradient-to-r from-amber-100 to-yellow-100', text: 'text-amber-700', border: 'border-amber-200', iconColor: 'text-amber-500' },
    dark: { bg: 'bg-gradient-to-r from-amber-900/50 to-yellow-900/50', text: 'text-amber-300', border: 'border-amber-700', iconColor: 'text-amber-400' }
  }
}

const sizeConfig = {
  sm: { container: 'px-2 py-1 text-xs', icon: 'w-3 h-3' },
  md: { container: 'px-3 py-1.5 text-sm', icon: 'w-4 h-4' },
  lg: { container: 'px-4 py-2 text-base', icon: 'w-5 h-5' }
}

const UserLevelBadge: React.FC<UserLevelBadgeProps> = memo(({
  level,
  size = 'md',
  showIcon = true,
  className = '',
  showShimmer = false,
  isDarkMode: isDarkModeProp
}) => {
  const config = levelConfigs[level] || levelConfigs['小白']
  const sizeClasses = sizeConfig[size]
  const IconComponent = config.icon

  // 优先使用 prop，fallback 到系统检测
  const isDarkMode = isDarkModeProp ?? (typeof window !== 'undefined' &&
    (document.documentElement.classList.contains('dark') ||
      window.matchMedia('(prefers-color-scheme: dark)').matches))

  const colorScheme = isDarkMode ? config.dark : config.light

  return (
    <div
      className={cn(
        'relative inline-flex items-center space-x-1.5 rounded-full border font-medium overflow-hidden',
        colorScheme.bg,
        colorScheme.text,
        colorScheme.border,
        sizeClasses.container,
        className
      )}
    >
      {/* Shimmer 闪烁效果 */}
      {showShimmer && (
        <div
          className={cn(
            'absolute inset-0 shimmer-effect pointer-events-none'
          )}
        />
      )}

      {showIcon && (
        <IconComponent className={cn(sizeClasses.icon, colorScheme.iconColor, 'relative')} />
      )}
      <span className="relative">{level}</span>

    </div>
  )
})

UserLevelBadge.displayName = 'UserLevelBadge'

export default UserLevelBadge
