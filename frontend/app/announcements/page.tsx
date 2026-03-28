'use client'

import { useState } from 'react'
import { useTranslation, Locale } from '@/lib/i18n'
import { useLocale } from '@/components/locale-provider'
import { Navbar } from '@/components/navbar'
import { BackgroundEffects } from '@/components/background-effects'
import AnnouncementHeader from '@/components/announcements/announcement-header'
import AnnouncementFilters from '@/components/announcements/announcement-filters'
import AnnouncementList from '@/components/announcements/announcement-list'
import AnnouncementSidebar from '@/components/announcements/announcement-sidebar'

export default function AnnouncementsPage() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <div className="min-h-screen bg-void-black text-text-primary">
      <BackgroundEffects />
      <Navbar />

      <main className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 pt-below-navbar-safe pb-24">
        {/* Header */}
        <AnnouncementHeader />

        {/* Main Layout */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">
          {/* Left Column - Announcement Feed */}
          <div>
            <AnnouncementFilters
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              locale={locale as Locale}
            />
            <AnnouncementList
              selectedCategory={selectedCategory}
              searchQuery={searchQuery}
              locale={locale as Locale}
            />
          </div>

          {/* Right Column - Sidebar */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <AnnouncementSidebar locale={locale as Locale} />
          </div>
        </div>
      </main>
    </div>
  )
}
