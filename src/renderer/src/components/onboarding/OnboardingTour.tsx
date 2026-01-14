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
      x: direction > 0 ? 30 : -30,
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 30 : -30,
      opacity: 0,
    }),
  }

  const CurrentComponent = steps[currentStep]

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[var(--bready-bg)]">
      <div
        className="h-8 w-full shrink-0"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      />
      <div className="flex-1 flex items-center justify-center">
        <div className="relative w-full max-w-2xl flex flex-col h-[480px] px-6">
          <motion.div
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 30 }}
            className="flex justify-center z-10 py-3"
          >
            <StepIndicator
              currentStep={currentStep}
              totalSteps={steps.length}
              onStepClick={handleStepClick}
            />
          </motion.div>

          <div className="flex-1 relative">
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
                  opacity: { duration: 0.15 },
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
        </div>
      </div>
    </div>
  )
}
