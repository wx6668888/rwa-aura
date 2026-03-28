'use client'

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { Locale } from '@/lib/i18n'

interface LocaleContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
}

const LocaleContext = createContext<LocaleContextType>({
  locale: 'zh',
  setLocale: () => {},
})

export function useLocale() {
  return useContext(LocaleContext)
}

function normalizeSystemLocale(input: string | null | undefined): Locale {
  const raw = String(input || '').toLowerCase()
  if (!raw) return 'zh'
  if (raw.startsWith('zh')) return 'zh'
  if (raw.startsWith('en')) return 'en'
  if (raw.startsWith('ko')) return 'ko'
  if (raw.startsWith('es')) return 'es'
  if (raw.startsWith('ar')) return 'ar'
  if (raw.startsWith('hi')) return 'hi'
  if (raw.startsWith('fr')) return 'fr'
  if (raw.startsWith('pt')) return 'pt'
  if (raw.startsWith('ru')) return 'ru'
  if (raw.startsWith('ja')) return 'ja'
  return 'en'
}

function detectSystemLocale(): Locale {
  if (typeof navigator === 'undefined') return 'zh'
  const preferred = navigator.languages?.[0] || navigator.language || ''
  return normalizeSystemLocale(preferred)
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('zh')

  useEffect(() => {
    let stored: Locale | null = null
    try {
      stored = localStorage.getItem('rwa-locale') as Locale | null
    } catch {
      stored = null
    }
    const initialLocale = stored || detectSystemLocale()
    setLocaleState(initialLocale)
    applyLocaleEffects(initialLocale)
  }, [])

  function applyLocaleEffects(loc: Locale) {
    if (typeof document === 'undefined') return
    if (loc === 'ar') {
      document.dir = 'rtl'
      document.documentElement.lang = 'ar'
    } else {
      document.dir = 'ltr'
      document.documentElement.lang = loc
    }
  }

  function setLocale(loc: Locale) {
    setLocaleState(loc)
    try {
      localStorage.setItem('rwa-locale', loc)
    } catch {
      /* WebView 可能禁用存储 */
    }
    applyLocaleEffects(loc)
  }

  // 必须始终挂载 Provider：此前在 mounted 前不包 Provider，Web3Provider/RainbowKit 与子页面
  // 只能拿到默认 context，部分环境下会导致客户端异常（/about、/governance 等）。
  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      {children}
    </LocaleContext.Provider>
  )
}
