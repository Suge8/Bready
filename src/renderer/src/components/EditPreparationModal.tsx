import React, { useState, useEffect } from 'react'
import { Upload, Loader2, Check, FileText } from 'lucide-react'
import { Button } from './ui/button'
import { ToastNotification } from './ui/notifications'
import { Modal } from './ui/Modal'
import { Input, Textarea } from './ui/input'
import { preparationService, type Preparation } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useI18n } from '../contexts/I18nContext'

interface EditPreparationModalProps {
  preparation?: Preparation
  preparations: Preparation[]
  setPreparations: React.Dispatch<React.SetStateAction<Preparation[]>>
  onReloadData: () => Promise<void>
  onClose: () => void
  onSaved: (savedPreparation: Preparation) => void
}

const EditPreparationModal: React.FC<EditPreparationModalProps> = ({
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
  const [jobDescription, setJobDescription] = useState('')
  const [resume, setResume] = useState('')
  const [analysisResult, setAnalysisResult] = useState<any>(null)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [toast, setToast] = useState<{
    message: string
    type: 'success' | 'error' | 'info' | 'warning'
  } | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isExtracting, setIsExtracting] = useState(false)

  useEffect(() => {
    if (isEditing && preparation) {
      setName(preparation.name)
      setJobDescription(preparation.job_description)
      setResume(preparation.resume || '')
      setAnalysisResult(preparation.analysis || null)
    }
  }, [isEditing, preparation])

  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploadedFile(file)
    const fileType = file.type
    const fileName = file.name.toLowerCase()

    if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        setResume(content)
        showToast(t('prepEditor.toasts.uploadSuccess'), 'success')
      }
      reader.onerror = () => {
        showToast(t('prepEditor.toasts.uploadFailed'), 'error')
      }
      reader.readAsText(file)
      return
    }

    if (
      fileType === 'application/pdf' ||
      fileType.startsWith('image/') ||
      fileName.endsWith('.pdf') ||
      fileName.endsWith('.png') ||
      fileName.endsWith('.jpg') ||
      fileName.endsWith('.jpeg')
    ) {
      setIsExtracting(true)
      try {
        const reader = new FileReader()
        reader.onload = async (e) => {
          const base64Data = e.target?.result as string

          if (window.bready && window.bready.extractFileContent) {
            const result = await window.bready.extractFileContent({
              fileName: file.name,
              fileType: fileType,
              base64Data: base64Data.split(',')[1],
            })

            if (result.success && result.content) {
              setResume(result.content)
              showToast(t('prepEditor.toasts.extractSuccess'), 'success')
            } else {
              showToast(result.error || t('prepEditor.toasts.extractFailed'), 'error')
            }
          } else {
            await new Promise((resolve) => setTimeout(resolve, 2000))
            setResume(`[从 ${file.name} 提取的内容]\n\n这是模拟提取的简历内容...`)
            showToast(t('prepEditor.toasts.extractSuccess'), 'success')
          }
          setIsExtracting(false)
        }
        reader.onerror = () => {
          showToast(t('prepEditor.toasts.uploadFailed'), 'error')
          setIsExtracting(false)
        }
        reader.readAsDataURL(file)
      } catch (error) {
        console.error('File extraction failed:', error)
        showToast(t('prepEditor.toasts.extractFailed'), 'error')
        setIsExtracting(false)
      }
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      setResume(content)
      showToast(t('prepEditor.toasts.uploadSuccess'), 'success')
    }
    reader.onerror = () => {
      showToast(t('prepEditor.toasts.uploadFailed'), 'error')
    }
    reader.readAsText(file)
  }

  const handleSave = async () => {
    if (!name.trim() || !jobDescription.trim()) {
      showToast(t('prepEditor.toasts.requiredFields'), 'error')
      return
    }

    setIsSaving(true)
    try {
      const preparationData = {
        name: name.trim(),
        job_description: jobDescription.trim(),
        resume: resume.trim() || undefined,
        analysis: analysisResult,
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
      onSaved(savedPreparation)
      showToast(t('prepEditor.toasts.updateSuccess'), 'success')
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
          {isEditing ? t('prepEditor.titleEdit') : t('prepEditor.titleCreate')}
        </h1>

        <Button
          onClick={handleSave}
          disabled={isSaving || !name.trim() || !jobDescription.trim()}
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
              {t('prepEditor.name.title')}
              <span className="text-red-500 ml-0.5">*</span>
            </label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('prepEditor.name.placeholder')}
              maxLength={50}
            />
            <div className="mt-1 text-xs text-[var(--bready-text-muted)]">{name.length}/50</div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col">
              <label className="block text-sm font-medium mb-2 text-[var(--bready-text)]">
                {t('prepEditor.job.title')}
                <span className="text-red-500 ml-0.5">*</span>
              </label>
              <Textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder={t('prepEditor.job.placeholder')}
                className="flex-1 min-h-[280px] resize-none"
              />
            </div>

            <div className="flex flex-col">
              <label className="block text-sm font-medium mb-2 text-[var(--bready-text)]">
                {t('prepEditor.resume.title')}
              </label>
              <Textarea
                value={resume}
                onChange={(e) => setResume(e.target.value)}
                placeholder={t('prepEditor.resume.pastePlaceholder')}
                className="flex-1 min-h-[280px] resize-none"
                disabled={isExtracting}
              />
            </div>
          </div>

          <label className="cursor-pointer block">
            <div
              className={`border-2 border-dashed border-[var(--bready-border)] hover:border-black/20 dark:hover:border-white/20 bg-[var(--bready-surface-2)] rounded-xl p-6 transition-all ${
                isExtracting ? 'opacity-50 pointer-events-none' : ''
              }`}
            >
              <div className="flex flex-col items-center justify-center gap-3">
                <div className="w-12 h-12 bg-[var(--bready-surface)] rounded-xl flex items-center justify-center">
                  {isExtracting ? (
                    <Loader2 className="w-6 h-6 text-[var(--bready-text-muted)] animate-spin" />
                  ) : (
                    <Upload className="w-6 h-6 text-[var(--bready-text-muted)]" />
                  )}
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-[var(--bready-text)]">
                    {isExtracting
                      ? t('prepEditor.resume.extracting')
                      : t('prepEditor.resume.upload.title')}
                  </p>
                  <p className="text-xs mt-1 text-[var(--bready-text-muted)]">
                    {t('prepEditor.resume.upload.hint')}
                  </p>
                </div>
                {uploadedFile && !isExtracting && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bready-surface-3)]">
                    <FileText className="w-4 h-4 text-[var(--bready-text-muted)]" />
                    <span className="text-sm text-[var(--bready-text)]">{uploadedFile.name}</span>
                    <Check className="w-4 h-4 text-emerald-500" />
                  </div>
                )}
              </div>
            </div>
            <input
              type="file"
              accept=".txt,.pdf,.doc,.docx,.png,.jpg,.jpeg,image/*"
              onChange={handleFileUpload}
              className="hidden"
              disabled={isExtracting}
            />
          </label>
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

export default EditPreparationModal
