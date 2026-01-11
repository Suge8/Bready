import React, { memo } from 'react'
import { motion } from 'framer-motion'
import { Sun, Moon, Monitor, Globe, ChevronsUpDown } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useI18n } from '../../contexts/I18nContext'
import { useTheme } from '../ui/theme-provider'
import { SettingsSkeleton } from './SkeletonLoaders'
import { ShortcutSettings } from './ShortcutSettings'

interface AppearanceSettingsProps {
  loading?: boolean
  isDarkMode?: boolean
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 10, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 300,
      damping: 24,
    },
  },
}

export const AppearanceSettings: React.FC<AppearanceSettingsProps> = memo(
  ({ loading = false, isDarkMode = false }) => {
    const { t, languageOptions, language, setLanguage } = useI18n()
    const { theme, setTheme } = useTheme()

    const themeOptions = [
      { value: 'light' as const, label: t('profile.themeOptions.light'), icon: Sun },
      { value: 'dark' as const, label: t('profile.themeOptions.dark'), icon: Moon },
      { value: 'auto' as const, label: t('profile.themeOptions.auto'), icon: Monitor },
    ]

    if (loading) {
      return (
        <div
          className={cn(
            'rounded-2xl border p-6',
            isDarkMode ? 'border-gray-800 bg-gray-900/40' : 'border-gray-100 bg-white shadow-sm',
          )}
        >
          <SettingsSkeleton isDarkMode={isDarkMode} />
        </div>
      )
    }

    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className={cn(
          'rounded-xl border overflow-hidden relative transition-all duration-300',
          isDarkMode ? 'border-gray-800 bg-black' : 'border-gray-200 bg-white shadow-sm',
        )}
      >
        <div className="p-3 space-y-3">
          <motion.div variants={itemVariants} className="flex items-center justify-between">
            <h4
              className={cn(
                'text-sm font-semibold tracking-tight',
                isDarkMode ? 'text-white' : 'text-gray-900',
              )}
            >
              {t('profile.settings')}
            </h4>
          </motion.div>

          <motion.div variants={itemVariants} className="space-y-2">
            <div className="grid grid-cols-3 gap-2">
              {themeOptions.map((option) => {
                const Icon = option.icon
                const isActive = theme === option.value

                return (
                  <button
                    key={option.value}
                    onClick={() => setTheme(option.value)}
                    className={cn(
                      'group relative flex flex-col items-center justify-center gap-1.5 py-2 px-2 rounded-lg border transition-all duration-300',
                      isActive
                        ? isDarkMode
                          ? 'bg-gray-800 border-gray-700 text-white shadow-md shadow-black/50'
                          : 'bg-black border-black text-white shadow-md shadow-gray-200'
                        : isDarkMode
                          ? 'bg-gray-900/50 border-gray-800 text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                          : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-900',
                    )}
                  >
                    <Icon
                      className={cn(
                        'w-3.5 h-3.5 transition-transform duration-300 group-hover:scale-110',
                        isActive && 'scale-110',
                      )}
                      strokeWidth={isActive ? 2.5 : 2}
                    />
                    <span className="text-[10px] font-medium">{option.label}</span>
                    {isActive && (
                      <motion.div
                        layoutId="activeThemeCheck"
                        className={cn(
                          'absolute top-1.5 right-1.5 w-1 h-1 rounded-full',
                          isDarkMode ? 'bg-blue-400' : 'bg-green-400',
                        )}
                      />
                    )}
                  </button>
                )
              })}
            </div>
          </motion.div>

          <motion.div variants={itemVariants}>
            <div className="relative group">
              <div
                className={cn(
                  'absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none transition-colors duration-200',
                  isDarkMode
                    ? 'text-gray-400 group-hover:text-gray-200'
                    : 'text-gray-400 group-hover:text-gray-600',
                )}
              >
                <Globe className="w-3.5 h-3.5" />
              </div>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as typeof language)}
                className={cn(
                  'w-full appearance-none pl-8 pr-8 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer outline-none',
                  isDarkMode
                    ? 'bg-gray-900/50 border border-gray-800 text-gray-200 hover:bg-gray-800 hover:border-gray-700 focus:ring-1 focus:ring-gray-700'
                    : 'bg-white border border-gray-200 text-gray-900 hover:border-gray-300 hover:bg-gray-50 focus:ring-1 focus:ring-black/5',
                )}
              >
                {languageOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <div
                className={cn(
                  'absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none transition-colors duration-200',
                  isDarkMode
                    ? 'text-gray-600 group-hover:text-gray-400'
                    : 'text-gray-400 group-hover:text-gray-600',
                )}
              >
                <ChevronsUpDown className="w-3.5 h-3.5" />
              </div>
            </div>
          </motion.div>

          <ShortcutSettings isDarkMode={isDarkMode} variants={itemVariants} />
        </div>
      </motion.div>
    )
  },
)

AppearanceSettings.displayName = 'AppearanceSettings'

export default AppearanceSettings
