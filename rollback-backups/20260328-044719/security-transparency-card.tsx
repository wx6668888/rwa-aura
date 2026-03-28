'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { FileCheck, Bug, Github } from 'lucide-react'
import { DotLottieAnimation } from '@/components/lottie-animation'

function Bullet({
  icon: Icon,
  title,
  desc,
}: {
  icon: typeof FileCheck
  title: string
  desc: string
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[#00f5d4]/20 bg-[#00f5d4]/10 text-[#00f5d4]">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[14px] font-bold text-[#f1f5f9]">{title}</p>
        <p className="mt-1 text-[12px] leading-relaxed text-[#64748b]">{desc}</p>
      </div>
    </div>
  )
}

export function SecurityTransparencyCard() {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [entered, setEntered] = useState(false)

  useEffect(() => {
    const el = rootRef.current
    if (!el || entered) return
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            requestAnimationFrame(() => requestAnimationFrame(() => setEntered(true)))
            obs.disconnect()
            break
          }
        }
      },
      { threshold: 0.12 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [entered])

  return (
    <section className="relative mx-auto max-w-7xl overflow-visible px-4 py-12 lg:px-8">
      <div
        ref={rootRef}
        className={`relative transition-all duration-700 ease-out ${
          entered ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-8 scale-[0.98] opacity-0'
        }`}
      >
        {/* 动图在卡片「外」：不参与卡片圆角裁切，叠在卡片上方 */}
        <div
          className="relative z-20 -mb-4 flex w-full justify-center pointer-events-none select-none sm:-mb-6 md:-mb-8"
          aria-hidden
        >
          <div className="relative h-[210px] w-[110%] max-w-[760px] sm:h-[248px] md:h-[300px] md:w-[118%] lg:max-w-[860px]">
            <DotLottieAnimation
              src="/查看.lottie"
              autoplay={true}
              loop={true}
              speed={1}
              className={[
                'absolute left-1/2 top-0 z-10 -translate-x-1/2',
                'h-full w-[142%] max-w-none',
                'flex items-start justify-center',
                'origin-top [&_canvas]:origin-top [&_svg]:origin-top',
                '[&_canvas]:mx-auto [&_svg]:mx-auto',
                '[&_canvas]:scale-[1.14] [&_svg]:scale-[1.14]',
                '[&_canvas]:h-full [&_svg]:h-full [&_canvas]:w-full [&_svg]:w-full',
              ].join(' ')}
            />
          </div>
        </div>

        <div className="relative z-10 overflow-hidden rounded-3xl border border-[#ffffff1a] bg-[#0d0d14] px-6 pb-6 pt-3 md:px-10 md:pb-10 md:pt-5 backdrop-blur-xl">
          <div
            className="pointer-events-none absolute -right-24 -bottom-24 h-[360px] w-[360px] rounded-full opacity-40"
            style={{
              background:
                'radial-gradient(circle at 30% 30%, rgba(0,245,212,0.30), rgba(0,245,212,0) 60%)',
            }}
          />

          <div className="relative space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#00f5d4]/25 bg-[#00f5d4]/10 px-4 py-2">
              <span className="h-2 w-2 rounded-full bg-[#00f5d4]" />
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#00f5d4]">
                安全与透明
              </p>
            </div>

            <div className="space-y-3">
              <h2 className="font-[family-name:var(--font-space-grotesk)] text-[38px] font-extrabold leading-tight text-[#f1f5f9]">
                安全可靠，久经考验
              </h2>
              <p className="text-[15px] leading-relaxed text-[#64748b]">
                关键规则链上执行，数据可独立验证。通过审计、漏洞赏金与开源协作，持续提升协议安全性与可验证性。
              </p>
            </div>

            <div className="grid gap-4">
              <Bullet
                icon={FileCheck}
                title="第三方审计"
                desc="关键合约与核心流程经审计与复核，风险透明披露。"
              />
              <Bullet icon={Bug} title="漏洞赏金" desc="鼓励白帽持续审查，快速修复潜在风险点。" />
              <Bullet icon={Github} title="开源可查" desc="代码公开可审阅，记录与数据可追踪验证。" />
            </div>

            <div className="pt-2">
              <Link
                href="https://rwa.lat/analytics"
                target="_self"
                rel="noreferrer"
                className="inline-flex w-full items-center justify-center rounded-full bg-[#00f5d4] px-8 py-4 text-sm font-extrabold text-[#05050a] shadow-[0_0_30px_rgba(0,245,212,0.18)] transition-all hover:scale-[1.02] hover:brightness-110 sm:w-auto"
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
