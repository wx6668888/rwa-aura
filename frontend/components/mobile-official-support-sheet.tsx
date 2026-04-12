'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { useAccount } from 'wagmi'
import { X, Send, Copy, ThumbsUp, ThumbsDown, RotateCw } from 'lucide-react'
import { LazyDotLottieAnimation, encodePublicLottieSrc } from '@/components/lazy-dot-lottie'
import { chatHttpUrl } from '@/lib/chat-api'
import { fetchWithTimeout } from '@/lib/fetch-with-timeout'
import { useLocale } from '@/components/locale-provider'
import { getTranslation, useTranslation } from '@/lib/i18n'
import { knowledgeCategories } from '@/lib/knowledge-data'
import { getArticleContent } from '@/lib/knowledge-content'

/** 公开目录：官方客服头像（无框展示） */
const SUPPORT_AVATAR_LOTTIE_SRC = '/在线客服.lottie'
/** 公开目录：等待回答动效（文件名含中文） */
const SUPPORT_WAIT_LOTTIE_SRC = '/等待Onsite.lottie'
/** 打开会话首条：欢迎动效 */
const SUPPORT_WELCOME_LOTTIE_SRC = encodePublicLottieSrc('/欢迎.lottie')
/** 叠在欢迎动效之上（同区域、更高 z-index） */
const SUPPORT_CONFETTI_LOTTIE_SRC = encodePublicLottieSrc('/礼花.lottie')
/** 持久化欢迎条 id，便于识别旧数据 */
const SHEET_WELCOME_MESSAGE_ID = 'sheet-welcome-v1'

type SheetUserMsg = { id: string; role: 'user'; content: string }
type SheetAssistantMsg = {
  id: string
  role: 'assistant'
  content: string
  faqs: string[]
  /** 首条欢迎气泡：正文上方展示欢迎 Lottie，持久化在会话中 */
  welcomeBanner?: boolean
}
type SheetMsg = SheetUserMsg | SheetAssistantMsg

type Props = {
  open: boolean
  onClose: () => void
}

/** 本地保存官方客服会话：最多 40 条、保留 7 天 */
const SUPPORT_SHEET_STORAGE_KEY = 'rwa-official-support-sheet:v1'
const SUPPORT_SHEET_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000
const SUPPORT_SHEET_MAX_MESSAGES = 40
const SUPPORT_SAVE_DEBOUNCE_MS = 500

const SUPPORT_LINK_PATH_PREFIXES: string[] = [
  '/withdraw-preview',
  '/node/network',
  '/referral-network',
  '/announcements',
  '/chat/admin',
  '/chat',
  '/stake',
  '/swap',
  '/dashboard',
  '/withdraw',
  '/nodes',
  '/market',
  '/lucky',
  '/analytics',
  '/calculator',
  '/governance',
  '/security',
  '/knowledge',
  '/help',
  '/about',
  '/terms',
  '/privacy',
  '/emergency',
  '/dividend',
  '/leaderboard',
  '/slots',
  '/crash',
]

const SORTED_SUPPORT_PATHS = [...SUPPORT_LINK_PATH_PREFIXES].sort((a, b) => b.length - a.length)

type PersistedSupportSheet = {
  v: 1
  savedAt: number
  locale: string
  messages: SheetMsg[]
}

function loadSupportSheetPersisted(): SheetMsg[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(SUPPORT_SHEET_STORAGE_KEY)
    if (!raw) return []
    const p = JSON.parse(raw) as PersistedSupportSheet
    if (!p || p.v !== 1 || !Array.isArray(p.messages)) return []
    if (Date.now() - (p.savedAt || 0) > SUPPORT_SHEET_MAX_AGE_MS) {
      localStorage.removeItem(SUPPORT_SHEET_STORAGE_KEY)
      return []
    }
    return p.messages
      .slice(-SUPPORT_SHEET_MAX_MESSAGES)
      .filter((row): row is Record<string, unknown> => !!row && typeof row === 'object')
      .map((m: Record<string, unknown>) => {
        const id = String(m.id ?? '')
        const role = m.role
        if (role === 'user') {
          return { id, role: 'user' as const, content: String(m.content ?? '') }
        }
        if (role === 'assistant') {
          return {
            id,
            role: 'assistant' as const,
            content: String(m.content ?? ''),
            faqs: Array.isArray(m.faqs) ? m.faqs.map(String) : [],
            welcomeBanner: Boolean(m.welcomeBanner) || id === SHEET_WELCOME_MESSAGE_ID,
          }
        }
        return null
      })
      .filter(Boolean) as SheetMsg[]
  } catch {
    return []
  }
}

function saveSupportSheetPersisted(messages: SheetMsg[], locale: string) {
  if (typeof window === 'undefined') return
  try {
    const payload: PersistedSupportSheet = {
      v: 1,
      savedAt: Date.now(),
      locale,
      messages: messages.slice(-SUPPORT_SHEET_MAX_MESSAGES),
    }
    localStorage.setItem(SUPPORT_SHEET_STORAGE_KEY, JSON.stringify(payload))
  } catch {
    /* quota */
  }
}

