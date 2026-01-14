import React from 'react'
import { motion } from 'framer-motion'
import { DoorOpen } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { useI18n } from '../../contexts/I18nContext'

interface ExitConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
}

export const ExitConfirmModal: React.FC<ExitConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  const { t } = useI18n()

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" className="max-w-sm">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10, scale: 0.98 }}
        transition={{ duration: 0.2 }}
        className="text-center relative py-2"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          className="w-12 h-12 mx-auto mb-5 bg-black dark:bg-white rounded-xl flex items-center justify-center"
        >
          <DoorOpen className="w-6 h-6 text-white dark:text-black" />
        </motion.div>

        <motion.h3
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.25 }}
          className="text-lg font-semibold text-[var(--bready-text)] mb-2"
        >
          {t('collaboration.exit.title')}
        </motion.h3>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.25 }}
          className="text-sm text-[var(--bready-text-muted)] mb-6 leading-relaxed"
        >
          {t('collaboration.exit.description')}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.25 }}
          className="flex gap-3"
        >
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-[var(--bready-surface-2)] hover:bg-[var(--bready-surface-3)] border border-[var(--bready-border)] rounded-lg text-sm font-medium text-[var(--bready-text)] transition-all duration-200 cursor-pointer"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 rounded-lg text-sm font-medium text-white transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
          >
            <DoorOpen className="w-4 h-4" />
            {t('collaboration.exit.confirm')}
          </button>
        </motion.div>
      </motion.div>
    </Modal>
  )
}
