import React, { memo, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useI18n } from '../../contexts/I18nContext'

// 预设头像配置
export const PRESET_AVATARS = [
    { id: 'avatar-1', gradient: 'from-violet-500 to-purple-600', label: '紫罗兰' },
    { id: 'avatar-2', gradient: 'from-blue-500 to-cyan-500', label: '蓝海' },
    { id: 'avatar-3', gradient: 'from-emerald-500 to-teal-600', label: '翡翠' },
    { id: 'avatar-4', gradient: 'from-orange-500 to-amber-500', label: '日落' },
    { id: 'avatar-5', gradient: 'from-rose-500 to-pink-600', label: '玫瑰' },
    { id: 'avatar-6', gradient: 'from-gray-700 to-gray-900', label: '暗夜' },
    { id: 'avatar-7', gradient: 'from-indigo-500 to-blue-600', label: '深蓝' },
    { id: 'avatar-8', gradient: 'from-lime-500 to-green-600', label: '草原' },
    { id: 'avatar-9', gradient: 'from-fuchsia-500 to-purple-600', label: '紫晶' },
    { id: 'avatar-10', gradient: 'from-red-500 to-rose-600', label: '烈焰' },
    { id: 'avatar-11', gradient: 'from-cyan-500 to-blue-500', label: '冰川' },
    { id: 'avatar-12', gradient: 'from-yellow-400 to-orange-500', label: '金橙' }
] as const

export type AvatarId = typeof PRESET_AVATARS[number]['id']

interface AvatarSelectorProps {
    isOpen: boolean
    onClose: () => void
    currentAvatar?: string
    onSelect: (avatarId: string) => void
    isDarkMode?: boolean
}

export const AvatarSelector: React.FC<AvatarSelectorProps> = memo(({
    isOpen,
    onClose,
    currentAvatar,
    onSelect,
    isDarkMode = false
}) => {
    const { t } = useI18n()
    const [selectedId, setSelectedId] = useState<string | undefined>(currentAvatar)

    // 同步外部 currentAvatar 变化到内部 selectedId
    useEffect(() => {
        setSelectedId(currentAvatar)
    }, [currentAvatar])

    const handleSelect = (avatarId: string) => {
        setSelectedId(avatarId)
        onSelect(avatarId)
        onClose()
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* 背景遮罩 */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
                        onClick={onClose}
                    />

                    {/* 选择器弹窗 */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className={cn(
                            'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50',
                            'w-[90vw] max-w-md p-6 rounded-2xl shadow-2xl',
                            isDarkMode
                                ? 'bg-gray-900 border border-gray-800'
                                : 'bg-white border border-gray-200'
                        )}
                    >
                        <h3 className={cn(
                            'text-lg font-semibold mb-4',
                            isDarkMode ? 'text-white' : 'text-gray-900'
                        )}>
                            {t('profile.avatar.title') || '选择头像'}
                        </h3>

                        <div className="grid grid-cols-4 gap-3">
                            {PRESET_AVATARS.map((avatar, index) => (
                                <motion.button
                                    key={avatar.id}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: index * 0.03 }}
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => handleSelect(avatar.id)}
                                    className={cn(
                                        'relative aspect-square rounded-xl overflow-hidden cursor-pointer',
                                        'transition-all duration-200',
                                        'focus:outline-none focus:ring-2 focus:ring-offset-2',
                                        isDarkMode ? 'focus:ring-white focus:ring-offset-gray-900' : 'focus:ring-black focus:ring-offset-white',
                                        selectedId === avatar.id && 'ring-2 ring-offset-2',
                                        selectedId === avatar.id && (isDarkMode ? 'ring-white ring-offset-gray-900' : 'ring-black ring-offset-white')
                                    )}
                                    title={avatar.label}
                                >
                                    <div className={cn(
                                        'absolute inset-0 bg-gradient-to-br',
                                        avatar.gradient
                                    )} />

                                    {/* 选中标记 */}
                                    <AnimatePresence>
                                        {selectedId === avatar.id && (
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0 }}
                                                className="absolute inset-0 flex items-center justify-center bg-black/30"
                                            >
                                                <Check className="w-6 h-6 text-white" strokeWidth={3} />
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.button>
                            ))}
                        </div>

                        <p className={cn(
                            'text-xs text-center mt-4',
                            isDarkMode ? 'text-gray-500' : 'text-gray-400'
                        )}>
                            {t('profile.avatar.hint') || '点击选择头像'}
                        </p>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
})

AvatarSelector.displayName = 'AvatarSelector'

// 头像显示组件
interface AvatarDisplayProps {
    avatarId?: string
    size?: 'sm' | 'md' | 'lg' | 'xl'
    className?: string
    onClick?: () => void
    showPulse?: boolean
}

export const AvatarDisplay: React.FC<AvatarDisplayProps> = memo(({
    avatarId,
    size = 'md',
    className,
    onClick,
    showPulse = false
}) => {
    const sizeClasses = {
        sm: 'w-8 h-8',
        md: 'w-12 h-12',
        lg: 'w-16 h-16',
        xl: 'w-24 h-24'
    }

    const avatar = PRESET_AVATARS.find(a => a.id === avatarId) || PRESET_AVATARS[0]

    return (
        <motion.div
            whileHover={onClick ? { scale: 1.05 } : undefined}
            whileTap={onClick ? { scale: 0.95 } : undefined}
            onClick={onClick}
            className={cn(
                'relative rounded-full overflow-hidden',
                sizeClasses[size],
                onClick && 'cursor-pointer',
                className
            )}
        >
            {/* 呼吸动效背景 */}
            {showPulse && (
                <div className={cn(
                    'absolute inset-0 rounded-full bg-gradient-to-br opacity-60',
                    avatar.gradient,
                    'animate-pulse'
                )} />
            )}

            {/* 头像主体 */}
            <div className={cn(
                'absolute inset-0 bg-gradient-to-br',
                avatar.gradient
            )} />

            {/* Hover 发光效果 */}
            {onClick && (
                <div className="absolute inset-0 bg-white/0 hover:bg-white/10 transition-colors" />
            )}
        </motion.div>
    )
})

AvatarDisplay.displayName = 'AvatarDisplay'

export default AvatarSelector
