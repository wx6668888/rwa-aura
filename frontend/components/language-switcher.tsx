'use client'

import { useState, useRef, useEffect } from 'react'
import { Globe } from 'lucide-react'
import { useLocale } from '@/components/locale-provider'
import { localeOptions } from '@/lib/i18n'
import type { Locale } from '@/lib/i18n'

// 语言对应的国旗 emoji
const languageFlags: Record<Locale, string> = {
  zh: '🇨🇳',
  en: '🇺🇸',
  ko: '🇰🇷',
  es: '🇪🇸',
  ar: '🇸🇦',
  hi: '🇮🇳',
  fr: '🇫🇷',
  pt: '🇧🇷',
  ru: '🇷🇺',
  ja: '🇯🇵',
}

// 语言显示名称
const languageNames: Record<Locale, string> = {
  zh: '中文',
  en: 'English',
  ko: '한국어',
  es: 'Español',
  ar: 'العربية',
  hi: 'हिन्दी',
  fr: 'Français',
  pt: 'Português',
  ru: 'Русский',
  ja: '日本語',
}

export function LanguageSwitcher() {
  const { locale, setLocale } = useLocale()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const current = localeOptions.find((o) => o.value === locale) || localeOptions[0]

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleSelect(code: Locale) {
    setLocale(code)
    setOpen(false)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-full px-3 py-2 text-sm text-[#64748b] transition-colors hover:bg-[#13131e] hover:text-[#f1f5f9] whitespace-nowrap shrink-0"
        aria-label="Switch language"
      >
        <Globe className="h-4 w-4 shrink-0" />
        <span className="hidden sm:inline">{languageNames[locale] || current.label}</span>
      </button>

      {open && (
        <div className="absolute start-0 top-full z-[100] mt-2 min-w-[180px] overflow-hidden rounded-xl border border-[#64748b]/30 bg-[#334155]/60 backdrop-blur-3xl shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
          {localeOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleSelect(option.value as Locale)}
              className="flex h-10 w-full items-center justify-between px-4 text-sm transition-colors hover:bg-[#64748b]/50"
            >
              <span className={option.value === locale ? 'text-[#00f5d4]' : 'text-[#e2e8f0]'}>
                {languageFlags[option.value as Locale]} {languageNames[option.value as Locale] || option.label}
              </span>
              {option.value === locale && (
                <svg
                  className="h-4 w-4 text-[#00f5d4]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
