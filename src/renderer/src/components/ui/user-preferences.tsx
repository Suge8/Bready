import React, { useState } from 'react'
import { Toggle } from './ui/toggle'

interface UserPreferencesProps {
  preferences: {
    theme: 'light' | 'dark' | 'auto'
    language: string
    notifications: boolean
    autoSave: boolean
    fontSize: 'small' | 'medium' | 'large'
  }
  onSave: (preferences: any) => void
}

export const UserPreferences: React.FC<UserPreferencesProps> = ({ 
  preferences, 
  onSave 
}) => {
  const [localPreferences, setLocalPreferences] = useState(preferences)

  const preferenceOptions = [
    {
      id: 'theme',
      label: '主题',
      type: 'select' as const,
      options: [
        { label: '浅色', value: 'light' },
        { label: '深色', value: 'dark' },
        { label: '自动', value: 'auto' }
      ]
    },
    {
      id: 'fontSize',
      label: '字体大小',
      type: 'radio' as const,
      options: [
        { label: '小', value: 'small' },
        { label: '中', value: 'medium' },
        { label: '大', value: 'large' }
      ]
    },
    {
      id: 'notifications',
      label: '启用通知',
      type: 'toggle' as const
    },
    {
      id: 'autoSave',
      label: '自动保存草稿',
      type: 'toggle' as const
    }
  ]

  const handleChange = (id: string, value: any) => {
    setLocalPreferences({
      ...localPreferences,
      [id]: value
    })
  }

  const handleSave = () => {
    onSave(localPreferences)
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">个性化设置</h2>
      
      <div className="space-y-4">
        {preferenceOptions.map(option => (
          <div key={option.id} className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
            <span className="text-gray-700 dark:text-gray-300">{option.label}</span>
            
            {option.type === 'select' && (
              <select
                value={localPreferences[option.id as keyof typeof localPreferences]}
                onChange={(e) => handleChange(option.id, e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                {option.options.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            )}
            
            {option.type === 'radio' && (
              <div className="flex space-x-4">
                {option.options.map(radio => (
                  <label key={radio.value} className="flex items-center space-x-2">
                    <input
                      type="radio"
                      checked={localPreferences[option.id as keyof typeof localPreferences] === radio.value}
                      onChange={() => handleChange(option.id, radio.value)}
                      className="text-black dark:text-white"
                    />
                    <span className="text-gray-700 dark:text-gray-300">{radio.label}</span>
                  </label>
                ))}
              </div>
            )}
            
            {option.type === 'toggle' && (
              <Toggle
                checked={localPreferences[option.id as keyof typeof localPreferences] as boolean}
                onChange={(checked) => handleChange(option.id, checked)}
              />
            )}
          </div>
        ))}
      </div>
      
      <button 
        onClick={handleSave}
        className="w-full px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors dark:bg-white dark:text-black dark:hover:bg-gray-200"
      >
        保存设置
      </button>
    </div>
  )
}