'use client'

import { useTranslation, Locale } from '@/lib/i18n'
import { Search } from 'lucide-react'

interface AnnouncementFiltersProps {
  selectedCategory: string
  onCategoryChange: (category: string) => void
  searchQuery: string
  onSearchChange: (query: string) => void
  locale: Locale
}

const categories = [
  { id: 'all', key: 'announce.all', color: 'plasma-cyan' },
  { id: 'update', key: 'announce.catUpdate', color: 'plasma-cyan' },
  { id: 'activity', key: 'announce.catActivity', color: 'gold-node' },
  { id: 'security', key: 'announce.catSecurity', color: 'danger' },
  { id: 'partnership', key: 'announce.catPartnership', color: 'void-purple' },
  { id: 'maintenance', key: 'announce.catMaintenance', color: 'warning' },
]

export default function AnnouncementFilters({
  selectedCategory,
  onCategoryChange,
  searchQuery,
  onSearchChange,
  locale,
}: AnnouncementFiltersProps) {
  const { t } = useTranslation(locale)

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
      {/* Category Pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 w-full sm:w-auto scrollbar-hide">
        {categories.map((cat) => {
          const isActive = selectedCategory === cat.id
          const isAll = cat.id === 'all'

          return (
            <button
              key={cat.id}
              onClick={() => onCategoryChange(cat.id)}
              className={`
                h-9 px-4 rounded-full whitespace-nowrap text-[13px] font-medium
                flex items-center gap-2 transition-all
                ${
                  isActive
                    ? 'bg-plasma-cyan text-void-black'
                    : 'bg-surface-2 text-text-secondary border border-border-subtle hover:border-border-active'
                }
              `}
            >
              {!isAll && !isActive && (
                <span
                  className={`w-1.5 h-1.5 rounded-full bg-${cat.color}`}
                  style={{
                    backgroundColor:
                      cat.color === 'plasma-cyan'
                        ? '#00f5d4'
                        : cat.color === 'gold-node'
                        ? '#f59e0b'
                        : cat.color === 'danger'
                        ? '#f43f5e'
                        : cat.color === 'void-purple'
                        ? '#8b5cf6'
                        : '#fb923c',
                  }}
                />
              )}
              {t(cat.key)}
            </button>
          )
        })}
      </div>

      {/* Search Input - Desktop Only */}
      <div className="hidden sm:block relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-disabled" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t('announce.search')}
          className="h-10 w-48 bg-surface-1 border border-border-subtle rounded-full pl-10 pr-4 text-[13px] text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-border-active transition-all"
        />
      </div>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  )
}
