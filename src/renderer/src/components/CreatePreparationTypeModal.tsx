import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Briefcase, ShoppingBag, Users } from 'lucide-react'
import { useTheme } from './ui/theme-provider'
import { useI18n } from '../contexts/I18nContext'

export type PreparationType = 'interview' | 'sales' | 'meeting'

interface CreatePreparationTypeModalProps {
  onClose: () => void
  onSelect: (type: PreparationType) => void
}

const CreatePreparationTypeModal: React.FC<CreatePreparationTypeModalProps> = ({
  onClose,
  onSelect
}) => {
  const { theme } = useTheme()
  const { t } = useI18n()
  const isDarkMode = theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  const types = [
    {
      id: 'interview' as PreparationType,
      title: t('createPrep.types.interview.title'),
      description: t('createPrep.types.interview.description'),
      icon: Briefcase,
      gradient: isDarkMode ? 'from-blue-500/20 to-blue-600/10' : 'from-blue-50 to-blue-100',
      iconBg: isDarkMode ? 'bg-blue-500/20' : 'bg-blue-100',
      iconColor: isDarkMode ? 'text-blue-400' : 'text-blue-600'
    },
    {
      id: 'sales' as PreparationType,
      title: t('createPrep.types.sales.title'),
      description: t('createPrep.types.sales.description'),
      icon: ShoppingBag,
      gradient: isDarkMode ? 'from-emerald-500/20 to-emerald-600/10' : 'from-emerald-50 to-emerald-100',
      iconBg: isDarkMode ? 'bg-emerald-500/20' : 'bg-emerald-100',
      iconColor: isDarkMode ? 'text-emerald-400' : 'text-emerald-600'
    },
    {
      id: 'meeting' as PreparationType,
      title: t('createPrep.types.meeting.title'),
      description: t('createPrep.types.meeting.description'),
      icon: Users,
      gradient: isDarkMode ? 'from-violet-500/20 to-violet-600/10' : 'from-violet-50 to-violet-100',
      iconBg: isDarkMode ? 'bg-violet-500/20' : 'bg-violet-100',
      iconColor: isDarkMode ? 'text-violet-400' : 'text-violet-600'
    }
  ]

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4 cursor-pointer"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className={`relative w-[420px] ${isDarkMode ? 'bg-zinc-900' : 'bg-white'} rounded-2xl shadow-2xl overflow-hidden cursor-auto`}
          onClick={(e) => e.stopPropagation()}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          {/* Header */}
          <div className="px-5 py-4">
            <h1 className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {t('createPrep.title')}
            </h1>
            <p className={`text-xs mt-1 ${isDarkMode ? 'text-zinc-500' : 'text-gray-500'}`}>
              {t('createPrep.subtitle')}
            </p>
          </div>

          {/* Type Options */}
          <div className="px-5 pb-5 space-y-3">
            {types.map((type, index) => (
              <motion.button
                key={type.id}
                onClick={() => onSelect(type.id)}
                className={`w-full p-4 rounded-xl bg-gradient-to-br ${type.gradient} flex items-center gap-4 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <div className={`w-12 h-12 rounded-xl ${type.iconBg} flex items-center justify-center flex-shrink-0`}>
                  <type.icon className={`w-6 h-6 ${type.iconColor}`} />
                </div>
                <div className="text-left">
                  <h3 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {type.title}
                  </h3>
                  <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-zinc-400' : 'text-gray-500'}`}>
                    {type.description}
                  </p>
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default CreatePreparationTypeModal
