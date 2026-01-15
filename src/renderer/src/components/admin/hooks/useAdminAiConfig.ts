import { useState, useCallback } from 'react'
import { settingsService } from '../../../lib/api-client'
import { useToast } from '../../../contexts/ToastContext'
import { useI18n } from '../../../contexts/I18nContext'
import type { AiTestStatus, AiConfigDisplay } from '../types'

const initialAiTestStatus: AiTestStatus = {
  gemini: { tested: false, success: false, loading: false },
  doubaoChat: { tested: false, success: false, loading: false },
  doubaoAsr: { tested: false, success: false, loading: false },
}

const initialAiConfig: AiConfigDisplay = {
  provider: 'gemini',
  geminiApiKey: '',
  doubaoChatApiKey: '',
  doubaoAsrAppId: '',
  doubaoAsrAccessKey: '',
  hasGeminiKey: false,
  hasDoubaoKey: false,
}

export function useAdminAiConfig() {
  const { showToast } = useToast()
  const { t } = useI18n()

  const [aiConfig, setAiConfig] = useState<AiConfigDisplay>(initialAiConfig)
  const [aiTestStatus, setAiTestStatus] = useState<AiTestStatus>(initialAiTestStatus)

  const loadAiConfig = useCallback(async () => {
    try {
      const config = await settingsService.getAiConfig()
      if (config) setAiConfig(config)
    } catch (error) {
      console.error('Failed to load AI config', error)
    }
  }, [])

  const resetTestStatus = useCallback(() => {
    setAiTestStatus(initialAiTestStatus)
  }, [])

  const handleSaveAiConfig = async (saveType?: 'chat' | 'asr') => {
    try {
      const result = await settingsService.updateAiConfig(aiConfig)
      if (result.success) {
        const msg =
          saveType === 'chat'
            ? 'Chat 配置已保存'
            : saveType === 'asr'
              ? 'ASR 配置已保存'
              : '保存成功'
        showToast(msg, 'success')
      } else {
        showToast(result.error || t('alerts.saveFailed') || '保存失败', 'error')
      }
    } catch (error) {
      console.error('Failed to save AI config', error)
      showToast(t('alerts.saveFailed') || '保存失败', 'error')
    }
  }

  const handleTestAiConnection = async (testType?: 'chat' | 'asr') => {
    const statusKey =
      aiConfig.provider === 'gemini' ? 'gemini' : testType === 'asr' ? 'doubaoAsr' : 'doubaoChat'

    setAiTestStatus((prev) => ({
      ...prev,
      [statusKey]: { ...prev[statusKey], loading: true },
    }))

    try {
      const result = await settingsService.testAiConnection(aiConfig.provider, testType, {
        geminiApiKey: aiConfig.geminiApiKey,
        doubaoChatApiKey: aiConfig.doubaoChatApiKey,
        doubaoAsrAppId: aiConfig.doubaoAsrAppId,
        doubaoAsrAccessKey: aiConfig.doubaoAsrAccessKey,
      })
      setAiTestStatus((prev) => ({
        ...prev,
        [statusKey]: { tested: true, success: result.success, loading: false },
      }))
      if (result.success) {
        showToast(t('alerts.testSuccess') || '连接测试成功', 'success')
      } else {
        showToast(result.error || '连接测试失败', 'error')
      }
    } catch (error) {
      console.error('Failed to test AI connection', error)
      setAiTestStatus((prev) => ({
        ...prev,
        [statusKey]: { tested: true, success: false, loading: false },
      }))
      showToast('测试失败', 'error')
    }
  }

  return {
    aiConfig,
    setAiConfig,
    aiTestStatus,
    loadAiConfig,
    resetTestStatus,
    handleSaveAiConfig,
    handleTestAiConnection,
  }
}