function normalizeSupportDisplayText(raw: string): string {
  let s = String(raw || '')
  s = s.replace(/\*\*([^*]*)\*\*/g, '$1')
  s = s.replace(/\*\*/g, '')
  return s
}

/** 在 0x 地址内插入 ZWSP，部分移动端 WebView 对 word-break 支持差，仍靠断行机会换行 */
function insertSoftBreaksInHexAddresses(s: string): string {
  const zw = '\u200b'
  const chunkHexBody = (hexBody: string) => {
    if (hexBody.length <= 12) return hexBody
    const segs: string[] = []
    for (let i = 0; i < hexBody.length; i += 6) segs.push(hexBody.slice(i, i + 6))
    return segs.join(zw)
  }
  const foldContinuous = (full: string) => {
    const m = full.match(/^0x([0-9a-fA-F]+)$/i)
    if (!m?.[1] || m[1].length < 12) return full
    return `0x${chunkHexBody(m[1])}`
  }
  const foldAbbrev = (full: string) => {
    const m = full.match(/^0x([0-9a-fA-F]+)(\.{3}|…)([0-9a-fA-F]+)$/i)
    if (!m?.[1] || !m[3]) return full
    return `0x${chunkHexBody(m[1])}${m[2]}${chunkHexBody(m[3])}`
  }
  let out = s.replace(/0x[0-9a-fA-F]{4,}(?:\.{3}|…)[0-9a-fA-F]{4,}/gi, foldAbbrev)
  out = out.replace(/0x[0-9a-fA-F]{12,}/gi, foldContinuous)
  return out
}

/** Tron Base58Check 风格地址（T 开头长串） */
function insertSoftBreaksInTronAddresses(s: string): string {
  const zw = '\u200b'
  return s.replace(/T[1-9A-HJ-NP-Za-km-z]{25,}/g, (m) => {
    const parts: string[] = []
    for (let i = 0; i < m.length; i += 5) parts.push(m.slice(i, i + 5))
    return parts.join(zw)
  })
}

/** 正文里未解析为链接的超长 URL（避免撑破宽度） */
function insertSoftBreaksInLongUrls(s: string): string {
  const zw = '\u200b'
  return s.replace(/https?:\/\/[^\s<>"']{28,}/gi, (url) => {
    const parts: string[] = []
    for (let i = 0; i < url.length; i += 10) parts.push(url.slice(i, i + 10))
    return parts.join(zw)
  })
}

/** 纯文本气泡内展示前统一处理（顺序：EVM 地址 → Tron → 长 URL） */
function prepareSupportPlainSegment(s: string): string {
  return insertSoftBreaksInLongUrls(insertSoftBreaksInTronAddresses(insertSoftBreaksInHexAddresses(s)))
}

/** 用户/助手正文：强制在卡片宽度内折行，禁止横向溢出 */
const SUPPORT_TEXT_WRAP_CLASS =
  'min-w-0 max-w-full whitespace-pre-wrap break-all [overflow-wrap:anywhere] [word-break:break-word]'

function supportLinkClassName() {
  return 'inline-block min-w-0 max-w-full align-baseline break-all font-medium text-[#5eead4] underline decoration-teal-400/45 underline-offset-[3px] transition-colors hover:text-[#a7f3d0] hover:decoration-teal-300/70'
}

function SmartSheetLink({ href, children }: { href: string; children: ReactNode }) {
  const h = String(href || '').trim()
  const display = typeof children === 'string' ? prepareSupportPlainSegment(children) : children
  if (!h) return <>{children}</>
  let path = h
  if (h.startsWith('http://') || h.startsWith('https://')) {
    try {
      const u = new URL(h)
      if (u.hostname === 'rwa.lat' || u.hostname === 'www.rwa.lat' || u.hostname.endsWith('.rwa.lat')) {
        path = `${u.pathname}${u.search}${u.hash}` || '/'
      } else {
        return (
          <a href={h} target="_blank" rel="noopener noreferrer" className={supportLinkClassName()}>
            {display}
          </a>
        )
      }
    } catch {
      return (
        <a href={h} target="_blank" rel="noopener noreferrer" className={supportLinkClassName()}>
          {display}
        </a>
      )
    }
  }
  if (!path.startsWith('/')) path = `/${path}`
  return (
    <Link href={path} prefetch={false} className={supportLinkClassName()}>
      {display}
    </Link>
  )
}

