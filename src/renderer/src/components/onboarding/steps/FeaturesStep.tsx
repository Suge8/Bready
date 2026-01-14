import React from 'react'
import { motion } from 'framer-motion'
import { useI18n } from '../../../contexts/I18nContext'
import { Button } from '../../ui/button'
import { AudioLines, Sparkles, Shield, ArrowRight, ArrowLeft } from 'lucide-react'

interface OnboardingStepProps {
  onNext: () => void
  onPrevious: () => void
  onSkip: () => void
}

export const FeaturesStep: React.FC<OnboardingStepProps> = ({ onNext, onPrevious }) => {
  const { t } = useI18n()

  const features = [
    {
      icon: <Sparkles className="w-5 h-5" />,
      title: t('onboarding.features.1.title') || 'AI 智能分析',
      desc: t('onboarding.features.1.desc') || '根据任务背景、简历或个人信息，提前为你分析准备',
      color: 'text-violet-500',
    },
    {
      icon: <AudioLines className="w-5 h-5" />,
      title: t('onboarding.features.2.title') || '实时个性化提示',
      desc: t('onboarding.features.2.desc') || '语音转写配合背景信息，给予精准个性化回答',
      color: 'text-amber-500',
    },
    {
      icon: <Shield className="w-5 h-5" />,
      title: t('onboarding.features.3.title') || '隐私安全模式',
      desc: t('onboarding.features.3.desc') || '应用无法被屏幕捕捉，支持自定义显示隐藏快捷键',
      color: 'text-cyan-500',
    },
  ]

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.1 },
    },
  }

  const item = {
    hidden: { y: 20, opacity: 0 },
    show: {
      y: 0,
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
          {t('onboarding.features.title') || 'Powerful Features'}
        </h2>
        <p className="text-[var(--bready-text-muted)] text-sm">
          {t('onboarding.features.subtitle') || 'Everything you need to succeed.'}
        </p>
      </motion.div>

      <motion.div variants={container} initial="hidden" animate="show" className="grid gap-3 mb-6">
        {features.map((feature, idx) => (
          <motion.div
            key={idx}
            variants={item}
            whileHover={{ x: 4 }}
            className="flex items-start p-4 rounded-xl border border-[var(--bready-border)] bg-[var(--bready-surface)] hover:border-[var(--bready-text-muted)]/30 transition-all cursor-pointer"
          >
            <div
              className={`p-2.5 rounded-lg bg-[var(--bready-bg)] border border-[var(--bready-border)] mr-4 ${feature.color}`}
            >
              {feature.icon}
            </div>
            <div>
              <h3 className="font-medium text-sm mb-0.5 text-[var(--bready-text)]">
                {feature.title}
              </h3>
              <p className="text-xs text-[var(--bready-text-muted)] leading-relaxed">
                {feature.desc}
              </p>
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
