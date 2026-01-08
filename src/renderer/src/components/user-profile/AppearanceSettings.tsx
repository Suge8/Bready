import React, { memo } from 'react'
import { motion } from 'framer-motion'
import { Sun, Moon, Monitor, Globe, Palette } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useI18n } from '../../contexts/I18nContext'
import { useTheme } from '../ui/theme-provider'
import { SettingsSkeleton } from './SkeletonLoaders'

interface AppearanceSettingsProps {
    loading?: boolean
    isDarkMode?: boolean
}

export const AppearanceSettings: React.FC<AppearanceSettingsProps> = memo(({
    loading = false,
    isDarkMode = false
}) => {
    const { t, languageOptions, language, setLanguage } = useI18n()
    const { theme, setTheme } = useTheme()

    const themeOptions = [
        { value: 'light' as const, label: t('profile.themeOptions.light'), icon: Sun },
        { value: 'dark' as const, label: t('profile.themeOptions.dark'), icon: Moon },
        { value: 'auto' as const, label: t('profile.themeOptions.auto'), icon: Monitor }
    ]

    if (loading) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className={cn(
                    'rounded-xl border p-5',
                    isDarkMode ? 'border-gray-800 bg-black' : 'border-gray-200 bg-white'
                )}
            >
                <SettingsSkeleton isDarkMode={isDarkMode} />
            </motion.div>
        )
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className={cn(
                'rounded-xl border p-5',
                isDarkMode ? 'border-gray-800 bg-black' : 'border-gray-200 bg-white'
            )}
        >
            <h4 className={cn(
                'font-medium mb-4 flex items-center gap-2',
                isDarkMode ? 'text-white' : 'text-gray-900'
            )}>
                <Palette className="w-4 h-4" />
                {t('profile.settings')}
            </h4>

            <div className="space-y-5">
                {/* 主题设置 */}
                <div>
                    <div className={cn(
                        'flex items-center gap-2 text-sm mb-3',
                        isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    )}>
                        <Sun className="w-4 h-4" />
                        <span>{t('profile.theme')}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                        {themeOptions.map((option, index) => {
                            const Icon = option.icon
                            const isActive = theme === option.value

                            return (
                                <motion.button
                                    key={option.value}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.1 + index * 0.05 }}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setTheme(option.value)}
                                    className={cn(
                                        'flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium',
                                        'border transition-all duration-300 cursor-pointer',
                                        'relative overflow-hidden',
                                        isActive
                                            ? isDarkMode
                                                ? 'bg-white text-black border-transparent shadow-lg shadow-white/10'
                                                : 'bg-black text-white border-transparent shadow-lg shadow-black/10'
                                            : isDarkMode
                                                ? 'bg-gray-900 text-gray-300 border-gray-800 hover:bg-gray-800 hover:border-gray-700'
                                                : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                                    )}
                                >
                                    {/* 主题切换渐变效果 */}
                                    <motion.div
                                        initial={false}
                                        animate={{
                                            opacity: isActive ? 1 : 0,
                                            scale: isActive ? 1 : 0.8
                                        }}
                                        transition={{ duration: 0.3 }}
                                        className={cn(
                                            'absolute inset-0 rounded-lg',
                                            isDarkMode
                                                ? 'bg-gradient-to-br from-white to-gray-200'
                                                : 'bg-gradient-to-br from-black to-gray-800'
                                        )}
                                        style={{ zIndex: -1 }}
                                    />

                                    <Icon className="w-4 h-4" />
                                    <span className="relative">{option.label}</span>
                                </motion.button>
                            )
                        })}
                    </div>
                </div>

                {/* 语言设置 */}
                <div>
                    <div className={cn(
                        'flex items-center gap-2 text-sm mb-3',
                        isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    )}>
                        <Globe className="w-4 h-4" />
                        <span>{t('profile.language')}</span>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25 }}
                        className="relative"
                    >
                        <select
                            value={language}
                            onChange={(e) => setLanguage(e.target.value as typeof language)}
                            className={cn(
                                'w-full px-4 py-2.5 rounded-lg border appearance-none cursor-pointer',
                                'text-sm font-medium transition-all duration-200',
                                'focus:outline-none focus:ring-2',
                                isDarkMode
                                    ? 'border-gray-800 bg-gray-900 text-white focus:ring-white/20 hover:bg-gray-800'
                                    : 'border-gray-200 bg-gray-50 text-gray-900 focus:ring-black/10 hover:bg-gray-100'
                            )}
                        >
                            {languageOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>

                        {/* 下拉箭头 */}
                        <div className={cn(
                            'absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none',
                            isDarkMode ? 'text-gray-500' : 'text-gray-400'
                        )}>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </motion.div>
                </div>
            </div>
        </motion.div>
    )
})

AppearanceSettings.displayName = 'AppearanceSettings'

export default AppearanceSettings