/** Markdown [label](url)、https://rwa.lat…、以及裸路径 /stake 等 → 可点链接；去掉 ** */
function SupportAssistantBody({ text }: { text: string }) {
  const normalized = normalizeSupportDisplayText(text)
  const nodes: ReactNode[] = []
  let buf = ''
  let i = 0
  let nk = 0
  const flush = () => {
    if (!buf) return
    nodes.push(
      <span key={`t-${nk++}`} className="inline">
        {prepareSupportPlainSegment(buf)}
      </span>
    )
    buf = ''
  }

  while (i < normalized.length) {
    const rest = normalized.slice(i)

    const md = rest.match(/^\[([^\]]+)\]\(([^)]+)\)/)
    if (md?.[0]) {
      flush()
      nodes.push(
        <SmartSheetLink key={`l-${nk++}`} href={String(md[2])}>
          {md[1]}
        </SmartSheetLink>
      )
      i += md[0].length
      continue
    }

    const abs = rest.match(/^https:\/\/rwa\.lat[\w./?#&=%-]*/i)
    if (abs?.[0]) {
      flush()
      const href = abs[0]
      nodes.push(
        <SmartSheetLink key={`u-${nk++}`} href={href}>
          {href}
        </SmartSheetLink>
      )
      i += href.length
      continue
    }

    if (rest[0] === '/') {
      let hit: { href: string; len: number } | null = null
      for (const pfx of SORTED_SUPPORT_PATHS) {
        if (rest.startsWith(pfx)) {
          let j = pfx.length
          while (j < rest.length && /[?#=&%.\w/-]/i.test(rest[j]!)) j += 1
          hit = { href: rest.slice(0, j), len: j }
          break
        }
      }
      if (hit) {
        flush()
        nodes.push(
          <SmartSheetLink key={`p-${nk++}`} href={hit.href}>
            {hit.href}
          </SmartSheetLink>
        )
        i += hit.len
        continue
      }
    }

    buf += normalized[i]!
    i += 1
  }
  flush()

  return (
    <div
      className={`text-[13.5px] leading-[1.78] tracking-[0.015em] text-[#e8edf5] ${SUPPORT_TEXT_WRAP_CLASS}`}
    >
      {nodes}
    </div>
  )
}

/** 「正在思考」后的省略号动画（避免与 i18n 文案里静态 … 重复） */
function ThinkingEllipsis() {
  const [phase, setPhase] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => setPhase((p) => (p + 1) % 4), 450)
    return () => window.clearInterval(id)
  }, [])
  const dots = phase === 0 ? '' : phase === 1 ? '.' : phase === 2 ? '..' : '...'
  return (
    <span className="inline-block min-w-[1em] text-left font-normal tabular-nums" aria-hidden>
      {dots}
    </span>
  )
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** 使用知识库多语言正文里的标题（与 /knowledge 一致），避免 i18n 主表里缺少 article 标题时回退成英文 */
function buildKnowledgeQuestionPool(locale: string): string[] {
  const out: string[] = []
  for (const cat of knowledgeCategories) {
    for (const a of cat.articles) {
      const ac = getArticleContent(locale, a.id)
      const q = (ac?.title || '').trim()
      if (q && !out.includes(q)) out.push(q)
    }
  }
  return out
}

function pickRandomFaqs(pool: string[], n: number): string[] {
  if (pool.length === 0) return []
  return shuffle(pool).slice(0, Math.min(n, pool.length))
}

function scoreTitleAgainstCorpus(title: string, corpus: string): number {
  const c = corpus
  const t = title
  if (!t) return 0
  let s = 0
  if (c.includes(t)) s += 80
  const tLower = t.toLowerCase()
  const cLower = c.toLowerCase()
  if (cLower.includes(tLower)) s += 40
  const parts = t.split(/[\s·.,?!，。？、；:/\\]+/).filter((p) => p.length > 1)
  for (const p of parts) {
    if (c.includes(p)) s += 10
  }
  for (let len = Math.min(8, t.length); len >= 2; len--) {
    for (let i = 0; i + len <= t.length; i++) {
      const sub = t.slice(i, i + len)
      if (sub.trim() && c.includes(sub)) s += len * 0.35
    }
  }
  return s
}

/** 与本轮问答相关的常见问题，展示在对应助手气泡上方 */
function shortWalletLabel(addr: string): string {
  const a = (addr || '').trim()
  const lower = a.toLowerCase()
  if (lower.startsWith('0x') && a.length >= 10) {
    return `${a.slice(0, 6)}…${a.slice(-4)}`
  }
  return a.slice(0, 12) || '访客'
}

function pickRelatedFaqs(userQ: string, answer: string, pool: string[], n: number): string[] {
  if (pool.length === 0) return []
  const corpus = `${userQ}\n${answer}`
  const ranked = pool
    .map((q) => ({ q, s: scoreTitleAgainstCorpus(q, corpus) }))
    .sort((a, b) => b.s - a.s)
  const strong = ranked.filter((x) => x.s >= 4).map((x) => x.q)
  const source =
    strong.length >= n ? strong.slice(0, Math.min(36, strong.length)) : ranked.map((x) => x.q)
  return shuffle(source).slice(0, Math.min(n, source.length))
}

