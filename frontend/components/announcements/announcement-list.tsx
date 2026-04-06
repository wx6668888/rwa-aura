'use client'

import { useTranslation, Locale } from '@/lib/i18n'
import { Eye, ArrowRight, Pin } from 'lucide-react'
import Link from 'next/link'
import { announcements, getAnnouncementsByCategory } from '@/lib/announcements-data'
import { getLocalizedAnnouncementMeta } from '@/lib/announcements-localized'

interface AnnouncementListProps {
  selectedCategory: string
  searchQuery: string
  locale: Locale
}

const categoryColors = {
  update: { bg: 'bg-plasma-cyan/15', text: 'text-plasma-cyan', border: 'border-plasma-cyan' },
  activity: { bg: 'bg-[#f59e0b]/15', text: 'text-[#f59e0b]', border: 'border-[#f59e0b]' },
  security: { bg: 'bg-[#f43f5e]/15', text: 'text-[#f43f5e]', border: 'border-[#f43f5e]' },
  partnership: { bg: 'bg-[#8b5cf6]/15', text: 'text-[#8b5cf6]', border: 'border-[#8b5cf6]' },
  maintenance: { bg: 'bg-[#fb923c]/15', text: 'text-[#fb923c]', border: 'border-[#fb923c]' },
}

export default function AnnouncementList({
  selectedCategory,
  searchQuery,
  locale,
}: AnnouncementListProps) {
  const { t } = useTranslation(locale)

  const filteredAnnouncements = getAnnouncementsByCategory(selectedCategory).filter((ann) => {
    if (!searchQuery) return true
    const { title } = getLocalizedAnnouncementMeta(ann.slug, locale, t)
    const titleNorm = title.toLowerCase()
    const queryNorm = searchQuery.toLowerCase()
    const slugNorm = ann.slug.toLowerCase()
    const tagsNorm = ann.tags.join(' ').toLowerCase()
    return titleNorm.includes(queryNorm) || slugNorm.includes(queryNorm) || tagsNorm.includes(queryNorm)
  })

  const pinnedAnnouncement = filteredAnnouncements.find((ann) => ann.isPinned)
  const regularAnnouncements = filteredAnnouncements.filter((ann) => !ann.isPinned)

  return (
    <div>
      {/* Pinned Announcement */}
      {pinnedAnnouncement && (
        (() => {
          const meta = getLocalizedAnnouncementMeta(pinnedAnnouncement.slug, locale, t)
          return (
        <div className="relative mb-4 p-6 bg-surface-1 border border-plasma-cyan rounded-2xl shadow-[0_0_30px_rgba(0,245,212,0.15)] hover:-translate-y-1 transition-all duration-200">
          {/* Pin Indicator */}
          <div className="absolute top-0 right-0 bg-surface-2 rounded-bl-xl px-3 py-1.5 flex items-center gap-1.5">
            <Pin className="w-3 h-3 text-plasma-cyan" />
            <span className="text-[11px] text-plasma-cyan font-semibold">{t('announce.pinned')}</span>
          </div>

          {/* Category and Date */}
          <div className="flex justify-between items-center mb-3">
            <span className={`px-3 py-1 rounded-full text-[11px] font-semibold ${categoryColors[pinnedAnnouncement.category].bg} ${categoryColors[pinnedAnnouncement.category].text}`}>
              {t(`announce.cat${pinnedAnnouncement.category.charAt(0).toUpperCase() + pinnedAnnouncement.category.slice(1)}`)}
            </span>
            <span className="text-[12px] text-text-secondary font-mono">{pinnedAnnouncement.date}</span>
          </div>

          {/* Title */}
          <Link href={`/announcements/${pinnedAnnouncement.slug}`}>
            <h3 className="text-[22px] font-bold text-text-primary hover:text-plasma-cyan transition-colors cursor-pointer font-space-grotesk">
              {meta.title}
            </h3>
          </Link>

          {/* Preview */}
          <p className="mt-2 text-[14px] text-text-secondary leading-relaxed line-clamp-3">
            {meta.preview}
          </p>

          {/* Footer */}
          <div className="mt-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-plasma-cyan/20 flex items-center justify-center">
                <span className="text-[10px] text-plasma-cyan font-bold">R</span>
              </div>
              <span className="text-[13px] text-text-secondary">{pinnedAnnouncement.author}</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-text-disabled">
                <Eye className="w-3 h-3" />
                <span className="text-[12px] font-mono">{pinnedAnnouncement.views.toLocaleString()}</span>
              </div>
              <Link
                href={`/announcements/${pinnedAnnouncement.slug}`}
                className="text-[13px] text-plasma-cyan hover:underline flex items-center gap-1"
              >
                {t('announce.readMore')}
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
          )
        })()
      )}

      {/* Regular Announcements */}
      <div className="space-y-4">
        {regularAnnouncements.map((ann) => {
          const colors = categoryColors[ann.category]
          const isSecurityAlert = ann.category === 'security'
          const meta = getLocalizedAnnouncementMeta(ann.slug, locale, t)

          return (
            <div
              key={ann.id}
              className={`p-5 bg-surface-1 border ${isSecurityAlert ? 'border-[#f43f5e]' : 'border-border-subtle'} rounded-xl hover:border-border-active hover:-translate-y-1 transition-all duration-200 backdrop-blur-xl`}
            >
              {/* Top Row */}
              <div className="flex justify-between items-start">
                <span className={`px-3 py-1 rounded-full text-[11px] font-semibold ${colors.bg} ${colors.text}`}>
                  {t(`announce.cat${ann.category.charAt(0).toUpperCase() + ann.category.slice(1)}`)}
                </span>
                {ann.isNew && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#10b981]/15 text-[#10b981]">
                    NEW
                  </span>
                )}
              </div>

              {/* Date */}
              <div className="mt-2 text-[12px] text-text-disabled font-mono">{ann.date}</div>

              {/* Title */}
              <Link href={`/announcements/${ann.slug}`}>
                <h3 className="mt-3 text-[17px] font-bold text-text-primary hover:text-plasma-cyan transition-colors cursor-pointer font-space-grotesk">
                  {meta.title}
                </h3>
              </Link>

              {/* Preview */}
              <p className="mt-2 text-[13px] text-text-secondary leading-relaxed line-clamp-2">
                {meta.preview}
              </p>

              {/* Footer */}
              <div className="mt-3 flex justify-between items-center">
                <div className="flex items-center gap-3 text-[12px]">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full bg-plasma-cyan/20 flex items-center justify-center">
                      <span className="text-[9px] text-plasma-cyan font-bold">R</span>
                    </div>
                    <span className="text-text-secondary">{ann.author}</span>
                  </div>
                  <span className="text-text-disabled">·</span>
                  <span className="text-text-disabled">{ann.readTime}{t('announce.minRead')}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-text-disabled">
                    <Eye className="w-3 h-3" />
                    <span className="text-[12px] font-mono">{ann.views.toLocaleString()}</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-text-secondary hover:text-plasma-cyan hover:translate-x-1 transition-all" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Pagination - Hidden for now as we show all announcements */}
      {regularAnnouncements.length > 10 && (
        <div className="mt-6 flex justify-center items-center gap-2">
          <button 
            disabled
            className="h-10 px-4 bg-surface-2 border border-border-subtle rounded-full text-[13px] text-text-secondary hover:border-border-active transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ←
          </button>
          <button className="h-10 px-4 bg-plasma-cyan text-void-black rounded-full text-[13px] font-semibold">
            1
          </button>
          <span className="text-text-disabled">...</span>
          <button 
            disabled
            className="h-10 px-4 bg-surface-2 border border-border-subtle rounded-full text-[13px] text-text-secondary hover:border-border-active transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            →
          </button>
        </div>
      )}
    </div>
  )
}
