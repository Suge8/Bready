import React from 'react'
import { motion } from 'framer-motion'
import { Calendar, Trash2, FileText, Code, Users, Briefcase } from 'lucide-react'
import { Modal } from './ui/Modal'
import { type Preparation } from '../lib/supabase'
import { useI18n } from '../contexts/I18nContext'
import { useTheme } from './ui/theme-provider'

interface AllPreparationsModalProps {
  preparations: Preparation[]
  onClose: () => void
  onDelete: (id: string) => void
  onView: (preparation: Preparation) => void
}

const getPreparationIcon = (index: number) => {
  const icons = [FileText, Code, Users, Briefcase]
  return icons[index % icons.length]
}

const getScoreBadgeColor = (score: number, isDark: boolean) => {
  if (score >= 80)
    return isDark
      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
      : 'bg-emerald-100 text-emerald-700 border-emerald-200'
  if (score >= 60)
    return isDark
      ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
      : 'bg-amber-100 text-amber-700 border-amber-200'
  if (score >= 40)
    return isDark
      ? 'bg-orange-500/20 text-orange-400 border-orange-500/30'
      : 'bg-orange-100 text-orange-700 border-orange-200'
  return isDark
    ? 'bg-red-500/20 text-red-400 border-red-500/30'
    : 'bg-red-100 text-red-700 border-red-200'
}

const AllPreparationsModal: React.FC<AllPreparationsModalProps> = ({
  preparations,
  onClose,
  onDelete,
  onView,
}) => {
  const { t, locale } = useI18n()
  const { resolvedTheme } = useTheme()
  const isDarkMode = resolvedTheme === 'dark'

  const handleViewPreparation = (preparation: Preparation) => {
    onClose()
    onView(preparation)
  }

  const handleDeletePreparation = (id: string) => {
    if (confirm(t('alerts.deletePreparation'))) {
      onDelete(id)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString(locale, { month: 'short', day: 'numeric' })
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      size="lg"
      className="p-0 max-h-[70vh] flex flex-col overflow-hidden"
    >
      <div
        className={`flex items-center justify-between px-5 py-4 border-b ${isDarkMode ? 'border-zinc-800' : 'border-gray-100'}`}
      >
        <div className="flex items-center gap-3">
          <span
            className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
          >
            {t('prepList.title')}
          </span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${isDarkMode ? 'bg-zinc-800 text-zinc-400' : 'bg-gray-100 text-gray-500'}`}
          >
            {preparations.length}
          </span>
        </div>
      </div>

      <div className="flex-1 min-h-0 p-4 overflow-y-auto scrollbar-thin">
        {preparations.length === 0 ? (
          <div className={`text-center py-12 ${isDarkMode ? 'text-zinc-500' : 'text-gray-400'}`}>
            {t('prepList.empty')}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {preparations.map((preparation, index) => {
              const IconComponent = getPreparationIcon(index)
              return (
                <motion.div
                  key={preparation.id}
                  className={`group relative p-3 rounded-xl border cursor-pointer transition-all duration-200 ${
                    isDarkMode
                      ? 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/50'
                      : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm'
                  }`}
                  onClick={() => handleViewPreparation(preparation)}
                  whileHover={{ y: -2 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="flex items-start gap-2.5">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isDarkMode ? 'bg-zinc-800' : 'bg-gray-50'
                      }`}
                    >
                      <IconComponent
                        className={`w-4 h-4 ${isDarkMode ? 'text-zinc-400' : 'text-gray-500'}`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4
                        className={`text-sm font-medium leading-tight line-clamp-1 ${isDarkMode ? 'text-zinc-100' : 'text-gray-800'}`}
                      >
                        {preparation.name}
                      </h4>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span
                          className={`text-[10px] flex items-center ${isDarkMode ? 'text-zinc-500' : 'text-gray-400'}`}
                        >
                          <Calendar className="w-3 h-3 mr-1" />
                          {formatDate(preparation.updated_at)}
                        </span>
                        {preparation.analysis?.matchScore !== undefined && (
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded border ${getScoreBadgeColor(preparation.analysis.matchScore, isDarkMode)}`}
                          >
                            {preparation.analysis.matchScore}
                          </span>
                        )}
                        {preparation.is_analyzing && (
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1 ${isDarkMode ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}
                          >
                            <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                            分析中
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <motion.button
                    className={`absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 transition-opacity ${
                      isDarkMode
                        ? 'bg-zinc-800 hover:bg-red-900/50 text-zinc-400 hover:text-red-400'
                        : 'bg-gray-100 hover:bg-red-50 text-gray-400 hover:text-red-500'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeletePreparation(preparation.id)
                    }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </motion.button>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </Modal>
  )
}

export default AllPreparationsModal
