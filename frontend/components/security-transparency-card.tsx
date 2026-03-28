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

            <div className="mt-5 grid grid-cols-1 gap-5 sm:mt-6 sm:grid-cols-[minmax(0,1fr)_min(200px,38vw)] sm:items-stretch sm:gap-x-8 sm:gap-y-0 lg:grid-cols-[minmax(0,1fr)_min(240px,34vw)] lg:gap-x-12">
              <div className="flex min-w-0 flex-col gap-4 sm:gap-5">
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

                <div className="flex justify-start">
                  <Link
                    href="/security"
                    className="inline-flex rounded-full border border-[#2d3a4f] bg-[#121a27] px-5 py-2.5 text-sm font-semibold text-[#d9e7f7] transition-colors hover:bg-[#182235]"
                  >
                    查看链上数据
                  </Link>
                </div>
              </div>

              <div className="flex min-h-[150px] w-full min-w-0 justify-center sm:h-full sm:min-h-0 sm:justify-end">
                <div className="h-full w-[min(100%,11rem)] min-h-[150px] sm:h-full sm:min-h-0 sm:w-full sm:max-w-[min(20rem,100%)]">
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
          </div>
        </div>
      </div>
    </section>
  )
}
