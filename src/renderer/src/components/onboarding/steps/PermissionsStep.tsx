import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useI18n } from '../../../contexts/I18nContext'
import { Button } from '../../ui/button'
import {
  Mic,
  Monitor,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react'

interface OnboardingStepProps {
  onNext: () => void
  onPrevious: () => void
  onSkip: () => void
}

export const PermissionsStep: React.FC<OnboardingStepProps> = ({ onNext, onPrevious, onSkip }) => {
  const { t } = useI18n()
  const [micStatus, setMicStatus] = useState<'granted' | 'denied' | 'unknown'>('unknown')
  const [screenStatus, setScreenStatus] = useState<'granted' | 'denied' | 'unknown'>('unknown')
  const [isChecking, setIsChecking] = useState(false)

  const checkPermissions = async () => {
    setIsChecking(true)
    try {
      const mic = await window.bready.checkMicrophonePermission()
      setMicStatus(mic === 'granted' ? 'granted' : 'denied')

      const screen = await window.bready.checkScreenRecordingPermission()
      setScreenStatus(screen === 'granted' ? 'granted' : 'denied')
    } catch (error) {
      console.error('Permission check failed:', error)
    } finally {
      setIsChecking(false)
    }
  }

  useEffect(() => {
    checkPermissions()
    const interval = setInterval(checkPermissions, 2000)
    return () => clearInterval(interval)
  }, [])

  const requestMic = async () => {
    await window.bready.requestMicrophonePermission()
    checkPermissions()
  }

  const openSecuritySettings = () => {
    window.bready.openSystemPreferences('security')
  }

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

  const StatusIcon = ({ status }: { status: string }) => {
    if (status === 'granted') return <CheckCircle className="w-6 h-6 text-green-500" />
    return <AlertCircle className="w-6 h-6 text-amber-500" />
  }

  return (
    <div className="flex flex-col h-full w-full max-w-2xl mx-auto px-6 py-4">
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-center mb-6"
      >
        <h2 className="text-3xl font-bold mb-2 text-[var(--bready-text)]">
          {t('onboarding.permissions.title') || 'Permissions'}
        </h2>
        <p className="text-[var(--bready-text-muted)]">
          {t('onboarding.permissions.subtitle') || 'We need access to help you.'}
        </p>
      </motion.div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="flex flex-col gap-4 mb-6"
      >
        <motion.div
          variants={item}
          className="flex items-center p-4 rounded-xl border border-[var(--bready-border)] bg-[var(--bready-surface)]"
        >
          <div className="p-3 rounded-lg bg-[var(--bready-bg)] border border-[var(--bready-border)] mr-4 text-[var(--bready-text)]">
            <Mic className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-[var(--bready-text)]">
              {t('onboarding.permissions.mic.title') || 'Microphone'}
            </h3>
            <p className="text-sm text-[var(--bready-text-muted)]">
              {t('onboarding.permissions.mic.desc') || 'To hear interview questions.'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <StatusIcon status={micStatus} />
            {micStatus !== 'granted' && (
              <Button variant="outline" size="sm" onClick={requestMic} className="cursor-pointer">
                {t('common.allow') || 'Allow'}
              </Button>
            )}
          </div>
        </motion.div>

        <motion.div
          variants={item}
          className="flex items-center p-4 rounded-xl border border-[var(--bready-border)] bg-[var(--bready-surface)]"
        >
          <div className="p-3 rounded-lg bg-[var(--bready-bg)] border border-[var(--bready-border)] mr-4 text-[var(--bready-text)]">
            <Monitor className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-[var(--bready-text)]">
              {t('onboarding.permissions.screen.title') || 'Screen Recording'}
            </h3>
            <p className="text-sm text-[var(--bready-text-muted)]">
              {t('onboarding.permissions.screen.desc') || 'To see shared content.'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <StatusIcon status={screenStatus} />
            {screenStatus !== 'granted' && (
              <Button
                variant="outline"
                size="sm"
                onClick={openSecuritySettings}
                className="cursor-pointer"
              >
                {t('common.settings') || 'Settings'}
              </Button>
            )}
          </div>
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex justify-center mb-6"
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={checkPermissions}
          disabled={isChecking}
          className="text-[var(--bready-text-muted)] hover:text-[var(--bready-text)] cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isChecking ? 'animate-spin' : ''}`} />
          {t('common.refresh') || 'Refresh Status'}
        </Button>
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
