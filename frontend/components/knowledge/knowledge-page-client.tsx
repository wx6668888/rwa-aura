'use client'

import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslation } from '@/lib/i18n'
import { useLocale } from '@/components/locale-provider'
import {
  Search,
  X,
  ChevronDown,
  LayoutGrid,
  Wallet,
  ArrowDownToLine,
  TrendingUp,
  Unlock,
  Users,
  Star,
  ArrowLeftRight,
  PieChart,
  Shield,
  HelpCircle,
  BookOpen,
  Github,
} from 'lucide-react'
import {
  knowledgeCategories,
  getCategoryById,
  getArticleById,
  type KnowledgeCategoryId,
  type KnowledgeDrawerIcon,
} from '@/lib/knowledge-data'
import type { KnowledgeArticle, KnowledgeCategory } from '@/lib/knowledge-data'
import { getArticleContent } from '@/lib/knowledge-content'

/** 搜索框下单独展示的「小白投资完整教程」文章 ID */
const FEATURED_TUTORIAL_ARTICLE_ID = 'beginner-full-tutorial'

const DRAWER_ICON_MAP: Record<KnowledgeDrawerIcon, React.ComponentType<{ className?: string }>> = {
  LayoutGrid,
  Wallet,
  ArrowDownToLine,
  TrendingUp,
  Unlock,
  Users,
  Star,
  ArrowLeftRight,
  PieChart,
  Shield,
  HelpCircle,
  BookOpen,
}

type CategoryFilter = KnowledgeCategoryId | 'all'

