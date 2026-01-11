import React from 'react'
import { motion } from 'framer-motion'

interface StepIndicatorProps {
  currentStep: number
  totalSteps: number
  onStepClick: (step: number) => void
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({
  currentStep,
  totalSteps,
  onStepClick,
}) => {
  return (
    <div className="flex items-center justify-center gap-3 py-4">
      {Array.from({ length: totalSteps }).map((_, index) => {
        const isActive = index === currentStep
        const isCompleted = index < currentStep

        return (
          <motion.button
            key={index}
            onClick={() => onStepClick(index)}
            className={`
              relative h-2 rounded-full transition-colors duration-300
              ${isActive ? 'w-8 bg-[var(--bready-text)]' : 'w-2 bg-[var(--bready-border)]'}
              ${isCompleted ? 'bg-[var(--bready-text-muted)]' : ''}
              hover:bg-[var(--bready-text-muted)] cursor-pointer
              focus:outline-none
            `}
            initial={false}
            animate={{
              width: isActive ? 32 : 8,
              backgroundColor: isActive
                ? 'var(--bready-text)'
                : isCompleted
                  ? 'var(--bready-text-muted)'
                  : 'var(--bready-border)',
            }}
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.9 }}
            aria-label={`Go to step ${index + 1}`}
          />
        )
      })}
    </div>
  )
}
