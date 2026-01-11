import React from 'react'
import { motion } from 'framer-motion'
import { useI18n } from '../../../contexts/I18nContext'
import { Button } from '../../ui/button'
import { Play, MessageSquare, FileText, ArrowRight, ArrowLeft } from 'lucide-react'

interface OnboardingStepProps {
  onNext: () => void
  onPrevious: () => void
  onSkip: () => void
}

export const WorkflowStep: React.FC<OnboardingStepProps> = ({ onNext, onPrevious, onSkip }) => {
  const { t } = useI18n()

  const steps = [
    {
      icon: <Play className="w-5 h-5" />,
      title: t('onboarding.workflow.1.title') || 'Join a Meeting',
      desc: t('onboarding.workflow.1.desc') || 'Open Google Meet, Zoom, or Teams.',
    },
    {
      icon: <FileText className="w-5 h-5" />,
      title: t('onboarding.workflow.2.title') || 'Start Transcription',
      desc: t('onboarding.workflow.2.desc') || 'Click "Start" in Bready to capture audio.',
    },
    {
      icon: <MessageSquare className="w-5 h-5" />,
      title: t('onboarding.workflow.3.title') || 'Get Insights',
      desc: t('onboarding.workflow.3.desc') || 'See real-time hints and answers.',
    },
  ]

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  }

  const item = {
    hidden: { x: -20, opacity: 0 },
    show: { x: 0, opacity: 1 },
  }

  return (
    <div className="flex flex-col h-full w-full max-w-2xl mx-auto px-6 py-4">
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-center mb-8"
      >
        <h2 className="text-3xl font-bold mb-2 text-[var(--bready-text)]">
          {t('onboarding.workflow.title') || 'How It Works'}
        </h2>
        <p className="text-[var(--bready-text-muted)]">
          {t('onboarding.workflow.subtitle') || 'Three simple steps to mastery.'}
        </p>
      </motion.div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="flex flex-col gap-6 mb-8 relative"
      >
        {/* Connecting line */}
        <div className="absolute left-6 top-4 bottom-4 w-0.5 bg-[var(--bready-border)] -z-10" />

        {steps.map((step, idx) => (
          <motion.div key={idx} variants={item} className="flex items-center gap-6">
            <div className="relative flex items-center justify-center w-12 h-12 rounded-full bg-[var(--bready-surface)] border border-[var(--bready-border)] z-10 shadow-sm text-[var(--bready-text)]">
              {step.icon}
            </div>
            <div className="flex-1 p-4 rounded-xl border border-[var(--bready-border)] bg-[var(--bready-surface)]/50">
              <h3 className="font-semibold text-[var(--bready-text)]">{step.title}</h3>
              <p className="text-sm text-[var(--bready-text-muted)]">{step.desc}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
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
