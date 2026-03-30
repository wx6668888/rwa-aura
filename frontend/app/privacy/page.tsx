'use client'

import { Navbar } from '@/components/navbar'
import { BackgroundEffects } from '@/components/background-effects'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'

export default function PrivacyPage() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)

  return (
    <div className="min-h-screen bg-[#05050a] font-sans">
      <BackgroundEffects />
      <Navbar />
      <main className="relative z-10 mx-auto max-w-4xl px-4 pb-16 pt-[calc(4rem+var(--app-safe-top))] lg:px-8">
        <div className="rounded-2xl border border-[#ffffff0d] bg-[#0d0d14] p-8 backdrop-blur-xl">
          <h1 className="mb-8 font-[family-name:var(--font-space-grotesk)] text-4xl font-bold text-[#f1f5f9]">
            {t('about.footerPrivacy')}
          </h1>
          
          <div className="prose prose-invert max-w-none space-y-6 text-[#64748b]">
            <section id="clauses">
              <h2 className="mb-4 font-[family-name:var(--font-space-grotesk)] text-2xl font-bold text-[#f1f5f9]">
                {t('privacy.section1Title')}
              </h2>
              <p className="leading-7">{t('privacy.section1Content')}</p>
            </section>

            <section>
              <h2 className="mb-4 font-[family-name:var(--font-space-grotesk)] text-2xl font-bold text-[#f1f5f9]">
                {t('privacy.section2Title')}
              </h2>
              <p className="leading-7">{t('privacy.section2Content')}</p>
            </section>

            <section>
              <h2 className="mb-4 font-[family-name:var(--font-space-grotesk)] text-2xl font-bold text-[#f1f5f9]">
                {t('privacy.section3Title')}
              </h2>
              <p className="leading-7">{t('privacy.section3Content')}</p>
            </section>

            <section>
              <h2 className="mb-4 font-[family-name:var(--font-space-grotesk)] text-2xl font-bold text-[#f1f5f9]">
                {t('privacy.section4Title')}
              </h2>
              <p className="leading-7">{t('privacy.section4Content')}</p>
            </section>

            <section>
              <h2 className="mb-4 font-[family-name:var(--font-space-grotesk)] text-2xl font-bold text-[#f1f5f9]">
                {t('privacy.section5Title')}
              </h2>
              <p className="leading-7">{t('privacy.section5Content')}</p>
            </section>

            <section>
              <h2 className="mb-4 font-[family-name:var(--font-space-grotesk)] text-2xl font-bold text-[#f1f5f9]">
                {t('privacy.section6Title')}
              </h2>
              <p className="leading-7">{t('privacy.section6Content')}</p>
            </section>

            <section>
              <h2 className="mb-4 font-[family-name:var(--font-space-grotesk)] text-2xl font-bold text-[#f1f5f9]">
                {t('privacy.section7Title')}
              </h2>
              <p className="leading-7">{t('privacy.section7Content')}</p>
            </section>

            <div className="mt-8 border-t border-[#ffffff0d] pt-6 text-sm text-[#334155]">
              <p>{t('privacy.lastUpdated')}</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