export function KnowledgePageClient() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [openArticleId, setOpenArticleId] = useState<string | null>(null)
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const contentTopRef = useRef<HTMLDivElement | null>(null)
  const searchParams = useSearchParams()

  // 从 URL ?article=xxx 打开指定文章并切换到对应分类
  useEffect(() => {
    const articleId = searchParams.get('article')
    if (!articleId) return
    const art = getArticleById(articleId)
    if (art) {
      setCategoryFilter(art.categoryId)
      setOpenArticleId(articleId)
    }
  }, [searchParams])

  const categoriesForDrawer = useMemo(() => {
    return [
      { id: 'all' as const, nameKey: 'knowledge.cat.all', drawerIcon: 'LayoutGrid' as const },
      ...knowledgeCategories,
    ]
  }, [])

  const filteredCategories = useMemo(() => {
    let list = knowledgeCategories
    if (categoryFilter !== 'all') {
      const cat = getCategoryById(categoryFilter)
      list = cat ? [cat] : list
    }
    if (!searchQuery.trim()) return list
    const q = searchQuery.toLowerCase()
    return list
      .map((cat) => {
        const matching = cat.articles.filter((art) => {
          const ac = getArticleContent(locale, art.id)
          const title = ac?.title ?? ''
          const content = ac?.content ?? ''
          return title.toLowerCase().includes(q) || content.toLowerCase().includes(q)
        })
        return matching.length ? { ...cat, articles: matching } : null
      })
      .filter((c): c is KnowledgeCategory => c !== null)
  }, [categoryFilter, searchQuery, locale])

  const scrollToSection = useCallback((sectionId: string) => {
    setDrawerOpen(false)
    if (sectionId === 'all' || !sectionId) {
      contentTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }
    const el = sectionRefs.current[sectionId]
    if (el) {
      requestAnimationFrame(() => {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    }
  }, [])

  const currentCategoryLabel =
    categoryFilter === 'all'
      ? t('knowledge.cat.all')
      : t(getCategoryById(categoryFilter)?.nameKey ?? 'knowledge.cat.all')

  return (
    <div className="relative z-10 min-h-screen pt-20 pb-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        {/* Drawer trigger: current category + ChevronDown */}
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="mb-4 flex items-center gap-2 rounded-lg border border-[rgba(255,255,255,0.08)] bg-transparent px-3 py-1.5 text-xs text-[#94a3b8] transition-colors hover:border-[rgba(255,255,255,0.12)] hover:text-[#f1f5f9]"
          style={{ borderRadius: 8 }}
        >
          <span>{currentCategoryLabel}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0" />
        </button>

        {/* Page header */}
        <h1
          className="font-bold text-[#f1f5f9]"
          style={{
            fontSize: 'clamp(22px, 4vw, 28px)',
            letterSpacing: '-0.02em',
          }}
        >
          {t('knowledge.pageTitle')}
        </h1>
        <p className="mt-2 text-[15px] text-[#64748b]">{t('knowledge.subtitle')}</p>

        {/* Search */}
        <div className="mt-6">
          <div
            className="flex items-center gap-3 rounded-[10px] border border-[rgba(255,255,255,0.06)] bg-transparent px-4 py-3 transition-[border-color] focus-within:border-[rgba(255,255,255,0.12)]"
            style={{ borderRadius: 10 }}
          >
            <Search className="h-4 w-4 shrink-0 text-[#64748b]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('knowledge.searchPlaceholder')}
              className="min-w-0 flex-1 bg-transparent text-[15px] text-[#94a3b8] placeholder:text-[#64748b] focus:outline-none"
            />
          </div>
        </div>

        {/* Featured: RWA 协议 · 小白投资完整教程（多语言标题） */}
        <div className="mt-6">
          <button
            type="button"
            onClick={() => {
              setCategoryFilter('tutorial')
              setOpenArticleId(FEATURED_TUTORIAL_ARTICLE_ID)
              setDrawerOpen(false)
              setTimeout(() => {
                const el = sectionRefs.current['tutorial']
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }, 100)
            }}
            className="flex w-full items-center gap-3 rounded-xl border border-[rgba(0,245,212,0.2)] bg-[rgba(0,245,212,0.06)] px-4 py-3.5 text-left transition-colors hover:border-[rgba(0,245,212,0.35)] hover:bg-[rgba(0,245,212,0.08)]"
          >
            <BookOpen className="h-5 w-5 shrink-0 text-[#00f5d4]" />
            <span className="text-[15px] font-medium text-[#e2e8f0]">
              {getArticleContent(locale, FEATURED_TUTORIAL_ARTICLE_ID)?.title ?? t('knowledge.featuredTutorial')}
            </span>
            <ChevronDown className="ml-auto h-4 w-4 shrink-0 text-[#64748b]" />
          </button>
        </div>

        {/* Content: sections + accordions */}
        <div ref={contentTopRef} className="mt-10">
          {filteredCategories.length === 0 ? (
            <p className="text-[15px] text-[#64748b]">{t('knowledge.noResults')}</p>
          ) : (
            filteredCategories.map((cat) => (
              <section
                key={cat.id}
                ref={(el) => {
                  sectionRefs.current[cat.id] = el
                }}
                className="mb-12"
              >
                <h2
                  className="mb-2 text-[13px] font-semibold uppercase tracking-[0.1em] text-[#475569]"
                  style={{ letterSpacing: '0.1em' }}
                >
                  {t(cat.nameKey)}
                </h2>
                <div className="border-b border-[rgba(255,255,255,0.05)] last:border-b-0">
                  {cat.articles.map((art) => {
                    const isOpen = openArticleId === art.id
                    return (
                      <div
                        key={art.id}
                        className="border-b border-[rgba(255,255,255,0.05)] last:border-b-0"
                      >
                        <button
                          type="button"
                          onClick={() => setOpenArticleId(isOpen ? null : art.id)}
                          className="flex w-full items-center justify-between gap-3 py-[13px] text-left transition-colors"
                        >
                          <span
                            className={`text-[15px] font-medium ${isOpen ? 'text-[#94a3b8]' : 'text-[#64748b]'}`}
                          >
                            {getArticleContent(locale, art.id)?.title ?? art.id}
                          </span>
                          <ChevronDown
                            className={`h-4 w-4 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#00f5d4]' : 'text-[#64748b]'}`}
                          />
                        </button>
                        {isOpen && (
                          <div className="pb-4 pt-0">
                            <KnowledgeContent
                              content={getArticleContent(locale, art.id)?.content ?? ''}
                              exampleLabel={t('knowledge.exampleLabel')}
                              importantLabel={t('knowledge.importantLabel')}
                            />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </section>
            ))
          )}
        </div>
      </div>

      {/* Drawer overlay */}
      {drawerOpen && (
        <button
          type="button"
          aria-label="Close"
          className="fixed inset-0 z-40 bg-black/40"
          style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Drawer panel: 从页眉下方开始，避免与导航栏重合 */}
      <div
        className="fixed left-0 z-50 w-[260px] border-r border-[rgba(255,255,255,0.06)] bg-[rgba(8,8,14,0.98)] backdrop-blur-[20px] transition-transform duration-[240ms] ease-[cubic-bezier(0.32,0.72,0,1)]"
        style={{
          top: 72,
          height: 'calc(100vh - 72px)',
          transform: drawerOpen ? 'translateX(0)' : 'translateX(-100%)',
          boxShadow: drawerOpen ? 'none' : undefined,
        }}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.06)] px-5 py-4">
            <span className="text-[15px] font-medium text-[#94a3b8]">
              {t('knowledge.navTitle')}
            </span>
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="rounded p-1 text-[#94a3b8] hover:bg-white/5 hover:text-[#f1f5f9]"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto">
            {categoriesForDrawer.map((item) => {
              const isAll = item.id === 'all'
              const count = isAll
                ? knowledgeCategories.reduce((s, c) => s + c.articles.length, 0)
                : (item as KnowledgeCategory).articles.length
              const isActive =
                (isAll && categoryFilter === 'all') ||
                (!isAll && categoryFilter === item.id)
              const Icon = isAll ? DRAWER_ICON_MAP.LayoutGrid : DRAWER_ICON_MAP[(item as KnowledgeCategory).drawerIcon]
              const name = isAll ? t('knowledge.cat.all') : t((item as KnowledgeCategory).nameKey)
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setCategoryFilter(isAll ? 'all' : item.id)
                    scrollToSection(isAll ? 'all' : item.id)
                  }}
                  className={`flex w-full items-center justify-between gap-3 border-b border-[rgba(255,255,255,0.04)] px-6 py-4 text-left text-[15px] transition-colors hover:bg-white/[0.03] ${isActive ? 'border-l-2 border-l-[#00f5d4] bg-white/[0.03] text-[#00f5d4]' : 'text-[#94a3b8]'}`}
                >
                  <div className="flex items-center gap-3">
                    {Icon && <Icon className={`h-5 w-5 shrink-0 ${isActive ? 'text-[#00f5d4]' : ''}`} />}
                    <span>{name}</span>
                  </div>
                  <span className="text-[13px] text-[#64748b]">
                    {typeof count === 'number' ? count : ''}
                  </span>
                </button>
              )
            })}
          </nav>
          <div
            className="border-t border-[rgba(255,255,255,0.06)] px-5 py-4"
          >
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-[14px] text-[#94a3b8] hover:text-[#00f5d4]"
            >
              <Github className="h-4 w-4" />
              <span>{t('knowledge.githubLink')}</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

/** 将 **粗体** 转为 <strong>，保留换行 */
function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((seg, idx) =>
    seg.startsWith('**') && seg.endsWith('**') ? (
      <strong key={idx} className="font-semibold text-[#94a3b8]">
        {seg.slice(2, -2)}
      </strong>
    ) : (
      seg
    )
  )
}

/** 解析并渲染 Markdown 表格 */
function parseTable(block: string, blockKey?: number) {
  const lines = block.split('\n').map((l) => l.trim()).filter(Boolean)
  if (lines.length < 2) return null
  const rows = lines
    .filter((l) => l.includes('|'))
    .map((l) => l.split('|').map((c) => c.trim()).filter(Boolean))
  if (rows.length < 2) return null
  const isSeparator = (row: string[]) => row.every((c) => /^[-:]+$/.test(c))
  const headerRow = isSeparator(rows[0]) ? null : rows[0]
  const dataRows = headerRow ? rows.slice(1) : rows
  const bodyRows = dataRows.filter((r) => !isSeparator(r))
  if (!bodyRows.length) return null
  return (
    <div key={blockKey ?? 0} className="knowledge-table-wrap my-4 overflow-x-auto">
      <table className="knowledge-table w-full border-collapse text-left">
        {headerRow && (
          <thead>
            <tr>
              {headerRow.map((cell, cj) => (
                <th key={cj}>{renderInline(cell)}</th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {bodyRows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, cj) => (
                <td key={cj}>{renderInline(cell)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** 是否为列表块（以 - 或 • 或 1. 2. 等开头） */
function isListBlock(trimmed: string) {
  const first = trimmed.split('\n')[0]?.trim() ?? ''
  return /^[-•]\s/.test(first) || /^\d+[.)]\s/.test(first) || /^[①②③④⑤⑥⑦⑧⑨⑩]\s/.test(first)
}

function renderListBlock(block: string) {
  const lines = block.split('\n').map((l) => l.trim()).filter(Boolean)
  const items = lines.map((line) => {
    const match = line.match(/^([-•]|\d+[.)]|[①②③④⑤⑥⑦⑧⑨⑩])\s+(.*)/)
    const label = match ? match[1] : null
    const text = match ? match[2] : line
    return { label, text }
  })
  const isOrdered = /^\d+[.)]|[①②③④⑤⑥⑦⑧⑨⑩]/.test(items[0]?.label ?? '')
  return (
    <div className="knowledge-list-wrap my-4">
      {isOrdered ? (
        <ol className="knowledge-list space-y-3 pl-2 list-none">
          {items.map((item, idx) => (
            <li key={idx} className="flex gap-2.5">
              <span className="knowledge-step-num shrink-0">{item.label}</span>
              <span className="knowledge-list-text">{renderInline(item.text)}</span>
            </li>
          ))}
        </ol>
      ) : (
        <ul className="knowledge-list list-disc space-y-2.5 pl-5">
          {items.map((item, idx) => (
            <li key={idx} className="pl-0.5">{renderInline(item.text)}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** Match example block: 举例 (zh), **Example** (en), 例 (ja), etc. */
const EXAMPLE_PREFIX =
  /^\*\*举例\*\*[：:]?\s*|^举例[：:]?\s*|^\*\*Example\*\*[:\s]*|^Example[:\s]+|^\*\*例\*\*[：:]?\s*|^例[：:]?\s*|^\*\*Ejemplo\*\*[:\s]*|^Ejemplo[:\s]+|^\*\*Exemple\*\*[:\s]*|^Exemple[:\s]+|^\*\*예시\*\*[:\s]*|^예시[:\s]+|^\*\*Пример\*\*[:\s]*|^Пример[:\s]+|^\*\*مثال\*\*[:\s]*|^مثال[:\s]+|^\*\*उदाहरण\*\*[:\s]*|^उदाहरण[:\s]+|^\*\*Exemplo\*\*[:\s]*|^Exemplo[:\s]+/i
/** Match important/warning block: 重要, 建议 (zh), **Important**, **Note** (en), etc. */
const WARNING_PREFIX =
  /^\*\*重要\*\*[：:]?\s*|^重要[：:]?\s*|^\*\*建议\*\*[：:]?\s*|^建议[：:]?\s*|^\*\*Important\*\*[:\s]*|^Important[:\s]+|^\*\*Note\*\*[:\s]*|^Note[:\s]+|^\*\*Tip\*\*[:\s]*|^Tip[:\s]+|^\*\*중요\*\*[:\s]*|^중요[:\s]+|^\*\*Critical\*\*[:\s]*|^Critical[:\s]+|^\*\*Importante\*\*[:\s]*|^Importante[:\s]+|^\*\*Must\*\*[:\s]*|^Must[:\s]+/i

function KnowledgeContent({
  content,
  exampleLabel,
  importantLabel,
}: {
  content: string
  exampleLabel: string
  importantLabel: string
}) {
  if (!content) return null
  const paragraphs = content.split(/\n\n+/)
  return (
    <div
      className="knowledge-answer text-[15px] leading-[1.8] text-[#64748b]"
      style={{ lineHeight: 1.8 }}
    >
      {paragraphs.map((para, i) => {
        const trimmed = para.trim()
        if (!trimmed) return null

        // 二级标题：## 一、xxx 或 ## Step 1
        const isH2 = /^##\s+.+/.test(trimmed) && !trimmed.includes('\n')
        if (isH2) {
          const title = trimmed.replace(/^##\s+/, '')
          return (
            <h2 key={i} className="knowledge-h2 mt-8 mb-3 text-base font-semibold text-[#e2e8f0] first:mt-0">
              {renderInline(title)}
            </h2>
          )
        }
        // 三级标题：### 2.1 下载 App
        const isH3 = /^###\s+.+/.test(trimmed) && !trimmed.includes('\n')
        if (isH3) {
          const title = trimmed.replace(/^###\s+/, '')
          return (
            <h3 key={i} className="knowledge-h3 mt-6 mb-2 text-[15px] font-semibold text-[#cbd5e1]">
              {renderInline(title)}
            </h3>
          )
        }
        // 分隔线 --- 忽略或显示为细线
        if (/^---+$/.test(trimmed)) return <hr key={i} className="knowledge-hr my-6 border-[rgba(255,255,255,0.06)]" />

        const isExample = EXAMPLE_PREFIX.test(trimmed)
        const isWarning = WARNING_PREFIX.test(trimmed)
        const tableEl = parseTable(trimmed, i)
        const isList = isListBlock(trimmed)

        if (isExample) {
          const body = trimmed.replace(EXAMPLE_PREFIX, '')
          return (
            <div key={i} className="example-block mb-4 mt-3">
              <span className="example-label uppercase tracking-wider">{exampleLabel}</span>
              <div className="mt-1.5 space-y-2">
                {body.split('\n').map((line, j) => {
                  const lineText = line.trim()
                  if (!lineText) return null
                  return (
                    <p key={j} className="mb-0">
                      {renderInline(lineText)}
                    </p>
                  )
                })}
              </div>
            </div>
          )
        }
        if (isWarning) {
          const body = trimmed.replace(WARNING_PREFIX, '')
          return (
            <div key={i} className="warning-block mb-4 mt-3">
              <span className="example-label uppercase tracking-wider text-amber-400/90">{importantLabel}</span>
              <div className="mt-1.5 space-y-2">
                {body.split('\n').map((line, j) => {
                  const lineText = line.trim()
                  if (!lineText) return null
                  return (
                    <p key={j} className="mb-0">
                      {renderInline(lineText)}
                    </p>
                  )
                })}
              </div>
            </div>
          )
        }

        if (tableEl) return tableEl
        if (isList) return <div key={i}>{renderListBlock(trimmed)}</div>

        return (
          <p key={i} className="mb-4 last:mb-0">
            {trimmed.split('\n').map((line, j) => (
              <span key={j}>
                {renderInline(line.trim())}
                {j < trimmed.split('\n').length - 1 && <br />}
              </span>
            ))}
          </p>
        )
      })}
    </div>
  )
}
