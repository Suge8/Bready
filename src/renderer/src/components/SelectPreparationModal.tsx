import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, ChevronDown, Loader2 } from 'lucide-react'
import { type Preparation } from '../lib/supabase'

interface SelectPreparationModalProps {
  preparations: Preparation[]
  onClose: () => void
  onSelect: (preparation: Preparation | null, language: string, purpose: string) => void
  isLoading?: boolean
}

const SelectPreparationModal: React.FC<SelectPreparationModalProps> = ({
  preparations,
  onClose,
  onSelect,
  isLoading = false
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 cursor-pointer"
      onClick={!isLoading ? onClose : undefined}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        transition={{ type: "spring", duration: 0.3, bounce: 0.2 }}
        className="bg-white rounded-xl w-full max-w-xl p-6 shadow-xl border border-gray-200 cursor-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-black">准备面试</h2>
        </div>

        {/* 语言和目的设置 */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* 语言设置 */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              语言
            </label>
            <button
              onClick={() => setLanguageDropdownOpen(!languageDropdownOpen)}
              className="w-full flex items-center justify-between px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm hover:bg-gray-100 transition-colors cursor-pointer"
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
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors first:rounded-t-lg last:rounded-b-lg cursor-pointer ${language === lang.value ? 'bg-gray-100 text-black font-medium' : 'text-gray-700'
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
              目的
            </label>
            <button
              onClick={() => setPurposeDropdownOpen(!purposeDropdownOpen)}
              className="w-full flex items-center justify-between px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm hover:bg-gray-100 transition-colors cursor-pointer"
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
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors first:rounded-t-lg last:rounded-b-lg cursor-pointer ${purpose === p.value ? 'bg-gray-100 text-black font-medium' : 'text-gray-700'
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
                  className={`p-4 rounded-lg cursor-pointer transition-all duration-200 ${selectedPreparation?.id === preparation.id
                    ? 'bg-black text-white border border-black shadow-md'
                    : 'bg-gray-50 hover:bg-gray-100 border border-gray-200 hover:border-gray-300 hover:shadow-sm'
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className={`font-medium ${selectedPreparation?.id === preparation.id ? 'text-white' : 'text-black'
                        }`}>
                        {preparation.name}
                      </h3>
                      <p className={`text-sm mt-1 ${selectedPreparation?.id === preparation.id ? 'text-gray-300' : 'text-gray-600'
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

        {/* 操作按钮 - 居中显示 */}
        <div className="flex justify-center">
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 cursor-pointer flex items-center gap-2 ${selectedPreparation
              ? 'bg-black text-white hover:bg-gray-800 shadow-md hover:shadow-lg'
              : 'bg-black text-white hover:bg-gray-800 shadow-md hover:shadow-lg'
              } ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {selectedPreparation ? '确定' : '不准备，直接开始'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default SelectPreparationModal
