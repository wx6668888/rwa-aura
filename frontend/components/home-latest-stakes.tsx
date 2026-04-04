'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import { BSC_BLOCK_EXPLORER } from '@/lib/contracts/addresses'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

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
  const [inView, setInView] = useState(false)
  const [rows, setRows] = useState<RecentStakeRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [visibleItems, setVisibleItems] = useState<boolean[]>([])

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
      { threshold: 0.08, rootMargin: '0px 0px 15% 0px' }
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
        const res = await fetch('/api/stats/homepage/recent-stakes?limit=5', { cache: 'no-store' })
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
    setVisibleItems([])
  }, [rows])

  /** 进入视口后按条依次从左右滑入（比逐条 IntersectionObserver 更慢、更顺序） */
  useEffect(() => {
    if (!inView || rows.length === 0) return
    if (reducedMotion) {
      setVisibleItems(rows.map(() => true))
      return
    }
    setVisibleItems(rows.map(() => false))
    const staggerMs = 420
    const timers = rows.map((_, i) =>
      window.setTimeout(() => {
        setVisibleItems((prev) => {
          const next = prev.length === rows.length ? [...prev] : rows.map(() => false)
          next[i] = true
          return next
        })
      }, i * staggerMs)
    )
    return () => timers.forEach((id) => clearTimeout(id))
  }, [inView, reducedMotion, rows])

  const accent = '#00ffc8'

  const timeLocale =
    locale === 'zh' ? 'zh-CN' : locale === 'ja' ? 'ja-JP' : locale === 'ko' ? 'ko-KR' : 'en-US'

  const showSkeleton = !inView || loading
  const showList = inView && !loading && !error && rows.length > 0

  return (
    <section ref={sectionRef} className="relative overflow-x-hidden py-10 lg:py-14">
      <div className="relative mx-auto max-w-3xl px-4 lg:px-8">
        <h2 className="mb-6 text-center font-[family-name:var(--font-space-grotesk)] text-xl font-bold tracking-tight text-white sm:mb-8 sm:text-2xl lg:text-left">
          {t('home.recentStakesTitle')}
        </h2>

        <div className="rounded-3xl border border-[#1f2733] bg-[#0f1622]/65 p-4 backdrop-blur-[5px] sm:p-6">
        {showSkeleton ? (
          <div className="flex flex-col gap-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-[4.5rem] animate-pulse rounded-lg border border-white/[0.06] bg-white/[0.03]"
              />
            ))}
          </div>
        ) : error && rows.length === 0 ? (
          <p className="text-center text-sm text-white/60">{t('home.recentStakesError')}</p>
        ) : rows.length === 0 ? (
          <p className="text-center text-sm text-white/60">{t('home.recentStakesEmpty')}</p>
        ) : null}

        {showList ? (
          <div className="flex flex-col gap-5 sm:gap-6">
            {rows.map((row, i) => {
              const fromLeft = i % 2 === 0
              const slideOut = reducedMotion
                ? 'translate-x-0'
                : fromLeft
                  ? '-translate-x-10 sm:-translate-x-14'
                  : 'translate-x-10 sm:translate-x-14'
              const isVisible = reducedMotion || !!visibleItems[i]
              const visible = isVisible ? 'translate-x-0 opacity-100' : `${slideOut} opacity-0`
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
                  className={`relative overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.03] py-3 transition-[transform,opacity] duration-[2000ms] ease-out ${visible}`}
                >
                  {txUrl ? (
                    <a
                      href={txUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute right-2.5 top-2 p-0.5 text-[#00ffc8]/70 transition hover:text-[#00ffc8]"
                      aria-label="BscScan"
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
