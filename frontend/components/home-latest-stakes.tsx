'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import { BSC_BLOCK_EXPLORER } from '@/lib/contracts/addresses'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

const STAKE_LIST_LIMIT = 5

type RecentStakeRow = {
  userAddress: string
  asset: 'USDT' | 'RWA'
  amountToken: number
  timestampMs: number
  txHash: string | null
}

function shortenAddr(a: string) {
  const s = String(a || '').trim()
  if (s.length < 12) return s || '—'
  return `${s.slice(0, 6)}…${s.slice(-4)}`
}

function formatTokenAmount(n: number, maxFrac = 4) {
  if (!Number.isFinite(n) || n === 0) return '0'
  const abs = Math.abs(n)
  const digits = abs >= 1 ? 2 : maxFrac
  return n.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: 0 })
}

export function HomeLatestStakes() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const reducedMotion = usePrefersReducedMotion()
  const sectionRef = useRef<HTMLElement | null>(null)
  const cardRef = useRef<HTMLDivElement | null>(null)
  const [inView, setInView] = useState(false)
  const [stakingCardInView, setStakingCardInView] = useState(false)
  const [rows, setRows] = useState<RecentStakeRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  /** 列表整体入场：左右交替同时滑入（非逐条 stagger） */
  const [rowsSlideIn, setRowsSlideIn] = useState(false)

  /** 外层：尽早拉取数据 */
  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true)
          observer.disconnect()
        }
      },
      { threshold: 0.06, rootMargin: '0px 0px 22% 0px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  /** 玻璃卡片进入视口后才开始左右依次划入 */
  useEffect(() => {
    const el = cardRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        const hit = entries.some((e) => e.isIntersecting)
        if (hit) {
          setStakingCardInView(true)
          observer.disconnect()
        }
      },
      { threshold: 0.2, rootMargin: '0px 0px -8% 0px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!inView) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(false)
      try {
        const res = await fetch(
          `/api/stats/homepage/recent-stakes?limit=${STAKE_LIST_LIMIT}`,
          { cache: 'no-store' }
        )
        const json = await res.json()
        if (cancelled) return
        if (!json?.success || !Array.isArray(json?.data?.rows)) {
          setRows([])
          setError(true)
        } else {
          setRows(json.data.rows as RecentStakeRow[])
        }
      } catch {
        if (!cancelled) {
          setRows([])
          setError(true)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [inView])

  useEffect(() => {
    setRowsSlideIn(false)
  }, [rows])

  useEffect(() => {
    if (!stakingCardInView || rows.length === 0) return
    if (reducedMotion) {
      setRowsSlideIn(true)
      return
    }
    setRowsSlideIn(false)
    const t = window.setTimeout(() => setRowsSlideIn(true), 80)
    return () => clearTimeout(t)
  }, [stakingCardInView, reducedMotion, rows])

  const accent = '#00f5d4'

  const timeLocale =
    locale === 'zh' ? 'zh-CN' : locale === 'ja' ? 'ja-JP' : locale === 'ko' ? 'ko-KR' : 'en-US'

  const showSkeleton = !inView || loading
  const showList = inView && !loading && !error && rows.length > 0

  return (
    <section
      ref={sectionRef}
      className="relative isolate mx-auto max-w-7xl overflow-x-hidden px-4 py-12 lg:px-8 lg:py-14"
    >
      <div
        ref={cardRef}
        className="relative overflow-hidden rounded-3xl border border-white/14 bg-[#0d0d14]/82 px-5 py-8 shadow-[0_0_48px_rgba(0,0,0,0.35)] backdrop-blur-2xl supports-[backdrop-filter]:bg-[#0d0d14]/72 sm:px-8 sm:py-10"
      >
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl"
          aria-hidden
        />

        <div className="home-recent-stakes-ambient" aria-hidden>
          <div className="home-recent-stakes-ambient__base" />
          <div className="home-recent-stakes-ambient__blob-1" />
          <div className="home-recent-stakes-ambient__blob-2" />
          <div className="home-recent-stakes-ambient__accent" />
          <div className="home-recent-stakes-ambient__sheen" />
        </div>

        <div className="relative z-10 mx-auto max-w-4xl">
          <h2 className="mb-6 text-center font-[family-name:var(--font-space-grotesk)] text-xl font-bold tracking-tight text-[#f1f5f9] sm:mb-8 sm:text-2xl lg:text-left">
            {t('home.recentStakesTitle')}
          </h2>

          {showSkeleton ? (
            <div className="flex flex-col gap-5">
              {Array.from({ length: STAKE_LIST_LIMIT }).map((_, i) => (
                <div
                  key={i}
                  className="h-[4.5rem] animate-pulse rounded-lg border border-white/[0.08] bg-white/[0.04]"
                />
              ))}
            </div>
          ) : error && rows.length === 0 ? (
            <p className="text-center text-sm text-[#94a3b8]">{t('home.recentStakesError')}</p>
          ) : rows.length === 0 ? (
            <p className="text-center text-sm text-[#94a3b8]">{t('home.recentStakesEmpty')}</p>
          ) : null}

          {showList ? (
            <div className="flex flex-col gap-5 overflow-x-hidden sm:gap-6">
              {rows.map((row, i) => {
              const fromLeft = i % 2 === 0
              const slideOut = reducedMotion
                ? 'translate-x-0'
                : fromLeft
                  ? '-translate-x-[min(120vw,140%)]'
                  : 'translate-x-[min(120vw,140%)]'
              const visible = rowsSlideIn || reducedMotion
                ? 'translate-x-0 opacity-100'
                : `${slideOut} opacity-0`
              const ts = row.timestampMs > 0 ? new Date(row.timestampMs) : null
              const timeStr = ts
                ? ts.toLocaleString(timeLocale, {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '—'
              const txUrl = row.txHash ? `${BSC_BLOCK_EXPLORER}/tx/${row.txHash}` : null

              return (
                <article
                  key={`${row.txHash ?? 'nohash'}-${row.userAddress}-${i}-${row.timestampMs}`}
                  className={`relative overflow-hidden rounded-lg border border-white/[0.1] bg-white/[0.05] py-3 shadow-[0_4px_24px_rgba(0,0,0,0.28)] backdrop-blur-md transition-[transform,opacity] duration-[1000ms] ease-[cubic-bezier(0.22,1,0.28,1)] will-change-transform supports-[backdrop-filter]:bg-white/[0.04] ${visible}`}
                >
                  {txUrl ? (
                    <a
                      href={txUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute right-2.5 top-2 p-0.5 text-[#00f5d4]/70 transition hover:text-[#00f5d4]"
                      aria-label={t('home.recentStakeExplorerAria')}
                    >
                      <ArrowUpRight className="h-4 w-4" strokeWidth={2.25} aria-hidden />
                    </a>
                  ) : null}

                  <div className="flex flex-col items-center px-10 pb-6 pt-0.5 text-center">
                    <span className="font-mono text-[13px] leading-tight tracking-tight text-white/85 sm:text-sm">
                      {shortenAddr(row.userAddress)}
                    </span>
                    <span className="mt-1 font-mono text-[11px] tabular-nums text-white/42">{timeStr}</span>
                  </div>

                  <div
                    className="absolute bottom-2 left-3 font-mono text-[13px] font-medium tabular-nums sm:text-sm"
                    style={{ color: accent }}
                  >
                    {formatTokenAmount(row.amountToken)} {row.asset}
                  </div>
                </article>
              )
              })}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}
