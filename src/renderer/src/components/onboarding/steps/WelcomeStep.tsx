import React from 'react'
import { motion } from 'framer-motion'
import { useI18n } from '../../../contexts/I18nContext'
import { Button } from '../../ui/button'
import logoImage from '../../../assets/logo.png'
import { ArrowRight } from 'lucide-react'

interface OnboardingStepProps {
  onNext: () => void
  onPrevious: () => void
  onSkip: () => void
}

export const WelcomeStep: React.FC<OnboardingStepProps> = ({ onNext, onSkip }) => {
  const { t } = useI18n()

  return (
    <div className="flex flex-col items-center text-center p-6 max-w-lg mx-auto">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="mb-8"
      >
        <img
          src={logoImage}
          alt="Bready Logo"
          className="w-32 h-32 object-contain drop-shadow-2xl"
        />
      </motion.div>

      <motion.h1
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="text-4xl font-bold mb-4 tracking-tight text-[var(--bready-text)]"
      >
        {t('onboarding.welcome.title') || 'Welcome to Bready'}
      </motion.h1>

      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="text-lg text-[var(--bready-text-muted)] mb-10 leading-relaxed"
      >
        {t('onboarding.welcome.description') ||
          'Your AI-powered interview copilot. Capture audio, get real-time insights, and ace your interviews with confidence.'}
      </motion.p>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="flex gap-4 w-full justify-center"
      >
        <Button
          variant="ghost"
          onClick={onSkip}
          className="text-[var(--bready-text-muted)] hover:text-[var(--bready-text)] cursor-pointer"
        >
          {t('onboarding.skip') || 'Skip'}
        </Button>
        <Button
          onClick={onNext}
          className="bg-[var(--bready-text)] text-[var(--bready-bg)] hover:bg-[var(--bready-text)]/90 px-8 py-6 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all cursor-pointer"
        >
          {t('onboarding.start') || 'Get Started'} <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </motion.div>
    </div>
  )
}
