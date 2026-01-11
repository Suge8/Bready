import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { StepIndicator } from './StepIndicator'
import { WelcomeStep } from './steps/WelcomeStep'
import { FeaturesStep } from './steps/FeaturesStep'
import { WorkflowStep } from './steps/WorkflowStep'
import { PermissionsStep } from './steps/PermissionsStep'
import { GetStartedStep } from './steps/GetStartedStep'

interface OnboardingTourProps {
  onComplete: () => void
}

export const OnboardingTour: React.FC<OnboardingTourProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0)
  const [direction, setDirection] = useState(0)

  const steps = [WelcomeStep, FeaturesStep, WorkflowStep, PermissionsStep, GetStartedStep]

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setDirection(1)
      setCurrentStep((prev) => prev + 1)
    } else {
      onComplete()
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setDirection(-1)
      setCurrentStep((prev) => prev - 1)
    }
  }

  const handleSkip = () => {
    onComplete()
  }

  const handleStepClick = (stepIndex: number) => {
    if (stepIndex > currentStep) {
      setDirection(1)
      setCurrentStep(stepIndex)
    } else if (stepIndex < currentStep) {
      setDirection(-1)
      setCurrentStep(stepIndex)
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') handleNext()
      if (e.key === 'ArrowLeft') handlePrevious()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentStep])

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 50 : -50,
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 50 : -50,
      opacity: 0,
    }),
  }

  const CurrentComponent = steps[currentStep]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[var(--bready-bg)] opacity-95"></div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-4xl bg-[var(--bready-bg)] rounded-2xl border border-[var(--bready-border)] shadow-2xl overflow-hidden flex flex-col h-[600px] max-h-[90vh]"
      >
        <div className="absolute top-0 left-0 right-0 flex justify-center z-10 pt-6">
          <StepIndicator
            currentStep={currentStep}
            totalSteps={steps.length}
            onStepClick={handleStepClick}
          />
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden pt-16 pb-6 relative">
          <AnimatePresence initial={false} custom={direction} mode="wait">
            <motion.div
              key={currentStep}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: 'spring', stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 },
              }}
              className="h-full w-full"
            >
              <CurrentComponent
                onNext={handleNext}
                onPrevious={handlePrevious}
                onSkip={handleSkip}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}
