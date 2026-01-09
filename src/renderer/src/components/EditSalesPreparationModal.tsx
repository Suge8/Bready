import React, { useState, useEffect } from 'react'
import { Loader2, Check } from 'lucide-react'
import { Button } from './ui/button'
import { ToastNotification } from './ui/notifications'
import { Modal } from './ui/Modal'
import { Input, Textarea } from './ui/input'
import { preparationService, type Preparation } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useI18n } from '../contexts/I18nContext'

interface EditSalesPreparationModalProps {
  preparation?: Preparation
  preparations: Preparation[]
  setPreparations: React.Dispatch<React.SetStateAction<Preparation[]>>
  onReloadData: () => Promise<void>
  onClose: () => void
  onSaved: (savedPreparation: Preparation) => void
}

const EditSalesPreparationModal: React.FC<EditSalesPreparationModalProps> = ({
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

  const [name, setName] = useState('')
  const [clientInfo, setClientInfo] = useState('')
  const [productInfo, setProductInfo] = useState('')
  const [salesGoal, setSalesGoal] = useState('')
  const [toast, setToast] = useState<{
    message: string
    type: 'success' | 'error' | 'info' | 'warning'
  } | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (isEditing && preparation) {
      setName(preparation.name)
      try {
        const data = JSON.parse(preparation.job_description)
        setClientInfo(data.clientInfo || '')
        setProductInfo(data.productInfo || '')
        setSalesGoal(data.salesGoal || '')
      } catch {
        setClientInfo(preparation.job_description)
      }
    }
  }, [isEditing, preparation])

  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleSave = async () => {
    if (!name.trim() || !clientInfo.trim()) {
      showToast(t('prepEditor.toasts.requiredFields'), 'error')
      return
    }

    setIsSaving(true)
    try {
      const preparationData = {
        name: name.trim(),
        job_description: JSON.stringify({
          type: 'sales',
          clientInfo: clientInfo.trim(),
          productInfo: productInfo.trim(),
          salesGoal: salesGoal.trim(),
        }),
        resume: undefined,
        user_id: user?.id || '',
      }

      let savedPreparation: Preparation
      if (isEditing && preparation) {
        savedPreparation = await preparationService.update(preparation.id, preparationData)
        const updatedPreparations = preparations.map((p) =>
          p.id === preparation.id ? savedPreparation : p,
        )
        setPreparations(updatedPreparations)
      } else {
        savedPreparation = await preparationService.create(preparationData)
        setPreparations([...preparations, savedPreparation])
      }

      await onReloadData()
      showToast(t('prepEditor.toasts.updateSuccess'), 'success')
      onSaved(savedPreparation)
    } catch (error) {
      console.error('Save failed:', error)
      showToast(t('prepEditor.toasts.saveFailed'), 'error')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      size="xl"
      className="w-[85vw] max-w-[900px] max-h-[80vh] p-0 flex flex-col"
    >
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--bready-border)]">
        <h1 className="text-base font-semibold text-[var(--bready-text)]">
          {isEditing ? t('salesPrep.titleEdit') : t('salesPrep.titleCreate')}
        </h1>

        <Button
          onClick={handleSave}
          disabled={isSaving || !name.trim() || !clientInfo.trim()}
          className="h-8 px-4 text-sm"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              {t('prepEditor.actions.saving')}
            </>
          ) : (
            <>
              <Check className="w-4 h-4 mr-1.5" />
              {t('prepEditor.actions.save')}
            </>
          )}
        </Button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-6 scrollbar-thin">
        <div className="space-y-4 pt-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-[var(--bready-text)]">
              {t('salesPrep.name.title')}
              <span className="text-red-500 ml-0.5">*</span>
            </label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('salesPrep.name.placeholder')}
              maxLength={50}
            />
            <div className="mt-1 text-xs text-[var(--bready-text-muted)]">{name.length}/50</div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col">
              <label className="block text-sm font-medium mb-2 text-[var(--bready-text)]">
                {t('salesPrep.clientInfo.title')}
                <span className="text-red-500 ml-0.5">*</span>
              </label>
              <Textarea
                value={clientInfo}
                onChange={(e) => setClientInfo(e.target.value)}
                placeholder={t('salesPrep.clientInfo.placeholder')}
                className="flex-1 min-h-[200px] resize-none"
              />
            </div>

            <div className="flex flex-col">
              <label className="block text-sm font-medium mb-2 text-[var(--bready-text)]">
                {t('salesPrep.productInfo.title')}
              </label>
              <Textarea
                value={productInfo}
                onChange={(e) => setProductInfo(e.target.value)}
                placeholder={t('salesPrep.productInfo.placeholder')}
                className="flex-1 min-h-[200px] resize-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-[var(--bready-text)]">
              {t('salesPrep.salesGoal.title')}
            </label>
            <Textarea
              value={salesGoal}
              onChange={(e) => setSalesGoal(e.target.value)}
              placeholder={t('salesPrep.salesGoal.placeholder')}
              className="min-h-[100px] resize-none"
            />
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

export default EditSalesPreparationModal
