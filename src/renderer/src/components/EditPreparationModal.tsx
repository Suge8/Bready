import React, { useState, useEffect } from 'react'
import { Upload, Loader2, Check, FileText } from 'lucide-react'
import { Button } from './ui/button'
import { ToastNotification } from './ui/notifications'
import { preparationService, type Preparation } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useI18n } from '../contexts/I18nContext'
import { useTheme } from './ui/theme-provider'

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
  onSaved
}) => {
  const { user } = useAuth()
  const { t } = useI18n()
  const { theme } = useTheme()
  const isEditing = !!preparation

  const isDarkMode = theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  const [name, setName] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [resume, setResume] = useState('')
  const [analysisResult, setAnalysisResult] = useState<any>(null)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null)
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

    // 纯文本文件直接读取
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

    // PDF 或图片文件需要调用 AI 提取内容
    if (fileType === 'application/pdf' || 
        fileType.startsWith('image/') || 
        fileName.endsWith('.pdf') ||
        fileName.endsWith('.png') ||
        fileName.endsWith('.jpg') ||
        fileName.endsWith('.jpeg')) {
      
      setIsExtracting(true)
      try {
        // 读取文件为 base64
        const reader = new FileReader()
        reader.onload = async (e) => {
          const base64Data = e.target?.result as string
          
          // 调用 AI 提取内容
          if (window.bready && window.bready.extractFileContent) {
            const result = await window.bready.extractFileContent({
              fileName: file.name,
              fileType: fileType,
              base64Data: base64Data.split(',')[1] // 移除 data:xxx;base64, 前缀
            })
            
            if (result.success && result.content) {
              setResume(result.content)
              showToast(t('prepEditor.toasts.extractSuccess'), 'success')
            } else {
              showToast(result.error || t('prepEditor.toasts.extractFailed'), 'error')
            }
          } else {
            // 开发环境模拟
            await new Promise(resolve => setTimeout(resolve, 2000))
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

    // 其他文件类型尝试作为文本读取
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
        user_id: user?.id || ''
      }

      let savedPreparation: Preparation
      if (isEditing && preparation) {
        savedPreparation = await preparationService.update(preparation.id, preparationData)
        const updatedPreparations = preparations.map(p =>
          p.id === preparation.id ? savedPreparation : p
        )
        setPreparations(updatedPreparations)
      } else {
        savedPreparation = await preparationService.create(preparationData)
        setPreparations([...preparations, savedPreparation])
      }

      await onReloadData()
      showToast(t('prepEditor.toasts.updateSuccess'), 'success')
    } catch (error) {
      console.error('Save failed:', error)
      showToast(t('prepEditor.toasts.saveFailed'), 'error')
    } finally {
      setIsSaving(false)
    }
  }

  // 输入框样式 - 无边框
  const inputClass = `w-full px-3 py-2 rounded-lg text-sm transition-all focus:outline-none focus:ring-2 focus:ring-black/5 ${
    isDarkMode 
      ? 'bg-zinc-800 text-white placeholder:text-zinc-500' 
      : 'bg-gray-100 text-gray-900 placeholder:text-gray-400'
  }`

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4 cursor-pointer"
      onClick={onClose}
    >
      <div 
        className={`relative w-[85vw] max-w-[900px] max-h-[80vh] ${isDarkMode ? 'bg-zinc-900' : 'bg-white'} rounded-2xl shadow-2xl flex flex-col overflow-hidden cursor-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 flex-shrink-0">
          <h1 className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            {isEditing ? t('prepEditor.titleEdit') : t('prepEditor.titleCreate')}
          </h1>
          
          <Button
            onClick={handleSave}
            disabled={isSaving || !name.trim() || !jobDescription.trim()}
            className={`h-8 px-4 text-sm font-medium rounded-lg transition-all cursor-pointer ${
              isDarkMode 
                ? 'bg-white text-black hover:bg-gray-100' 
                : 'bg-black text-white hover:bg-gray-800'
            } disabled:opacity-50`}
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

        {/* Content */}
        <div className={`flex-1 overflow-y-auto px-5 pb-5 ${isDarkMode ? 'scrollbar-dark' : 'scrollbar-light'}`}>
          <style>{`
            .scrollbar-light::-webkit-scrollbar { width: 6px; }
            .scrollbar-light::-webkit-scrollbar-track { background: transparent; }
            .scrollbar-light::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 3px; }
            .scrollbar-light::-webkit-scrollbar-thumb:hover { background: #d1d5db; }
            .scrollbar-dark::-webkit-scrollbar { width: 6px; }
            .scrollbar-dark::-webkit-scrollbar-track { background: transparent; }
            .scrollbar-dark::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 3px; }
            .scrollbar-dark::-webkit-scrollbar-thumb:hover { background: #52525b; }
          `}</style>
          
          <div className="space-y-4">
            {/* 准备名称 */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {t('prepEditor.name.title')}
                <span className="text-red-500 ml-0.5">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('prepEditor.name.placeholder')}
                maxLength={50}
                className={inputClass}
              />
              <div className={`mt-1 text-xs ${isDarkMode ? 'text-zinc-500' : 'text-gray-400'}`}>
                {name.length}/50
              </div>
            </div>

            {/* JD 和简历横向排列 */}
            <div className="grid grid-cols-2 gap-4">
              {/* 岗位描述 */}
              <div className="flex flex-col">
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {t('prepEditor.job.title')}
                  <span className="text-red-500 ml-0.5">*</span>
                </label>
                <textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder={t('prepEditor.job.placeholder')}
                  className={`${inputClass} flex-1 min-h-[280px] resize-none`}
                />
              </div>

              {/* 个人简历 */}
              <div className="flex flex-col">
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {t('prepEditor.resume.title')}
                </label>
                <textarea
                  value={resume}
                  onChange={(e) => setResume(e.target.value)}
                  placeholder={t('prepEditor.resume.pastePlaceholder')}
                  className={`${inputClass} flex-1 min-h-[280px] resize-none`}
                  disabled={isExtracting}
                />
              </div>
            </div>

            {/* 上传文件区域 */}
            <label className="cursor-pointer block">
              <div className={`border-2 border-dashed ${
                isDarkMode 
                  ? 'border-zinc-700 hover:border-zinc-500 bg-zinc-800/30' 
                  : 'border-gray-200 hover:border-gray-400 bg-gray-50'
              } rounded-xl p-6 transition-all ${isExtracting ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="flex flex-col items-center justify-center gap-3">
                  <div className={`w-12 h-12 ${isDarkMode ? 'bg-zinc-700' : 'bg-gray-100'} rounded-xl flex items-center justify-center`}>
                    {isExtracting ? (
                      <Loader2 className={`w-6 h-6 ${isDarkMode ? 'text-zinc-400' : 'text-gray-500'} animate-spin`} />
                    ) : (
                      <Upload className={`w-6 h-6 ${isDarkMode ? 'text-zinc-400' : 'text-gray-500'}`} />
                    )}
                  </div>
                  <div className="text-center">
                    <p className={`text-sm font-medium ${isDarkMode ? 'text-zinc-300' : 'text-gray-700'}`}>
                      {isExtracting ? t('prepEditor.resume.extracting') : t('prepEditor.resume.upload.title')}
                    </p>
                    <p className={`text-xs mt-1 ${isDarkMode ? 'text-zinc-500' : 'text-gray-500'}`}>
                      {t('prepEditor.resume.upload.hint')}
                    </p>
                  </div>
                  {uploadedFile && !isExtracting && (
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${isDarkMode ? 'bg-zinc-700' : 'bg-gray-100'}`}>
                      <FileText className={`w-4 h-4 ${isDarkMode ? 'text-zinc-400' : 'text-gray-500'}`} />
                      <span className={`text-sm ${isDarkMode ? 'text-zinc-300' : 'text-gray-600'}`}>{uploadedFile.name}</span>
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

        {/* Toast */}
        {toast && (
          <ToastNotification
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </div>
    </div>
  )
}

export default EditPreparationModal
