import React, { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useI18n } from '../../../contexts/I18nContext'
import { Button } from '../../ui/button'
import {
  Mic,
  MonitorSmartphone,
  Check,
  Circle,
  RefreshCw,
  ArrowRight,
  ArrowLeft,
  Sparkles,
} from 'lucide-react'

interface OnboardingStepProps {
  onNext: () => void
  onPrevious: () => void
  onSkip: () => void
}

export const PermissionsStep: React.FC<OnboardingStepProps> = ({ onNext, onPrevious }) => {
  const { t } = useI18n()
  const [micStatus, setMicStatus] = useState<'granted' | 'denied' | 'unknown'>('unknown')
  const [screenStatus, setScreenStatus] = useState<'granted' | 'denied' | 'unknown'>('unknown')
  const [isChecking, setIsChecking] = useState(false)
  const micAnimatedRef = useRef(false)
  const screenAnimatedRef = useRef(false)

  const allPermissionsGranted = micStatus === 'granted' && screenStatus === 'granted'

  const checkPermissions = async () => {
    setIsChecking(true)
    try {
      const mic = await window.bready.checkMicrophonePermission()
      setMicStatus(mic?.granted ? 'granted' : 'denied')

      const screen = await window.bready.checkScreenRecordingPermission()
      setScreenStatus(screen?.granted ? 'granted' : 'denied')
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
    if (micStatus === 'denied') {
      window.bready.openSystemPreferences('microphone')
    } else {
      await window.bready.requestMicrophonePermission()
      checkPermissions()
    }
  }

  const openScreenSettings = () => {
    window.bready.openSystemPreferences('screen-recording')
  }

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } },
  }

  const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { type: 'spring' as const, stiffness: 300 } },
  }

  const StatusIcon = ({
    status,
    animatedRef,
  }: {
    status: string
    animatedRef: React.MutableRefObject<boolean>
  }) => {
    if (status === 'granted') {
      const shouldAnimate = !animatedRef.current
      if (shouldAnimate) animatedRef.current = true
      return (
        <motion.div
          initial={shouldAnimate ? { scale: 0 } : { scale: 1 }}
          animate={{ scale: 1 }}
          transition={shouldAnimate ? { type: 'spring', stiffness: 400, damping: 15 } : undefined}
          className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center"
        >
          <Check className="w-3 h-3 text-white" />
        </motion.div>
      )
    }
    return <Circle className="w-5 h-5 text-[var(--bready-text-muted)]" />
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
          {t('onboarding.permissions.title') || 'Permissions'}
        </h2>
        <p className="text-[var(--bready-text-muted)] text-sm">
          {t('onboarding.permissions.subtitle') || 'We need access to help you.'}
        </p>
      </motion.div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="flex flex-col gap-3 mb-4"
      >
        <motion.div
          variants={item}
          whileHover={{ x: 4 }}
          className={`flex items-center p-4 rounded-xl border transition-all cursor-pointer ${
            micStatus === 'granted'
              ? 'border-emerald-500/40 bg-emerald-500/5'
              : 'border-[var(--bready-border)] bg-[var(--bready-surface)]'
          }`}
        >
          <div className="p-2.5 rounded-lg bg-[var(--bready-bg)] border border-[var(--bready-border)] mr-4 text-cyan-500">
            <Mic className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-sm text-[var(--bready-text)]">
              {t('onboarding.permissions.mic.title') || 'Microphone'}
            </h3>
            <p className="text-xs text-[var(--bready-text-muted)]">
              {t('onboarding.permissions.mic.desc') || 'To hear interview questions.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatusIcon status={micStatus} animatedRef={micAnimatedRef} />
            {micStatus !== 'granted' && (
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={requestMic}
                  className="cursor-pointer text-xs h-7 px-3"
                >
                  {t('common.allow') || 'Allow'}
                </Button>
              </motion.div>
            )}
          </div>
        </motion.div>

        <motion.div
          variants={item}
          whileHover={{ x: 4 }}
          className={`flex items-center p-4 rounded-xl border transition-all cursor-pointer ${
            screenStatus === 'granted'
              ? 'border-emerald-500/40 bg-emerald-500/5'
              : 'border-[var(--bready-border)] bg-[var(--bready-surface)]'
          }`}
        >
          <div className="p-2.5 rounded-lg bg-[var(--bready-bg)] border border-[var(--bready-border)] mr-4 text-violet-500">
            <MonitorSmartphone className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-sm text-[var(--bready-text)]">
              {t('onboarding.permissions.screen.title') || 'Screen Recording'}
            </h3>
            <p className="text-xs text-[var(--bready-text-muted)]">
              {t('onboarding.permissions.screen.desc') || 'To see shared content.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatusIcon status={screenStatus} animatedRef={screenAnimatedRef} />
            {screenStatus !== 'granted' && (
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openScreenSettings}
                  className="cursor-pointer text-xs h-7 px-3"
                >
                  {t('common.settings') || 'Settings'}
                </Button>
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>

      <AnimatePresence mode="wait">
        {allPermissionsGranted ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center gap-2 py-3"
          >
            <Sparkles className="w-4 h-4 text-emerald-500" />
            <p className="text-emerald-500 font-medium text-sm">
              {t('onboarding.permissions.allSet') || '都设置好啦！'}
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="refresh"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex justify-center py-3"
          >
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Button
                variant="ghost"
                size="sm"
                onClick={checkPermissions}
                disabled={isChecking}
                className="text-[var(--bready-text-muted)] hover:text-[var(--bready-text)] cursor-pointer text-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isChecking ? 'animate-spin' : ''}`} />
                {t('common.refresh') || 'Refresh Status'}
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-auto flex justify-between items-center"
      >
        <motion.div whileHover={{ x: -3 }} whileTap={{ scale: 0.97 }}>
          <Button
            variant="ghost"
            size="icon"
            onClick={onPrevious}
            className="text-[var(--bready-text-muted)] hover:text-[var(--bready-text)] rounded-full cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </motion.div>
        <AnimatePresence>
          {allPermissionsGranted && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
            >
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
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
