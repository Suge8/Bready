import React from 'react'
import { motion } from 'framer-motion'
import { useI18n } from '../../../contexts/I18nContext'
import { Button } from '../../ui/button'
import logoImage from '../../../assets/logo.png'
import { ArrowRight, Sparkles } from 'lucide-react'

interface OnboardingStepProps {
  onNext: () => void
  onPrevious: () => void
  onSkip: () => void
}

export const WelcomeStep: React.FC<OnboardingStepProps> = ({ onNext }) => {
  const { t } = useI18n()

  return (
    <div className="flex flex-col items-center text-center px-4 max-w-md mx-auto h-full justify-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, type: 'spring', stiffness: 300 }}
        className="mb-8 relative"
      >
        <motion.div
          animate={{ y: [0, -12, 0], scale: [1, 1.03, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          <img src={logoImage} alt="Bready Logo" className="w-28 h-28 object-contain" />
        </motion.div>
        <motion.div
          animate={{ y: [0, -12, 0], scale: [1, 1.03, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-3 -right-3"
        >
          <Sparkles className="w-7 h-7 text-amber-400" />
        </motion.div>
      </motion.div>

      <motion.h1
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15, duration: 0.4 }}
        className="text-4xl font-semibold mb-4 text-[var(--bready-text)]"
      >
        {t('onboarding.welcome.title') || 'Welcome to Bready'}
      </motion.h1>

      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.25, duration: 0.4 }}
        className="text-[var(--bready-text-muted)] mb-10 leading-relaxed text-base"
      >
        {t('onboarding.welcome.description') ||
          'Your AI-powered interview copilot. Capture audio, get real-time insights, and ace your interviews with confidence.'}
      </motion.p>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.35, duration: 0.4 }}
      >
        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
          <Button
            onClick={onNext}
            style={{
              backgroundColor: 'var(--bready-accent)',
              color: 'var(--bready-accent-contrast)',
            }}
            className="hover:opacity-90 px-8 py-5 text-base rounded-xl transition-all cursor-pointer"
          >
            {t('onboarding.start') || 'Get Started'} <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </motion.div>
      </motion.div>
    </div>
  )
}
