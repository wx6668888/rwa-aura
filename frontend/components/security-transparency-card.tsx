'use client'

import Link from 'next/link'
import { DotLottieAnimation } from '@/components/lottie-animation'

export function SecurityTransparencyCard() {
  return (
    <section className="mx-auto mt-2 w-full max-w-7xl px-4 pb-3 lg:px-8">
      <div className="relative mx-auto max-w-3xl lg:max-w-5xl">
        <div className="relative overflow-hidden rounded-3xl border border-[#1f2733] bg-[#0f1622]/75 p-5 backdrop-blur-[5px] sm:p-7">
          <div className="pointer-events-none absolute -right-32 -top-32 h-64 w-64 rounded-full border border-[#00f5d4]/20 shadow-[0_0_60px_rgba(0,245,212,0.12)]" />
          <div className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(0,245,212,0.16),rgba(0,245,212,0.02)_65%,transparent_70%)]" />

          <div className="relative z-10">
            <h3 className="text-left text-2xl font-extrabold text-white sm:text-3xl">安全可靠，久经考验</h3>
            <p className="mt-3 text-left text-sm leading-relaxed text-[#93a6bf] sm:text-base">
              链上可追溯，资金可验证，透明可审计。
            </p>

            {/* 手机起即左右分栏：左三行文案，右动图，垂直居中对齐 */}
            <div className="mt-5 grid grid-cols-[minmax(0,1fr)_min(104px,30vw)] items-center gap-3 sm:grid-cols-[minmax(0,1fr)_min(132px,34vw)] sm:gap-6 lg:grid-cols-[minmax(0,1fr)_168px] lg:gap-8">
              <ul className="list-none space-y-1.5 text-left text-[13px] leading-snug text-[#c7d3e1] sm:space-y-2 sm:text-sm">
                <li className="flex gap-2">
                  <span className="shrink-0 text-[#00f5d4]/80" aria-hidden>
                    ·
                  </span>
                  <span>链上可核验</span>
                </li>
                <li className="flex gap-2">
                  <span className="shrink-0 text-[#00f5d4]/80" aria-hidden>
                    ·
                  </span>
                  <span>指标持续监控</span>
                </li>
                <li className="flex gap-2">
                  <span className="shrink-0 text-[#00f5d4]/80" aria-hidden>
                    ·
                  </span>
                  <span>配置可回滚</span>
                </li>
              </ul>

              <div className="flex h-full min-h-[100px] items-center justify-center lg:min-h-[132px] lg:justify-end">
                <div className="h-[96px] w-[96px] sm:h-[118px] sm:w-[118px] lg:h-[152px] lg:w-[152px]">
                  <DotLottieAnimation
                    src="/shouyes.lottie"
                    className="h-full w-full"
                    autoplay
                    loop
                    speed={1.35}
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 sm:mt-7">
              <Link
                href="/security"
                className="inline-flex rounded-full border border-[#2d3a4f] bg-[#121a27] px-5 py-2.5 text-sm font-semibold text-[#d9e7f7] transition-colors hover:bg-[#182235]"
              >
                查看链上数据
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
