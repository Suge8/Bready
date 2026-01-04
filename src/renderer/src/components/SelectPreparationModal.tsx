import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, ChevronDown, Loader2 } from 'lucide-react'
import { type Preparation } from '../lib/supabase'
import { useI18n } from '../contexts/I18nContext'

interface SelectPreparationModalProps {
  preparations: Preparation[]
  onClose: () => void
  onSelect: (preparation: Preparation | null, language: string, purpose: string) => void
  isLoading?: boolean
}

const SelectPreparationModal: React.FC<SelectPreparationModalProps> = ({
  preparations,
  onClose,
  onSelect,
  isLoading = false
}) => {
  const { t, languageOptions } = useI18n()
  const [selectedPreparation, setSelectedPreparation] = useState<Preparation | null>(null)
  const [language, setLanguage] = useState(() => {
    const stored = localStorage.getItem('bready-selected-language')
    if (stored === 'zh-CN') return 'cmn-CN'
    return stored || 'cmn-CN'
  })
  const [purpose, setPurpose] = useState('interview')
  const [languageDropdownOpen, setLanguageDropdownOpen] = useState(false)
  const [purposeDropdownOpen, setPurposeDropdownOpen] = useState(false)

  const handleSelectPreparation = (preparation: Preparation) => {
    setSelectedPreparation(preparation)
  }

  const handleConfirm = () => {
    onSelect(selectedPreparation, language, purpose)
  }

  const purposes = [
    { value: 'interview', label: t('purposes.interview') },
    { value: 'sales', label: t('purposes.sales') },
    { value: 'meeting', label: t('purposes.meeting') }
  ]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-50 cursor-pointer"
      onClick={!isLoading ? onClose : undefined}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        transition={{ type: "spring", duration: 0.3, bounce: 0.2 }}
        className="bg-[var(--bready-surface)] rounded-2xl w-full max-w-xl p-6 shadow-2xl border border-[var(--bready-border)] cursor-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-[var(--bready-text)]">{t('select.title')}</h2>
        </div>

        {/* 语言和目的设置 */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* 语言设置 */}
          <div className="relative">
            <label className="block text-sm font-medium text-[var(--bready-text-muted)] mb-2">
              {t('select.language')}
            </label>
            <button
              onClick={() => setLanguageDropdownOpen(!languageDropdownOpen)}
              className="w-full flex items-center justify-between px-4 py-2 bg-[var(--bready-surface-2)] border border-[var(--bready-border)] rounded-xl text-sm hover:shadow-sm transition-colors cursor-pointer"
            >
              <span className="text-[var(--bready-text)]">{languageOptions.find(l => l.value === language)?.label}</span>
              <ChevronDown className="w-4 h-4 text-[var(--bready-text-muted)]" />
            </button>

            {languageDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--bready-surface)] border border-[var(--bready-border)] rounded-xl shadow-lg z-10">
                {languageOptions.map(lang => (
                  <button
                    key={lang.value}
                    onClick={() => {
                      setLanguage(lang.value)
                      setLanguageDropdownOpen(false)
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/10 transition-colors first:rounded-t-lg last:rounded-b-lg cursor-pointer ${language === lang.value ? 'bg-black/10 dark:bg-white/15 text-[var(--bready-text)] font-medium' : 'text-[var(--bready-text-muted)]'}`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 目的设置 */}
          <div className="relative">
            <label className="block text-sm font-medium text-[var(--bready-text-muted)] mb-2">
              {t('select.purpose')}
            </label>
            <button
              onClick={() => setPurposeDropdownOpen(!purposeDropdownOpen)}
              className="w-full flex items-center justify-between px-4 py-2 bg-[var(--bready-surface-2)] border border-[var(--bready-border)] rounded-xl text-sm hover:shadow-sm transition-colors cursor-pointer"
            >
              <span className="text-[var(--bready-text)]">{purposes.find(p => p.value === purpose)?.label}</span>
              <ChevronDown className="w-4 h-4 text-[var(--bready-text-muted)]" />
            </button>

            {purposeDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--bready-surface)] border border-[var(--bready-border)] rounded-xl shadow-lg z-10">
                {purposes.map(p => (
                  <button
                    key={p.value}
                    onClick={() => {
                      setPurpose(p.value)
                      setPurposeDropdownOpen(false)
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/10 transition-colors first:rounded-t-lg last:rounded-b-lg cursor-pointer ${purpose === p.value ? 'bg-black/10 dark:bg-white/15 text-[var(--bready-text)] font-medium' : 'text-[var(--bready-text-muted)]'}`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 准备项列表 */}
        <div className="max-h-60 overflow-y-auto mb-6">
          {preparations.length === 0 ? (
            <div className="text-center py-8 text-[var(--bready-text-muted)]">
              <p>{t('select.empty')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {preparations.map(preparation => (
                <div
                  key={preparation.id}
                  onClick={() => handleSelectPreparation(preparation)}
                  className={`p-4 rounded-xl cursor-pointer transition-all duration-200 ${selectedPreparation?.id === preparation.id
                    ? 'bg-[var(--bready-accent)] text-[var(--bready-accent-contrast)] border border-[var(--bready-accent)] shadow-md'
                    : 'bg-[var(--bready-surface-2)] hover:bg-[var(--bready-surface-3)] border border-[var(--bready-border)] hover:shadow-sm'
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className={`font-medium ${selectedPreparation?.id === preparation.id ? 'text-[var(--bready-accent-contrast)]' : 'text-[var(--bready-text)]'}`}>
                        {preparation.name}
                      </h3>
                      <p className={`text-sm mt-1 ${selectedPreparation?.id === preparation.id ? 'text-white/70' : 'text-[var(--bready-text-muted)]'}`}>
                        {preparation.job_description.length > 50
                          ? `${preparation.job_description.substring(0, 50)}...`
                          : preparation.job_description
                        }
                      </p>
                    </div>
                    {selectedPreparation?.id === preparation.id && (
                      <Check className="w-5 h-5 text-white ml-3 flex-shrink-0" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 操作按钮 - 居中显示 */}
        <div className="flex justify-center">
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 cursor-pointer flex items-center gap-2 bg-white text-black dark:bg-white dark:text-black shadow-md hover:shadow-lg ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {selectedPreparation ? t('select.confirm') : t('select.quickStart')}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default SelectPreparationModal
