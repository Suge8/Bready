import React from 'react'
import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { cn } from '../../lib/utils'
import { FloatingLabelInput } from '../ui/FloatingLabelInput'
import type { AiConfigDisplay, AiTestStatus } from './types'

interface AiTabProps {
  isDarkMode: boolean
  aiConfig: AiConfigDisplay
  setAiConfig: (config: AiConfigDisplay) => void
  aiTestStatus: AiTestStatus
  handleSaveAiConfig: (saveType?: 'chat' | 'asr') => void
  handleTestAiConnection: (testType?: 'chat' | 'asr') => void
  t: (key: string) => string
}

export const AiTab: React.FC<AiTabProps> = ({
  isDarkMode,
  aiConfig,
  setAiConfig,
  aiTestStatus,
  handleSaveAiConfig,
  handleTestAiConnection,
  t,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex-1 overflow-y-auto p-4"
    >
      <div className="grid gap-3 max-w-md mx-auto">
        <div
          className={cn(
            'p-3 rounded-xl border',
            isDarkMode
              ? 'border-neutral-800 bg-neutral-900/50'
              : 'border-neutral-200 bg-neutral-50',
          )}
        >
          <h4 className={cn('text-xs font-medium mb-3', isDarkMode ? 'text-white' : 'text-black')}>
            AI 提供方
          </h4>
          <div className="flex gap-4">
            {['gemini', 'doubao'].map((provider) => (
              <label key={provider} className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="radio"
                  name="aiProvider"
                  value={provider}
                  checked={aiConfig.provider === provider}
                  onChange={(e) => setAiConfig({ ...aiConfig, provider: e.target.value as any })}
                />
                <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
                  {provider === 'gemini' ? 'Google Gemini' : '字节豆包'}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div
          className={cn(
            'p-3 rounded-xl border',
            isDarkMode
              ? 'border-neutral-800 bg-neutral-900/50'
              : 'border-neutral-200 bg-neutral-50',
          )}
        >
          <h4 className={cn('text-xs font-medium mb-3', isDarkMode ? 'text-white' : 'text-black')}>
            配置参数
          </h4>
          <div className="grid gap-3">
            {aiConfig.provider === 'gemini' && (
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <FloatingLabelInput
                    alwaysShowLabel
                    label={t('admin.ai.gemini.apiKey')}
                    value={aiConfig.geminiApiKey}
                    placeholder={
                      aiConfig.hasGeminiKey
                        ? t('admin.ai.placeholders.gemini.apiKeySet')
                        : t('admin.ai.placeholders.gemini.apiKey')
                    }
                    onChange={(value) => setAiConfig({ ...aiConfig, geminiApiKey: value })}
                    className="text-xs"
                  />
                </div>
                <TestSaveButton
                  isDarkMode={isDarkMode}
                  tested={aiTestStatus.gemini.tested}
                  success={aiTestStatus.gemini.success}
                  loading={aiTestStatus.gemini.loading}
                  onTest={() => handleTestAiConnection()}
                  onSave={() => handleSaveAiConfig()}
                />
              </div>
            )}

            {aiConfig.provider === 'doubao' && (
              <div className="space-y-3">
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <FloatingLabelInput
                      alwaysShowLabel
                      label={t('admin.ai.doubao.chatApiKey')}
                      value={aiConfig.doubaoChatApiKey}
                      placeholder={
                        aiConfig.hasDoubaoKey
                          ? t('admin.ai.placeholders.doubao.chatApiKeySet')
                          : t('admin.ai.placeholders.doubao.chatApiKey')
                      }
                      onChange={(value) => setAiConfig({ ...aiConfig, doubaoChatApiKey: value })}
                      className="text-xs"
                    />
                  </div>
                  <TestSaveButton
                    isDarkMode={isDarkMode}
                    tested={aiTestStatus.doubaoChat.tested}
                    success={aiTestStatus.doubaoChat.success}
                    loading={aiTestStatus.doubaoChat.loading}
                    onTest={() => handleTestAiConnection('chat')}
                    onSave={() => handleSaveAiConfig('chat')}
                  />
                </div>

                <div className="flex gap-2">
                  <div className="flex-1 space-y-2">
                    <FloatingLabelInput
                      alwaysShowLabel
                      label={t('admin.ai.doubao.asrAppId')}
                      value={aiConfig.doubaoAsrAppId}
                      placeholder={
                        aiConfig.hasDoubaoKey
                          ? t('admin.ai.placeholders.doubao.asrAppIdSet')
                          : t('admin.ai.placeholders.doubao.asrAppId')
                      }
                      onChange={(value) => setAiConfig({ ...aiConfig, doubaoAsrAppId: value })}
                      className="text-xs"
                    />
                    <FloatingLabelInput
                      alwaysShowLabel
                      label={t('admin.ai.doubao.asrAccessKey')}
                      value={aiConfig.doubaoAsrAccessKey}
                      placeholder={
                        aiConfig.hasDoubaoKey
                          ? t('admin.ai.placeholders.doubao.asrAccessKeySet')
                          : t('admin.ai.placeholders.doubao.asrAccessKey')
                      }
                      onChange={(value) => setAiConfig({ ...aiConfig, doubaoAsrAccessKey: value })}
                      className="text-xs"
                    />
                  </div>
                  <div className="flex items-center pt-5">
                    <TestSaveButton
                      isDarkMode={isDarkMode}
                      tested={aiTestStatus.doubaoAsr.tested}
                      success={aiTestStatus.doubaoAsr.success}
                      loading={aiTestStatus.doubaoAsr.loading}
                      onTest={() => handleTestAiConnection('asr')}
                      onSave={() => handleSaveAiConfig('asr')}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

const TestSaveButton: React.FC<{
  isDarkMode: boolean
  tested: boolean
  success: boolean
  loading: boolean
  onTest: () => void
  onSave: () => void
}> = ({ isDarkMode, tested, success, loading, onTest, onSave }) => {
  const buttonClass = cn(
    'h-10 px-4 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 shrink-0',
    isDarkMode
      ? 'bg-white text-black hover:bg-neutral-200'
      : 'bg-black text-white hover:bg-neutral-800',
  )

  if (tested && success) {
    return (
      <motion.button
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onSave}
        className={buttonClass}
      >
        <Check className="w-3 h-3" />
        保存设置
      </motion.button>
    )
  }

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onTest}
      disabled={loading}
      className={buttonClass}
    >
      {loading && (
        <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      测试连接
    </motion.button>
  )
}
