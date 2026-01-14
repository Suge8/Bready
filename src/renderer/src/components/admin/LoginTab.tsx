import React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, Mail, MessageSquare, MessageCircle } from 'lucide-react'
import { cn } from '../../lib/utils'
import { FloatingLabelInput } from '../ui/FloatingLabelInput'
import { Button } from '../ui/button'
import type { EmailConfig, LoginConfigDisplay, SmsConfigDisplay } from './types'

interface ToggleProps {
  enabled: boolean
  onChange: () => void
  isDarkMode: boolean
}

const Toggle: React.FC<ToggleProps> = ({ enabled, onChange, isDarkMode }) => (
  <div
    onClick={(e) => {
      e.stopPropagation()
      onChange()
    }}
    className={cn(
      'w-10 h-6 rounded-full p-1 cursor-pointer transition-colors duration-300',
      enabled ? 'bg-green-500' : isDarkMode ? 'bg-neutral-800' : 'bg-gray-200',
    )}
  >
    <motion.div
      className="w-4 h-4 bg-white rounded-full shadow-sm"
      initial={false}
      animate={{ x: enabled ? 16 : 0 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
    />
  </div>
)

interface CardHeaderProps {
  icon: React.ReactNode
  title: string
  subtitle: string
  cardKey: 'email' | 'phone' | 'wechat' | 'google'
  enabled: boolean
  onToggle: () => void
  color: string
  isDarkMode: boolean
  expandedCard: 'email' | 'phone' | 'wechat' | 'google' | null
  setExpandedCard: (card: 'email' | 'phone' | 'wechat' | 'google' | null) => void
}

const CardHeader: React.FC<CardHeaderProps> = ({
  icon,
  title,
  subtitle,
  cardKey,
  enabled,
  onToggle,
  color,
  isDarkMode,
  expandedCard,
  setExpandedCard,
}) => (
  <div
    onClick={() => setExpandedCard(expandedCard === cardKey ? null : cardKey)}
    className="p-4 flex items-center justify-between cursor-pointer transition-colors"
  >
    <div className="flex items-center gap-3">
      <div
        className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center transition-colors',
          isDarkMode ? 'bg-neutral-800' : 'bg-white shadow-sm border',
          expandedCard === cardKey && color,
        )}
      >
        {icon}
      </div>
      <div>
        <div className={cn('text-sm font-semibold', isDarkMode ? 'text-white' : 'text-black')}>
          {title}
        </div>
        <div className="text-xs text-gray-500">{subtitle}</div>
      </div>
    </div>
    <div className="flex items-center gap-3">
      <Toggle enabled={enabled} onChange={onToggle} isDarkMode={isDarkMode} />
      <motion.div
        initial={false}
        animate={{ rotate: expandedCard === cardKey ? 180 : 0 }}
        transition={{ duration: 0.2 }}
      >
        <ChevronDown className="w-4 h-4 text-gray-400" />
      </motion.div>
    </div>
  </div>
)

interface LoginTabProps {
  isDarkMode: boolean
  expandedCard: 'email' | 'phone' | 'wechat' | 'google' | null
  setExpandedCard: (card: 'email' | 'phone' | 'wechat' | 'google' | null) => void
  emailConfig: EmailConfig
  handleEmailConfigChange: <K extends keyof EmailConfig>(key: K, value: EmailConfig[K]) => void
  emailTestLoading: boolean
  emailConfigured: boolean
  handleTestEmailConnection: () => void
  loginConfig: LoginConfigDisplay
  setLoginConfig: (config: LoginConfigDisplay) => void
  smsConfig: SmsConfigDisplay
  setSmsConfig: (config: SmsConfigDisplay) => void
  handleSaveAllLoginSettings: () => void
  t: (key: string) => string
}

