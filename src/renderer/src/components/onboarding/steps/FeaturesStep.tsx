import React from 'react'
import { motion } from 'framer-motion'
import { useI18n } from '../../../contexts/I18nContext'
import { Button } from '../../ui/button'
import { Mic, Sparkles, Zap, ArrowRight, ArrowLeft } from 'lucide-react'

interface OnboardingStepProps {
  onNext: () => void
  onPrevious: () => void
  onSkip: () => void
}

export const FeaturesStep: React.FC<OnboardingStepProps> = ({ onNext, onPrevious, onSkip }) => {
  const { t } = useI18n()

  const features = [
    {
      icon: <Mic className="w-6 h-6" />,
      title: t('onboarding.features.1.title') || 'Real-time Transcription',
      desc:
        t('onboarding.features.1.desc') ||
        'Instantly converts speech to text during your interviews.',
    },
    {
      icon: <Sparkles className="w-6 h-6" />,
      title: t('onboarding.features.2.title') || 'AI-Powered Hints',
      desc:
        t('onboarding.features.2.desc') ||
        'Get smart suggestions and answers to interview questions on the fly.',
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: t('onboarding.features.3.title') || 'Seamless Integration',
      desc:
        t('onboarding.features.3.desc') ||
        'Works with any meeting platform directly from your desktop.',
    },
  ]

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 },
  }

  return (
    <div className="flex flex-col h-full w-full max-w-2xl mx-auto px-6 py-4">
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-center mb-8"
      >
        <h2 className="text-3xl font-bold mb-2 text-[var(--bready-text)]">
          {t('onboarding.features.title') || 'Powerful Features'}
        </h2>
        <p className="text-[var(--bready-text-muted)]">
          {t('onboarding.features.subtitle') || 'Everything you need to succeed.'}
        </p>
      </motion.div>

      <motion.div variants={container} initial="hidden" animate="show" className="grid gap-4 mb-8">
        {features.map((feature, idx) => (
          <motion.div
            key={idx}
            variants={item}
            className="flex items-start p-4 rounded-xl border border-[var(--bready-border)] bg-[var(--bready-surface)] hover:border-[var(--bready-text-muted)] transition-colors"
          >
            <div className="p-3 rounded-lg bg-[var(--bready-bg)] border border-[var(--bready-border)] mr-4 text-[var(--bready-text)]">
              {feature.icon}
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-1 text-[var(--bready-text)]">
                {feature.title}
              </h3>
              <p className="text-sm text-[var(--bready-text-muted)] leading-relaxed">
                {feature.desc}
              </p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-auto flex justify-between items-center pt-4"
      >
        <Button
          variant="ghost"
          onClick={onPrevious}
          className="text-[var(--bready-text-muted)] hover:text-[var(--bready-text)] cursor-pointer"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> {t('common.back') || 'Back'}
        </Button>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            onClick={onSkip}
            className="text-[var(--bready-text-muted)] hover:text-[var(--bready-text)] cursor-pointer"
          >
            {t('onboarding.skip') || 'Skip'}
          </Button>
          <Button
            onClick={onNext}
            className="bg-[var(--bready-text)] text-[var(--bready-bg)] hover:bg-[var(--bready-text)]/90 px-6 rounded-xl cursor-pointer"
          >
            {t('common.next') || 'Next'} <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
