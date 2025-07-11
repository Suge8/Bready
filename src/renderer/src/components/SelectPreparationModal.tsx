import React, { useState } from 'react'
import { X, Check, ChevronDown } from 'lucide-react'

interface Preparation {
  id: string
  name: string
  jobDescription: string
  resume?: string
  createdAt: string
  updatedAt: string
}

interface SelectPreparationModalProps {
  preparations: Preparation[]
  onClose: () => void
  onSelect: (preparation: Preparation | null, language: string, purpose: string) => void
}

const SelectPreparationModal: React.FC<SelectPreparationModalProps> = ({
  preparations,
  onClose,
  onSelect
}) => {
  const [selectedPreparation, setSelectedPreparation] = useState<Preparation | null>(null)
  const [language, setLanguage] = useState('cmn-CN')
  const [purpose, setPurpose] = useState('interview')
  const [languageDropdownOpen, setLanguageDropdownOpen] = useState(false)
  const [purposeDropdownOpen, setPurposeDropdownOpen] = useState(false)

  const handleSelectPreparation = (preparation: Preparation) => {
    setSelectedPreparation(preparation)
  }

  const handleConfirm = () => {
    onSelect(selectedPreparation, language, purpose)
  }

  const languages = [
    { value: 'cmn-CN', label: '中文' },
    { value: 'en-US', label: '英文' },
    { value: 'zh-en', label: '中英混合' },
    { value: 'ja-JP', label: '日语' },
    { value: 'fr-FR', label: '法语' }
  ]

  const purposes = [
    { value: 'interview', label: '面试' },
    { value: 'sales', label: '销售' },
    { value: 'meeting', label: '会议' }
  ]

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-vercel w-full max-w-xl p-6 shadow-vercel-lg animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-vercel-black">请选择本次面试的准备项</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-vercel-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-vercel-gray-600" />
          </button>
        </div>

        {/* 语言和目的设置 */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* 语言设置 */}
          <div className="relative">
            <label className="block text-sm font-medium text-vercel-gray-700 mb-2">
              面试语言
            </label>
            <button
              onClick={() => setLanguageDropdownOpen(!languageDropdownOpen)}
              className="w-full flex items-center justify-between px-4 py-2 bg-vercel-gray-50 border border-vercel-gray-200 rounded-lg text-sm"
            >
              <span>{languages.find(l => l.value === language)?.label}</span>
              <ChevronDown className="w-4 h-4 text-vercel-gray-500" />
            </button>
            
            {languageDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-vercel-gray-200 rounded-lg shadow-vercel z-10">
                {languages.map(lang => (
                  <button
                    key={lang.value}
                    onClick={() => {
                      setLanguage(lang.value)
                      setLanguageDropdownOpen(false)
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-vercel-gray-50 ${
                      language === lang.value ? 'bg-vercel-gray-100' : ''
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 目的设置 */}
          <div className="relative">
            <label className="block text-sm font-medium text-vercel-gray-700 mb-2">
              使用目的
            </label>
            <button
              onClick={() => setPurposeDropdownOpen(!purposeDropdownOpen)}
              className="w-full flex items-center justify-between px-4 py-2 bg-vercel-gray-50 border border-vercel-gray-200 rounded-lg text-sm"
            >
              <span>{purposes.find(p => p.value === purpose)?.label}</span>
              <ChevronDown className="w-4 h-4 text-vercel-gray-500" />
            </button>
            
            {purposeDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-vercel-gray-200 rounded-lg shadow-vercel z-10">
                {purposes.map(p => (
                  <button
                    key={p.value}
                    onClick={() => {
                      setPurpose(p.value)
                      setPurposeDropdownOpen(false)
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-vercel-gray-50 ${
                      purpose === p.value ? 'bg-vercel-gray-100' : ''
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 准备项列表 */}
        <div className="max-h-60 overflow-y-auto mb-6">
          {preparations.length === 0 ? (
            <div className="text-center py-8 text-vercel-gray-500">
              <p>还没有准备项</p>
            </div>
          ) : (
            <div className="space-y-3">
              {preparations.map(preparation => (
                <div
                  key={preparation.id}
                  onClick={() => handleSelectPreparation(preparation)}
                  className={`p-4 rounded-lg cursor-pointer transition-colors ${
                    selectedPreparation?.id === preparation.id
                      ? 'bg-vercel-blue-50 border border-vercel-blue-500'
                      : 'bg-vercel-gray-50 hover:bg-vercel-gray-100 border border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-vercel-black">{preparation.name}</h3>
                    {selectedPreparation?.id === preparation.id && (
                      <Check className="w-5 h-5 text-vercel-blue-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="flex justify-end">
          <button
            onClick={handleConfirm}
            className={`px-6 py-2 rounded-lg font-medium ${
              selectedPreparation
                ? 'bg-vercel-black text-white hover:bg-vercel-gray-800'
                : 'bg-vercel-gray-100 text-vercel-gray-800 hover:bg-vercel-gray-200'
            } transition-colors`}
          >
            {selectedPreparation ? '确认' : '不选择，直接开始'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default SelectPreparationModal
