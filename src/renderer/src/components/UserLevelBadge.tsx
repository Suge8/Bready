import React from 'react'
import { User, Crown, Star, Shield, Zap } from 'lucide-react'
import { UserLevel } from '../lib/supabase'

interface UserLevelBadgeProps {
  level: UserLevel
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
  className?: string
}

const UserLevelBadge: React.FC<UserLevelBadgeProps> = ({ 
  level, 
  size = 'md', 
  showIcon = true, 
  className = '' 
}) => {
  const getLevelConfig = (level: UserLevel) => {
    switch (level) {
      case '小白':
        return {
          icon: User,
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-700',
          borderColor: 'border-gray-200',
          iconColor: 'text-gray-500'
        }
      case '螺丝钉':
        return {
          icon: Zap,
          bgColor: 'bg-blue-100',
          textColor: 'text-blue-700',
          borderColor: 'border-blue-200',
          iconColor: 'text-blue-500'
        }
      case '大牛':
        return {
          icon: Star,
          bgColor: 'bg-purple-100',
          textColor: 'text-purple-700',
          borderColor: 'border-purple-200',
          iconColor: 'text-purple-500'
        }
      case '管理':
        return {
          icon: Shield,
          bgColor: 'bg-orange-100',
          textColor: 'text-orange-700',
          borderColor: 'border-orange-200',
          iconColor: 'text-orange-500'
        }
      case '超级':
        return {
          icon: Crown,
          bgColor: 'bg-red-100',
          textColor: 'text-red-700',
          borderColor: 'border-red-200',
          iconColor: 'text-red-500'
        }
      default:
        return {
          icon: User,
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-700',
          borderColor: 'border-gray-200',
          iconColor: 'text-gray-500'
        }
    }
  }

  const getSizeClasses = (size: 'sm' | 'md' | 'lg') => {
    switch (size) {
      case 'sm':
        return {
          container: 'px-2 py-1 text-xs',
          icon: 'w-3 h-3'
        }
      case 'md':
        return {
          container: 'px-3 py-1.5 text-sm',
          icon: 'w-4 h-4'
        }
      case 'lg':
        return {
          container: 'px-4 py-2 text-base',
          icon: 'w-5 h-5'
        }
      default:
        return {
          container: 'px-3 py-1.5 text-sm',
          icon: 'w-4 h-4'
        }
    }
  }

  const config = getLevelConfig(level)
  const sizeClasses = getSizeClasses(size)
  const IconComponent = config.icon

  return (
    <div
      className={`
        inline-flex items-center space-x-1.5 rounded-full border font-medium
        ${config.bgColor} ${config.textColor} ${config.borderColor}
        ${sizeClasses.container}
        ${className}
      `}
    >
      {showIcon && (
        <IconComponent className={`${sizeClasses.icon} ${config.iconColor}`} />
      )}
      <span>{level}</span>
    </div>
  )
}

export default UserLevelBadge
