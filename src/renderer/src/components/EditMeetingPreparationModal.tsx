import React, { useState, useEffect } from 'react'
import { Loader2, Check } from 'lucide-react'
import { Button } from './ui/button'
import { ToastNotification } from './ui/notifications'
import { preparationService, type Preparation } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from './ui/theme-provider'
import { useI18n } from '../contexts/I18nContext'

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
  onSaved
}) => {
  const { user } = useAuth()
  const { theme } = useTheme()
  const { t } = useI18n()
  const isEditing = !!preparation

  const isDarkMode = theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  const [name, setName] = useState('')
  const [meetingTopic, setMeetingTopic] = useState('')
  const [participants, setParticipants] = useState('')
  const [agenda, setAgenda] = useState('')
  const [keyPoints, setKeyPoints] = useState('')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (isEditing && preparation) {
      setName(preparation.name)
      // 从 job_description 解析会议准备数据
      try {
        const data = JSON.parse(preparation.job_description)
        setMeetingTopic(data.meetingTopic || '')
        setParticipants(data.participants || '')
        setAgenda(data.agenda || '')
        setKeyPoints(data.keyPoints || '')
      } catch {
        setMeetingTopic(preparation.job_description)
      }
    }
  }, [isEditing, preparation])

  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleSave = async () => {
    if (!name.trim() || !meetingTopic.trim()) {
      showToast(t('prepEditor.toasts.requiredFields'), 'error')
      return
    }

    setIsSaving(true)
    try {
      const preparationData = {
        name: name.trim(),
        job_description: JSON.stringify({
          type: 'meeting',
          meetingTopic: meetingTopic.trim(),
          participants: participants.trim(),
          agenda: agenda.trim(),
          keyPoints: keyPoints.trim()
        }),
        resume: undefined,
        analysis: null,
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
      onSaved(savedPreparation)
    } catch (error) {
      console.error('Save failed:', error)
      showToast(t('prepEditor.toasts.saveFailed'), 'error')
    } finally {
      setIsSaving(false)
    }
  }

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
            {isEditing ? t('meetingPrep.titleEdit') : t('meetingPrep.titleCreate')}
          </h1>
          
          <Button
            onClick={handleSave}
            disabled={isSaving || !name.trim() || !meetingTopic.trim()}
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
            .scrollbar-dark::-webkit-scrollbar { width: 6px; }
            .scrollbar-dark::-webkit-scrollbar-track { background: transparent; }
            .scrollbar-dark::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 3px; }
          `}</style>
          
          <div className="space-y-4">
            {/* 准备名称 */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {t('meetingPrep.name.title')}
                <span className="text-red-500 ml-0.5">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('meetingPrep.name.placeholder')}
                maxLength={50}
                className={inputClass}
              />
              <div className={`mt-1 text-xs ${isDarkMode ? 'text-zinc-500' : 'text-gray-400'}`}>
                {name.length}/50
              </div>
            </div>

            {/* 会议主题和参会人员横向排列 */}
            <div className="grid grid-cols-2 gap-4">
              {/* 会议主题 */}
              <div className="flex flex-col">
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {t('meetingPrep.meetingTopic.title')}
                  <span className="text-red-500 ml-0.5">*</span>
                </label>
                <textarea
                  value={meetingTopic}
                  onChange={(e) => setMeetingTopic(e.target.value)}
                  placeholder={t('meetingPrep.meetingTopic.placeholder')}
                  className={`${inputClass} flex-1 min-h-[150px] resize-none`}
                />
              </div>

              {/* 参会人员 */}
              <div className="flex flex-col">
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {t('meetingPrep.participants.title')}
                </label>
                <textarea
                  value={participants}
                  onChange={(e) => setParticipants(e.target.value)}
                  placeholder={t('meetingPrep.participants.placeholder')}
                  className={`${inputClass} flex-1 min-h-[150px] resize-none`}
                />
              </div>
            </div>

            {/* 会议议程和关键要点横向排列 */}
            <div className="grid grid-cols-2 gap-4">
              {/* 会议议程 */}
              <div className="flex flex-col">
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {t('meetingPrep.agenda.title')}
                </label>
                <textarea
                  value={agenda}
                  onChange={(e) => setAgenda(e.target.value)}
                  placeholder={t('meetingPrep.agenda.placeholder')}
                  className={`${inputClass} flex-1 min-h-[150px] resize-none`}
                />
              </div>

              {/* 关键要点 */}
              <div className="flex flex-col">
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {t('meetingPrep.keyPoints.title')}
                </label>
                <textarea
                  value={keyPoints}
                  onChange={(e) => setKeyPoints(e.target.value)}
                  placeholder={t('meetingPrep.keyPoints.placeholder')}
                  className={`${inputClass} flex-1 min-h-[150px] resize-none`}
                />
              </div>
            </div>
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

export default EditMeetingPreparationModal
