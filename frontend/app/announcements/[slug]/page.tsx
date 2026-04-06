'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Eye, Clock, Calendar, Share2, Twitter, Send, Copy, Check } from 'lucide-react'
import { useState } from 'react'
import { useTranslation, Locale } from '@/lib/i18n'
import { useLocale } from '@/components/locale-provider'
import { Navbar } from '@/components/navbar'
import { BackgroundEffects } from '@/components/background-effects'
import { getAnnouncementBySlug, announcements } from '@/lib/announcements-data'
import { getLocalizedAnnouncementMeta } from '@/lib/announcements-localized'
import AnnouncementContent from '@/components/announcements/announcement-content'

export default function AnnouncementDetailPage() {
  const params = useParams()
  const slug = params.slug as string
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const [copied, setCopied] = useState(false)

  const announcement = getAnnouncementBySlug(slug)
  const announcementMeta = announcement
    ? getLocalizedAnnouncementMeta(announcement.slug, locale as Locale, t)
    : null
  
  if (!announcement) {
    return (
      <div className="min-h-screen bg-void-black text-text-primary">
        <BackgroundEffects />
        <Navbar />
        <main className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
          <h1 className="text-4xl font-bold text-text-primary mb-4">404</h1>
          <p className="text-text-secondary mb-8">{t('announce.notFound')}</p>
          <Link
            href="/announcements"
            className="inline-flex items-center gap-2 px-6 py-3 bg-plasma-cyan text-void-black rounded-full font-medium hover:brightness-110 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('announce.backToList')}
          </Link>
        </main>
      </div>
    )
  }

  const currentIndex = announcements.findIndex((a) => a.slug === slug)
  const prevAnnouncement = currentIndex > 0 ? announcements[currentIndex - 1] : null
  const nextAnnouncement = currentIndex < announcements.length - 1 ? announcements[currentIndex + 1] : null

  const categoryColors = {
    update: { bg: 'bg-plasma-cyan/15', text: 'text-plasma-cyan' },
    activity: { bg: 'bg-[#f59e0b]/15', text: 'text-[#f59e0b]' },
    security: { bg: 'bg-[#f43f5e]/15', text: 'text-[#f43f5e]' },
    partnership: { bg: 'bg-[#8b5cf6]/15', text: 'text-[#8b5cf6]' },
    maintenance: { bg: 'bg-[#fb923c]/15', text: 'text-[#fb923c]' },
  }

  const colors = categoryColors[announcement.category]

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShare = (platform: 'twitter' | 'telegram') => {
    const url = window.location.href
    const title = announcementMeta?.title || announcement?.slug || ''
    
    if (platform === 'twitter') {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`, '_blank')
    } else {
      window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`, '_blank')
    }
  }

  return (
    <div className="min-h-screen bg-void-black text-text-primary">
      <BackgroundEffects />
      <Navbar />

      <main className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 pt-below-navbar-safe pb-24">
        {/* Back Link */}
        <Link
          href="/announcements"
          className="inline-flex items-center gap-2 text-plasma-cyan hover:underline mb-8 text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('announce.backToList')}
        </Link>

        {/* Article Container */}
        <article className="max-w-[740px] mx-auto">
          {/* Header */}
          <header className="mb-8">
            {/* Category and Date */}
            <div className="flex items-center justify-between mb-4">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${colors.bg} ${colors.text}`}>
                {t(`announce.cat${announcement.category.charAt(0).toUpperCase() + announcement.category.slice(1)}`)}
              </span>
              <div className="flex items-center gap-2 text-sm text-text-secondary font-mono">
                <Calendar className="w-4 h-4" />
                {announcement.date}
              </div>
            </div>

            {/* Title */}
            <h1 className="text-4xl font-[800] text-text-primary leading-tight font-space-grotesk">
              {announcementMeta?.title}
            </h1>

            {/* Meta Row */}
            <div className="mt-6 pt-6 border-t border-border-subtle flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-plasma-cyan/20 flex items-center justify-center">
                  <span className="text-xs text-plasma-cyan font-bold">R</span>
                </div>
                <span className="text-text-secondary">{announcement.author}</span>
              </div>
              <span className="text-text-disabled">·</span>
              <div className="flex items-center gap-1.5 text-text-secondary">
                <Clock className="w-4 h-4" />
                {announcement.readTime}{t('announce.minRead')}
              </div>
              <span className="text-text-disabled">·</span>
              <div className="flex items-center gap-1.5 text-text-secondary">
                <Eye className="w-4 h-4" />
                {announcement.views.toLocaleString()}
              </div>
            </div>
          </header>

          {/* Content */}
          <AnnouncementContent slug={announcement.slug} locale={locale as Locale} />

          {/* Footer */}
          <footer className="mt-12 pt-8 border-t border-border-subtle">
            {/* Tags */}
            <div className="mb-6">
              <div className="flex flex-wrap gap-2">
                {announcement.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-surface-2 border border-border-subtle rounded-full text-xs text-text-secondary hover:border-border-active transition-all cursor-pointer"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Share */}
            <div className="mb-8">
              <div className="text-sm text-text-secondary mb-3">{t('announce.share')}</div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleShare('twitter')}
                  className="h-10 px-4 bg-surface-2 border border-border-subtle rounded-full flex items-center gap-2 text-sm text-text-secondary hover:border-border-active transition-all"
                >
                  <Twitter className="w-4 h-4" />
                  Twitter
                </button>
                <button
                  onClick={() => handleShare('telegram')}
                  className="h-10 px-4 bg-surface-2 border border-border-subtle rounded-full flex items-center gap-2 text-sm text-text-secondary hover:border-border-active transition-all"
                >
                  <Send className="w-4 h-4" />
                  Telegram
                </button>
                <button
                  onClick={handleCopyLink}
                  className="h-10 px-4 bg-surface-2 border border-border-subtle rounded-full flex items-center gap-2 text-sm text-text-secondary hover:border-border-active transition-all"
                >
                  {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                  {copied ? t('announce.copied') : t('announce.copyLink')}
                </button>
              </div>
            </div>

            {/* Navigation */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {prevAnnouncement && (
                <Link
                  href={`/announcements/${prevAnnouncement.slug}`}
                  className="p-4 bg-surface-1 border border-border-subtle rounded-xl hover:border-border-active transition-all group"
                >
                  <div className="text-xs text-text-disabled mb-2">← {t('announce.previous')}</div>
                  <div className="text-sm font-semibold text-text-primary group-hover:text-plasma-cyan transition-colors line-clamp-2">
                    {getLocalizedAnnouncementMeta(prevAnnouncement.slug, locale as Locale, t).title}
                  </div>
                </Link>
              )}
              {nextAnnouncement && (
                <Link
                  href={`/announcements/${nextAnnouncement.slug}`}
                  className="p-4 bg-surface-1 border border-border-subtle rounded-xl hover:border-border-active transition-all group text-right sm:col-start-2"
                >
                  <div className="text-xs text-text-disabled mb-2">{t('announce.next')} →</div>
                  <div className="text-sm font-semibold text-text-primary group-hover:text-plasma-cyan transition-colors line-clamp-2">
                    {getLocalizedAnnouncementMeta(nextAnnouncement.slug, locale as Locale, t).title}
                  </div>
                </Link>
              )}
            </div>
          </footer>
        </article>
      </main>
    </div>
  )
}
