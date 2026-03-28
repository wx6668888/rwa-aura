'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { DotLottieAnimation } from '@/components/lottie-animation'

export function HowItWorksSection() {
  const cardRef = useRef<HTMLDivElement | null>(null)
  const [entered, setEntered] = useState(false)

  useEffect(() => {
    const el = cardRef.current
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
      { threshold: 0.14 },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [entered])

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
      <div
        ref={cardRef}
        className={`relative overflow-hidden rounded-3xl border border-white/14 bg-[#0d0d14]/82 px-6 pb-6 pt-3 backdrop-blur-2xl supports-[backdrop-filter]:bg-[#0d0d14]/72 transition-all duration-700 ease-out md:px-10 md:pb-10 md:pt-4 ${
          entered ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-8 scale-[0.98] opacity-0'
        }`}
      >
        {/* 左下半圆（带填充），约 1/2 显示在卡片内 */}
        <div
          className="pointer-events-none absolute -bottom-40 -left-40 h-80 w-80 rounded-full opacity-55 md:-bottom-44 md:-left-44 md:h-96 md:w-96"
          style={{
            background: 'radial-gradient(circle at 65% 65%, rgba(0,245,212,0.34), rgba(0,245,212,0.03) 55%, rgba(0,245,212,0) 70%)',
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-40 -left-40 h-80 w-80 rounded-full border border-[#00f5d4]/22 opacity-78 md:-bottom-44 md:-left-44 md:h-96 md:w-96"
          style={{
            boxShadow: '0 0 56px rgba(0,245,212,0.16), inset 0 0 38px rgba(0,245,212,0.09)',
          }}
          aria-hidden
        />

        <div className="relative mx-auto -mt-2 h-[320px] w-full max-w-4xl overflow-hidden md:-mt-1 md:h-[380px]">
          <DotLottieAnimation
            src="/network.lottie"
            autoplay
            loop
            speed={1}
            className={[
              'absolute left-1/2 top-0 z-10 h-full -translate-x-1/2',
              'w-[132%] max-w-none md:w-[120%]',
              'flex items-start justify-center',
              'origin-top [&_canvas]:origin-top [&_svg]:origin-top',
              '[&_canvas]:mx-auto [&_svg]:mx-auto',
              '[&_canvas]:-translate-y-[11%] [&_svg]:-translate-y-[11%] md:[&_canvas]:-translate-y-[8%] md:[&_svg]:-translate-y-[8%]',
              '[&_canvas]:scale-[1.12] [&_svg]:scale-[1.12]',
              '[&_canvas]:h-full [&_svg]:h-full [&_canvas]:w-full [&_svg]:w-full',
            ].join(' ')}
          />
        </div>

        <h2 className="relative mt-3 text-left font-[family-name:var(--font-space-grotesk)] text-[28px] font-extrabold leading-tight text-[#f1f5f9] md:text-[34px]">
          邀请好友，奖励增长
        </h2>
        <p className="relative mt-3 max-w-2xl text-left text-[14px] leading-relaxed text-[#64748b] md:text-[15px]">
          生成你的专属邀请关系，好友参与后你将获得推荐奖励。节点等级体系会放大团队贡献带来的收益潜力，所有结算按规则执行，记录可持续追踪。
        </p>

        <ul className="relative mx-auto mt-8 max-w-2xl space-y-2.5 text-left text-[13px] leading-relaxed text-[#94a3b8] md:mt-10">
          <li className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#00f5d4]" />
            绑定推荐关系后开始计入团队贡献。
          </li>
          <li className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#00f5d4]" />
            等级越高，奖励结构越完整、空间越大。
          </li>
          <li className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#00f5d4]" />
            奖励与记录持续更新，随时可查看。
          </li>
        </ul>

        <div className="relative mt-8 flex md:mt-10">
          <Link
            href="https://rwa.lat/node/network"
            className="inline-flex w-full items-center justify-center rounded-full bg-[#00f5d4] px-8 py-4 text-base font-extrabold text-[#05050a] shadow-[0_0_24px_rgba(0,245,212,0.2)] transition-all hover:scale-[1.01] hover:brightness-110"
          >
            查看我的网络
          </Link>
        </div>
      </div>
    </section>
  )
}
