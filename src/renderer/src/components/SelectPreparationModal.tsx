import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Check,
  ChevronDown,
  Loader2,
  Briefcase,
  Globe,
  Target,
  Sparkles,
  FileText,
  ArrowRight,
  Rocket,
  Zap,
  Star,
  Award,
  TrendingUp,
  Users,
} from 'lucide-react'
import { type Preparation } from '../lib/supabase'
import { useI18n } from '../contexts/I18nContext'
import { Modal } from './ui/Modal'

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
    { value: 'interview', label: t('purposes.interview'), icon: Target },
    { value: 'sales', label: t('purposes.sales'), icon: Sparkles },
    { value: 'meeting', label: t('purposes.meeting'), icon: Globe },
  ]

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05, delayChildren: 0.1 },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3 },
    },
  }

  const cardStyles = [
    { bg: 'bg-blue-500/10 backdrop-blur-sm', icon: Rocket, iconColor: 'text-blue-500' },
    { bg: 'bg-emerald-500/10 backdrop-blur-sm', icon: Zap, iconColor: 'text-emerald-500' },
    { bg: 'bg-violet-500/10 backdrop-blur-sm', icon: Star, iconColor: 'text-violet-500' },
    { bg: 'bg-amber-500/10 backdrop-blur-sm', icon: Award, iconColor: 'text-amber-500' },
    { bg: 'bg-rose-500/10 backdrop-blur-sm', icon: TrendingUp, iconColor: 'text-rose-500' },
    { bg: 'bg-cyan-500/10 backdrop-blur-sm', icon: Users, iconColor: 'text-cyan-500' },
  ]

  const getCardStyle = (index: number) => cardStyles[index % cardStyles.length]

  const [hasAnimated, setHasAnimated] = useState(false)

  React.useEffect(() => {
    const timer = setTimeout(() => setHasAnimated(true), 1500)
    return () => clearTimeout(timer)
  }, [])

  const ScoreCircle = ({ score, delay }: { score: number; delay: number }) => {
    const radius = 14
    const circumference = 2 * Math.PI * radius
    const strokeDashoffset = circumference - (score / 100) * circumference

    return (
      <div className="relative w-8 h-8 flex items-center justify-center">
        <svg className="w-8 h-8 -rotate-90" viewBox="0 0 36 36">
          <circle
            cx="18"
            cy="18"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            className="opacity-20"
          />
          <motion.circle
            cx="18"
            cy="18"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            initial={hasAnimated ? { strokeDashoffset } : { strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={hasAnimated ? { duration: 0 } : { duration: 0.8, delay, ease: 'easeOut' }}
            style={{ strokeDasharray: circumference }}
          />
        </svg>
        <span className="absolute text-[10px] font-bold">{score}</span>
      </div>
    )
  }

  return (
    <Modal
      isOpen
      onClose={!isLoading ? onClose : () => undefined}
      size="lg"
      className="max-w-3xl flex flex-col overflow-hidden bg-[var(--bready-surface)]"
    >
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative p-2"
      >
        <motion.div variants={itemVariants} className="mb-4 text-center relative">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="w-10 h-10 mx-auto mb-3 bg-black dark:bg-white rounded-lg flex items-center justify-center text-white dark:text-black"
          >
            <Briefcase className="w-5 h-5" />
          </motion.div>
          <h2 className="text-xl font-bold text-[var(--bready-text)] mb-1 tracking-tight">
            {t('select.title')}
          </h2>
          <p className="text-xs text-[var(--bready-text-muted)]">选择准备项开始协作</p>
        </motion.div>

        <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3 mb-4">
          <div className="relative">
            <label className="block text-xs font-semibold text-[var(--bready-text-muted)] mb-2 uppercase tracking-wider">
              {t('select.language')}
            </label>
            <button
              onClick={() => {
                setLanguageDropdownOpen(!languageDropdownOpen)
                setPurposeDropdownOpen(false)
              }}
              className="w-full flex items-center justify-between px-3 py-2.5 bg-[var(--bready-surface-2)] border border-[var(--bready-border)] rounded-lg text-sm hover:border-[var(--bready-text-muted)] transition-all cursor-pointer group outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
            >
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-[var(--bready-text)]" />
                <span className="text-[var(--bready-text)] font-medium">
                  {languageOptions.find((l) => l.value === language)?.label}
                </span>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-[var(--bready-text-muted)] transition-transform duration-200 ${languageDropdownOpen ? 'rotate-180' : ''}`}
              />
            </button>

            <AnimatePresence>
              {languageDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setLanguageDropdownOpen(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: -5, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -5, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 right-0 mt-1 bg-[var(--bready-surface)] border border-[var(--bready-border)] rounded-lg shadow-lg z-20 overflow-hidden py-1"
                  >
                    {languageOptions.map((lang) => (
                      <button
                        key={lang.value}
                        onClick={() => {
                          setLanguage(lang.value)
                          setLanguageDropdownOpen(false)
                        }}
                        className={`w-full text-left px-3 py-2 text-sm transition-colors cursor-pointer flex items-center justify-between ${
                          language === lang.value
                            ? 'bg-black/5 dark:bg-white/10 text-[var(--bready-text)]'
                            : 'text-[var(--bready-text-muted)] hover:bg-[var(--bready-surface-2)]'
                        }`}
                      >
                        <span className="font-medium">{lang.label}</span>
                        {language === lang.value && (
                          <Check className="w-4 h-4 text-[var(--bready-text)]" />
                        )}
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          <div className="relative">
            <label className="block text-xs font-semibold text-[var(--bready-text-muted)] mb-2 uppercase tracking-wider">
              {t('select.purpose')}
            </label>
            <button
              onClick={() => {
                setPurposeDropdownOpen(!purposeDropdownOpen)
                setLanguageDropdownOpen(false)
              }}
              className="w-full flex items-center justify-between px-3 py-2.5 bg-[var(--bready-surface-2)] border border-[var(--bready-border)] rounded-lg text-sm hover:border-[var(--bready-text-muted)] transition-all cursor-pointer group outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
            >
              <div className="flex items-center gap-2">
                {(() => {
                  const PurposeIcon = purposes.find((p) => p.value === purpose)?.icon || Target
                  return <PurposeIcon className="w-4 h-4 text-[var(--bready-text)]" />
                })()}
                <span className="text-[var(--bready-text)] font-medium">
                  {purposes.find((p) => p.value === purpose)?.label}
                </span>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-[var(--bready-text-muted)] transition-transform duration-200 ${purposeDropdownOpen ? 'rotate-180' : ''}`}
              />
            </button>

            <AnimatePresence>
              {purposeDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setPurposeDropdownOpen(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: -5, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -5, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 right-0 mt-1 bg-[var(--bready-surface)] border border-[var(--bready-border)] rounded-lg shadow-lg z-20 overflow-hidden py-1"
                  >
                    {purposes.map((p) => {
                      const Icon = p.icon
                      return (
                        <button
                          key={p.value}
                          onClick={() => {
                            setPurpose(p.value)
                            setPurposeDropdownOpen(false)
                          }}
                          className={`w-full text-left px-3 py-2 text-sm transition-colors cursor-pointer flex items-center justify-between ${
                            purpose === p.value
                              ? 'bg-black/5 dark:bg-white/10 text-[var(--bready-text)]'
                              : 'text-[var(--bready-text-muted)] hover:bg-[var(--bready-surface-2)]'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4" />
                            <span className="font-medium">{p.label}</span>
                          </div>
                          {purpose === p.value && (
                            <Check className="w-4 h-4 text-[var(--bready-text)]" />
                          )}
                        </button>
                      )
                    })}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="mb-4">
          {preparations.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12 bg-[var(--bready-surface-2)]/50 rounded-xl border border-dashed border-[var(--bready-border)]"
            >
              <div className="w-10 h-10 mx-auto mb-3 bg-[var(--bready-surface-3)] rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-[var(--bready-text-muted)]" />
              </div>
              <p className="text-[var(--bready-text-muted)] text-sm">{t('select.empty')}</p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-4 gap-2 max-h-[220px] overflow-y-auto overflow-x-hidden scrollbar-thin p-1">
              {preparations.map((preparation, index) => {
                const style = getCardStyle(index)
                const CardIcon = style.icon
                const isSelected = selectedPreparation?.id === preparation.id
                const matchScore = preparation.analysis?.matchScore || 0
                return (
                  <motion.div
                    key={preparation.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.03 }}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedPreparation(isSelected ? null : preparation)}
                    className={`p-3 rounded-xl cursor-pointer relative ${
                      isSelected
                        ? 'bg-emerald-500 text-white shadow-lg'
                        : `${style.bg} text-[var(--bready-text)] hover:shadow-md`
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div
                        className={`w-7 h-7 rounded-lg ${isSelected ? 'bg-white/20' : 'bg-black/5 dark:bg-white/10'} flex items-center justify-center`}
                      >
                        <CardIcon
                          className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : style.iconColor}`}
                        />
                      </div>
                      <ScoreCircle score={matchScore} delay={index * 0.08} />
                    </div>
                    <h3
                      className={`font-medium text-xs leading-tight line-clamp-1 mb-0.5 ${isSelected ? 'text-white' : ''}`}
                    >
                      {preparation.name}
                    </h3>
                    <p
                      className={`text-[10px] line-clamp-1 ${isSelected ? 'text-white/70' : 'text-[var(--bready-text-muted)]'}`}
                    >
                      {preparation.job_description.substring(0, 30)}...
                    </p>
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-white flex items-center justify-center"
                      >
                        <Check className="w-2.5 h-2.5 text-emerald-500" />
                      </motion.div>
                    )}
                  </motion.div>
                )
              })}
            </div>
          )}
        </motion.div>

        <motion.div variants={itemVariants} className="flex justify-center pt-4 pb-2">
          <AnimatePresence mode="wait">
            {selectedPreparation ? (
              <motion.button
                key="confirm-btn"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.08 }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleConfirm}
                disabled={isLoading}
                className="relative px-6 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-emerald-500 text-white shadow-lg shadow-emerald-500/25"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowRight className="w-4 h-4" />
                )}
                <span>{t('select.confirm')}</span>
              </motion.button>
            ) : (
              <motion.button
                key="quick-btn"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.08 }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleConfirm}
                disabled={isLoading}
                className="relative px-6 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-[var(--bready-surface-2)] text-[var(--bready-text-muted)]"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowRight className="w-4 h-4" />
                )}
                <span>{t('select.quickStart')}</span>
              </motion.button>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </Modal>
  )
}

export default SelectPreparationModal
