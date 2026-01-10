import React, { useState, useEffect, useMemo } from 'react'
import { Upload, Loader2, Check, FileText, Briefcase } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 350,
      damping: 25,
      mass: 1,
    },
  },
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

  const hasChanges = useMemo(() => {
    if (!preparation) {
      return name.trim() !== '' || jobDescription.trim() !== '' || resume.trim() !== ''
    }
    return (
      name !== preparation.name ||
      jobDescription !== preparation.job_description ||
      (resume || '') !== (preparation.resume || '')
    )
  }, [name, jobDescription, resume, preparation])

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
      className="w-[75vw] max-w-[750px] h-[75vh] p-0 flex flex-col bg-[var(--bready-surface)] border border-[var(--bready-border)] shadow-2xl overflow-hidden rounded-2xl ring-1 ring-black/5 dark:ring-white/10"
    >
      <div className="flex-shrink-0 relative z-10 grid grid-cols-[100px_1fr_100px] items-center gap-4 px-6 py-4 border-b border-[var(--bready-border)] bg-[var(--bready-surface)]/80 backdrop-blur-md">
        <div />
        <div className="flex flex-col gap-1 w-full max-w-[240px] mx-auto">
          <div className="text-xs text-center text-[var(--bready-text-muted)] font-medium">
            {t('prepEditor.name.title')}
          </div>
          <div className="relative group text-center">
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('prepEditor.name.placeholder')}
              maxLength={50}
              className="h-8 p-0 text-lg font-semibold border-none bg-transparent shadow-none focus-visible:ring-0 placeholder:text-[var(--bready-text-muted)]/50 px-0 rounded-none w-full text-center transition-colors"
            />
            <div className="absolute bottom-0 left-0 w-full h-[1px] bg-[var(--bready-border)] group-hover:bg-[var(--bready-text-muted)] transition-colors origin-center scale-x-50 group-hover:scale-x-100" />
          </div>
        </div>
        <div className="flex items-center justify-end">
          <Button
            onClick={handleSave}
            disabled={isSaving || !name.trim() || !jobDescription.trim()}
            className={`h-8 px-4 text-xs font-medium transition-all duration-300 shadow-md ${
              hasChanges
                ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20 scale-105'
                : 'bg-[var(--bready-text)] text-[var(--bready-surface)] hover:opacity-90 opacity-80'
            }`}
          >
            {isSaving ? (
              <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
            ) : (
              <Check className={`w-3.5 h-3.5 mr-2 ${hasChanges ? 'animate-bounce' : ''}`} />
            )}
            {t('prepEditor.actions.save')}
          </Button>
        </div>
      </div>

      <motion.div
        className="flex-1 grid grid-cols-1 md:grid-cols-2 min-h-0 gap-6 p-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div
          variants={itemVariants}
          className="flex flex-col h-full min-h-0 bg-[var(--bready-surface-2)]/30 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300 group relative overflow-hidden"
        >
          <div className="flex items-center justify-between px-6 py-4 bg-transparent sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Briefcase className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-[var(--bready-text)] tracking-tight">
                {t('prepEditor.job.title')}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]" />
            </div>
          </div>

          <div className="flex-1 relative overflow-hidden">
            <Textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder={t('prepEditor.job.placeholder')}
              className="absolute inset-0 w-full h-full resize-none border-none bg-transparent p-6 pt-0 text-sm leading-7 text-[var(--bready-text)] placeholder:text-[var(--bready-text-muted)]/50 focus-visible:ring-0 selection:bg-amber-500/10 scrollbar-thin scrollbar-thumb-[var(--bready-border)] hover:scrollbar-thumb-[var(--bready-text-muted)]/50"
            />
          </div>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="flex flex-col h-full min-h-0 bg-[var(--bready-surface-2)]/30 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300 group relative overflow-hidden"
        >
          <div className="flex items-center justify-between px-6 py-4 bg-transparent sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <FileText className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-[var(--bready-text)] tracking-tight">
                {t('prepEditor.resume.title')}
              </h3>
            </div>

            <label className="cursor-pointer group/upload">
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors duration-200 ${
                  uploadedFile
                    ? 'border border-solid border-[var(--bready-text)] text-[var(--bready-text)]'
                    : 'border border-dashed border-[var(--bready-border)] hover:border-[var(--bready-text)] text-[var(--bready-text-muted)] hover:text-[var(--bready-text)]'
                } ${isExtracting ? 'opacity-50 cursor-wait' : ''}`}
              >
                {isExtracting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : uploadedFile ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <Upload className="w-3.5 h-3.5" />
                )}
                <span className="text-xs font-medium">
                  {isExtracting
                    ? 'Parsing...'
                    : uploadedFile
                      ? 'Uploaded'
                      : t('prepEditor.resume.upload.title')}
                </span>
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

          <div className="flex-1 relative overflow-hidden">
            <Textarea
              value={resume}
              onChange={(e) => setResume(e.target.value)}
              placeholder={t('prepEditor.resume.pastePlaceholder')}
              className="absolute inset-0 w-full h-full resize-none border-none bg-transparent p-6 pt-0 text-sm leading-7 text-[var(--bready-text)] placeholder:text-[var(--bready-text-muted)]/50 focus-visible:ring-0 selection:bg-blue-500/10 scrollbar-thin scrollbar-thumb-[var(--bready-border)] hover:scrollbar-thumb-[var(--bready-text-muted)]/50"
              disabled={isExtracting}
            />

            <AnimatePresence>
              {isExtracting && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[var(--bready-surface)]/80 backdrop-blur-sm rounded-2xl"
                >
                  <div className="p-4 rounded-full bg-[var(--bready-surface)] border border-[var(--bready-border)] shadow-xl mb-4 relative overflow-hidden">
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    />
                    <Loader2 className="w-8 h-8 text-blue-500 relative z-10 animate-pulse" />
                  </div>
                  <p className="text-sm font-medium text-[var(--bready-text)]">
                    Analyzing document...
                  </p>
                  <p className="text-xs text-[var(--bready-text-muted)] mt-1">
                    Extracting text and structure
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {toast && (
          <ToastNotification
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </AnimatePresence>
    </Modal>
  )
}

export default EditPreparationModal
