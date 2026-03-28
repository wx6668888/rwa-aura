'use client'

import { useTranslation, Locale } from '@/lib/i18n'
import { ExternalLink } from 'lucide-react'

interface AnnouncementSidebarProps {
  locale: Locale
}

const timelineItems = [
  { type: 'update', titleKey: 'announce.timeline1', time: 'announce.today', color: '#00f5d4' },
  { type: 'activity', titleKey: 'announce.timeline2', time: 'announce.yesterday', color: '#f59e0b' },
  { type: 'partnership', titleKey: 'announce.timeline3', time: 'announce.days3', color: '#8b5cf6' },
  { type: 'update', titleKey: 'announce.timeline4', time: 'announce.days8', color: '#00f5d4' },
  { type: 'security', titleKey: 'announce.timeline5', time: 'announce.days13', color: '#f43f5e' },
  { type: 'activity', titleKey: 'announce.timeline6', time: 'announce.days18', color: '#f59e0b' },
]

const categoryStats = [
  { type: 'update', key: 'announce.catUpdate', count: 12, color: '#00f5d4' },
  { type: 'activity', key: 'announce.catActivity', count: 8, color: '#f59e0b' },
  { type: 'security', key: 'announce.catSecurity', count: 3, color: '#f43f5e' },
  { type: 'partnership', key: 'announce.catPartnership', count: 5, color: '#8b5cf6' },
  { type: 'maintenance', key: 'announce.catMaintenance', count: 4, color: '#fb923c' },
]

const socialChannels = [
  { icon: '𝕏', name: 'Twitter', handle: '@RWAProtocol', followers: '12.4K', color: '#00f5d4', url: 'https://twitter.com/RWAProtocol' },
  { icon: '✈', name: 'Telegram', handle: 'announce.joinGroup', followers: '8,234', color: '#8b5cf6', url: 'https://t.me/RWAProtocol' },
  { icon: '💬', name: 'Discord', handle: 'announce.joinCommunity', followers: '5,891', color: '#8b5cf6', url: 'https://discord.gg/RWAProtocol' },
  { icon: '📺', name: 'YouTube', handle: 'announce.tutorials', followers: '1,234', color: '#f43f5e', url: 'https://youtube.com/@RWAProtocol' },
]

const versions = [
  { version: 'V1.1', date: '2025-03-01', change: 'announce.v11Change', isCurrent: true },
  { version: 'V1.0.2', date: '2025-02-15', change: 'announce.v102Change', isCurrent: false },
  { version: 'V1.0.1', date: '2025-02-01', change: 'announce.v101Change', isCurrent: false },
  { version: 'V1.0', date: '2025-01-15', change: 'announce.v10Change', isCurrent: false },
]

export default function AnnouncementSidebar({ locale }: AnnouncementSidebarProps) {
  const { t } = useTranslation(locale)

  return (
    <div className="space-y-4">
      {/* Latest Activity Card */}
      <div className="p-5 bg-surface-1 border border-border-subtle rounded-xl backdrop-blur-xl">
        <h3 className="text-[13px] font-bold text-text-primary">{t('announce.latestActivity')}</h3>
        
        <div className="mt-4 space-y-4">
          {timelineItems.map((item, index) => (
            <div key={index} className="flex gap-3">
              {/* Timeline Dot and Line */}
              <div className="flex flex-col items-center">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                {index < timelineItems.length - 1 && (
                  <div className="w-px h-full bg-border-subtle mt-1" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 pb-2">
                <div className="text-[13px] text-text-primary font-medium line-clamp-1">
                  {t(item.titleKey)}
                </div>
                <div className="text-[11px] text-text-disabled mt-1">{t(item.time)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Category Stats Card */}
      <div className="p-5 bg-surface-1 border border-border-subtle rounded-xl backdrop-blur-xl">
        <h3 className="text-[13px] font-bold text-text-primary">{t('announce.byCategory')}</h3>
        
        <div className="mt-4 space-y-2">
          {categoryStats.map((cat, index) => (
            <div
              key={cat.type}
              className={`flex justify-between items-center py-2 ${
                index < categoryStats.length - 1 ? 'border-b border-border-subtle' : ''
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: cat.color }}
                />
                <span className="text-[13px] text-text-secondary">{t(cat.key)}</span>
              </div>
              <span className="px-3 py-0.5 bg-surface-2 rounded-full text-[12px] text-text-primary font-mono">
                {cat.count}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Social Channels Card */}
      <div className="p-5 bg-surface-1 border border-border-subtle rounded-xl backdrop-blur-xl">
        <h3 className="text-[13px] font-bold text-text-primary">{t('announce.followUs')}</h3>
        
        <div className="mt-4 space-y-2">
          {socialChannels.map((channel) => (
            <a
              key={channel.name}
              href={channel.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 bg-surface-2 rounded-xl hover:border hover:border-border-active transition-all cursor-pointer group"
            >
              <div
                className="w-5 h-5 flex items-center justify-center text-base"
                style={{ color: channel.color }}
              >
                {channel.icon}
              </div>
              <div className="flex-1">
                <div className="text-[13px] text-text-primary font-medium">{channel.name}</div>
                <div className="text-[11px] text-text-disabled">{t(channel.handle)}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-text-disabled font-mono">{channel.followers}</span>
                <ExternalLink className="w-3 h-3 text-text-disabled group-hover:text-plasma-cyan transition-colors" />
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* Version History Card */}
      <div className="p-5 bg-surface-1 border border-border-subtle rounded-xl backdrop-blur-xl">
        <div className="flex justify-between items-start">
          <h3 className="text-[13px] font-bold text-text-primary">{t('announce.versionHistory')}</h3>
          <a href="#" className="text-[12px] text-plasma-cyan hover:underline">
            {t('announce.viewChangelog')} →
          </a>
        </div>
        
        <div className="mt-4 space-y-3">
          {versions.map((ver) => (
            <div key={ver.version} className="flex gap-3">
              <div
                className={`px-2 py-1 rounded-lg text-[12px] font-bold font-mono ${
                  ver.isCurrent
                    ? 'bg-plasma-cyan/20 text-plasma-cyan border border-plasma-cyan'
                    : 'bg-surface-3 text-text-secondary'
                }`}
              >
                {ver.version}
              </div>
              <div className="flex-1">
                <div
                  className={`text-[12px] ${
                    ver.isCurrent ? 'text-plasma-cyan' : 'text-text-secondary'
                  }`}
                >
                  {ver.isCurrent ? t('announce.currentVersion') : ver.date}
                </div>
                <div className="text-[11px] text-text-disabled mt-0.5">{t(ver.change)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
