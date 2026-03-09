// Announcements data with full content
import { announcementsContentZh } from './announcements-content-zh'
import { announcementsContentEn } from './announcements-content-en'
import { announcementsContentKo } from './announcements-content-ko'

export interface Announcement {
  id: string
  slug: string
  category: 'update' | 'activity' | 'security' | 'partnership' | 'maintenance'
  isPinned: boolean
  isNew: boolean
  date: string
  author: string
  readTime: number
  views: number
  tags: string[]
}

export const announcements: Announcement[] = [
  {
    id: '1',
    slug: 'rwa-protocol-v1-launch',
    category: 'update',
    isPinned: true,
    isNew: true,
    date: '2025-03-01',
    author: 'RWA Team',
    readTime: 5,
    views: 12450,
    tags: ['launch', 'v1.0', 'mainnet'],
  },
  {
    id: '2',
    slug: 'v1-1-withdrawal-fee-optimization',
    category: 'update',
    isPinned: false,
    isNew: true,
    date: '2025-03-01',
    author: 'RWA Team',
    readTime: 3,
    views: 8234,
    tags: ['update', 'v1.1', 'optimization'],
  },
  {
    id: '3',
    slug: 'first-monthly-draw-48200',
    category: 'activity',
    isPinned: false,
    isNew: true,
    date: '2025-02-28',
    author: 'RWA Team',
    readTime: 4,
    views: 15678,
    tags: ['lottery', 'event', 'prize'],
  },
  {
    id: '4',
    slug: 'slowmist-security-partnership',
    category: 'partnership',
    isPinned: false,
    isNew: false,
    date: '2025-02-25',
    author: 'RWA Team',
    readTime: 5,
    views: 9876,
    tags: ['security', 'audit', 'partnership'],
  },
  {
    id: '5',
    slug: 'v5-diamond-node-reward-increase',
    category: 'update',
    isPinned: false,
    isNew: false,
    date: '2025-02-20',
    author: 'RWA Team',
    readTime: 4,
    views: 11234,
    tags: ['nodes', 'rewards', 'governance'],
  },
  {
    id: '6',
    slug: 'phishing-security-alert',
    category: 'security',
    isPinned: false,
    isNew: false,
    date: '2025-02-15',
    author: 'Security Team',
    readTime: 3,
    views: 18900,
    tags: ['security', 'alert', 'phishing'],
  },
  {
    id: '7',
    slug: 'anniversary-airdrop-event',
    category: 'activity',
    isPinned: false,
    isNew: false,
    date: '2025-02-10',
    author: 'RWA Team',
    readTime: 4,
    views: 7654,
    tags: ['airdrop', 'event', 'anniversary'],
  },
  {
    id: '8',
    slug: 'maintenance-feb-7-withdrawal-pause',
    category: 'maintenance',
    isPinned: false,
    isNew: false,
    date: '2025-02-05',
    author: 'Operations Team',
    readTime: 2,
    views: 5432,
    tags: ['maintenance', 'downtime'],
  },
  {
    id: '9',
    slug: 'pancakeswap-listing-announcement',
    category: 'partnership',
    isPinned: false,
    isNew: false,
    date: '2025-01-28',
    author: 'RWA Team',
    readTime: 3,
    views: 14567,
    tags: ['dex', 'listing', 'pancakeswap'],
  },
  {
    id: '10',
    slug: 'certik-audit-completion',
    category: 'security',
    isPinned: false,
    isNew: false,
    date: '2025-01-20',
    author: 'Security Team',
    readTime: 6,
    views: 13245,
    tags: ['audit', 'certik', 'security'],
  },
  {
    id: '11',
    slug: 'referral-system-upgrade',
    category: 'update',
    isPinned: false,
    isNew: false,
    date: '2025-01-15',
    author: 'RWA Team',
    readTime: 4,
    views: 8901,
    tags: ['referral', 'upgrade', 'rewards'],
  },
  {
    id: '12',
    slug: 'community-ama-recap',
    category: 'activity',
    isPinned: false,
    isNew: false,
    date: '2025-01-10',
    author: 'Community Team',
    readTime: 7,
    views: 6789,
    tags: ['ama', 'community', 'q&a'],
  },
]

export function getAnnouncementBySlug(slug: string): Announcement | undefined {
  return announcements.find((a) => a.slug === slug)
}

export function getAnnouncementsByCategory(category: string): Announcement[] {
  if (category === 'all') return announcements
  return announcements.filter((a) => a.category === category)
}
