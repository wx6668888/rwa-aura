import type { Locale } from '@/lib/i18n'
import { announcementsContentZh } from '@/lib/announcements-content-zh'
import { announcementsContentEn } from '@/lib/announcements-content-en'
import { announcementsContentKo } from '@/lib/announcements-content-ko'

const CONTENT_MAP = {
  zh: announcementsContentZh,
  en: announcementsContentEn,
  ko: announcementsContentKo,
} as const

type ContentEntry = {
  title?: string
  preview?: string
}

export function getLocalizedAnnouncementMeta(
  slug: string,
  locale: Locale,
  t: (key: string) => string
): { title: string; preview: string } {
  const keyTitle = `announce.detail.${slug}.title`
  const keyPreview = `announce.detail.${slug}.preview`
  const titleT = t(keyTitle)
  const previewT = t(keyPreview)

  const localized = (CONTENT_MAP[locale]?.[slug as keyof typeof announcementsContentZh] ||
    CONTENT_MAP.en[slug as keyof typeof announcementsContentEn] ||
    {}) as ContentEntry

  const title = titleT === keyTitle ? localized.title || slug : titleT
  const preview = previewT === keyPreview ? localized.preview || '' : previewT
  return { title, preview }
}
