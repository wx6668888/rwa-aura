import { BackgroundEffects } from '@/components/background-effects'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata = {
  title: '下载与教程 | RWA Protocol',
  description: '下载 RWA App、连接钱包，快速上手 RWA Protocol。',
}

function GlowCard({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={`rounded-2xl border border-white/[0.06] bg-gradient-to-br from-[#0d0d14] to-[#13131e] p-6 shadow-[0_0_30px_rgba(0,245,212,0.04)] ${className}`}
    >
      {children}
    </div>
  )
}

function StepBlock({
  num,
  title,
  children,
}: {
  num: string
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="flex gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#00f5d4]/10 border border-[#00f5d4]/20 text-[#00f5d4] text-sm font-bold font-mono">
        {num}
      </div>
      <div className="min-w-0">
        <h4 className="text-[15px] font-semibold text-[#f1f5f9]">{title}</h4>
        <div className="mt-1 text-[13px] leading-relaxed text-[#94a3b8] space-y-1">
          {children}
        </div>
      </div>
    </div>
  )
}

function QuickBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#00f5d4]/10 border border-[#00f5d4]/20 px-2.5 py-0.5 text-[11px] font-semibold text-[#00f5d4]">
      {children}
    </span>
  )
}

export default function GuideXPage() {
  const rwaAppFileName = 'rwa.app.apk'
  const rwaAppUrl = `/frontend/yindao/${encodeURIComponent(rwaAppFileName)}?v=20260324-2150`
  const iosImgBase = '/frontend/yindao'
  const imageCacheBuster = '20260320'

  return (
    <div className="min-h-screen bg-[#05050a] font-sans">
      <BackgroundEffects />

      <main className="mx-auto max-w-4xl px-4 pb-20 pt-below-navbar-safe lg:px-8">
        {/* ── Hero ── */}
        <section className="relative overflow-hidden rounded-3xl border border-[#00f5d4]/15 bg-gradient-to-br from-[#0d0d14] to-[#13131e] p-8 sm:p-10">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse 600px 300px at 20% 0%, rgba(0,245,212,0.12) 0%, transparent 70%), radial-gradient(ellipse 400px 400px at 80% 100%, rgba(139,92,246,0.08) 0%, transparent 70%)',
            }}
          />

          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.06] bg-black/30 px-3.5 py-1.5">
              <span className="h-2 w-2 rounded-full bg-[#00f5d4] animate-pulse" />
              <span className="text-[12px] font-semibold text-[#00f5d4] font-mono">
                快速上手
              </span>
            </div>

            <h1 className="mt-5 text-[28px] sm:text-[36px] font-bold text-white tracking-tight">
              下载 RWA App
            </h1>
            <p className="mt-3 text-[15px] leading-relaxed text-[#94a3b8] max-w-2xl">
              推荐在手机浏览器中打开{' '}
              <span className="font-mono text-[#00f5d4]">rwa.lat</span>，或下载
              Android APK 获得原生体验。连接钱包推荐使用
              币安 Web3 钱包 / TP 钱包。
            </p>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <a
                href={rwaAppUrl}
                download
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#00f5d4] px-6 py-3.5 text-sm font-semibold text-[#05050a] shadow-[0_0_30px_rgba(0,245,212,0.20)] transition-all hover:brightness-110 hover:shadow-[0_0_40px_rgba(0,245,212,0.30)]"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                下载 Android APK
              </a>
              <a
                href="https://rwa.lat"
                className="inline-flex items-center justify-center rounded-xl border border-[#00f5d4]/20 bg-transparent px-6 py-3.5 text-sm font-semibold text-[#00f5d4] transition-all hover:bg-[#00f5d4]/8"
              >
                在浏览器中打开 →
              </a>
            </div>

            <p className="mt-3 text-[12px] text-[#64748b]">
              收藏本页{' '}
              <span className="font-mono text-[#94a3b8]">rwa.lat/xxxxxxx</span>
            </p>
          </div>
        </section>

        {/* ── Android ── */}
        <section className="mt-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xl">🤖</span>
            <h2 className="text-[18px] font-bold text-white">Android 教程</h2>
          </div>

          <GlowCard>
            <div className="space-y-5">
              <StepBlock num="1" title="安装 App">
                <p>下载上方 APK，安装后打开 RWA App。</p>
              </StepBlock>
              <StepBlock num="2" title="连接钱包">
                <p>
                  点击右上角「连接钱包」，优先选择{' '}
                  <strong className="text-[#e2e8f0]">币安 Web3 钱包</strong>{' '}
                  或 <strong className="text-[#e2e8f0]">TP 钱包</strong>。
                </p>
              </StepBlock>
              <StepBlock num="3" title="开始使用">
                <p>
                  连接成功后即可质押、兑换、参与社区。遇连接失败，等待 10
                  秒后重试。
                </p>
              </StepBlock>
            </div>
          </GlowCard>

          <a
            href={rwaAppUrl}
            download
            className="mt-4 inline-flex items-center justify-center w-full rounded-2xl bg-[#00f5d4] px-5 py-4 text-sm font-semibold text-[#05050a] shadow-[0_0_24px_rgba(0,245,212,0.20)] transition-all hover:brightness-110"
          >
            下载 RWA App（最新版 APK）
          </a>
        </section>

        {/* ── iOS ── */}
        <section className="mt-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xl">🍎</span>
            <h2 className="text-[18px] font-bold text-white">
              iPhone / iPad 教程
            </h2>
          </div>

          <GlowCard>
            <div className="space-y-4">
              <StepBlock num="1" title="Safari 打开 rwa.lat">
                <p>使用苹果自带 Safari 浏览器访问网站。</p>
              </StepBlock>
              <StepBlock num="2" title="添加到主屏幕">
                <p>
                  点击底部分享按钮 → 选择「添加到主屏幕」，下次秒开，体验接近
                  App。
                </p>
              </StepBlock>
              <StepBlock num="3" title="连接钱包">
                <p>打开后点击右上角「连接钱包」，选择币安 / TP 或 WalletConnect。</p>
              </StepBlock>
            </div>
          </GlowCard>

          {/* Screenshot guides */}
          <div className="mt-6 space-y-4">
            {[
              { step: '01', title: '打开 Safari，输入 rwa.lat 并点分享', desc: '苹果自带浏览器打开网站，找到分享按钮。', img: '1' },
              { step: '02', title: '下拉选择「添加到主屏幕」', desc: '分享菜单里下拉，添加到主屏幕。', img: '2' },
              { step: '03', title: '回到主屏幕，点击右上角连接钱包', desc: '桌面打开后点右上角连接。', img: '3' },
              { step: '04', title: '选择钱包，完成授权', desc: '选币安 / TP 或 WalletConnect，按提示授权。', img: '4' },
              { step: '05', title: '连接失败？等 10 秒重试', desc: '保持网络稳定，等待 10-30 秒再试。', img: '5' },
            ].map((item) => (
              <GlowCard key={item.step} className="!p-4">
                <div className="flex gap-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#00f5d4]/10 border border-[#00f5d4]/15 text-[11px] font-bold text-[#00f5d4] font-mono">
                    {item.step}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-[14px] font-semibold text-[#f1f5f9]">
                      {item.title}
                    </h4>
                    <p className="mt-1 text-[12px] text-[#64748b]">
                      {item.desc}
                    </p>
                    <img
                      src={`${iosImgBase}/${item.img}.png?v=${imageCacheBuster}`}
                      alt={item.title}
                      className="mt-3 w-full rounded-xl border border-white/[0.06] bg-[#0a0a0f]"
                    />
                  </div>
                </div>
              </GlowCard>
            ))}
          </div>
        </section>

        {/* ── Note ── */}
        <section className="mt-8 rounded-2xl border border-[#fbbf24]/15 bg-[#fbbf24]/5 p-5">
          <div className="flex gap-3">
            <span className="text-lg shrink-0">💡</span>
            <div>
              <h3 className="text-[14px] font-semibold text-[#f1f5f9]">
                连接提示
              </h3>
              <p className="mt-1 text-[13px] leading-relaxed text-[#94a3b8]">
                推荐在{' '}
                <strong className="text-[#e2e8f0]">
                  币安 App → Web3 / DApp 浏览器
                </strong>{' '}
                或{' '}
                <strong className="text-[#e2e8f0]">TP 钱包内置浏览器</strong>{' '}
                中打开 rwa.lat。首次连接失败请等待 10-30 秒再试，不要频繁切换网络。
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
