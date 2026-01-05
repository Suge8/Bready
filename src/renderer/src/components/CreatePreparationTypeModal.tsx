import React from "react"
import { Briefcase, ShoppingBag, Users } from "lucide-react"
import { Modal } from "./ui/Modal"
import { useI18n } from "../contexts/I18nContext"

export type PreparationType = "interview" | "sales" | "meeting"

interface CreatePreparationTypeModalProps {
  onClose: () => void
  onSelect: (type: PreparationType) => void
}

const CreatePreparationTypeModal: React.FC<CreatePreparationTypeModalProps> = ({
  onClose,
  onSelect,
}) => {
  const { t } = useI18n()

  const types = [
    {
      id: "interview" as PreparationType,
      title: t("createPrep.types.interview.title"),
      description: t("createPrep.types.interview.description"),
      icon: Briefcase,
    },
    {
      id: "sales" as PreparationType,
      title: t("createPrep.types.sales.title"),
      description: t("createPrep.types.sales.description"),
      icon: ShoppingBag,
    },
    {
      id: "meeting" as PreparationType,
      title: t("createPrep.types.meeting.title"),
      description: t("createPrep.types.meeting.description"),
      icon: Users,
    },
  ]

  return (
    <Modal isOpen onClose={onClose} size="sm" className="p-0">
      <div className="border-b border-[var(--bready-border)] px-6 py-5">
        <h1 className="text-base font-semibold text-[var(--bready-text)]">
          {t("createPrep.title")}
        </h1>
        <p className="mt-1 text-xs text-[var(--bready-text-muted)]">
          {t("createPrep.subtitle")}
        </p>
      </div>

      <div className="space-y-3 px-6 py-5">
        {types.map((type) => (
          <button
            key={type.id}
            onClick={() => onSelect(type.id)}
            className="group flex w-full items-center gap-4 rounded-xl border border-[var(--bready-border)] bg-[var(--bready-surface-2)] p-4 text-left transition-colors hover:bg-[var(--bready-surface-3)]"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--bready-surface)] text-[var(--bready-text)] shadow-sm">
              <type.icon className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--bready-text)]">
                {type.title}
              </h3>
              <p className="mt-0.5 text-xs text-[var(--bready-text-muted)]">
                {type.description}
              </p>
            </div>
          </button>
        ))}
      </div>
    </Modal>
  )
}

export default CreatePreparationTypeModal
