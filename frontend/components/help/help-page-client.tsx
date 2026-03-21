'use client'

import { useState, useMemo } from 'react'
import { useTranslation } from '@/lib/i18n'
import { useLocale } from '@/components/locale-provider'
import Link from 'next/link'
import {
  Search,
  X,
  Rocket,
  DollarSign,
  Trophy,
  Users,
  Shield,
  AlertTriangle,
  ArrowRight,
  MessageCircle,
  Mail,
  TrendingUp,
  ChevronDown,
} from 'lucide-react'

interface FAQItem {
  id: string
  category: string
  question: string
  answer: string
  isWarning?: boolean
}

const faqData: FAQItem[] = [
  { id: 'q1', category: 'getStarted', question: 'q1', answer: 'a1' },
  { id: 'q2', category: 'getStarted', question: 'q2', answer: 'a2' },
  { id: 'q3', category: 'getStarted', question: 'q3', answer: 'a3' },
  { id: 'q4', category: 'staking', question: 'q4', answer: 'a4' },
  { id: 'q5', category: 'staking', question: 'q5', answer: 'a5' },
  { id: 'q6', category: 'staking', question: 'q6', answer: 'a6' },
  { id: 'q7', category: 'nodes', question: 'q7', answer: 'a7' },
  { id: 'q8', category: 'nodes', question: 'q8', answer: 'a8' },
  { id: 'q9', category: 'referral', question: 'q9', answer: 'a9' },
  { id: 'q10', category: 'referral', question: 'q10', answer: 'a10' },
  { id: 'q11', category: 'security', question: 'q11', answer: 'a11' },
  { id: 'q12', category: 'security', question: 'q12', answer: 'a12', isWarning: true },
  { id: 'q13', category: 'trouble', question: 'q13', answer: 'a13' },
  { id: 'q14', category: 'trouble', question: 'q14', answer: 'a14' },
  { id: 'q15', category: 'trouble', question: 'q15', answer: 'a15' },
]

const categoryIcons = {
  getStarted: Rocket,
  staking: DollarSign,
  nodes: Trophy,
  referral: Users,
  security: Shield,
  trouble: AlertTriangle,
}

const categoryColors = {
  getStarted: 'text-plasma-cyan',
  staking: 'text-[#f59e0b]', // gold-node color
  nodes: 'text-void-purple',
  referral: 'text-plasma-cyan',
  security: 'text-[#f43f5e]', // danger color
  trouble: 'text-[#f59e0b]', // gold-node color
}

