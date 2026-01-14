import React from 'react'
import { motion, type Variants } from 'framer-motion'
import { Briefcase, ShoppingBag, Users } from 'lucide-react'
import { Modal } from './ui/Modal'
import { useI18n } from '../contexts/I18nContext'

export type PreparationType = 'interview' | 'sales' | 'meeting'

interface CreatePreparationTypeModalProps {
  onClose: () => void
  onSelect: (type: PreparationType) => void
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
  exit: {
    opacity: 0,
    transition: { staggerChildren: 0.05, staggerDirection: -1 },
  },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 12, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.3 },
  },
  exit: {
    opacity: 0,
    y: -8,
    scale: 0.95,
    transition: { duration: 0.2 },
  },
}

const CreatePreparationTypeModal: React.FC<CreatePreparationTypeModalProps> = ({
  onClose,
  onSelect,
}) => {
  const { t } = useI18n()

  const types = [
    {
      id: 'interview' as PreparationType,
      title: t('createPrep.types.interview.title'),
      description: t('createPrep.types.interview.description'),
      icon: Briefcase,
    },
    {
      id: 'sales' as PreparationType,
      title: t('createPrep.types.sales.title'),
      description: t('createPrep.types.sales.description'),
      icon: ShoppingBag,
    },
    {
      id: 'meeting' as PreparationType,
      title: t('createPrep.types.meeting.title'),
      description: t('createPrep.types.meeting.description'),
      icon: Users,
    },
  ]

  return (
    <Modal isOpen onClose={onClose} size="sm" className="p-0 flex flex-col">
      <motion.div variants={containerVariants} initial="hidden" animate="visible" exit="exit">
        <motion.div
          variants={itemVariants}
          className="border-b border-[var(--bready-border)] px-6 py-5 flex-shrink-0"
        >
          <h1 className="text-base font-semibold text-[var(--bready-text)]">
            {t('createPrep.title')}
          </h1>
          <p className="mt-1 text-xs text-[var(--bready-text-muted)]">{t('createPrep.subtitle')}</p>
        </motion.div>

        <div className="flex-1 min-h-0 space-y-3 overflow-y-auto px-6 py-5 scrollbar-thin">
          {types.map((type, index) => (
            <motion.button
              key={type.id}
              variants={itemVariants}
              custom={index}
              onClick={() => onSelect(type.id)}
              whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
              whileTap={{ scale: 0.98 }}
              className="group flex w-full items-center gap-4 rounded-xl border border-[var(--bready-border)] bg-[var(--bready-surface-2)] p-4 text-left transition-colors hover:bg-[var(--bready-surface-3)] cursor-pointer"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--bready-surface)] text-[var(--bready-text)] shadow-sm">
                <type.icon className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[var(--bready-text)]">{type.title}</h3>
                <p className="mt-0.5 text-xs text-[var(--bready-text-muted)]">{type.description}</p>
              </div>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </Modal>
  )
}

export default CreatePreparationTypeModal
