import React, { useState, useEffect } from "react"
import { Loader2, Check } from "lucide-react"
import { Button } from "./ui/button"
import { ToastNotification } from "./ui/notifications"
import { Modal } from "./ui/Modal"
import { Input, Textarea } from "./ui/input"
import { preparationService, type Preparation } from "../lib/supabase"
import { useAuth } from "../contexts/AuthContext"
import { useI18n } from "../contexts/I18nContext"

interface EditMeetingPreparationModalProps {
  preparation?: Preparation
  preparations: Preparation[]
  setPreparations: React.Dispatch<React.SetStateAction<Preparation[]>>
  onReloadData: () => Promise<void>
  onClose: () => void
  onSaved: (savedPreparation: Preparation) => void
}

const EditMeetingPreparationModal: React.FC<EditMeetingPreparationModalProps> = ({
  preparation,
  preparations,
  setPreparations,
  onReloadData,
  onClose,
  onSaved,
}) => {
  const { user } = useAuth()
  const { t } = useI18n()
  const isEditing = !!preparation

  const [name, setName] = useState("")
  const [meetingTopic, setMeetingTopic] = useState("")
  const [participants, setParticipants] = useState("")
  const [agenda, setAgenda] = useState("")
  const [keyPoints, setKeyPoints] = useState("")
  const [toast, setToast] = useState<{
    message: string
    type: "success" | "error" | "info" | "warning"
  } | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (isEditing && preparation) {
      setName(preparation.name)
      try {
        const data = JSON.parse(preparation.job_description)
        setMeetingTopic(data.meetingTopic || "")
        setParticipants(data.participants || "")
        setAgenda(data.agenda || "")
        setKeyPoints(data.keyPoints || "")
      } catch {
        setMeetingTopic(preparation.job_description)
      }
    }
  }, [isEditing, preparation])

  const showToast = (
    message: string,
    type: "success" | "error" | "info" | "warning"
  ) => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleSave = async () => {
    if (!name.trim() || !meetingTopic.trim()) {
      showToast(t("prepEditor.toasts.requiredFields"), "error")
      return
    }

    setIsSaving(true)
    try {
      const preparationData = {
        name: name.trim(),
        job_description: JSON.stringify({
          type: "meeting",
          meetingTopic: meetingTopic.trim(),
          participants: participants.trim(),
          agenda: agenda.trim(),
          keyPoints: keyPoints.trim(),
        }),
        resume: undefined,
        user_id: user?.id || "",
      }

      let savedPreparation: Preparation
      if (isEditing && preparation) {
        savedPreparation = await preparationService.update(
          preparation.id,
          preparationData
        )
        const updatedPreparations = preparations.map((p) =>
          p.id === preparation.id ? savedPreparation : p
        )
        setPreparations(updatedPreparations)
      } else {
        savedPreparation = await preparationService.create(preparationData)
        setPreparations([...preparations, savedPreparation])
      }

      await onReloadData()
      showToast(t("prepEditor.toasts.updateSuccess"), "success")
      onSaved(savedPreparation)
    } catch (error) {
      console.error("Save failed:", error)
      showToast(t("prepEditor.toasts.saveFailed"), "error")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      size="xl"
      className="w-[85vw] max-w-[900px] max-h-[80vh] overflow-hidden p-0"
    >
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--bready-border)]">
        <h1 className="text-base font-semibold text-[var(--bready-text)]">
          {isEditing ? t("meetingPrep.titleEdit") : t("meetingPrep.titleCreate")}
        </h1>

        <Button
          onClick={handleSave}
          disabled={isSaving || !name.trim() || !meetingTopic.trim()}
          className="h-8 px-4 text-sm"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              {t("prepEditor.actions.saving")}
            </>
          ) : (
            <>
              <Check className="w-4 h-4 mr-1.5" />
              {t("prepEditor.actions.save")}
            </>
          )}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6 scrollbar-thin">
        <div className="space-y-4 pt-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-[var(--bready-text)]">
              {t("meetingPrep.name.title")}
              <span className="text-red-500 ml-0.5">*</span>
            </label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("meetingPrep.name.placeholder")}
              maxLength={50}
            />
            <div className="mt-1 text-xs text-[var(--bready-text-muted)]">
              {name.length}/50
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col">
              <label className="block text-sm font-medium mb-2 text-[var(--bready-text)]">
                {t("meetingPrep.meetingTopic.title")}
                <span className="text-red-500 ml-0.5">*</span>
              </label>
              <Textarea
                value={meetingTopic}
                onChange={(e) => setMeetingTopic(e.target.value)}
                placeholder={t("meetingPrep.meetingTopic.placeholder")}
                className="flex-1 min-h-[150px] resize-none"
              />
            </div>

            <div className="flex flex-col">
              <label className="block text-sm font-medium mb-2 text-[var(--bready-text)]">
                {t("meetingPrep.participants.title")}
              </label>
              <Textarea
                value={participants}
                onChange={(e) => setParticipants(e.target.value)}
                placeholder={t("meetingPrep.participants.placeholder")}
                className="flex-1 min-h-[150px] resize-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col">
              <label className="block text-sm font-medium mb-2 text-[var(--bready-text)]">
                {t("meetingPrep.agenda.title")}
              </label>
              <Textarea
                value={agenda}
                onChange={(e) => setAgenda(e.target.value)}
                placeholder={t("meetingPrep.agenda.placeholder")}
                className="flex-1 min-h-[150px] resize-none"
              />
            </div>

            <div className="flex flex-col">
              <label className="block text-sm font-medium mb-2 text-[var(--bready-text)]">
                {t("meetingPrep.keyPoints.title")}
              </label>
              <Textarea
                value={keyPoints}
                onChange={(e) => setKeyPoints(e.target.value)}
                placeholder={t("meetingPrep.keyPoints.placeholder")}
                className="flex-1 min-h-[150px] resize-none"
              />
            </div>
          </div>
        </div>
      </div>

      {toast && (
        <ToastNotification
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </Modal>
  )
}

export default EditMeetingPreparationModal
