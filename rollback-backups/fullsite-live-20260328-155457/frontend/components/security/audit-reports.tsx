'use client'

import { ExternalLink, FileText } from 'lucide-react'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'

const audits = [
  {
    id: 'slowmist',
    auditor: 'SlowMist',
    auditorZh: '慢雾',
    initials: 'SM',
    status: 'completed',
    critical: 0,
    high: 0,
    medium: 2,
    fixed: true,
    dateKey: 'security.auditDateMarch2025',
    pdfUrl: '/SlowMist.pdf',
    githubUrl: '#',
  },
  {
    id: 'certik',
    auditor: 'CertiK',
    auditorZh: 'CertiK',
    initials: 'CK',
    status: 'completed',
    critical: 0,
    high: 0,
    medium: 2,
    fixed: true,
    dateKey: 'security.auditDateMarch2025',
    pdfUrl: '/CertiK.pdf',
    githubUrl: '#',
  },
  {
    id: 'peckshield',
    auditor: 'PeckShield',
    auditorZh: '派盾',
    initials: 'PS',
    status: 'inProgress',
    critical: 0,
    high: 0,
    medium: 0,
    fixed: false,
    dateKey: 'security.inProgress',
    pdfUrl: null,
    githubUrl: '#',
  },
]

export function AuditReports() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)

  return (
    <section className="mt-16">
      <p
        className="text-[11px] uppercase tracking-widest text-[#64748b]"
        style={{ fontVariant: 'small-caps' }}
      >
        {t('security.auditReports')}
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {audits.map((audit) => (
          <div
            key={audit.id}
            className="rounded-xl border border-[#ffffff0d] bg-[#0d0d14] p-4 backdrop-blur-xl transition-all duration-200 hover:border-[#ffffff1a] hover:-translate-y-0.5 sm:p-6"
          >
            {/* Top row */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#13131e] font-[family-name:var(--font-jetbrains-mono)] text-xs font-bold text-[#00f5d4] sm:h-12 sm:w-12 sm:text-sm">
                  {audit.initials}
                </div>
                <h3 className="mt-2 text-base font-bold text-[#f1f5f9] sm:text-lg">
                  {audit.auditor}
                </h3>
                <p className="text-[11px] text-[#64748b] sm:text-xs">{t('security.smartContractAudit')}</p>
              </div>

              <div className="flex-shrink-0">
                {audit.status === 'completed' ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#10b9811a] px-2.5 py-1 text-[10px] font-medium text-[#10b981] sm:px-3 sm:text-xs">
                    {t('security.completed')} ✓
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#fb923c1a] px-2.5 py-1 text-[10px] font-medium text-[#fb923c] sm:px-3 sm:text-xs">
                    {t('security.inProgress')}...
                  </span>
                )}
              </div>
            </div>

            {/* Divider */}
            <div className="my-4 h-px bg-[#ffffff0d]" />

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-[#13131e] p-3">
                <div className="font-[family-name:var(--font-jetbrains-mono)] text-2xl font-bold text-[#10b981]">
                  {audit.critical}
                </div>
                <div className="text-[11px] text-[#64748b]">{t('security.critical')}</div>
              </div>

              <div className="rounded-lg bg-[#13131e] p-3">
                <div className="font-[family-name:var(--font-jetbrains-mono)] text-2xl font-bold text-[#10b981]">
                  {audit.high}
                </div>
                <div className="text-[11px] text-[#64748b]">{t('security.high')}</div>
              </div>

              <div className="rounded-lg bg-[#13131e] p-3">
                <div className="font-[family-name:var(--font-jetbrains-mono)] text-2xl font-bold text-[#fb923c]">
                  {audit.medium}
                </div>
                <div className="text-[11px] text-[#64748b]">{t('security.medium')}</div>
              </div>

              <div className="rounded-lg bg-[#13131e] p-3">
                <div className="font-[family-name:var(--font-jetbrains-mono)] text-sm font-bold text-[#10b981]">
                  {audit.fixed ? t('security.fixed') : '-'}
                </div>
                <div className="text-[11px] text-[#64748b]">{t('security.fixStatus')}</div>
              </div>
            </div>

            {/* Date */}
            <p className="mt-3 text-xs text-[#64748b]">
              {audit.status === 'completed' ? `${t('security.auditDate')}: ${t(audit.dateKey)}` : t(audit.dateKey)}
            </p>

            {/* Actions */}
            <div className="mt-4 flex flex-wrap gap-2">
              {audit.pdfUrl && (
                <a
                  href={audit.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-[#ffffff1a] px-3 py-2 text-[11px] text-[#00f5d4] transition-colors hover:bg-[#13131e] sm:flex-initial sm:px-4 sm:text-xs"
                >
                  <FileText className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="truncate">{t('security.viewReport')}</span>
                </a>
              )}
              <a
                href={audit.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-[#ffffff1a] px-3 py-2 text-[11px] text-[#f1f5f9] transition-colors hover:bg-[#13131e] sm:flex-initial sm:px-4 sm:text-xs"
              >
                <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
                <span>GitHub</span>
              </a>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
