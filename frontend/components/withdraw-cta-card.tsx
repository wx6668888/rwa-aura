'use client'

import Link from 'next/link'
import { DotLottieAnimation } from '@/components/lottie-animation'
import { TrustHighlightCardShell } from '@/components/trust-highlight-card-shell'
import { cn } from '@/lib/utils'

export function WithdrawCtaCard({ className }: { className?: string }) {
  return (
    <TrustHighlightCardShell className={className}>
      <h3 className="text-left text-2xl font-extrabold text-white sm:text-3xl">随时提现，一键到账</h3>
      <p className="mt-2 text-left text-sm leading-relaxed text-[#93a6bf] sm:text-base">
        收益与本金统一入口，分类清晰，少跳转、少困惑。
      </p>

      <div className="mt-4 grid grid-cols-[minmax(0,1fr)_min(136px,48vw)] grid-rows-1 items-stretch gap-x-3 sm:mt-5 sm:grid-cols-[minmax(0,1fr)_min(175px,48vw)] sm:gap-x-5 md:grid-cols-[minmax(0,1fr)_min(320px,50vw)] md:gap-x-10 lg:grid-cols-[minmax(0,1fr)_min(400px,44vw)] lg:gap-x-12">
        <div className="flex min-h-0 min-w-0 flex-col gap-4 sm:gap-5 md:gap-6">
          <ul className="list-none space-y-3 py-0.5 text-left text-[13px] leading-relaxed text-[#c7d3e1] sm:space-y-3.5 sm:text-sm sm:leading-relaxed md:space-y-4 md:py-1 md:text-base md:leading-loose">
            <li className="flex gap-1.5 sm:gap-2">
              <span className="shrink-0 text-[#00f5d4]/80" aria-hidden>
                ·
              </span>
              <span className="min-w-0 break-words">多资产支持，一次看清可提余额</span>
            </li>
            <li className="flex gap-1.5 sm:gap-2">
              <span className="shrink-0 text-[#00f5d4]/80" aria-hidden>
                ·
              </span>
              <span className="min-w-0 break-words">RWA / USDT / 推荐奖励等分项展示</span>
            </li>
            <li className="flex gap-1.5 sm:gap-2">
              <span className="shrink-0 text-[#00f5d4]/80" aria-hidden>
                ·
              </span>
              <span className="min-w-0 break-words">链上确认可追踪，到账更安心</span>
            </li>
          </ul>

          <div className="flex justify-start">
            <Link
              href="/withdraw"
              className={cn(
                'inline-flex max-w-full rounded-full border border-[#00f5d4]/35 bg-[#00f5d4]/10 px-3 py-2 text-center text-[11px] font-semibold leading-tight text-[#00f5d4] transition-colors hover:bg-[#00f5d4]/18 sm:px-4 sm:py-2.5 sm:text-xs md:px-5 md:text-sm'
              )}
            >
              前往提现
            </Link>
          </div>
        </div>

        <div className="flex h-full min-h-0 w-full min-w-0 justify-end">
          <div className="h-full min-h-0 w-full max-w-[min(22rem,100%)] md:max-w-none">
            <DotLottieAnimation
              src="/QIANBAO.lottie"
              className="h-full min-h-0 w-full"
              autoplay
              loop
              speed={1.15}
            />
          </div>
        </div>
      </div>
    </TrustHighlightCardShell>
  )
}
