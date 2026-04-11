import { BackgroundEffects } from '@/components/background-effects'

// 由于该页面会被边缘网络（如 Cloudflare）缓存到较长 TTL，
// 为了确保上线后内容能尽快生效，这里强制该路由动态渲染、禁用静态缓存。
export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata = {
  title: '使用教程 | RWA Protocol',
  description: 'VPN 优先、币安 DApp / TP 钱包引导；安卓 App 下载与 iPhone 主屏幕教程。',
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

      <main className="mx-auto max-w-5xl px-4 pb-[90px] pt-below-navbar-safe lg:px-8">
        <section
          id="vpn-guide"
          className="relative overflow-hidden rounded-3xl border border-[#00f5d420] bg-gradient-to-br from-[#0d0d14] to-[#13131e] p-6 sm:p-8 shadow-[0_0_40px_rgba(0,245,212,0.08)]"
        >
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
              <strong className="text-[#94a3b8]">国内网络建议优先使用 VPN</strong>
              （下方提供快连 VPN 下载）。连接钱包推荐：
              <strong className="text-[#94a3b8]"> 币安 App 内 Web3 / DApp 浏览器</strong>
              打开本站，或使用 <strong className="text-[#94a3b8]">TP 钱包（TokenPocket）</strong>
              内置浏览器访问。安卓用户也可安装 RWA App；iPhone 用户请参考下方 Safari 添加到主屏幕步骤。
            </p>

            <div className="mt-5 flex flex-col sm:flex-row gap-3 sm:items-center sm:flex-wrap">
              <a
                href={vpnUrl}
                download
                className="inline-flex items-center justify-center rounded-full bg-[#00f5d4] px-5 py-3 text-sm font-semibold text-[#05050a] shadow-[0_0_24px_rgba(0,245,212,0.25)] transition-all hover:brightness-110"
              >
                下载快连 VPN（推荐优先）
              </a>
              <a
                href={rwaAppUrl}
                download
                className="inline-flex items-center justify-center rounded-full border border-[#00f5d420] bg-transparent px-5 py-3 text-sm font-semibold text-[#00f5d4] transition-all hover:bg-[#00f5d410] hover:border-[#00f5d460]"
              >
                下载 RWA App（安卓 APK）
              </a>
              <div className="text-[12px] text-[#64748b] sm:basis-full">
                收藏本页地址 <span className="font-mono text-[#94a3b8]">https://rwa.lat/xxxxxxx</span>，便于随时查看
                VPN 与币安 / TP 引导。
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-3">
            <h2 className="text-[16px] font-semibold text-[#f1f5f9]">1）安卓（Android）</h2>
            <div className="text-[13px] leading-relaxed text-[#64748b]">
              优先连接 VPN，再在 <strong className="text-[#94a3b8]">币安 App → Web3 / DApp 浏览器</strong> 或{' '}
              <strong className="text-[#94a3b8]">TP 钱包内置浏览器</strong> 中打开{' '}
              <span className="font-mono text-[#94a3b8]">https://rwa.lat</span>
              ；也可使用下方 RWA App。
            </div>
            <div className="space-y-4">
              <div className="rounded-2xl border border-[#ffffff0d] bg-gradient-to-br from-[#0d0d14] to-[#13131e] p-5 shadow-[0_0_24px_rgba(0,245,212,0.06)]">
                <h3 className="text-[15px] font-semibold text-[#f1f5f9]">安卓快速步骤（推荐）</h3>
                <div className="mt-2 space-y-2 text-[13px] text-[#64748b] leading-relaxed">
                  <p>1. 优先下载并启用上方「快连 VPN」。</p>
                  <p>
                    2. 打开 <strong className="text-[#94a3b8]">币安 App</strong>，进入 Web3 或 DApp
                    浏览器，输入 <span className="font-mono text-[#94a3b8]">https://rwa.lat</span>；或使用{' '}
                    <strong className="text-[#94a3b8]">TP 钱包</strong> 内置浏览器访问同一地址。
                  </p>
                  <p>3. 在站内点击「连接钱包」，列表中优先选「币安 Web3 钱包」「TP 钱包」；需要时再选 WalletConnect。</p>
                  <p>4. 若使用 RWA App：安装后打开，右上角「连接钱包」，同样优先币安 / TP。</p>
                </div>
              </div>

              <a
                href={vpnUrl}
                download
                className="inline-flex items-center justify-center w-full rounded-2xl bg-[#00f5d4] px-5 py-4 text-sm font-semibold text-[#05050a] shadow-[0_0_24px_rgba(0,245,212,0.25)] transition-all hover:brightness-110"
              >
                下载快连 VPN（推荐优先）
              </a>

              <a
                href={rwaAppUrl}
                download
                className="inline-flex items-center justify-center w-full rounded-2xl border border-[#00f5d420] bg-transparent px-5 py-4 text-sm font-semibold text-[#00f5d4] transition-all hover:bg-[#00f5d410] hover:border-[#00f5d460]"
              >
                下载 RWA App（最新版 APK）
              </a>
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-[16px] font-semibold text-[#f1f5f9]">2）苹果（iPhone / iPad）</h2>
            <div className="text-[13px] leading-relaxed text-[#64748b]">
              建议同样先准备可用 VPN，再按下面步骤将本站添加到主屏幕，然后点击右上角连接钱包；连接时优先尝试币安 /
              TP 或 WalletConnect。
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
                <strong className="text-[#94a3b8]">请优先使用 VPN</strong>
                （本页上方/下方均可下载快连）。连接钱包时推荐在{' '}
                <strong className="text-[#94a3b8]">币安交易所 App 的 Web3 / DApp 浏览器</strong> 或{' '}
                <strong className="text-[#94a3b8]">TP 钱包（TokenPocket）</strong>{' '}
                内打开本站。完整说明与资源请收藏{' '}
                <a
                  href="https://rwa.lat/xxxxxxx"
                  className="font-mono text-[#00f5d4] underline underline-offset-2 hover:brightness-110"
                >
                  https://rwa.lat/xxxxxxx
                </a>
                。首次连接请避免频繁切换网络，失败后间隔 10–30 秒再试。
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