export function MobileOfficialSupportSheet({ open, onClose }: Props) {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const { address: wagmiAddress, isConnected: wagmiConnected } = useAccount()

  const [entered, setEntered] = useState(false)
  /** 打开瞬间锁定高度，避免聚焦输入框时随 visualViewport/键盘回调反复变高导致「页面突然变大」 */
  const [sheetHeightPx, setSheetHeightPx] = useState<number | null>(null)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [messages, setMessages] = useState<SheetMsg[]>([])
  const [reactionById, setReactionById] = useState<Record<string, 'up' | 'down'>>({})
  const [copyToast, setCopyToast] = useState(false)
  const listRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const messagesRef = useRef<SheetMsg[]>([])
  const saveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevOpenRef = useRef(false)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  const thinkingStem = useMemo(
    () => t('nav.supportSheetThinking').replace(/[.。…]+$/u, '').trim() || t('nav.supportSheetThinking'),
    [locale, t]
  )

  const inputThinkingStem = useMemo(
    () =>
      t('nav.supportSheetInputThinking').replace(/[.。…]+$/u, '').trim() ||
      t('nav.supportSheetInputThinking'),
    [locale, t]
  )

  const supportWalletAddress =
    wagmiConnected && wagmiAddress && /^0x[a-fA-F0-9]{40}$/.test(wagmiAddress.trim())
      ? wagmiAddress.trim()
      : ''
  const supportNickname = supportWalletAddress ? shortWalletLabel(supportWalletAddress) : ''

  const syncInputHeight = useCallback(() => {
    const el = inputRef.current
    if (!el) return
    const h1 = 44
    const h2 = 72
    const hMax = 192
    el.style.height = 'auto'
    const sh = el.scrollHeight
    const next = sh <= h2 ? Math.max(h1, Math.min(sh, h2)) : Math.min(sh, hMax)
    el.style.height = `${next}px`
    el.style.overflowY = sh > hMax ? 'auto' : 'hidden'
  }, [])

  useLayoutEffect(() => {
    if (!open) return
    syncInputHeight()
  }, [input, open, syncInputHeight])

  const questionPool = useMemo(() => buildKnowledgeQuestionPool(locale), [locale])

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  useEffect(() => {
    const wasOpen = prevOpenRef.current
    prevOpenRef.current = open

    if (!open) {
      if (wasOpen) {
        saveSupportSheetPersisted(messagesRef.current, locale)
      }
      setInput('')
      setErr(null)
      setSending(false)
      setReactionById({})
      return
    }

    // 打开期间禁止因 unstable 的 t() 等导致反复 init（否则会闪屏、清空会话、发送无回复）
    if (wasOpen) return

    const restored = loadSupportSheetPersisted()
    if (restored.length > 0) {
      setMessages(restored)
      setReactionById({})
    } else {
      setMessages([
        {
          id: SHEET_WELCOME_MESSAGE_ID,
          role: 'assistant',
          content: getTranslation(locale, 'nav.supportSheetBotIntro'),
          faqs: pickRandomFaqs(questionPool, 5),
          welcomeBanner: true,
        },
      ])
      setReactionById({})
    }
  }, [open, locale, questionPool])

  useEffect(() => {
    if (!open) return
    if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current)
    saveDebounceRef.current = setTimeout(() => {
      saveSupportSheetPersisted(messages, locale)
      saveDebounceRef.current = null
    }, SUPPORT_SAVE_DEBOUNCE_MS)
    return () => {
      if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current)
    }
  }, [messages, locale, open])

  useEffect(() => {
    if (!open) return
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current()
    }
    window.addEventListener('keydown', onEsc)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onEsc)
      document.body.style.overflow = prev
    }
  }, [open])

  useEffect(() => {
    if (!open) {
      setEntered(false)
      setSheetHeightPx(null)
      return
    }
    const inner = typeof window !== 'undefined' ? window.innerHeight : 760
    const cap = Math.max(420, Math.min(720, Math.floor(inner * 0.86)))
    setSheetHeightPx(cap)
    const id = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(id)
  }, [open])

  useEffect(() => {
    if (!open) return
    const el = listRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [open, messages, sending])

  const flashCopyToast = useCallback(() => {
    setCopyToast(true)
    window.setTimeout(() => setCopyToast(false), 1600)
  }, [])

  const postSheetFeedback = useCallback(
    (row: {
      assistantMessageId: string
      reaction: 'up' | 'down' | 'clear'
      userQuestion: string
      answerPreview: string
    }) => {
      void fetchWithTimeout(chatHttpUrl('support/feedback'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assistantMessageId: row.assistantMessageId,
          reaction: row.reaction,
          locale,
          userQuestion: row.userQuestion,
          answerPreview: row.answerPreview,
        }),
        timeoutMs: 12_000,
      }).catch(() => {})
    },
    [locale]
  )

  const applyMessageReaction = useCallback(
    (assistantId: string, userQuestion: string, answer: string, pick: 'up' | 'down') => {
      setReactionById((prev) => {
        const next = { ...prev }
        const was = next[assistantId]
        let serverReaction: 'up' | 'down' | 'clear' = pick
        if (was === pick) {
          delete next[assistantId]
          serverReaction = 'clear'
        } else {
          next[assistantId] = pick
          serverReaction = pick
        }
        postSheetFeedback({
          assistantMessageId: assistantId,
          reaction: serverReaction,
          userQuestion,
          answerPreview: answer.slice(0, 1200),
        })
        return next
      })
    },
    [postSheetFeedback]
  )

  const callSupportAsk = useCallback(
    async (userText: string, historySource: SheetMsg[]) => {
      const history = historySource.slice(-12).map((m) => ({
        role: m.role,
        content: m.content,
      }))
      const maxAttempts = 3
      const pauseMs = [0, 900, 2200] as const

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        if (pauseMs[attempt] > 0) {
          await new Promise((r) => setTimeout(r, pauseMs[attempt]))
        }

        let res: Response
        try {
          res = await fetchWithTimeout(chatHttpUrl('support/ask'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: userText,
              history,
              locale,
              ...(supportWalletAddress
                ? { walletAddress: supportWalletAddress, nickname: supportNickname }
                : {}),
            }),
            timeoutMs: 120_000,
          })
        } catch (e: unknown) {
          const name = e instanceof Error ? e.name : ''
          if (name === 'AbortError') throw e
          const transient =
            e instanceof TypeError && /fetch|network|load failed|failed to fetch/i.test(String(e.message || ''))
          if (transient && attempt < maxAttempts - 1) continue
          throw e
        }

        const raw = await res.text()
        let data: { reply?: string; error?: string } = {}
        try {
          data = JSON.parse(raw) as { reply?: string; error?: string }
        } catch {
          data = {}
        }

        if (!res.ok) {
          const code = data.error || `HTTP ${res.status}`
          const retryable =
            (res.status === 502 || res.status === 503 || res.status === 504) && attempt < maxAttempts - 1
          if (retryable) continue
          if (res.status === 429) throw new Error(`RATE:${t('nav.supportSheetRateLimited')}`)
          throw new Error(`HTTP:${t('nav.supportSheetError')} (${code})`)
        }

        const reply = typeof data.reply === 'string' ? data.reply.trim() : ''
        if (!reply) {
          if (attempt < maxAttempts - 1) continue
          throw new Error(`EMPTY:${t('nav.supportSheetError')}`)
        }
        return reply
      }

      throw new Error(`EMPTY:${t('nav.supportSheetError')}`)
    },
    [locale, supportNickname, supportWalletAddress, t]
  )

  const sendUserText = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || sending) return

      setErr(null)
      setSending(true)
      const userId = `u-${Date.now()}`
      let priorForHistory: SheetMsg[] = []
      setMessages((m) => {
        priorForHistory = m
        return [...m, { id: userId, role: 'user', content: trimmed }]
      })
      setInput('')

      try {
        const reply = await callSupportAsk(trimmed, priorForHistory)
        const faqs = pickRelatedFaqs(trimmed, reply, questionPool, 5)
        setMessages((m) => [
          ...m,
          {
            id: `a-${Date.now()}`,
            role: 'assistant',
            content: reply,
            faqs,
          },
        ])
      } catch (e: unknown) {
        const name = e instanceof Error ? e.name : ''
        const msg = e instanceof Error ? e.message : ''
        if (name === 'AbortError') setErr(t('nav.supportSheetTimeout'))
        else if (msg.startsWith('RATE:')) setErr(msg.slice(5))
        else if (msg.startsWith('HTTP:')) setErr(msg.slice(5))
        else if (msg.startsWith('EMPTY:')) setErr(msg.slice(6))
        else if (e instanceof TypeError && /fetch|network|load failed|failed to fetch/i.test(msg))
          setErr(t('nav.supportSheetTimeout'))
        else setErr(t('nav.supportSheetError'))
        setMessages((m) => m.filter((x) => x.id !== userId))
      } finally {
        setSending(false)
      }
    },
    [callSupportAsk, questionPool, sending, t]
  )

  const regenerateAssistant = useCallback(
    async (assistantId: string) => {
      if (sending) return
      const current = messagesRef.current
      const idx = current.findIndex((m) => m.id === assistantId)
      if (idx < 1) return
      const prev = current[idx - 1]
      if (prev.role !== 'user') return
      const removed = current[idx] as SheetAssistantMsg
      const historyBefore = current.slice(0, idx - 1)

      setErr(null)
      setSending(true)
      setMessages((m) => m.filter((x) => x.id !== assistantId))
      setReactionById((r) => {
        const next = { ...r }
        delete next[assistantId]
        return next
      })

      try {
        const reply = await callSupportAsk(prev.content, historyBefore)
        const faqs = pickRelatedFaqs(prev.content, reply, questionPool, 5)
        setMessages((m) => [
          ...m,
          {
            id: `a-${Date.now()}`,
            role: 'assistant',
            content: reply,
            faqs,
          },
        ])
      } catch (e: unknown) {
        setMessages((m) => {
          const uIdx = m.findIndex((x) => x.id === prev.id)
          if (uIdx === -1) return [...m, removed]
          return [...m.slice(0, uIdx + 1), removed, ...m.slice(uIdx + 1)]
        })
        const name = e instanceof Error ? e.name : ''
        const msg = e instanceof Error ? e.message : ''
        if (name === 'AbortError') setErr(t('nav.supportSheetTimeout'))
        else if (msg.startsWith('RATE:')) setErr(msg.slice(5))
        else if (msg.startsWith('HTTP:')) setErr(msg.slice(5))
        else if (msg.startsWith('EMPTY:')) setErr(msg.slice(6))
        else if (e instanceof TypeError && /fetch|network|load failed|failed to fetch/i.test(msg))
          setErr(t('nav.supportSheetTimeout'))
        else setErr(t('nav.supportSheetError'))
      } finally {
        setSending(false)
      }
    },
    [callSupportAsk, questionPool, sending, t]
  )

  const copyAssistantText = useCallback(
    async (content: string) => {
      const text = String(content || '')
      if (!text) return
      try {
        if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText && window.isSecureContext) {
          await navigator.clipboard.writeText(text)
          flashCopyToast()
          return
        }
      } catch {
        /* fall through */
      }
      try {
        const ta = document.createElement('textarea')
        ta.value = text
        ta.setAttribute('readonly', '')
        ta.style.position = 'fixed'
        ta.style.top = '0'
        ta.style.left = '0'
        ta.style.opacity = '0'
        ta.style.pointerEvents = 'none'
        ta.style.width = '1px'
        ta.style.height = '1px'
        document.body.appendChild(ta)
        ta.focus()
        ta.select()
        ta.setSelectionRange(0, text.length)
        const ok = document.execCommand('copy')
        document.body.removeChild(ta)
        if (ok) flashCopyToast()
      } catch {
        /* ignore */
      }
    },
    [flashCopyToast]
  )

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[145] flex items-end justify-center overflow-x-hidden bg-black/65 backdrop-blur-sm sm:items-center"
      onClick={onClose}
      aria-modal
      role="dialog"
    >
      <div
        className={`relative z-[146] flex w-full min-w-0 max-w-lg flex-col overflow-hidden rounded-t-3xl border border-[#00f5d420] bg-gradient-to-b from-[#0d0d14] via-[#0a0a10] to-[#0d0d14] shadow-[0_-16px_64px_rgba(0,0,0,0.55),0_0_0_1px_rgba(0,245,212,0.06)_inset] transition-transform duration-300 ease-out will-change-transform sm:rounded-3xl ${
          entered ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={
          sheetHeightPx != null
            ? { height: sheetHeightPx, maxHeight: sheetHeightPx }
            : { maxHeight: 'min(86vh, 720px)' }
        }
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#00f5d4]/35 to-transparent" />

        {/* Header */}
        <div className="flex shrink-0 items-start gap-3 border-b border-[#00f5d420]/15 px-4 pb-3 pt-3">
          <div className="relative h-14 w-14 shrink-0 overflow-hidden bg-[#0d0d14]">
            <LazyDotLottieAnimation
              src={SUPPORT_AVATAR_LOTTIE_SRC}
              className="h-full w-full"
              autoplay
              loop
              speed={1}
              rootMargin="0px"
              posterSrc=""
            />
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#00f5d4]/75">
              {t('nav.supportSheetKicker')}
            </div>
            <div className="mt-0.5 text-base font-bold tracking-tight text-[#f1f5f9]">{t('nav.supportSheetTitle')}</div>
          </div>
          <button
            type="button"
            className="shrink-0 rounded-full p-2 text-[#94a3b8] transition-colors hover:bg-white/[0.06] hover:text-[#f1f5f9]"
            onClick={onClose}
            aria-label={t('wallet.close')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Messages：min-height 防止底部「思考中」区域过高时把会话区挤成 0 高度 */}
        <div
          ref={listRef}
          className="min-h-0 min-w-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden px-4 py-4 [overscroll-behavior:contain] [touch-action:pan-y] [-webkit-overflow-scrolling:touch]"
        >
          {messages.map((m, idx) => {
            if (m.role === 'user') {
              return (
                <div key={m.id} className="flex min-w-0 max-w-full justify-end">
                  <div className="w-full max-w-[92%] min-w-0 shrink overflow-hidden rounded-2xl bg-gradient-to-br from-[#00f5d4]/18 to-[#00c9a3]/10 px-4 py-3 text-[13px] leading-relaxed text-[#ecfeff] shadow-[0_4px_20px_rgba(0,245,212,0.08)] ring-1 ring-[#00f5d4]/22">
                    <div className={SUPPORT_TEXT_WRAP_CLASS}>{prepareSupportPlainSegment(m.content)}</div>
                  </div>
                </div>
              )
            }
            const pairedUserQ =
              idx > 0 && messages[idx - 1]?.role === 'user' ? messages[idx - 1].content : ''
            const isWelcomeBubble = Boolean(m.welcomeBanner) || m.id === SHEET_WELCOME_MESSAGE_ID
            return (
              <div
                key={m.id}
                className="flex min-w-0 max-w-full flex-col gap-2"
              >
                {m.faqs.length ? (
                  <div className="flex min-w-0 max-w-full flex-wrap gap-2 pl-0.5">
                    {m.faqs.map((q) => (
                      <button
                        key={`${m.id}-${q}`}
                        type="button"
                        disabled={sending}
                        onClick={() => void sendUserText(q)}
                        className="max-w-full min-w-0 rounded-full border border-[#00f5d4]/20 bg-[#0d0d14]/90 px-3 py-1.5 text-left text-[11px] font-medium leading-snug text-[#cbd5e1] break-words transition-colors hover:border-[#00f5d4]/40 hover:text-[#00f5d4] disabled:opacity-50"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                ) : null}
                <div className="flex min-w-0 max-w-full justify-start">
                  <div className="w-full max-w-[92%] min-w-0 shrink overflow-hidden rounded-[1.35rem] border border-white/[0.07] bg-gradient-to-br from-[#171722]/98 via-[#12121a]/98 to-[#0f0f16]/98 px-4 py-3.5 shadow-[0_8px_32px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.04)]">
                    {isWelcomeBubble ? (
                      <div className="mb-3 flex min-w-0 max-w-full justify-center overflow-hidden">
                        <div className="relative aspect-square h-[min(8.5rem,min(62vw,40vh))] w-[min(8.5rem,min(62vw,40vh))] shrink-0">
                          <div className="relative z-0 h-full w-full">
                            <LazyDotLottieAnimation
                              src={SUPPORT_WELCOME_LOTTIE_SRC}
                              className="h-full w-full"
                              autoplay
                              loop
                              speed={1}
                              rootMargin="400px 0px 400px 0px"
                              posterSrc=""
                            />
                          </div>
                          <div
                            className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
                            aria-hidden
                          >
                            <LazyDotLottieAnimation
                              src={SUPPORT_CONFETTI_LOTTIE_SRC}
                              className="h-full w-full object-contain opacity-[0.92]"
                              autoplay
                              loop
                              speed={1}
                              rootMargin="400px 0px 400px 0px"
                              posterSrc=""
                            />
                          </div>
                        </div>
                      </div>
                    ) : null}
                    <SupportAssistantBody text={m.content} />
                    <div className="mt-3 flex min-w-0 max-w-full flex-wrap items-center gap-0.5 border-t border-white/[0.06] pt-2.5">
                      <button
                        type="button"
                        className="rounded-lg p-1.5 text-[#94a3b8] transition-colors hover:bg-white/[0.06] hover:text-[#e2e8f0] active:bg-white/[0.08]"
                        aria-label={t('nav.supportSheetCopyReply')}
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          void copyAssistantText(m.content)
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      {!isWelcomeBubble ? (
                        <>
                          <button
                            type="button"
                            className={`rounded-lg p-1.5 transition-colors hover:bg-white/[0.06] ${
                              reactionById[m.id] === 'up' ? 'text-[#00f5d4]' : 'text-[#94a3b8] hover:text-[#e2e8f0]'
                            }`}
                            aria-label={t('nav.supportSheetLike')}
                            aria-pressed={reactionById[m.id] === 'up'}
                            onClick={() => applyMessageReaction(m.id, pairedUserQ, m.content, 'up')}
                          >
                            <ThumbsUp className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            className={`rounded-lg p-1.5 transition-colors hover:bg-white/[0.06] ${
                              reactionById[m.id] === 'down' ? 'text-[#fb7185]' : 'text-[#94a3b8] hover:text-[#e2e8f0]'
                            }`}
                            aria-label={t('nav.supportSheetDislike')}
                            aria-pressed={reactionById[m.id] === 'down'}
                            onClick={() => applyMessageReaction(m.id, pairedUserQ, m.content, 'down')}
                          >
                            <ThumbsDown className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            disabled={sending}
                            className="rounded-lg p-1.5 text-[#94a3b8] transition-colors hover:bg-white/[0.06] hover:text-[#e2e8f0] disabled:opacity-40"
                            aria-label={t('nav.supportSheetRegenerate')}
                            onClick={() => void regenerateAssistant(m.id)}
                          >
                            <RotateCw className="h-4 w-4" />
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {err ? (
          <div className="max-w-full shrink-0 break-words border-t border-[#f43f5e]/20 bg-[#f43f5e]/10 px-4 py-2 text-center text-xs text-[#fecdd3]">
            {err}
          </div>
        ) : null}

        {/* 等待动效在输入框上方；输入区（限制高度避免挤没上方会话区） */}
        <div className="w-full min-w-0 max-w-full shrink-0 overflow-x-hidden border-t border-[#00f5d420]/12 bg-[#05050a]/80 px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md">
          {copyToast ? (
            <div className="pointer-events-none fixed bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] left-1/2 z-[200] -translate-x-1/2 rounded-full bg-[#0f172a]/95 px-4 py-2 text-center text-xs text-[#e2e8f0] shadow-lg ring-1 ring-[#00f5d4]/25">
              {t('wallet.copied')}
            </div>
          ) : null}
          {sending ? (
            <div
              className="mb-3 max-h-[min(42vh,260px)] min-w-0 max-w-full overflow-y-auto overflow-x-hidden rounded-2xl border border-[#00f5d4]/10 bg-[#080b11]/95 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
              aria-busy
              aria-live="polite"
            >
              <div className="relative mb-3 flex flex-col gap-2.5 pt-0.5">
                <div
                  className="pointer-events-none absolute -top-2 left-2 right-2 h-10 rounded-full bg-gradient-to-b from-[#00f5d4]/35 via-[#00f5d4]/12 to-transparent opacity-90 blur-xl"
                  aria-hidden
                />
                <div className="relative z-[1] flex flex-col gap-2.5">
                  <div className="rwa-support-skeleton-bar h-2.5 w-[92%]" />
                  <div className="rwa-support-skeleton-bar h-2.5 w-[76%]" />
                  <div className="rwa-support-skeleton-bar h-2.5 w-[54%]" />
                </div>
              </div>
              <div className="relative z-[1] flex min-w-0 max-w-full flex-row items-center justify-between gap-1 sm:gap-2">
                <div className="h-[4.875rem] w-[min(7.5rem,28vw)] shrink-0 sm:w-[8.625rem]">
                  <LazyDotLottieAnimation
                    src={SUPPORT_WAIT_LOTTIE_SRC}
                    className="h-full w-full"
                    autoplay
                    loop
                    speed={1}
                    rootMargin="400px 0px 400px 0px"
                    posterSrc=""
                  />
                </div>
                <div
                  className="flex min-w-0 flex-1 items-center justify-center px-1 text-center text-[11px] font-medium leading-tight text-[#64748b]"
                  aria-label={thinkingStem}
                >
                  <span className="whitespace-nowrap">{thinkingStem}</span>
                  <ThinkingEllipsis />
                </div>
                <div className="h-[4.875rem] w-[min(7.5rem,28vw)] shrink-0 -scale-x-100 sm:w-[8.625rem]">
                  <LazyDotLottieAnimation
                    src={SUPPORT_WAIT_LOTTIE_SRC}
                    className="h-full w-full"
                    autoplay
                    loop
                    speed={1}
                    rootMargin="400px 0px 400px 0px"
                    posterSrc=""
                  />
                </div>
              </div>
            </div>
          ) : null}
          <div className="flex min-w-0 max-w-full items-end gap-2">
            <div className="relative min-w-0 max-w-full flex-1">
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    void sendUserText(input)
                  }
                }}
                placeholder={sending ? '' : t('nav.supportSheetPlaceholder')}
                enterKeyHint="send"
                autoComplete="off"
                autoCorrect="off"
                aria-busy={sending}
                aria-label={sending ? `${inputThinkingStem}…` : undefined}
                className="box-border min-h-[44px] max-h-48 w-full resize-none overflow-hidden rounded-2xl border border-[#ffffff0d] bg-[#0d0d14]/95 px-3 py-2.5 text-[16px] leading-snug text-[#f1f5f9] outline-none ring-0 placeholder:text-[#64748b] focus:border-[#00f5d4]/35 sm:text-sm"
                disabled={sending}
              />
              {sending ? (
                <div
                  className="pointer-events-none absolute inset-0 flex items-center px-3 py-2.5 text-[16px] leading-snug sm:text-sm"
                  aria-hidden
                >
                  <span className="flex items-center text-[#64748b]">
                    <span className="whitespace-nowrap">{inputThinkingStem}</span>
                    <ThinkingEllipsis />
                  </span>
                </div>
              ) : null}
            </div>
            <button
              type="button"
              disabled={sending || !input.trim()}
              onClick={() => void sendUserText(input)}
              className="inline-flex h-11 min-h-[44px] w-11 shrink-0 items-center justify-center rounded-2xl bg-[#00f5d4] text-[#05050a] shadow-[0_10px_28px_rgba(0,245,212,0.22)] transition-[transform,filter] hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
              aria-label={t('nav.supportSheetSend')}
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
