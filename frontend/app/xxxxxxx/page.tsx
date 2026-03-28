import { BackgroundEffects } from '@/components/background-effects'
import { Navbar } from '@/components/navbar'

// 由于该页面会被边缘网络（如 Cloudflare）缓存到较长 TTL，
// 为了确保上线后内容能尽快生效，这里强制该路由动态渲染、禁用静态缓存。
export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata = {
  title: '使用教程 | RWA Protocol',
  description: '安卓 App 下载与安装优先指南；附 iPhone 添加到主屏幕与连接钱包步骤。',
}

function StepCard({
  step,
  title,
  description,
  imageSrc,
}: {
  step: string
  title: string
  description: string
  imageSrc?: string
}) {
  return (
    <div className="rounded-2xl border border-[#ffffff0d] bg-gradient-to-br from-[#0d0d14] to-[#13131e] p-4 shadow-[0_0_24px_rgba(0,245,212,0.06)]">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#00f5d420] bg-[#00f5d410]">
          <span className="text-[13px] font-bold text-[#00f5d4] font-mono">{step}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h3 className="text-[15px] font-semibold text-[#f1f5f9]">{title}</h3>
          </div>
          <p className="mt-1 text-[13px] leading-relaxed text-[#64748b]">{description}</p>
          {imageSrc ? (
            <div className="mt-3">
              <img
                src={imageSrc}
                alt={title}
                className="w-full rounded-xl border border-[#ffffff0d] bg-[#0a0a0f]"
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default function GuideXPage() {
  // 部分环境下中文文件名不编码会导致 400（路径解码失败），这里统一强制编码
  const vpnFileName = '快连.apk'
  const rwaAppFileName = 'rwa.app.apk'
  const vpnUrl = `/frontend/yindao/${encodeURIComponent(vpnFileName)}`
  const rwaAppUrl = `/frontend/yindao/${encodeURIComponent(rwaAppFileName)}?v=20260324-2150`
  const iosImgBase = '/frontend/yindao'
  // 兜底处理移动端/Android WebView 的静态资源缓存：当你重新上传图后，需要同步更新这个版本号
  const imageCacheBuster = '20260320'

  return (
    <div className="min-h-screen bg-[#05050a] font-sans">
      <BackgroundEffects />
      <Navbar />

      <main className="mx-auto max-w-5xl px-4 pb-[90px] pt-below-navbar-safe lg:px-8">
        <section className="relative overflow-hidden rounded-3xl border border-[#00f5d420] bg-gradient-to-br from-[#0d0d14] to-[#13131e] p-6 sm:p-8 shadow-[0_0_40px_rgba(0,245,212,0.08)]">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse at top left, rgba(0,245,212,0.18) 0%, transparent 55%), radial-gradient(ellipse at bottom right, rgba(139,92,246,0.10) 0%, transparent 60%)',
            }}
          />

          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#ffffff0d] bg-[#0a0a0f]/50 px-3 py-1">
              <span className="h-2 w-2 rounded-full bg-[#00f5d4]" />
              <span className="text-[12px] font-semibold text-[#00f5d4] font-mono">AOS/iOS 快速上手</span>
            </div>

            <h1 className="mt-4 text-[26px] sm:text-[32px] font-bold text-[#f1f5f9]">安卓 App 下载与使用教程</h1>
            <p className="mt-3 text-[14px] leading-relaxed text-[#64748b] max-w-3xl">
              建议安卓用户优先下载并安装 RWA App（最新版 APK），连接体验更稳定。若遇到网络波动或钱包连接失败，
              再使用 VPN 作为辅助方案。iPhone 用户请参考下方 Safari 添加到主屏幕步骤。
            </p>

            <div className="mt-5 flex flex-col sm:flex-row gap-3 sm:items-center">
              <a
                href={rwaAppUrl}
                download
                className="inline-flex items-center justify-center rounded-full bg-[#00f5d4] px-5 py-3 text-sm font-semibold text-[#05050a] shadow-[0_0_24px_rgba(0,245,212,0.25)] transition-all hover:brightness-110"
              >
                立即下载 RWA App（安卓最新版 APK）
              </a>
              <div className="text-[12px] text-[#64748b]">
                下载后安装并打开 App，直接连接钱包即可；如网络不稳定，再下载 VPN 辅助连接。
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-3">
            <h2 className="text-[16px] font-semibold text-[#f1f5f9]">1）安卓（Android）</h2>
            <div className="text-[13px] leading-relaxed text-[#64748b]">
              推荐优先使用 RWA App。按下面步骤操作，通常能更快完成连接钱包。
            </div>
            <div className="space-y-4">
              <div className="rounded-2xl border border-[#ffffff0d] bg-gradient-to-br from-[#0d0d14] to-[#13131e] p-5 shadow-[0_0_24px_rgba(0,245,212,0.06)]">
                <h3 className="text-[15px] font-semibold text-[#f1f5f9]">安卓快速步骤（推荐）</h3>
                <div className="mt-2 space-y-2 text-[13px] text-[#64748b] leading-relaxed">
                  <p>1. 点击上方按钮下载「RWA App（APK）」并安装。</p>
                  <p>2. 打开 App，进入首页右上角「连接钱包」。</p>
                  <p>3. 在钱包列表中优先选择 WalletConnect / OKX / Binance。</p>
                  <p>4. 若遇到连接转圈或回跳失败，再使用下方 VPN 辅助。</p>
                </div>
              </div>

              <a
                href={rwaAppUrl}
                download
                className="inline-flex items-center justify-center w-full rounded-2xl bg-[#00f5d4] px-5 py-4 text-sm font-semibold text-[#05050a] shadow-[0_0_24px_rgba(0,245,212,0.25)] transition-all hover:brightness-110"
              >
                下载 RWA App（最新版 APK）
              </a>

              <a
                href={vpnUrl}
                download
                className="inline-flex items-center justify-center w-full rounded-2xl border border-[#00f5d420] bg-transparent px-5 py-4 text-sm font-semibold text-[#00f5d4] transition-all hover:bg-[#00f5d410] hover:border-[#00f5d460]"
              >
                下载快连 VPN（仅连接失败时使用）
              </a>
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-[16px] font-semibold text-[#f1f5f9]">2）苹果（iPhone / iPad）</h2>
            <div className="text-[13px] leading-relaxed text-[#64748b]">
              iPhone 用户按下面步骤：先添加到主屏幕，再点击右上角连接钱包。
            </div>

            <div className="space-y-4">
              <StepCard
                step="图1"
                title="打开 Safari，输入网址并点分享"
                description="使用苹果自带浏览器打开本网站地址，找到底部/顶部的「分享」按钮。"
                imageSrc={`${iosImgBase}/1.png?v=${imageCacheBuster}`}
              />
              <StepCard
                step="图2"
                title="下拉选择「添加到主屏幕」"
                description="在分享菜单里下拉，选择「添加到主屏幕」，下次打开更快、更像 App。"
                imageSrc={`${iosImgBase}/2.png?v=${imageCacheBuster}`}
              />
              <StepCard
                step="图3"
                title="回到主屏幕后，点击右上角连接钱包"
                description="添加到桌面后打开页面，点击右上角「连接钱包」。"
                imageSrc={`${iosImgBase}/3.png?v=${imageCacheBuster}`}
              />
              <StepCard
                step="图4"
                title="选择钱包，完成授权"
                description="根据使用习惯选择钱包应用或扫码登录，按提示完成授权。"
                imageSrc={`${iosImgBase}/4.png?v=${imageCacheBuster}`}
              />
              <StepCard
                step="图5"
                title="首次连接失败时，保持网络稳定后重试"
                description="若首次连接失败，请勿频繁切换网络，等待 10-30 秒后重试。"
                imageSrc={`${iosImgBase}/5.png?v=${imageCacheBuster}`}
              />
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-[#ffffff0d] bg-[#0a0a0f]/40 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="mt-1 h-10 w-10 rounded-2xl border border-[#fbbf24]/30 bg-[#fbbf240f] flex items-center justify-center">
              <span className="text-[20px]">!</span>
            </div>
            <div className="min-w-0">
              <h3 className="text-[15px] font-semibold text-[#f1f5f9]">连接建议</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-[#64748b]">
                优先使用安卓 App，能减少浏览器环境导致的连接问题；若仍有失败，可再启用 VPN 辅助。无论安卓或 iOS，
                都建议首次连接时避免频繁切换网络，并在失败后间隔 10-30 秒重试。
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

