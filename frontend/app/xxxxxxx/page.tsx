import { BackgroundEffects } from '@/components/background-effects'
import { Navbar } from '@/components/navbar'

// 由于该页面会被边缘网络（如 Cloudflare）缓存到较长 TTL，
// 为了确保上线后内容能尽快生效，这里强制该路由动态渲染、禁用静态缓存。
export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata = {
  title: '使用教程 | RWA Protocol',
  description: '苹果添加到主屏幕 + 连接钱包教程；安卓一键下载 VPN 并连接钱包。',
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
  const rwaAppUrl = `/frontend/yindao/${encodeURIComponent(rwaAppFileName)}`
  const iosImgBase = '/frontend/yindao'
  // 兜底处理移动端/Android WebView 的静态资源缓存：当你重新上传图后，需要同步更新这个版本号
  const imageCacheBuster = '20260320'

  return (
    <div className="min-h-screen bg-[#05050a] font-sans">
      <BackgroundEffects />
      <Navbar />

      <main className="mx-auto max-w-5xl px-4 pb-[90px] pt-24 lg:px-8">
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

            <h1 className="mt-4 text-[26px] sm:text-[32px] font-bold text-[#f1f5f9]">
              苹果 & 安卓使用教程
            </h1>
            <p className="mt-3 text-[14px] leading-relaxed text-[#64748b] max-w-3xl">
              为了让你在国内网络环境下尽快完成「添加到桌面」和「连接钱包」，建议首次连接时保持 VPN
              连接状态。若遇到连接失败或转圈，请耐心多试几次（不同网络环境会有差异）。
            </p>

            <div className="mt-5 flex flex-col sm:flex-row gap-3 sm:items-center">
              <a
                href={vpnUrl}
                download
                className="inline-flex items-center justify-center rounded-full bg-[#00f5d4] px-5 py-3 text-sm font-semibold text-[#05050a] shadow-[0_0_24px_rgba(0,245,212,0.25)] transition-all hover:brightness-110"
              >
                立即下载快连 VPN（安卓/首次连接建议）
              </a>
              <div className="text-[12px] text-[#64748b]">
                安装后先连接 VPN，再打开本页面或点击「连接钱包」。
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-3">
            <h2 className="text-[16px] font-semibold text-[#f1f5f9]">1）苹果（iPhone / iPad）</h2>
            <div className="text-[13px] leading-relaxed text-[#64748b]">
              按下面步骤操作：先把网站添加到主屏幕，然后再点击右上角连接钱包。
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
                description="在分享菜单里下拉，选择「添加到主屏幕」。这样下次打开更快、更像 App。"
                            imageSrc={`${iosImgBase}/2.png?v=${imageCacheBuster}`}
              />
              <StepCard
                step="图3"
                title="回到主屏幕/页面后，点击右上角连接钱包"
                description="添加到桌面后打开页面，找到页面右上角的「连接钱包」。"
                            imageSrc={`${iosImgBase}/3.png?v=${imageCacheBuster}`}
              />
              <StepCard
                step="图4"
                title="选择对应钱包，或选择扫码登录"
                description="根据你的使用习惯选择：选择钱包应用或使用扫码登录。"
                            imageSrc={`${iosImgBase}/4.png?v=${imageCacheBuster}`}
              />
              <StepCard
                step="图5"
                title="连接时保持 VPN；首次请多试几次"
                description="由于国内网络限制，连接钱包时建议保持 VPN 状态。若首次连接失败，请不要关闭页面，稍等后多次尝试。"
                            imageSrc={`${iosImgBase}/5.png?v=${imageCacheBuster}`}
              />
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-[16px] font-semibold text-[#f1f5f9]">2）安卓（Android）</h2>
            <div className="text-[13px] leading-relaxed text-[#64748b]">
              安卓侧更简单：下载并安装 VPN，连接成功后再打开本网站并点击「连接钱包」。
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-[#ffffff0d] bg-gradient-to-br from-[#0d0d14] to-[#13131e] p-5 shadow-[0_0_24px_rgba(0,245,212,0.06)]">
                <h3 className="text-[15px] font-semibold text-[#f1f5f9]">快速步骤</h3>
                <div className="mt-2 space-y-2 text-[13px] text-[#64748b] leading-relaxed">
                  <p>1. 点击上方按钮下载「快连 VPN」。</p>
                  <p>2. 安装完成后打开快连，并保持 VPN 连接。</p>
                  <p>3. 回到本网站，点击「连接钱包」。</p>
                  <p>4. 若遇到转圈/灰色按钮：保持 VPN 状态，先多试几次再操作。</p>
                </div>
              </div>

              <div className="rounded-2xl border border-[#00f5d420] bg-[#00f5d410] p-5 shadow-[0_0_28px_rgba(0,245,212,0.12)]">
                <h3 className="text-[15px] font-semibold text-[#00f5d4]">小提示（提升成功率）</h3>
                <ul className="mt-2 text-[13px] text-[#64748b] list-disc pl-5 space-y-1 leading-relaxed">
                  <li>首次连接尽量选择你经常使用、稳定的链上钱包。</li>
                  <li>不要频繁切换网络；先连接 VPN 再操作。</li>
                  <li>若失败，等待 10-30 秒后再重新点击连接。</li>
                </ul>
              </div>

              <a
                href={rwaAppUrl}
                download
                className="inline-flex items-center justify-center w-full rounded-2xl border border-[#00f5d420] bg-transparent px-5 py-4 text-sm font-semibold text-[#00f5d4] transition-all hover:bg-[#00f5d410] hover:border-[#00f5d460]"
              >
                下载 RWA.app（最新版 APK）
              </a>
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-[#ffffff0d] bg-[#0a0a0f]/40 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="mt-1 h-10 w-10 rounded-2xl border border-[#fbbf24]/30 bg-[#fbbf240f] flex items-center justify-center">
              <span className="text-[20px]">!</span>
            </div>
            <div className="min-w-0">
              <h3 className="text-[15px] font-semibold text-[#f1f5f9]">注意事项</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-[#64748b]">
                本教程用于帮助你完成「添加到桌面」和「连接钱包」。在国内网络环境下，钱包连接可能会受
                网络波动影响。保持 VPN 状态并多次尝试，通常可以解决大多数情况。
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

