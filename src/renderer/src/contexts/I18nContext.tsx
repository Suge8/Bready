import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { SUPPORTED_LANGUAGES, translations, type SupportedLanguage } from '../i18n/translations'

interface I18nContextValue {
  language: SupportedLanguage
  setLanguage: (language: SupportedLanguage) => void
  t: (key: string, vars?: Record<string, string | number>) => string
  list: (key: string) => string[]
  languageOptions: { value: SupportedLanguage; label: string }[]
  locale: string
}

const STORAGE_KEY = 'bready-ui-language'
const AI_LANGUAGE_KEY = 'bready-selected-language'

const I18nContext = createContext<I18nContextValue | undefined>(undefined)

const getByPath = (obj: any, path: string) => {
  return path.split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj)
}

const interpolate = (text: string, vars?: Record<string, string | number>) => {
  if (!vars) return text
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const value = vars[key]
    return value === undefined ? '' : String(value)
  })
}

const normalizeSystemLanguage = (language?: string): SupportedLanguage | null => {
  if (!language) return null
  const normalized = language.toLowerCase()
  if (normalized.startsWith('zh')) return 'cmn-CN'
  if (normalized.startsWith('en')) return 'en-US'
  if (normalized.startsWith('ja')) return 'ja-JP'
  if (normalized.startsWith('fr')) return 'fr-FR'
  return null
}

const detectSystemLanguage = (): SupportedLanguage => {
  if (typeof navigator === 'undefined') return 'cmn-CN'
  const candidates = [navigator.language, ...(navigator.languages || [])]
  for (const candidate of candidates) {
    const mapped = normalizeSystemLanguage(candidate)
    if (mapped) return mapped
  }
  return 'cmn-CN'
}

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<SupportedLanguage>(() => {
    if (typeof window === 'undefined') return 'cmn-CN'
    const stored = localStorage.getItem(STORAGE_KEY) as SupportedLanguage | null
    if (stored && SUPPORTED_LANGUAGES.includes(stored)) {
      return stored
    }
    return detectSystemLanguage()
  })

  useEffect(() => {
    if (typeof document !== 'undefined') {
      const htmlLanguage = language === 'cmn-CN' ? 'zh-CN' : language === 'zh-en' ? 'zh-CN' : language
      document.documentElement.lang = htmlLanguage
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, language)
      if (!localStorage.getItem(AI_LANGUAGE_KEY)) {
        localStorage.setItem(AI_LANGUAGE_KEY, language)
      }
    }
  }, [language])

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const value = getByPath(translations[language], key) ?? getByPath(translations['cmn-CN'], key)
      if (typeof value !== 'string') {
        return key
      }
      return interpolate(value, vars)
    },
    [language]
  )

  const list = useCallback(
    (key: string) => {
      const value = getByPath(translations[language], key) ?? getByPath(translations['cmn-CN'], key)
      return Array.isArray(value) ? value : []
    },
    [language]
  )

  const languageOptions = useMemo(
    () => SUPPORTED_LANGUAGES.map((lang) => ({ value: lang, label: t(`languages.${lang}`) })),
    [t]
  )

  const locale = useMemo(() => {
    if (language === 'cmn-CN' || language === 'zh-en') return 'zh-CN'
    return language
  }, [language])

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t,
      list,
      languageOptions,
      locale
    }),
    [language, setLanguage, t, list, languageOptions, locale]
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export const useI18n = () => {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider')
  }
  return context
}

export type { SupportedLanguage }