export function HelpPageClient() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [openItems, setOpenItems] = useState<Record<string, string | null>>({})

  const filteredFAQs = useMemo(() => {
    let filtered = faqData

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((item) => item.category === selectedCategory)
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((item) => {
        const question = t(`help.${item.question}`).toLowerCase()
        const answer = t(`help.${item.answer}`).toLowerCase()
        return question.includes(query) || answer.includes(query)
      })
    }

    return filtered
  }, [searchQuery, selectedCategory, t])

  const highlightText = (text: string, query: string) => {
    if (!query) return text
    const parts = text.split(new RegExp(`(${query})`, 'gi'))
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={i} className="bg-plasma-cyan/20 text-plasma-cyan">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    )
  }

  const categories = [
    { id: 'all', key: 'catAll' },
    { id: 'getStarted', key: 'catGetStarted' },
    { id: 'staking', key: 'catStaking' },
    { id: 'nodes', key: 'catNodes' },
    { id: 'referral', key: 'catReferral' },
    { id: 'security', key: 'catSecurity' },
    { id: 'trouble', key: 'catTrouble' },
  ]

  const groupedFAQs = useMemo(() => {
    const groups: Record<string, FAQItem[]> = {}
    filteredFAQs.forEach((item) => {
      if (!groups[item.category]) {
        groups[item.category] = []
      }
      groups[item.category].push(item)
    })
    return groups
  }, [filteredFAQs])

  const popularQuestions = ['q1', 'q4', 'q8', 'q5', 'q14']

  return (
    <div className="relative pt-12 pb-16 px-4 sm:px-6 lg:px-8">
      {/* Page Header */}
      <div className="text-center max-w-2xl mx-auto mb-8">
        <div className="text-[11px] uppercase tracking-widest text-text-secondary mb-3">
          {t('help.overline')}
        </div>
        <h1 className="text-[40px] font-space-grotesk font-extrabold text-text-primary mt-3">
          {t('help.title')}
        </h1>
      </div>

      {/* Search Bar */}
      <div className="max-w-xl mx-auto mt-6 px-4">
        <div className="relative bg-surface-1 border border-active rounded-2xl h-14 flex items-center px-5 gap-3 focus-within:border-plasma-cyan focus-within:shadow-[0_0_20px_rgba(0,245,212,0.3)] transition-all">
          <Search className="w-5 h-5 text-text-secondary flex-shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('help.searchPlaceholder')}
            className="flex-1 bg-transparent border-none outline-none font-mono text-[15px] text-text-primary placeholder:text-text-disabled"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-text-secondary hover:text-text-primary text-base transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          {searchQuery && filteredFAQs.length > 0 && (
            <div className="bg-surface-2 rounded-full px-3 py-1 font-mono text-xs text-text-secondary">
              {t('help.foundResults').replace('{count}', filteredFAQs.length.toString())}
            </div>
          )}
        </div>
      </div>

      {/* Category Chips */}
      <div className="flex justify-center flex-wrap gap-2 mt-6 max-w-4xl mx-auto px-4">
        {categories.map((cat) => {
          const isActive = selectedCategory === cat.id
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                isActive
                  ? 'bg-plasma-cyan/15 border border-plasma-cyan text-plasma-cyan'
                  : 'bg-surface-2 border border-subtle text-text-secondary hover:border-active'
              }`}
            >
              {t(`help.${cat.key}`)}
            </button>
          )
        })}
      </div>

      {/* Main Layout */}
      <div className="mt-10 grid grid-cols-1 lg:grid-cols-[70%_30%] gap-8 max-w-7xl mx-auto">
        {/* Left - FAQ Sections */}
        <div>
          {Object.keys(groupedFAQs).length === 0 ? (
            <div className="text-center py-16">
              <Search className="w-10 h-10 text-text-disabled mx-auto" />
              <div className="text-base text-text-secondary mt-4">{t('help.noResults')}</div>
              <div className="text-[13px] text-text-disabled mt-2">{t('help.noResultsSub')}</div>
              <Link
                href="#contact"
                className="inline-block mt-4 px-4 py-2 bg-plasma-cyan/10 border border-plasma-cyan text-plasma-cyan rounded-full text-sm hover:bg-plasma-cyan/20 transition-colors"
              >
                {t('help.contactSupportBtn')}
              </Link>
            </div>
          ) : (
            Object.entries(groupedFAQs).map(([category, items]) => {
              const Icon = categoryIcons[category as keyof typeof categoryIcons]
              const color = categoryColors[category as keyof typeof categoryColors]
              return (
                <div key={category} className="mb-8">
                  <div className="flex items-center gap-3 mb-4">
                    <Icon className={`w-5 h-5 ${color}`} />
                    <h2 className="text-lg font-bold text-text-primary">
                      {category === 'getStarted'
                        ? t('help.catGetStarted')
                        : category === 'staking'
                        ? t('help.catStaking')
                        : category === 'nodes'
                        ? t('help.catNodes')
                        : category === 'referral'
                        ? t('help.catReferral')
                        : category === 'security'
                        ? t('help.catSecurity')
                        : t('help.catTrouble')}
                    </h2>
                  </div>
                  <div className="space-y-2">
                    {items.map((item) => {
                      const isOpen = openItems[category] === item.id
                      return (
                        <div
                          key={item.id}
                          id={item.id}
                          className={`bg-surface-1 rounded-xl overflow-hidden border transition-all mb-2 ${
                            isOpen ? 'border-active' : 'border-subtle'
                          }`}
                        >
                          <button
                            onClick={() => {
                              setOpenItems((prev) => ({
                                ...prev,
                                [category]: isOpen ? null : item.id,
                              }))
                            }}
                            className="w-full flex justify-between items-center p-5 cursor-pointer hover:bg-surface-2 transition-colors"
                          >
                            <div className="text-[15px] font-semibold text-text-primary text-left">
                              {highlightText(t(`help.${item.question}`), searchQuery)}
                            </div>
                            <ChevronDown
                              className={`w-[18px] h-[18px] text-text-secondary transition-transform ${
                                isOpen ? 'rotate-180 text-plasma-cyan' : ''
                              }`}
                            />
                          </button>
                          {isOpen && (
                            <div className="px-5 pb-5 animate-in slide-in-from-top-2 duration-250">
                              <div className="border-t border-subtle mb-4 mt-0"></div>
                              <div
                                className={`text-sm text-text-secondary leading-7 ${
                                  item.isWarning
                                    ? 'bg-[#f59e0b]/5 border border-[#f59e0b] rounded-xl p-4'
                                    : ''
                                }`}
                              >
                                {highlightText(t(`help.${item.answer}`), searchQuery)}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Right - Sidebar */}
        <div className="lg:sticky lg:top-24 space-y-4">
          {/* Quick Links */}
          <div className="bg-surface-1 rounded-xl p-5 border border-subtle">
            <div className="text-xs uppercase tracking-widest text-text-secondary mb-4">
              {t('help.quickLinks')}
            </div>
            <div className="space-y-1">
              {[
                { key: 'linkStake', href: '/stake' },
                { key: 'linkWithdraw', href: '/withdraw' },
                { key: 'linkNodes', href: '/nodes' },
                { key: 'linkSecurity', href: '/security' },
                { key: 'linkCalc', href: '/calculator' },
              ].map((link) => (
                <Link
                  key={link.key}
                  href={link.href}
                  className="flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-surface-2 cursor-pointer transition group"
                >
                  <ArrowRight className="w-3.5 h-3.5 text-plasma-cyan" />
                  <span className="text-sm text-text-secondary group-hover:text-text-primary">
                    {t(`help.${link.key}`)}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          <div className="border-t border-subtle my-4"></div>

          {/* Contact Support */}
          <div className="bg-surface-1 rounded-xl p-5 border border-subtle">
            <div className="text-xs uppercase tracking-widest text-text-secondary mb-4">
              {t('help.contactSupport')}
            </div>
            <div className="space-y-3">
              <div className="flex gap-3 items-start p-3 bg-surface-2 rounded-xl">
                <MessageCircle className="w-5 h-5 text-void-purple flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm font-semibold text-text-primary">
                    {t('help.telegramSupport')}
                  </div>
                  <div className="text-xs text-text-secondary mt-0.5">
                    {t('help.telegramDesc')}
                  </div>
                </div>
                <button className="text-[11px] text-plasma-cyan hover:underline self-end mt-1">
                  {t('help.joinBtn')}
                </button>
              </div>
              <div className="flex gap-3 items-start p-3 bg-surface-2 rounded-xl">
                <Mail className="w-5 h-5 text-plasma-cyan flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm font-semibold text-text-primary">
                    {t('help.emailSupport')}
                  </div>
                  <div className="text-xs font-mono text-text-secondary mt-0.5">
                    rwacoin001@gmail.com
                  </div>
                </div>
                <button className="text-[11px] text-plasma-cyan hover:underline self-end mt-1">
                  {t('help.sendEmailBtn')}
                </button>
              </div>
            </div>
          </div>

          <div className="border-t border-subtle my-4"></div>

          {/* Popular Articles */}
          <div className="bg-surface-1 rounded-xl p-5 border border-subtle">
            <div className="text-xs uppercase tracking-widest text-text-secondary mb-4">
              {t('help.popular')}
            </div>
            <div className="space-y-2">
              {popularQuestions.map((qId) => {
                const item = faqData.find((i) => i.id === qId)
                if (!item) return null
                return (
                  <button
                    key={qId}
                    onClick={() => {
                      const category = item.category
                      setOpenItems((prev) => ({
                        ...prev,
                        [category]: qId,
                      }))
                      setTimeout(() => {
                        document.getElementById(qId)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                      }, 100)
                    }}
                    className="w-full flex items-start gap-2 py-2 cursor-pointer group hover:text-text-primary transition-colors text-left"
                  >
                    <TrendingUp className="w-3.5 h-3.5 text-plasma-cyan flex-shrink-0 mt-0.5" />
                    <span className="text-[13px] text-text-secondary group-hover:text-text-primary truncate">
                      {t(`help.${item.question}`)}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="py-16 text-center border-t border-subtle mt-12">
        <div className="text-[28px] font-space-grotesk font-bold text-text-primary">
          {t('help.ctaTitle')}
        </div>
        <div className="text-[15px] text-text-secondary mt-3 max-w-md mx-auto">
          {t('help.ctaDesc')}
        </div>
        <div className="flex justify-center gap-3 mt-6 flex-wrap">
          <button className="px-6 py-3 bg-void-purple text-white rounded-full font-medium hover:bg-void-purple/80 transition-colors">
            {t('help.joinTelegram')}
          </button>
          <button className="px-6 py-3 bg-surface-2 border border-active text-text-primary rounded-full font-medium hover:bg-surface-1 transition-colors">
            {t('help.joinDiscord')}
          </button>
          <button className="px-6 py-3 bg-transparent border border-subtle text-text-secondary rounded-full font-medium hover:border-active transition-colors">
            {t('help.sendEmail')}
          </button>
        </div>
      </div>
    </div>
  )
}
