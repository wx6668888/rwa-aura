'use client'

import Link from 'next/link'
import { DotLottieAnimation } from '@/components/lottie-animation'
import { TrustHighlightCardShell } from '@/components/trust-highlight-card-shell'
import {
  SECURITY_TRUST_BODY_ROW,
  SECURITY_TRUST_LOTTIE_COL,
  SECURITY_TRUST_LOTTIE_INNER,
  SECURITY_TRUST_TEXT_COL,
  TRUST_BULLET_DOT,
  TRUST_BULLET_LI,
  TRUST_BULLET_LIST,
} from '@/lib/trust-highlight-cards'

export function SecurityTransparencyCard({ className }: { className?: string }) {
  return (
    <TrustHighlightCardShell className={className}>
      <h3 className="shrink-0 pt-6 text-left text-2xl font-extrabold text-white sm:pt-8 sm:text-3xl md:pt-10">
        安全可靠，久经考验
      </h3>

      <div className={SECURITY_TRUST_BODY_ROW}>
        <div className={SECURITY_TRUST_TEXT_COL}>
          <ul className={TRUST_BULLET_LIST}>
            <li className={TRUST_BULLET_LI}>
              <span className={TRUST_BULLET_DOT} aria-hidden>
                ·
              </span>
              <span className="min-w-0 break-words">链上可核验</span>
            </li>
            <li className={TRUST_BULLET_LI}>
              <span className={TRUST_BULLET_DOT} aria-hidden>
                ·
              </span>
              <span className="min-w-0 break-words">指标持续监控</span>
            </li>
            <li className={TRUST_BULLET_LI}>
              <span className={TRUST_BULLET_DOT} aria-hidden>
                ·
              </span>
              <span className="min-w-0 break-words">配置可回滚</span>
            </li>
          </ul>
        </div>

        <div className={SECURITY_TRUST_LOTTIE_COL}>
          <div className={SECURITY_TRUST_LOTTIE_INNER}>
            <DotLottieAnimation
              src="/shouyes.lottie"
              className="h-full min-h-0 w-full"
              autoplay
              loop
              speed={1.35}
            />
          </div>
        </div>
      </div>

      <div className="mt-4 flex shrink-0 justify-start sm:mt-5">
        <Link
          href="/security"
          className="inline-flex max-w-full rounded-full border border-[#2d3a4f] bg-[#121a27] px-3 py-2 text-center text-[11px] font-semibold leading-tight text-[#d9e7f7] transition-colors hover:bg-[#182235] sm:px-4 sm:py-2.5 sm:text-xs md:px-5 md:text-sm"
        >
          查看链上数据
        </Link>
      </div>
    </TrustHighlightCardShell>
  )
}
