'use client'

import { DotLottieAnimation } from './lottie-animation'

/**
 * Lottie 动画使用示例
 * 
 * 推荐格式：dotLottie（不带皇冠，无需会员）
 * - 文件小：31.31 KB
 * - 性能好：比 JSON 小 94%
 * - 支持主题和状态机
 */

// 示例 1：首页 Hero 区域动画
export function HeroAnimation() {
  return (
    <div className="w-full h-64 md:h-96">
      <DotLottieAnimation
        src="/动画/blockchain.lottie"
        autoplay={true}
        loop={true}
        speed={1}
        className="w-full h-full"
      />
    </div>
  )
}

// 示例 2：加载动画
export function LoadingAnimation() {
  return (
    <div className="flex items-center justify-center w-16 h-16">
      <DotLottieAnimation
        src="/动画/Falling coins.lottie"
        autoplay={true}
        loop={true}
        speed={1.5}
        width={64}
        height={64}
      />
    </div>
  )
}

// 示例 3：背景装饰动画
export function BackgroundAnimation() {
  return (
    <div className="fixed inset-0 pointer-events-none opacity-20 -z-10">
      <DotLottieAnimation
        src="/动画/blockchain.lottie"
        autoplay={true}
        loop={true}
        speed={0.5}
        className="w-full h-full"
      />
    </div>
  )
}

// 示例 4：卡片中的小动画
export function CardAnimation() {
  return (
    <div className="rounded-xl bg-[#13131e] border border-[#ffffff0d] p-6">
      <div className="w-32 h-32 mx-auto mb-4">
        <DotLottieAnimation
          src="/动画/Falling coins.lottie"
          autoplay={true}
          loop={true}
          speed={1}
        />
      </div>
      <h3 className="text-lg font-semibold text-[#f1f5f9] text-center">
        动画标题
      </h3>
    </div>
  )
}
