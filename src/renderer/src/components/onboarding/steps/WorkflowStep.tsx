import React from 'react'
import { motion } from 'framer-motion'
import { useI18n } from '../../../contexts/I18nContext'
import { Button } from '../../ui/button'
import { ClipboardList, Zap, MessageCircle, ArrowRight, ArrowLeft } from 'lucide-react'

interface OnboardingStepProps {
  onNext: () => void
  onPrevious: () => void
  onSkip: () => void
}

export const WorkflowStep: React.FC<OnboardingStepProps> = ({ onNext, onPrevious }) => {
  const { t } = useI18n()

  const steps = [
    {
      icon: <ClipboardList className="w-4 h-4" />,
      title: t('onboarding.workflow.1.title') || '创建准备项',
      desc: t('onboarding.workflow.1.desc') || '填写目标场景与目的，面宝会为你智能分析',
      color: 'text-emerald-500',
    },
    {
      icon: <Zap className="w-4 h-4" />,
      title: t('onboarding.workflow.2.title') || '进入协作模式',
      desc: t('onboarding.workflow.2.desc') || '开启实时协作，面宝随时待命',
      color: 'text-violet-500',
    },
    {
      icon: <MessageCircle className="w-4 h-4" />,
      title: t('onboarding.workflow.3.title') || '开始会议',
      desc: t('onboarding.workflow.3.desc') || '面宝实时给予个性化提示与建议',
      color: 'text-amber-500',
    },
  ]

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.12, delayChildren: 0.1 },
    },
  }

  const item = {
    hidden: { x: -20, opacity: 0 },
    show: {
      x: 0,
      opacity: 1,
      transition: { type: 'spring' as const, stiffness: 300, damping: 25 },
    },
  }

  return (
    <div className="flex flex-col h-full w-full max-w-lg mx-auto px-4">
      <motion.div
        initial={{ y: -15, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300 }}
        className="text-center mb-6"
      >
        <h2 className="text-2xl font-semibold mb-2 text-[var(--bready-text)]">
          {t('onboarding.workflow.title') || 'How It Works'}
        </h2>
        <p className="text-[var(--bready-text-muted)] text-sm">
          {t('onboarding.workflow.subtitle') || 'Three simple steps to mastery.'}
        </p>
      </motion.div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="flex flex-col gap-3 mb-6 relative"
      >
        <div className="absolute left-[22px] top-6 bottom-6 w-px bg-[var(--bready-border)]" />

        {steps.map((step, idx) => (
          <motion.div
            key={idx}
            variants={item}
            whileHover={{ x: 4 }}
            className="flex items-start gap-4 cursor-pointer"
          >
            <div
              className={`relative flex items-center justify-center w-11 h-11 rounded-full bg-[var(--bready-surface)] border border-[var(--bready-border)] z-10 ${step.color}`}
            >
              {step.icon}
              <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[var(--bready-bg)] border border-[var(--bready-border)] flex items-center justify-center text-[10px] font-medium text-[var(--bready-text-muted)]">
                {idx + 1}
              </span>
            </div>
            <div className="flex-1 p-3 rounded-xl border border-[var(--bready-border)] bg-[var(--bready-surface)] hover:border-[var(--bready-text-muted)]/30 transition-all">
              <h3 className="font-medium text-sm text-[var(--bready-text)]">{step.title}</h3>
              <p className="text-xs text-[var(--bready-text-muted)] mt-0.5">{step.desc}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-auto flex justify-between items-center"
      >
        <motion.div whileHover={{ x: -3 }} whileTap={{ scale: 0.97 }}>
          <Button
            variant="ghost"
            size="icon"
            onClick={onPrevious}
            className="text-[var(--bready-text-muted)] hover:text-[var(--bready-text)] cursor-pointer !rounded-full"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </motion.div>
        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
          <Button
            onClick={onNext}
            style={{
              backgroundColor: 'var(--bready-accent)',
              color: 'var(--bready-accent-contrast)',
            }}
            className="hover:opacity-90 px-6 rounded-xl cursor-pointer text-sm"
          >
            {t('common.next') || 'Next'} <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        </motion.div>
      </motion.div>
    </div>
  )
}
