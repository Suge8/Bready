import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useI18n } from '../../../contexts/I18nContext'
import { Button } from '../../ui/button'
import { Sparkles, ArrowLeft, Check } from 'lucide-react'

interface OnboardingStepProps {
  onNext: () => void
  onPrevious: () => void
  onSkip: () => void
}

const CONFETTI_COLORS = ['#f59e0b', '#8b5cf6', '#ec4899', '#10b981', '#3b82f6', '#ef4444']

type Direction = 'top'

const ConfettiPiece = ({
  delay,
  startX,
  startY,
  endX,
  endY,
  color,
}: {
  delay: number
  startX: number
  startY: number
  endX: number
  endY: number
  color: string
}) => (
  <motion.div
    initial={{ x: startX, y: startY, opacity: 1, rotate: 0, scale: 1 }}
    animate={{
      x: endX,
      y: endY,
      opacity: [1, 1, 0.8, 0],
      rotate: Math.random() * 1080 - 540,
      scale: [1, 0.9, 0.6],
    }}
    transition={{ duration: 2.8 + Math.random() * 0.8, delay, ease: 'easeOut' }}
    style={{ backgroundColor: color }}
    className="absolute w-2 h-3 rounded-sm"
  />
)

const generateConfetti = (_direction: Direction, count: number) => {
  return Array.from({ length: count }, () => {
    const color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)]
    const spread = (Math.random() - 0.5) * 600

    return {
      startX: spread,
      startY: -500,
      endX: spread * 0.6,
      endY: 600 + Math.random() * 200,
      color,
      delay: 0,
    }
  })
}

export const GetStartedStep: React.FC<OnboardingStepProps> = ({ onNext, onPrevious }) => {
  const { t } = useI18n()

  const confettiPieces = useMemo(() => {
    return generateConfetti('top', 54).map((piece, i) => ({ ...piece, id: `${i}` }))
  }, [])

  const handleStart = () => {
    onNext()
  }

  return (
    <div className="flex flex-col items-center text-center px-4 max-w-md mx-auto h-full justify-center relative overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {confettiPieces.map((piece) => (
          <ConfettiPiece
            key={piece.id}
            delay={piece.delay}
            startX={piece.startX}
            startY={piece.startY}
            endX={piece.endX}
            endY={piece.endY}
            color={piece.color}
          />
        ))}
      </div>

      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="mb-6 relative z-10"
      >
        <motion.div
          animate={{ y: [0, -15, 0], scale: [1, 1.08, 1] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          className=""
        >
          <Sparkles className="w-16 h-16 text-amber-500" />
        </motion.div>
      </motion.div>

      <motion.h1
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15, duration: 0.4 }}
        className="text-3xl font-semibold mb-3 text-[var(--bready-text)] z-10"
      >
        {t('onboarding.finish.title') || "You're All Set!"}
      </motion.h1>

      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.25, duration: 0.4 }}
        className="text-[var(--bready-text-muted)] mb-8 leading-relaxed text-sm z-10"
      >
        {t('onboarding.finish.desc') || 'Bready is ready to help you shine in your next interview.'}
      </motion.p>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.35, duration: 0.4 }}
        className="relative w-full flex items-center justify-center z-10"
      >
        <motion.div whileHover={{ x: -3 }} whileTap={{ scale: 0.97 }} className="absolute left-0">
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
            onClick={handleStart}
            style={{
              backgroundColor: 'var(--bready-accent)',
              color: 'var(--bready-accent-contrast)',
            }}
            className="hover:opacity-90 px-8 py-5 text-base rounded-xl transition-all cursor-pointer"
          >
            {t('onboarding.finish.cta') || 'Start Using Bready'} <Check className="ml-2 h-4 w-4" />
          </Button>
        </motion.div>
      </motion.div>
    </div>
  )
}
