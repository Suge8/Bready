import React, { useState } from 'react'
import { Check, ChevronDown, Loader2 } from 'lucide-react'
import { type Preparation } from '../lib/supabase'
import { useI18n } from '../contexts/I18nContext'
import { Modal } from './ui/Modal'
import { Button } from './ui/button'

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
  isLoading = false,
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

  const handleConfirm = () => {
    onSelect(selectedPreparation, language, purpose)
  }

  const purposes = [
    { value: 'interview', label: t('purposes.interview') },
    { value: 'sales', label: t('purposes.sales') },
    { value: 'meeting', label: t('purposes.meeting') },
  ]

  return (
    <Modal
      isOpen
      onClose={!isLoading ? onClose : () => undefined}
      size="lg"
      className="max-w-xl flex flex-col"
    >
      <div className="mb-6 flex-shrink-0">
        <h2 className="text-xl font-semibold text-[var(--bready-text)]">{t('select.title')}</h2>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="relative">
            <label className="block text-sm font-medium text-[var(--bready-text-muted)] mb-2">
              {t('select.language')}
            </label>
            <button
              onClick={() => setLanguageDropdownOpen(!languageDropdownOpen)}
              className="w-full flex items-center justify-between px-4 py-2 bg-[var(--bready-surface-2)] border border-[var(--bready-border)] rounded-xl text-sm hover:shadow-sm transition-colors cursor-pointer"
            >
              <span className="text-[var(--bready-text)]">
                {languageOptions.find((l) => l.value === language)?.label}
              </span>
              <ChevronDown className="w-4 h-4 text-[var(--bready-text-muted)]" />
            </button>

            {languageDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--bready-surface)] border border-[var(--bready-border)] rounded-xl shadow-lg z-10">
                {languageOptions.map((lang) => (
                  <button
                    key={lang.value}
                    onClick={() => {
                      setLanguage(lang.value)
                      setLanguageDropdownOpen(false)
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-[var(--bready-surface-2)] transition-colors first:rounded-t-lg last:rounded-b-lg cursor-pointer ${
                      language === lang.value
                        ? 'bg-[var(--bready-surface-2)] text-[var(--bready-text)] font-medium'
                        : 'text-[var(--bready-text-muted)]'
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            <label className="block text-sm font-medium text-[var(--bready-text-muted)] mb-2">
              {t('select.purpose')}
            </label>
            <button
              onClick={() => setPurposeDropdownOpen(!purposeDropdownOpen)}
              className="w-full flex items-center justify-between px-4 py-2 bg-[var(--bready-surface-2)] border border-[var(--bready-border)] rounded-xl text-sm hover:shadow-sm transition-colors cursor-pointer"
            >
              <span className="text-[var(--bready-text)]">
                {purposes.find((p) => p.value === purpose)?.label}
              </span>
              <ChevronDown className="w-4 h-4 text-[var(--bready-text-muted)]" />
            </button>

            {purposeDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--bready-surface)] border border-[var(--bready-border)] rounded-xl shadow-lg z-10">
                {purposes.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => {
                      setPurpose(p.value)
                      setPurposeDropdownOpen(false)
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-[var(--bready-surface-2)] transition-colors first:rounded-t-lg last:rounded-b-lg cursor-pointer ${
                      purpose === p.value
                        ? 'bg-[var(--bready-surface-2)] text-[var(--bready-text)] font-medium'
                        : 'text-[var(--bready-text-muted)]'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {preparations.length === 0 ? (
          <div className="text-center py-8 text-[var(--bready-text-muted)]">
            <p>{t('select.empty')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {preparations.map((preparation) => (
              <div
                key={preparation.id}
                onClick={() => setSelectedPreparation(preparation)}
                className={`p-4 rounded-xl cursor-pointer transition-all duration-200 ${
                  selectedPreparation?.id === preparation.id
                    ? 'bg-[var(--bready-accent)] text-[var(--bready-accent-contrast)] border border-[var(--bready-accent)] shadow-md'
                    : 'bg-[var(--bready-surface-2)] hover:bg-[var(--bready-surface-3)] border border-[var(--bready-border)] hover:shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3
                      className={`font-medium ${
                        selectedPreparation?.id === preparation.id
                          ? 'text-[var(--bready-accent-contrast)]'
                          : 'text-[var(--bready-text)]'
                      }`}
                    >
                      {preparation.name}
                    </h3>
                    <p
                      className={`text-sm mt-1 ${
                        selectedPreparation?.id === preparation.id
                          ? 'text-white/70'
                          : 'text-[var(--bready-text-muted)]'
                      }`}
                    >
                      {preparation.job_description.length > 50
                        ? `${preparation.job_description.substring(0, 50)}...`
                        : preparation.job_description}
                    </p>
                  </div>
                  {selectedPreparation?.id === preparation.id && (
                    <Check className="w-5 h-5 text-[var(--bready-accent-contrast)] ml-3 flex-shrink-0" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-center flex-shrink-0 mt-6">
        <Button onClick={handleConfirm} disabled={isLoading}>
          {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
          {selectedPreparation ? t('select.confirm') : t('select.quickStart')}
        </Button>
      </div>
    </Modal>
  )
}

export default SelectPreparationModal
