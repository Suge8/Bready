import React from 'react'
import { motion } from 'framer-motion'
import { useI18n } from '../../../contexts/I18nContext'
import { Button } from '../../ui/button'
import { Rocket, ArrowLeft, Check } from 'lucide-react'

interface OnboardingStepProps {
  onNext: () => void
  onPrevious: () => void
  onSkip: () => void
}

export const GetStartedStep: React.FC<OnboardingStepProps> = ({ onNext, onPrevious }) => {
  const { t } = useI18n()

  const handleStart = () => {
    onNext()
  }

  return (
    <div className="flex flex-col items-center text-center p-6 max-w-lg mx-auto h-full justify-center">
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        className="mb-8 p-6 rounded-full bg-[var(--bready-surface)] border border-[var(--bready-border)] shadow-xl"
      >
        <Rocket className="w-16 h-16 text-[var(--bready-text)]" />
      </motion.div>

      <motion.h1
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="text-4xl font-bold mb-4 tracking-tight text-[var(--bready-text)]"
      >
        {t('onboarding.finish.title') || "You're All Set!"}
      </motion.h1>

      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="text-lg text-[var(--bready-text-muted)] mb-10 leading-relaxed"
      >
        {t('onboarding.finish.desc') || 'Bready is ready to help you shine in your next interview.'}
      </motion.p>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="flex flex-col gap-4 w-full items-center"
      >
        <Button
          onClick={handleStart}
          className="bg-[var(--bready-text)] text-[var(--bready-bg)] hover:bg-[var(--bready-text)]/90 px-10 py-6 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all w-full sm:w-auto cursor-pointer"
        >
          {t('onboarding.finish.cta') || 'Start Using Bready'} <Check className="ml-2 h-5 w-5" />
        </Button>

        <Button
          variant="ghost"
          onClick={onPrevious}
          className="text-[var(--bready-text-muted)] hover:text-[var(--bready-text)] cursor-pointer"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> {t('common.back') || 'Back'}
        </Button>
      </motion.div>
    </div>
  )
}