export const LoginTab: React.FC<LoginTabProps> = ({
  isDarkMode,
  expandedCard,
  setExpandedCard,
  emailConfig,
  handleEmailConfigChange,
  emailTestLoading,
  emailConfigured,
  handleTestEmailConnection,
  loginConfig,
  setLoginConfig,
  smsConfig,
  setSmsConfig,
  handleSaveAllLoginSettings,
  t,
}) => {
  const cardBase = cn(
    'rounded-xl border transition-all duration-300 overflow-hidden',
    isDarkMode ? 'border-neutral-800 bg-neutral-900/50' : 'border-neutral-200 bg-neutral-50',
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex-1 overflow-y-auto p-4"
    >
      <div className="max-w-2xl mx-auto space-y-3">
        <motion.div
          whileHover={{ scale: 1.01, y: -2 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className={cardBase}
        >
          <CardHeader
            icon={<Mail className="w-5 h-5" />}
            title="邮箱登录"
            subtitle="SMTP / 验证码配置"
            cardKey="email"
            enabled={emailConfig.enableVerification}
            onToggle={() =>
              handleEmailConfigChange('enableVerification', !emailConfig.enableVerification)
            }
            color="text-blue-500"
            isDarkMode={isDarkMode}
            expandedCard={expandedCard}
            setExpandedCard={setExpandedCard}
          />
          <AnimatePresence>
            {expandedCard === 'email' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
              >
                <div className="p-4 pt-0 border-t border-dashed border-gray-200 dark:border-gray-800">
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="space-y-3">
                      <FloatingLabelInput
                        label={t('admin.email.smtp.server')}
                        value={emailConfig.smtpServer}
                        placeholder={t('admin.email.smtp.placeholders.server')}
                        alwaysShowLabel
                        onChange={(value) => handleEmailConfigChange('smtpServer', value)}
                        className="text-xs"
                      />
                      <div className="flex gap-2">
                        <div className="w-24">
                          <FloatingLabelInput
                            label={t('admin.email.smtp.port')}
                            value={emailConfig.port}
                            alwaysShowLabel
                            onChange={(value) => handleEmailConfigChange('port', value)}
                            className="text-xs"
                          />
                        </div>
                        <div className="flex items-end pb-2">
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <div
                              onClick={() =>
                                handleEmailConfigChange('enableSsl', !emailConfig.enableSsl)
                              }
                              className={cn(
                                'w-8 h-5 rounded-full p-0.5 transition-colors duration-200',
                                emailConfig.enableSsl
                                  ? 'bg-blue-500'
                                  : isDarkMode
                                    ? 'bg-neutral-700'
                                    : 'bg-gray-300',
                              )}
                            >
                              <motion.div
                                className="w-4 h-4 bg-white rounded-full shadow-sm"
                                initial={false}
                                animate={{ x: emailConfig.enableSsl ? 12 : 0 }}
                                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                              />
                            </div>
                            <span className="text-[10px] text-gray-500">SSL</span>
                          </label>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <FloatingLabelInput
                        label={t('admin.email.auth.email')}
                        value={emailConfig.senderEmail}
                        alwaysShowLabel
                        onChange={(value) => handleEmailConfigChange('senderEmail', value)}
                        className="text-xs"
                      />
                      <FloatingLabelInput
                        label={t('admin.email.auth.code')}
                        value={emailConfig.authCode}
                        alwaysShowLabel
                        onChange={(value) => handleEmailConfigChange('authCode', value)}
                        className="text-xs"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end mt-3 items-center gap-2">
                    {emailConfigured && <span className="text-xs text-emerald-500">✓ 已生效</span>}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleTestEmailConnection}
                      disabled={emailTestLoading}
                      className="text-xs h-7"
                    >
                      {emailTestLoading ? '测试中...' : '测试连接'}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.01, y: -2 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className={cardBase}
        >
          <CardHeader
            icon={<MessageSquare className="w-5 h-5" />}
            title="手机登录"
            subtitle="短信服务配置"
            cardKey="phone"
            enabled={loginConfig.phone.enabled}
            onToggle={() =>
              setLoginConfig({
                ...loginConfig,
                phone: { ...loginConfig.phone, enabled: !loginConfig.phone.enabled },
              })
            }
            color="text-violet-500"
            isDarkMode={isDarkMode}
            expandedCard={expandedCard}
            setExpandedCard={setExpandedCard}
          />
          <AnimatePresence>
            {expandedCard === 'phone' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
              >
                <div className="p-4 pt-0 border-t border-dashed border-gray-200 dark:border-gray-800">
                  <div className="mt-4 space-y-4">
                    <div className="flex gap-4 p-2 bg-black/5 dark:bg-white/5 rounded-lg w-fit">
                      {['aliyun', 'tencent'].map((p) => (
                        <label
                          key={p}
                          className="flex items-center gap-2 text-xs cursor-pointer select-none"
                        >
                          <input
                            type="radio"
                            name="smsProvider"
                            value={p}
                            checked={smsConfig.provider === p}
                            onChange={(e) =>
                              setSmsConfig({ ...smsConfig, provider: e.target.value as any })
                            }
                            className="accent-emerald-500"
                          />
                          <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
                            {p === 'aliyun' ? '阿里云' : '腾讯云'}
                          </span>
                        </label>
                      ))}
                    </div>
                    {smsConfig.provider === 'aliyun' && (
                      <div className="grid grid-cols-2 gap-4">
                        <FloatingLabelInput
                          label={t('admin.sms.accessKeyId')}
                          value={smsConfig.aliyun.accessKeyId}
                          alwaysShowLabel
                          onChange={(v) =>
                            setSmsConfig({
                              ...smsConfig,
                              aliyun: { ...smsConfig.aliyun, accessKeyId: v },
                            })
                          }
                          className="text-xs"
                        />
                        <FloatingLabelInput
                          label={t('admin.sms.accessKeySecret')}
                          value={smsConfig.aliyun.accessKeySecret}
                          alwaysShowLabel
                          onChange={(v) =>
                            setSmsConfig({
                              ...smsConfig,
                              aliyun: { ...smsConfig.aliyun, accessKeySecret: v },
                            })
                          }
                          className="text-xs"
                        />
                        <FloatingLabelInput
                          label={t('admin.sms.signName')}
                          value={smsConfig.aliyun.signName}
                          alwaysShowLabel
                          onChange={(v) =>
                            setSmsConfig({
                              ...smsConfig,
                              aliyun: { ...smsConfig.aliyun, signName: v },
                            })
                          }
                          className="text-xs"
                        />
                        <FloatingLabelInput
                          label={t('admin.sms.templateCode')}
                          value={smsConfig.aliyun.templateCode}
                          alwaysShowLabel
                          onChange={(v) =>
                            setSmsConfig({
                              ...smsConfig,
                              aliyun: { ...smsConfig.aliyun, templateCode: v },
                            })
                          }
                          className="text-xs"
                        />
                      </div>
                    )}
                    {smsConfig.provider === 'tencent' && (
                      <div className="grid grid-cols-2 gap-4">
                        <FloatingLabelInput
                          label={t('admin.sms.appId')}
                          value={smsConfig.tencent.appId}
                          alwaysShowLabel
                          onChange={(v) =>
                            setSmsConfig({
                              ...smsConfig,
                              tencent: { ...smsConfig.tencent, appId: v },
                            })
                          }
                          className="text-xs"
                        />
                        <FloatingLabelInput
                          label={t('admin.sms.secretId')}
                          value={smsConfig.tencent.secretId}
                          alwaysShowLabel
                          onChange={(v) =>
                            setSmsConfig({
                              ...smsConfig,
                              tencent: { ...smsConfig.tencent, secretId: v },
                            })
                          }
                          className="text-xs"
                        />
                        <FloatingLabelInput
                          label={t('admin.sms.secretKey')}
                          value={smsConfig.tencent.secretKey}
                          alwaysShowLabel
                          onChange={(v) =>
                            setSmsConfig({
                              ...smsConfig,
                              tencent: { ...smsConfig.tencent, secretKey: v },
                            })
                          }
                          className="text-xs"
                        />
                        <FloatingLabelInput
                          label={t('admin.sms.signName')}
                          value={smsConfig.tencent.signName}
                          alwaysShowLabel
                          onChange={(v) =>
                            setSmsConfig({
                              ...smsConfig,
                              tencent: { ...smsConfig.tencent, signName: v },
                            })
                          }
                          className="text-xs"
                        />
                        <FloatingLabelInput
                          label={t('admin.sms.templateId')}
                          value={smsConfig.tencent.templateId}
                          alwaysShowLabel
                          onChange={(v) =>
                            setSmsConfig({
                              ...smsConfig,
                              tencent: { ...smsConfig.tencent, templateId: v },
                            })
                          }
                          className="text-xs"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.01, y: -2 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className={cardBase}
        >
          <CardHeader
            icon={<MessageCircle className="w-5 h-5" />}
            title="微信登录"
            subtitle="微信开放平台配置"
            cardKey="wechat"
            enabled={loginConfig.wechat.enabled}
            onToggle={() =>
              setLoginConfig({
                ...loginConfig,
                wechat: { ...loginConfig.wechat, enabled: !loginConfig.wechat.enabled },
                google: { ...loginConfig.google, enabled: false },
              })
            }
            color="text-emerald-500"
            isDarkMode={isDarkMode}
            expandedCard={expandedCard}
            setExpandedCard={setExpandedCard}
          />
          <AnimatePresence>
            {expandedCard === 'wechat' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
              >
                <div className="p-4 pt-0 border-t border-dashed border-gray-200 dark:border-gray-800">
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <FloatingLabelInput
                      label={t('admin.login.wechat.appId')}
                      value={loginConfig.wechat.appId}
                      alwaysShowLabel
                      onChange={(v) =>
                        setLoginConfig({
                          ...loginConfig,
                          wechat: { ...loginConfig.wechat, appId: v },
                        })
                      }
                      className="text-xs"
                    />
                    <FloatingLabelInput
                      label={t('admin.login.wechat.appSecret')}
                      value={loginConfig.wechat.appSecret}
                      alwaysShowLabel
                      onChange={(v) =>
                        setLoginConfig({
                          ...loginConfig,
                          wechat: { ...loginConfig.wechat, appSecret: v },
                        })
                      }
                      className="text-xs"
                    />
                    <FloatingLabelInput
                      label={t('admin.login.wechat.redirectUri')}
                      value={loginConfig.wechat.redirectUri}
                      alwaysShowLabel
                      onChange={(v) =>
                        setLoginConfig({
                          ...loginConfig,
                          wechat: { ...loginConfig.wechat, redirectUri: v },
                        })
                      }
                      className="text-xs col-span-2"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.01, y: -2 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className={cardBase}
        >
          <CardHeader
            icon={<span className="text-lg font-bold">G</span>}
            title="Google 登录"
            subtitle="Google OAuth 配置"
            cardKey="google"
            enabled={loginConfig.google.enabled}
            onToggle={() =>
              setLoginConfig({
                ...loginConfig,
                google: { ...loginConfig.google, enabled: !loginConfig.google.enabled },
                wechat: { ...loginConfig.wechat, enabled: false },
              })
            }
            color="text-red-500"
            isDarkMode={isDarkMode}
            expandedCard={expandedCard}
            setExpandedCard={setExpandedCard}
          />
          <AnimatePresence>
            {expandedCard === 'google' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
              >
                <div className="p-4 pt-0 border-t border-dashed border-gray-200 dark:border-gray-800">
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <FloatingLabelInput
                      label={t('admin.login.google.clientId')}
                      value={loginConfig.google.clientId}
                      alwaysShowLabel
                      onChange={(v) =>
                        setLoginConfig({
                          ...loginConfig,
                          google: { ...loginConfig.google, clientId: v },
                        })
                      }
                      className="text-xs"
                    />
                    <FloatingLabelInput
                      label={t('admin.login.google.clientSecret')}
                      value={loginConfig.google.clientSecret}
                      alwaysShowLabel
                      onChange={(v) =>
                        setLoginConfig({
                          ...loginConfig,
                          google: { ...loginConfig.google, clientSecret: v },
                        })
                      }
                      className="text-xs"
                    />
                    <FloatingLabelInput
                      label={t('admin.login.google.redirectUri')}
                      value={loginConfig.google.redirectUri}
                      alwaysShowLabel
                      onChange={(v) =>
                        setLoginConfig({
                          ...loginConfig,
                          google: { ...loginConfig.google, redirectUri: v },
                        })
                      }
                      className="text-xs col-span-2"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <Button onClick={handleSaveAllLoginSettings} className="w-full text-xs">
          保存所有登录设置
        </Button>
      </div>
    </motion.div>
  )
}
