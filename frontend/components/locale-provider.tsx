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

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('zh')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('rwa-locale') as Locale | null
    if (stored) {
      setLocaleState(stored)
      applyLocaleEffects(stored)
    }
    setMounted(true)
  }, [])

  function applyLocaleEffects(loc: Locale) {
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
    localStorage.setItem('rwa-locale', loc)
    applyLocaleEffects(loc)
  }

  if (!mounted) {
    return <>{children}</>
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      {children}
    </LocaleContext.Provider>
  )
}
