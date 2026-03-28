'use client'

import Link from 'next/link'
import { DotLottieAnimation } from '@/components/lottie-animation'
import { TrustHighlightCardShell } from '@/components/trust-highlight-card-shell'
import {
  TRUST_BULLET_DOT,
  TRUST_BULLET_LI,
  TRUST_BULLET_LIST,
  TRUST_CARD_BODY_GRID,
  TRUST_LOTTIE_COL,
  TRUST_LOTTIE_INNER,
  TRUST_TEXT_COL,
} from '@/lib/trust-highlight-cards'
import { cn } from '@/lib/utils'

export function WithdrawCtaCard({ className }: { className?: string }) {
  return (
    <TrustHighlightCardShell className={className}>
      <h3 className="text-left text-2xl font-extrabold text-white sm:text-3xl">随时提现，一键到账</h3>

      <div className={TRUST_CARD_BODY_GRID}>
        <div className={TRUST_TEXT_COL}>
          <ul className={TRUST_BULLET_LIST}>
            <li className={TRUST_BULLET_LI}>
              <span className={TRUST_BULLET_DOT} aria-hidden>
                ·
              </span>
              <span className="min-w-0 break-words">多资产支持，一次看清可提余额</span>
            </li>
            <li className={TRUST_BULLET_LI}>
              <span className={TRUST_BULLET_DOT} aria-hidden>
                ·
              </span>
              <span className="min-w-0 break-words">RWA / USDT / 推荐奖励等分项展示</span>
            </li>
            <li className={TRUST_BULLET_LI}>
              <span className={TRUST_BULLET_DOT} aria-hidden>
                ·
              </span>
              <span className="min-w-0 break-words">链上确认可追踪，到账更安心</span>
            </li>
          </ul>

          <div className="flex shrink-0 justify-start">
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

        <div className={TRUST_LOTTIE_COL}>
          <div className={TRUST_LOTTIE_INNER}>
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
