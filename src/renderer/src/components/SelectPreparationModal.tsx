import React, { useState } from 'react'
import { X, Check, ChevronDown } from 'lucide-react'
import { type Preparation } from '../lib/supabase'

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
      <div className="bg-white rounded-xl w-full max-w-xl p-6 shadow-xl animate-fade-in border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-black">请选择本次面试的准备项</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* 语言和目的设置 */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* 语言设置 */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              面试语言
            </label>
            <button
              onClick={() => setLanguageDropdownOpen(!languageDropdownOpen)}
              className="w-full flex items-center justify-between px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm hover:bg-gray-100 transition-colors"
            >
              <span className="text-black">{languages.find(l => l.value === language)?.label}</span>
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </button>

            {languageDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                {languages.map(lang => (
                  <button
                    key={lang.value}
                    onClick={() => {
                      setLanguage(lang.value)
                      setLanguageDropdownOpen(false)
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                      language === lang.value ? 'bg-gray-100 text-black font-medium' : 'text-gray-700'
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              使用目的
            </label>
            <button
              onClick={() => setPurposeDropdownOpen(!purposeDropdownOpen)}
              className="w-full flex items-center justify-between px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm hover:bg-gray-100 transition-colors"
            >
              <span className="text-black">{purposes.find(p => p.value === purpose)?.label}</span>
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </button>

            {purposeDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                {purposes.map(p => (
                  <button
                    key={p.value}
                    onClick={() => {
                      setPurpose(p.value)
                      setPurposeDropdownOpen(false)
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                      purpose === p.value ? 'bg-gray-100 text-black font-medium' : 'text-gray-700'
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
            <div className="text-center py-8 text-gray-500">
              <p>还没有准备项</p>
            </div>
          ) : (
            <div className="space-y-3">
              {preparations.map(preparation => (
                <div
                  key={preparation.id}
                  onClick={() => handleSelectPreparation(preparation)}
                  className={`p-4 rounded-lg cursor-pointer transition-all duration-200 ${
                    selectedPreparation?.id === preparation.id
                      ? 'bg-black text-white border border-black shadow-md'
                      : 'bg-gray-50 hover:bg-gray-100 border border-gray-200 hover:border-gray-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className={`font-medium ${
                        selectedPreparation?.id === preparation.id ? 'text-white' : 'text-black'
                      }`}>
                        {preparation.name}
                      </h3>
                      <p className={`text-sm mt-1 ${
                        selectedPreparation?.id === preparation.id ? 'text-gray-300' : 'text-gray-600'
                      }`}>
                        {preparation.job_description.length > 50
                          ? `${preparation.job_description.substring(0, 50)}...`
                          : preparation.job_description
                        }
                      </p>
                    </div>
                    {selectedPreparation?.id === preparation.id && (
                      <Check className="w-5 h-5 text-white ml-3 flex-shrink-0" />
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
            className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
              selectedPreparation
                ? 'bg-black text-white hover:bg-gray-800 shadow-md hover:shadow-lg'
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200 border border-gray-200'
            }`}
          >
            {selectedPreparation ? '确定' : '不准备，直接开始'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default SelectPreparationModal
