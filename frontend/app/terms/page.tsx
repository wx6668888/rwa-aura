'use client'

import { Navbar } from '@/components/navbar'
import { BackgroundEffects } from '@/components/background-effects'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'

export default function TermsPage() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)

  return (
    <div className="min-h-screen bg-[#05050a] font-sans">
      <BackgroundEffects />
      <Navbar />
      <main className="relative z-10 mx-auto max-w-4xl px-4 pb-16 pt-[calc(4rem+var(--app-safe-top))] lg:px-8">
        <div className="rounded-2xl border border-[#ffffff0d] bg-[#0d0d14] p-8 backdrop-blur-xl">
          <h1 className="mb-8 font-[family-name:var(--font-space-grotesk)] text-4xl font-bold text-[#f1f5f9]">
            {t('about.footerTerms')}
          </h1>
          
          <div className="prose prose-invert max-w-none space-y-6 text-[#64748b]">
            <section>
              <h2 className="mb-4 font-[family-name:var(--font-space-grotesk)] text-2xl font-bold text-[#f1f5f9]">
                {t('terms.section1Title')}
              </h2>
              <p className="leading-7">{t('terms.section1Content')}</p>
            </section>

            <section>
              <h2 className="mb-4 font-[family-name:var(--font-space-grotesk)] text-2xl font-bold text-[#f1f5f9]">
                {t('terms.section2Title')}
              </h2>
              <p className="leading-7">{t('terms.section2Content')}</p>
            </section>

            <section>
              <h2 className="mb-4 font-[family-name:var(--font-space-grotesk)] text-2xl font-bold text-[#f1f5f9]">
                {t('terms.section3Title')}
              </h2>
              <p className="leading-7">{t('terms.section3Content')}</p>
            </section>

            <section>
              <h2 className="mb-4 font-[family-name:var(--font-space-grotesk)] text-2xl font-bold text-[#f1f5f9]">
                {t('terms.section4Title')}
              </h2>
              <p className="leading-7">{t('terms.section4Content')}</p>
            </section>

            <section>
              <h2 className="mb-4 font-[family-name:var(--font-space-grotesk)] text-2xl font-bold text-[#f1f5f9]">
                {t('terms.section5Title')}
              </h2>
              <p className="leading-7">{t('terms.section5Content')}</p>
            </section>

            <section>
              <h2 className="mb-4 font-[family-name:var(--font-space-grotesk)] text-2xl font-bold text-[#f1f5f9]">
                {t('terms.section6Title')}
              </h2>
              <p className="leading-7">{t('terms.section6Content')}</p>
            </section>

            <section>
              <h2 className="mb-4 font-[family-name:var(--font-space-grotesk)] text-2xl font-bold text-[#f1f5f9]">
                {t('terms.section7Title')}
              </h2>
              <p className="leading-7">{t('terms.section7Content')}</p>
            </section>

            <div className="mt-8 border-t border-[#ffffff0d] pt-6 text-sm text-[#334155]">
              <p>{t('terms.lastUpdated')}</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
