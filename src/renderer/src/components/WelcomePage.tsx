import React, { useState } from 'react'
import { Sparkles, ArrowRight, Zap, Shield, Mic, Moon, Sun } from 'lucide-react'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'
import { useTheme } from './ui/theme-provider'
import { useI18n } from '../contexts/I18nContext'

interface WelcomePageProps {
  onComplete: () => void
  onCreatePreparation?: () => void
}

const WelcomePage: React.FC<WelcomePageProps> = ({ onComplete, onCreatePreparation }) => {
  const { theme, setTheme } = useTheme()
  const { t, list } = useI18n()
  const [mounted, setMounted] = useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light')
  }

  const handleGetStarted = () => {
    onComplete()
    onCreatePreparation?.()
  }

  const collaborationItems = list('welcome.features.collaboration.items')
  const audioItems = list('welcome.features.audio.items')
  const privacyItems = list('welcome.features.privacy.items')

  return (
    <div className="h-screen w-screen overflow-hidden bg-[var(--bready-bg)] text-[var(--bready-text)] flex flex-col">
      {/* 拖拽区域和主题切换 */}
      <div className="h-12 w-full relative flex items-center justify-between px-4" style={{ WebkitAppRegion: 'drag' } as any}>
        <div></div> {/* 占位符 */}
        {mounted && (
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            style={{ WebkitAppRegion: 'no-drag' } as any}
          >
            {theme === 'light' ? (
              <Moon className="w-5 h-5 text-[var(--bready-text-muted)]" />
            ) : (
              <Sun className="w-5 h-5 text-[var(--bready-text-muted)]" />
            )}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto" style={{ WebkitAppRegion: 'no-drag' } as any}>
        <div className="min-h-full flex items-center justify-center p-6">
          <div className="max-w-3xl mx-auto">
            {/* Logo 和标题 */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-black text-white dark:bg-white dark:text-black rounded-2xl mb-6 shadow-xl">
                <Sparkles className="w-8 h-8" />
              </div>
              <h1 className="text-4xl font-semibold mb-3 tracking-tight">
                {t('welcome.title')}
              </h1>
              <p className="text-lg text-[var(--bready-text-muted)]">
                {t('welcome.tagline')}
              </p>
            </div>

            {/* 产品介绍 */}
            <Card className="mb-8 border-[var(--bready-border)] rounded-3xl bg-[var(--bready-surface)] shadow-sm">
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 m-2">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-[var(--bready-surface-2)] rounded-xl flex items-center justify-center mx-auto mb-4">
                      <Zap className="w-6 h-6 text-[var(--bready-text)]" />
                    </div>
                    <h3 className="font-semibold text-[var(--bready-text)] mb-2 text-base">{t('welcome.features.collaboration.title')}</h3>
                    <ul className="space-y-2 text-sm text-[var(--bready-text-muted)]">
                      {collaborationItems.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-[var(--bready-surface-2)] rounded-xl flex items-center justify-center mx-auto mb-4">
                      <Mic className="w-6 h-6 text-[var(--bready-text)]" />
                    </div>
                    <h3 className="font-semibold text-[var(--bready-text)] mb-2 text-base">{t('welcome.features.audio.title')}</h3>
                    <ul className="space-y-2 text-sm text-[var(--bready-text-muted)]">
                      {audioItems.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-[var(--bready-surface-2)] rounded-xl flex items-center justify-center mx-auto mb-4">
                      <Shield className="w-6 h-6 text-[var(--bready-text)]" />
                    </div>
                    <h3 className="font-semibold text-[var(--bready-text)] mb-2 text-base">{t('welcome.features.privacy.title')}</h3>
                    <ul className="space-y-2 text-sm text-[var(--bready-text-muted)]">
                      {privacyItems.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 操作按钮 */}
            <div className="text-center my-6">
              <Button
                onClick={handleGetStarted}
                size="lg"
                className="h-12 px-6 text-base font-medium group shadow-lg hover:shadow-xl cursor-pointer bg-black text-white dark:bg-white dark:text-black rounded-full"
              >
                <span>{t('welcome.cta')}</span>
                <ArrowRight className="ml-3 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>

            {/* 跳过按钮 */}
            <div className="text-center">
              <Button
                onClick={onComplete}
                variant="ghost"
                className="text-[var(--bready-text-muted)] hover:text-[var(--bready-text)] text-sm cursor-pointer"
              >
                {t('welcome.skip')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WelcomePage
