'use client'

import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import { Mail, Shield, MessageCircle } from 'lucide-react'

export function ContactSection() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)

  const contacts = [
    {
      icon: Mail,
      title: t('about.contactBusiness'),
      email: 'rwacoin001@gmail.com',
      desc: t('about.contactBusinessDesc'),
      buttonText: t('about.sendEmail'),
      buttonStyle: 'ghost',
    },
    {
      icon: Shield,
      title: t('about.contactSecurity'),
      email: 'rwacoin001@gmail.com',
      desc: t('about.contactSecurityDesc'),
      buttonText: t('about.reportVuln'),
      buttonStyle: 'danger',
    },
    {
      icon: MessageCircle,
      title: t('about.contactCommunity'),
      email: '',
      desc: t('about.contactCommunityDesc'),
      buttonText: '',
      buttonStyle: 'social',
    },
  ]

  return (
    <section className="px-4 py-16 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-10 text-center">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-[#64748b]">
            {t('about.contactLabel')}
          </div>
          <h2 className="mt-3 font-[family-name:var(--font-space-grotesk)] text-[32px] font-bold text-[#f1f5f9]">
            {t('about.contactTitle')}
          </h2>
        </div>

        {/* Contact cards */}
        <div className="grid gap-6 md:grid-cols-3">
          {contacts.map((contact, i) => {
            const Icon = contact.icon
            return (
              <div
                key={i}
                className="rounded-xl border border-[#ffffff0d] bg-[#0d0d14] p-6 text-center backdrop-blur-xl"
              >
                {/* Icon */}
                <div
                  className={`mx-auto flex h-8 w-8 items-center justify-center ${
                    contact.buttonStyle === 'danger' ? 'text-[#f43f5e]' : contact.buttonStyle === 'social' ? 'text-[#8b5cf6]' : 'text-[#00f5d4]'
                  }`}
                >
                  <Icon className="h-8 w-8" />
                </div>

                {/* Title */}
                <h3 className="mt-3 text-[15px] font-bold text-[#f1f5f9]">
                  {contact.title}
                </h3>

                {/* Email */}
                {contact.email && (
                  <div
                    className={`mt-2 font-[family-name:var(--font-jetbrains-mono)] text-[13px] ${
                      contact.buttonStyle === 'danger' ? 'text-[#f43f5e]' : 'text-[#00f5d4]'
                    }`}
                  >
                    {contact.email}
                  </div>
                )}

                {/* Description */}
                <p className="mt-2 text-xs text-[#64748b]">
                  {contact.desc}
                </p>

                {/* Button or Social links */}
                {contact.buttonStyle === 'social' ? (
                  <div className="mt-4 flex justify-center gap-2">
                    <button className="rounded-full border border-[#ffffff0d] bg-transparent px-4 py-2 text-sm font-medium text-[#64748b] transition-all hover:border-[#8b5cf6]/30 hover:text-[#8b5cf6]">
                      Telegram
                    </button>
                    <button className="rounded-full border border-[#ffffff0d] bg-transparent px-4 py-2 text-sm font-medium text-[#64748b] transition-all hover:border-[#8b5cf6]/30 hover:text-[#8b5cf6]">
                      Discord
                    </button>
                    <button className="rounded-full border border-[#ffffff0d] bg-transparent px-4 py-2 text-sm font-medium text-[#64748b] transition-all hover:border-[#8b5cf6]/30 hover:text-[#8b5cf6]">
                      Twitter
                    </button>
                  </div>
                ) : (
                  <button
                    className={`mt-4 rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                      contact.buttonStyle === 'danger'
                        ? 'border-[#f43f5e]/30 bg-transparent text-[#f43f5e] hover:bg-[#f43f5e]/10'
                        : 'border-[#ffffff0d] bg-transparent text-[#64748b] hover:border-[#00f5d4]/30 hover:text-[#00f5d4]'
                    }`}
                  >
                    {contact.buttonText}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
