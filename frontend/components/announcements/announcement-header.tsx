'use client'

import { useTranslation, Locale } from '@/lib/i18n'
import { useLocale } from '@/components/locale-provider'
import { Megaphone, Bell } from 'lucide-react'
import { useState } from 'react'

export default function AnnouncementHeader() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const [email, setEmail] = useState('')

  const handleSubscribe = () => {
    // TODO: Implement subscription logic
    console.log('Subscribe:', email)
  }

  return (
    <div className="pt-10 pb-6 text-center">
      {/* Icon with shake animation */}
      <div className="mx-auto w-11 h-11 flex items-center justify-center">
        <Megaphone 
          className="w-11 h-11 text-plasma-cyan animate-shake" 
          strokeWidth={2}
        />
      </div>

      {/* Overline */}
      <div className="mt-4 text-[11px] uppercase tracking-widest text-text-secondary font-medium">
        {t('announce.overline')}
      </div>

      {/* Title */}
      <h1 className="mt-3 text-4xl font-[800] text-text-primary max-w-2xl mx-auto font-space-grotesk">
        {t('announce.title')}
      </h1>

      {/* Subtitle */}
      <p className="mt-3 text-[15px] text-text-secondary max-w-xl mx-auto leading-relaxed">
        {t('announce.subtitle')}
      </p>

      {/* Subscription Row */}
      <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3 px-4">
        {/* Email Input with Subscribe Button */}
        <div className="relative w-full sm:w-auto flex items-center">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('announce.emailPlaceholder')}
            className="h-11 w-full sm:w-[320px] bg-surface-1 border border-border-active rounded-full pl-5 pr-28 text-text-primary placeholder:text-text-disabled focus:outline-none focus:ring-2 focus:ring-plasma-cyan/50 transition-all"
          />
          <button
            onClick={handleSubscribe}
            className="absolute right-1 h-9 px-5 bg-plasma-cyan text-void-black rounded-full font-medium flex items-center gap-2 hover:brightness-110 hover:scale-[1.02] transition-all active:scale-[0.98] whitespace-nowrap text-sm"
          >
            <Bell className="w-3.5 h-3.5" />
            {t('announce.subscribe')}
          </button>
        </div>

        {/* Social Links */}
        <div className="flex gap-2">
          <a
            href="https://twitter.com/RWAProtocol"
            target="_blank"
            rel="noopener noreferrer"
            className="h-11 w-11 bg-surface-2 border border-border-subtle rounded-full flex items-center justify-center hover:border-border-active transition-all"
            aria-label="Twitter"
          >
            <span className="text-lg">𝕏</span>
          </a>
          <a
            href="https://t.me/RWAProtocol"
            target="_blank"
            rel="noopener noreferrer"
            className="h-11 w-11 bg-surface-2 border border-border-subtle rounded-full flex items-center justify-center hover:border-border-active transition-all"
            aria-label="Telegram"
          >
            <span className="text-lg">✈</span>
          </a>
        </div>
      </div>

      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-5deg); }
          75% { transform: rotate(5deg); }
        }
        .animate-shake {
          animation: shake 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
