import React, { useState } from 'react'
import { Toggle } from './toggle'

interface AccessibilitySettingsProps {
  accessibility: {
    highContrast: boolean
    largerText: boolean
    reducedMotion: boolean
    screenReader: boolean
  }
  onChange: (accessibility: any) => void
}

export const AccessibilitySettings: React.FC<AccessibilitySettingsProps> = ({
  accessibility,
  onChange,
}) => {
  const [localAccessibility, setLocalAccessibility] = useState(accessibility)

  const handleChange = (id: string, value: boolean) => {
    const newAccessibility = {
      ...localAccessibility,
      [id]: value,
    }
    setLocalAccessibility(newAccessibility)
    onChange(newAccessibility)

    // 应用无障碍设置到DOM
    document.body.classList.toggle(`accessibility-${id}`, value)
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">无障碍设置</h2>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white">高对比度模式</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              增强颜色对比度，便于视觉障碍用户使用
            </p>
          </div>
          <Toggle
            checked={localAccessibility.highContrast}
            onChange={(checked: boolean) => handleChange('highContrast', checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white">增大字体</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">放大界面字体，便于阅读</p>
          </div>
          <Toggle
            checked={localAccessibility.largerText}
            onChange={(checked: boolean) => handleChange('largerText', checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white">减少动画</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              减少界面动画，减轻前庭障碍用户不适
            </p>
          </div>
          <Toggle
            checked={localAccessibility.reducedMotion}
            onChange={(checked: boolean) => handleChange('reducedMotion', checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white">屏幕阅读器优化</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">优化界面元素的语义化标签</p>
          </div>
          <Toggle
            checked={localAccessibility.screenReader}
            onChange={(checked: boolean) => handleChange('screenReader', checked)}
          />
        </div>
      </div>
    </div>
  )
}
