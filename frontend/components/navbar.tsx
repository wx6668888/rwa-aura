'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { 
  Menu, 
  X, 
  ChevronDown, 
  MoreHorizontal,
  Home, 
  Wallet, 
  TrendingUp, 
  BarChart3, 
  Network, 
  Shield, 
  Bell,
  AlertTriangle,
  Gift,
  Calculator,
  LayoutDashboard,
  Coins,
  ArrowUpCircle,
  Store,
  ArrowLeftRight,
  FileText,
  Info,
  Gavel,
  FileCheck,
  Megaphone,
  Send,
  Github,
  Share2,
  MessageCircle,
} from 'lucide-react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { warmConnectModal } from '@/lib/wallet-connect-preconnect'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import { LanguageSwitcher } from '@/components/language-switcher'
import { WalletDetailsModal } from '@/components/wallet-details-modal'

// 导航分组配置
type NavItem = {
  key: string
  href: string
  icon?: React.ComponentType<{ className?: string }>
  danger?: boolean
  description?: string
}

type NavGroup = {
  key: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  items: NavItem[]
  standalone?: boolean // 独立显示，无下拉菜单
}

/** 桌面端「更多」分组：带分区的下拉 */
type NavGroupMore = {
  key: 'more'
  label: string
  icon: React.ComponentType<{ className?: string }>
  sections: { label: string; items: NavItem[] }[]
}

const navGroups: NavGroup[] = [
  {
    key: 'home',
    label: 'nav.group.home',
    icon: Home,
    items: [{ key: 'nav.home', href: '/' }],
    standalone: true,
  },
  {
    key: 'assets',
    label: 'nav.group.assets',
    icon: Wallet,
    items: [
      { key: 'nav.dashboard', href: '/dashboard', icon: LayoutDashboard, description: 'nav.group.assets.desc.dashboard' },
      { key: 'nav.withdraw', href: '/withdraw', icon: ArrowUpCircle, description: 'nav.group.assets.desc.withdraw' },
    ],
  },
  {
    key: 'trade',
    label: 'nav.group.trade',
    icon: TrendingUp,
    items: [
      { key: 'nav.market', href: '/market', icon: Store, description: 'nav.group.tradeDesc.market' },
    ],
  },
  {
    key: 'lucky',
    label: 'nav.group.lucky',
    icon: Gift,
    items: [{ key: 'nav.lucky', href: '/lucky' }],
    standalone: true,
  },
  {
    key: 'analytics',
    label: 'nav.group.analytics',
    icon: BarChart3,
    items: [
      { key: 'nav.analytics', href: '/analytics', icon: BarChart3, description: 'nav.group.analyticsDesc.analytics' },
      { key: 'nav.calculator', href: '/calculator', icon: Calculator, description: 'nav.group.analyticsDesc.calculator' },
    ],
  },
  {
    key: 'network',
    label: 'nav.group.network',
    icon: Network,
    items: [
      { key: 'nav.nodes', href: '/nodes', icon: Network },
      { key: 'nav.referralNetworkPage', href: '/node/network', icon: Share2 },
    ],
  },
  {
    key: 'governance',
    label: 'nav.group.governance',
    icon: Shield,
    items: [
      { key: 'nav.governance', href: '/governance', icon: Gavel, description: 'nav.group.governanceDesc.governance' },
      { key: 'nav.security', href: '/security', icon: FileCheck, description: 'nav.group.governanceDesc.security' },
    ],
  },
  {
    key: 'info',
    label: 'nav.group.info',
    icon: Bell,
    items: [
      { key: 'nav.announcements', href: '/announcements', icon: Megaphone, description: 'nav.group.infoDesc.announcements' },
      { key: 'nav.knowledge', href: '/knowledge', icon: FileText, description: 'nav.group.infoDesc.knowledge' },
      { key: 'nav.about', href: '/about', icon: Info, description: 'nav.group.infoDesc.about' },
    ],
  },
]

/** 桌面端方案 D：仅 5 项，后 4 项收进「更多」 */
const navGroupsDesktop: (NavGroup | NavGroupMore)[] = [
  navGroups[0], // 首页
  {
    key: 'stake-standalone',
    label: 'nav.stake',
    icon: Coins,
    items: [{ key: 'nav.stake', href: '/stake' }],
    standalone: true,
  },
  {
    key: 'swap-standalone',
    label: 'nav.swap',
    icon: ArrowLeftRight,
    items: [{ key: 'nav.swap', href: '/swap' }],
    standalone: true,
  },
  navGroups[1], // 我的资产
  navGroups[2], // 交易市场
  navGroups[3], // 抽奖
  {
    key: 'more',
    label: 'nav.group.more',
    icon: MoreHorizontal,
    sections: [
      { label: 'nav.group.analytics', items: navGroups[4].items },
      { label: 'nav.group.network', items: navGroups[5].items },
      { label: 'nav.group.governance', items: navGroups[6].items },
      { label: 'nav.group.info', items: navGroups[7].items },
    ],
  },
]

/** 移动端菜单：将「质押」「兑换/购买」独立出来置顶 */
const navGroupsMobile: NavGroup[] = [
  navGroups[0], // 首页
  {
    key: 'stake-standalone',
    label: 'nav.stake',
    icon: Coins,
    items: [{ key: 'nav.stake', href: '/stake' }],
    standalone: true,
  },
  {
    key: 'swap-standalone',
    label: 'nav.swap',
    icon: ArrowLeftRight,
    items: [{ key: 'nav.swap', href: '/swap' }],
    standalone: true,
  },
  navGroups[1], // 我的资产
  navGroups[2], // 交易市场
  navGroups[3], // 抽奖
  navGroups[4], // 数据分析
  navGroups[5], // 节点网络
  navGroups[6], // 治理安全
  navGroups[7], // 信息中心
]

// 移动端菜单项组件
function MobileNavItem({ 
  group, 
  isGroupActive, 
  isActive, 
  t, 
  onClose 
}: { 
  group: NavGroup
  isGroupActive: (group: NavGroup) => boolean
  isActive: (href: string) => boolean
  t: (key: string) => string
  onClose: () => void
}) {
  const [expanded, setExpanded] = useState(isGroupActive(group))
  const Icon = group.icon
  const groupActive = isGroupActive(group)

  // 独立项
  if (group.standalone) {
    const item = group.items[0]
    const itemActive = isActive(item.href)
    return (
      <Link
        href={item.href}
        onClick={onClose}
        className={`flex items-center gap-3 rounded-lg px-4 py-3 text-base font-semibold transition-all ${
          itemActive
            ? 'bg-[#00f5d4] text-[#0a0a12] shadow-[0_0_20px_rgba(0,245,212,0.5)]'
            : 'text-[#e2e8f0] hover:bg-[#13131e]'
        }`}
      >
        <Icon className="h-5 w-5" />
        <span>{t(item.key)}</span>
      </Link>
    )
  }

  // 分组项（可折叠）
  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className={`w-full flex items-center justify-between rounded-lg px-4 py-3 text-base font-semibold transition-all ${
          groupActive
            ? 'bg-[#00f5d4]/10 text-[#00f5d4]'
            : 'text-[#e2e8f0] hover:bg-[#13131e]'
        }`}
      >
        <div className="flex items-center gap-3">
          <Icon className="h-5 w-5" />
          <span>{t(group.label)}</span>
        </div>
        <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>
      {expanded && (
        <div className="ml-4 space-y-1 border-l border-[#ffffff0d] pl-4">
          {group.items.map((item) => {
            const itemActive = isActive(item.href)
            const ItemIcon = item.icon
            return (
              <Link
                key={item.key}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all ${
                  itemActive
                    ? 'bg-[#00f5d4]/10 text-[#00f5d4]'
                    : item.danger
                    ? 'text-[#f43f5e] hover:bg-[#f43f5e]/10'
                    : 'text-[#94a3b8] hover:bg-[#13131e] hover:text-[#e2e8f0]'
                }`}
              >
                {ItemIcon ? (
                  <ItemIcon className="h-4 w-4" />
                ) : item.danger ? (
                  <AlertTriangle className="h-4 w-4" />
                ) : (
                  <div className="h-4 w-4 rounded-full bg-current opacity-30" />
                )}
                <span>{t(item.key)}</span>
                {item.danger && (
                  <span className="ml-auto rounded-full bg-[#f43f5e] px-1.5 py-0.5 text-[9px] font-bold uppercase leading-none tracking-wider text-white">
                    !!
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function Navbar() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [hoveredGroup, setHoveredGroup] = useState<string | null>(null)
  const [isScrolled, setIsScrolled] = useState(false)
  const [isHidden, setIsHidden] = useState(false)
  const [walletModalOpen, setWalletModalOpen] = useState(false)
  const [openChainModalRef, setOpenChainModalRef] = useState<(() => void) | undefined>(undefined)
  const pathname = usePathname()
  const allowHideOnScroll = pathname === '/'
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastScrollYRef = useRef(0)

  // 滚动监听：只在跨过阈值时切换一次，避免 Android WebView 频繁 setState 造成滚动抖动
  useEffect(() => {
    let raf = 0
    const onScroll = () => {
      if (raf) cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const currentY = window.scrollY
        const next = currentY > 10
        setIsScrolled((prev) => (prev === next ? prev : next))
        if (!allowHideOnScroll) {
          setIsHidden(false)
          lastScrollYRef.current = currentY
          return
        }
        const delta = currentY - lastScrollYRef.current
        if (mobileOpen) {
          setIsHidden(false)
        } else if (currentY < 24 || delta < -6) {
          setIsHidden(false)
        } else if (delta > 6 && currentY > 80) {
          setIsHidden(true)
        }
        lastScrollYRef.current = currentY
      })
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [mobileOpen, allowHideOnScroll])

  function isActive(href: string) {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  function getGroupItems(group: NavGroup | NavGroupMore): NavItem[] {
    if (group.key === 'more') {
      return (group as NavGroupMore).sections.flatMap(s => s.items)
    }
    return (group as NavGroup).items
  }

  function isGroupActive(group: NavGroup | NavGroupMore) {
    return getGroupItems(group).some(item => isActive(item.href))
  }

  function handleGroupEnter(groupKey: string) {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredGroup(groupKey)
    }, 150)
  }

  function handleGroupLeave() {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredGroup(null)
    }, 200)
  }

  const isSwapPage = pathname === '/swap'

  const headerBg = isScrolled 
    ? 'bg-[#05050a]/95 backdrop-blur-xl border-b border-[#ffffff0d]' 
    : 'bg-transparent border-b border-transparent'

  return (
    <>
      <header
        className={`fixed left-0 right-0 top-0 z-[100] flex w-full min-w-0 flex-col transition-opacity duration-300 ${isHidden ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
      >
        {/* 文档流占位（勿用 absolute）：把导航行推到安全区之下；全宽底色与页面一致 */}
        <div
          aria-hidden
          className="pointer-events-none w-full min-w-0 shrink-0 bg-[#05050a]"
          style={{ height: 'var(--app-safe-top)' }}
        />
        {/* 背景/描边必须全宽；勿把 headerBg 写在 max-w-7xl 的 nav 上，否则会出现两侧「空出一条」的窄条观感 */}
        <div className={`w-full min-w-0 shrink-0 ${headerBg}`}>
          <nav className="relative z-10 mx-auto flex h-16 w-full min-w-0 max-w-7xl items-center justify-between px-4 lg:px-8">
          {/* Left: Logo + Language Switcher（桌面端单行不换行） */}
          <div className="flex items-center gap-3 shrink-0 min-w-0">
            <Link href="/" className="flex items-center gap-2 font-[family-name:var(--font-space-grotesk)] shrink-0">
              <Image
                src="/app-icon-48.webp"
                alt="RWA Protocol"
                width={32}
                height={32}
                className="h-8 w-8 shrink-0 rounded-lg object-contain"
                unoptimized
              />
              <span className="text-lg font-bold tracking-tight text-[#00f5d4]">RWA</span>
            </Link>
            <span className="h-4 w-px bg-[#ffffff1a] shrink-0" />
            <LanguageSwitcher />
          </div>

          {/* Center: Desktop Nav（方案 D：5 项，更多收进下拉） */}
          <div className="hidden items-center gap-1 lg:flex flex-nowrap">
            {navGroupsDesktop.map((group) => {
              const groupActive = isGroupActive(group)
              const isHovered = hoveredGroup === group.key
              const Icon = group.icon

              // 独立项（无下拉菜单）
              if ('standalone' in group && group.standalone) {
                const g = group as NavGroup
                const item = g.items[0]
                const itemActive = isActive(item.href)
                return (
                  <Link
                    key={group.key}
                    href={item.href}
                    className={`relative flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-all whitespace-nowrap ${
                      itemActive
                        ? 'text-[#00f5d4]'
                        : 'text-[#64748b] hover:text-[#f1f5f9] hover:bg-[#13131e]'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="whitespace-nowrap">{t(item.key)}</span>
                    {itemActive && (
                      <span className="absolute bottom-0 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full bg-[#00f5d4]" 
                        style={{ boxShadow: '0 0 8px #00f5d440' }} 
                      />
                    )}
                  </Link>
                )
              }

              // 「更多」分组：分区 mega menu
              if (group.key === 'more') {
                const moreGroup = group as NavGroupMore
                return (
                  <div
                    key={group.key}
                    className="relative"
                    onMouseEnter={() => handleGroupEnter(group.key)}
                    onMouseLeave={handleGroupLeave}
                  >
                    <button
                      type="button"
                      className={`relative flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-all whitespace-nowrap ${
                        groupActive
                          ? 'text-[#00f5d4]'
                          : 'text-[#64748b] hover:text-[#f1f5f9] hover:bg-[#13131e]'
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="whitespace-nowrap">{t(group.label)}</span>
                      <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${isHovered ? 'rotate-180' : ''}`} />
                      {groupActive && (
                        <span className="absolute bottom-0 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full bg-[#00f5d4]" 
                          style={{ boxShadow: '0 0 8px #00f5d440' }} 
                        />
                      )}
                    </button>
                    {isHovered && (
                      <div className="absolute top-full right-0 mt-2 w-64 rounded-xl border border-[#00f5d4]/20 bg-[#0d0d14]/95 backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] opacity-0 animate-[fadeIn_0.3s_ease-out_forwards] pointer-events-auto">
                        <div className="p-2 space-y-3">
                          {moreGroup.sections.map((section, idx) => (
                            <div key={idx}>
                              <p className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-[#64748b]">
                                {t(section.label)}
                              </p>
                              <div className="space-y-0.5">
                                {section.items.map((item) => {
                                  const itemActive = isActive(item.href)
                                  const ItemIcon = item.icon
                                  return (
                                    <Link
                                      key={item.key}
                                      href={item.href}
                                      className={`group relative flex items-start gap-3 rounded-lg px-4 py-3 transition-all ${
                                        itemActive
                                          ? 'bg-[#00f5d4]/10 text-[#00f5d4]'
                                          : item.danger
                                          ? 'text-[#f43f5e] hover:bg-[#f43f5e]/10'
                                          : 'text-[#e2e8f0] hover:bg-[#13131e]'
                                      }`}
                                    >
                                      <div className={`mt-0.5 flex-shrink-0 ${itemActive ? 'text-[#00f5d4]' : item.danger ? 'text-[#f43f5e]' : 'text-[#64748b] group-hover:text-[#00f5d4]'}`}>
                                        {ItemIcon ? (
                                          <ItemIcon className="h-4 w-4" />
                                        ) : item.danger ? (
                                          <AlertTriangle className="h-4 w-4" />
                                        ) : (
                                          <div className="h-4 w-4 rounded-full bg-current opacity-50" />
                                        )}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                          <span className="font-medium">{t(item.key)}</span>
                                          {item.danger && (
                                            <span className="rounded-full bg-[#f43f5e] px-1.5 py-0.5 text-[9px] font-bold uppercase leading-none tracking-wider text-white">
                                              !!
                                            </span>
                                          )}
                                        </div>
                                        {item.description && (
                                          <p className="mt-1 text-xs text-[#64748b] line-clamp-1">
                                            {t(item.description)}
                                          </p>
                                        )}
                                      </div>
                                      {itemActive && (
                                        <span className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full bg-[#00f5d4]" />
                                      )}
                                    </Link>
                                  )
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              }

              // 普通分组项（有下拉菜单）
              const g = group as NavGroup
              return (
                <div
                  key={group.key}
                  className="relative"
                  onMouseEnter={() => handleGroupEnter(group.key)}
                  onMouseLeave={handleGroupLeave}
                >
                  <button
                    type="button"
                    className={`relative flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-all whitespace-nowrap ${
                      groupActive
                        ? 'text-[#00f5d4]'
                        : 'text-[#64748b] hover:text-[#f1f5f9] hover:bg-[#13131e]'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="whitespace-nowrap">{t(group.label)}</span>
                    <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${isHovered ? 'rotate-180' : ''}`} />
                    {groupActive && (
                      <span className="absolute bottom-0 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full bg-[#00f5d4]" 
                        style={{ boxShadow: '0 0 8px #00f5d440' }} 
                      />
                    )}
                  </button>

                  {/* Mega Menu */}
                  {isHovered && (
                    <div className="absolute top-full left-0 mt-2 w-64 rounded-xl border border-[#00f5d4]/20 bg-[#0d0d14]/95 backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] opacity-0 animate-[fadeIn_0.3s_ease-out_forwards] pointer-events-auto">
                      <div className="p-2">
                        {g.items.map((item) => {
                          const itemActive = isActive(item.href)
                          const ItemIcon = item.icon
                          return (
                            <Link
                              key={item.key}
                              href={item.href}
                              className={`group relative flex items-start gap-3 rounded-lg px-4 py-3 transition-all ${
                                itemActive
                                  ? 'bg-[#00f5d4]/10 text-[#00f5d4]'
                                  : item.danger
                                  ? 'text-[#f43f5e] hover:bg-[#f43f5e]/10'
                                  : 'text-[#e2e8f0] hover:bg-[#13131e]'
                              }`}
                            >
                              <div className={`mt-0.5 flex-shrink-0 ${itemActive ? 'text-[#00f5d4]' : item.danger ? 'text-[#f43f5e]' : 'text-[#64748b] group-hover:text-[#00f5d4]'}`}>
                                {ItemIcon ? (
                                  <ItemIcon className="h-4 w-4" />
                                ) : item.danger ? (
                                  <AlertTriangle className="h-4 w-4" />
                                ) : (
                                  <div className="h-4 w-4 rounded-full bg-current opacity-50" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{t(item.key)}</span>
                                  {item.danger && (
                                    <span className="rounded-full bg-[#f43f5e] px-1.5 py-0.5 text-[9px] font-bold uppercase leading-none tracking-wider text-white">
                                      !!
                                    </span>
                                  )}
                                </div>
                                {item.description && (
                                  <p className="mt-1 text-xs text-[#64748b] line-clamp-1">
                                    {t(item.description)}
                                  </p>
                                )}
                              </div>
                              {itemActive && (
                                <span className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full bg-[#00f5d4]" />
                              )}
                            </Link>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Right: Wallet（桌面端单行不换行） */}
          <div className="flex items-center gap-2 flex-nowrap shrink-0">
            <ConnectButton.Custom>
              {({
                account,
                chain,
                openAccountModal,
                openChainModal,
                openConnectModal,
                mounted,
              }) => {
                const ready = mounted
                const connected = ready && account && chain

                return (
                  <div
                    {...(!ready && {
                      'aria-hidden': true,
                      style: {
                        opacity: 0,
                        pointerEvents: 'none',
                        userSelect: 'none',
                      },
                    })}
                  >
                    {(() => {
                      if (!connected) {
                        return (
                          <button
                            onClick={() => {
                              warmConnectModal()
                              openConnectModal()
                            }}
                            type="button"
                            className="rounded-full bg-[#00f5d4] px-5 py-2 font-[family-name:var(--font-space-grotesk)] text-sm font-semibold text-[#05050a] transition-all hover:scale-[1.02] hover:brightness-110"
                          >
                            {t('nav.connectWallet')}
                          </button>
                        )
                      }

                      if (chain.unsupported) {
                        return (
                          <button
                            onClick={openChainModal}
                            type="button"
                            className="rounded-full bg-[#f43f5e] px-5 py-2 font-[family-name:var(--font-space-grotesk)] text-sm font-semibold text-white transition-all hover:scale-[1.02] hover:brightness-110"
                          >
                            {t('nav.wrongNetwork')}
                          </button>
                        )
                      }

                      return (
                        <div className="flex items-center gap-2 flex-nowrap shrink-0 min-w-0">
                          <button
                            onClick={openChainModal}
                            type="button"
                            className={`${isSwapPage ? 'hidden' : 'hidden md:flex'} items-center gap-2 rounded-full border border-[#ffffff0d] bg-[#0d0d1499] px-2.5 py-2 text-sm font-medium text-[#f1f5f9] backdrop-blur-xl transition-all hover:border-[#00f5d4]/30 whitespace-nowrap shrink-0 max-w-[120px] sm:max-w-[140px] truncate`}
                            title={chain.name ?? undefined}
                          >
                            {chain.hasIcon && (
                              <div
                                style={{
                                  background: chain.iconBackground,
                                  width: 16,
                                  height: 16,
                                  borderRadius: 999,
                                  overflow: 'hidden',
                                  flexShrink: 0,
                                }}
                              >
                                {chain.iconUrl && (
                                  <img
                                    alt={chain.name ?? 'Chain icon'}
                                    src={chain.iconUrl}
                                    style={{ width: 16, height: 16 }}
                                  />
                                )}
                              </div>
                            )}
                            <span className="truncate">{chain.name}</span>
                          </button>

                          <button
                            onClick={() => {
                              setOpenChainModalRef(() => openChainModal)
                              setWalletModalOpen(true)
                              setTimeout(() => {
                                const modal = document.querySelector('[data-wallet-details-modal="1"]')
                                if (!modal) openAccountModal()
                              }, 0)
                            }}
                            type="button"
                            className="rounded-full bg-[#00f5d4] px-4 py-2 font-[family-name:var(--font-space-grotesk)] text-sm font-semibold text-[#05050a] transition-all hover:scale-[1.02] hover:brightness-110 whitespace-nowrap shrink-0"
                            title={account.displayName}
                          >
                            {account.displayName}
                          </button>
                        </div>
                      )
                    })()}
                  </div>
                )
              }}
            </ConnectButton.Custom>
            {/* Mobile hamburger */}
            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="flex h-10 w-10 items-center justify-center rounded-full text-[#f1f5f9] transition-colors hover:bg-[#13131e] lg:hidden"
              aria-label={t('nav.toggleMenu')}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </nav>
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-md lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer：顶栏避开刘海/状态栏，避免菜单标题贴顶 */}
          <div 
            className="fixed inset-y-0 end-0 z-[110] flex w-[min(100vw-3rem,20rem)] flex-col border-s border-[#64748b]/30 bg-[#334155]/60 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-3xl lg:hidden pt-[var(--app-safe-top)]"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-[#64748b]/50 p-6">
              <span className="text-lg font-bold text-[#00f5d4] font-[family-name:var(--font-space-grotesk)]">{t('nav.menu')}</span>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full text-[#f1f5f9] hover:bg-[#64748b]/50"
                aria-label={t('nav.closeMenu')}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              {navGroupsMobile.map((group) => (
                <MobileNavItem
                  key={group.key}
                  group={group}
                  isGroupActive={isGroupActive}
                  isActive={isActive}
                  t={t}
                  onClose={() => setMobileOpen(false)}
                />
              ))}
            </div>
            {/* Social Links Footer */}
            <div className="flex shrink-0 items-center justify-between gap-3 border-t border-[#64748b]/30 p-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))]">
              <Link
                href="/chat"
                onClick={() => setMobileOpen(false)}
                className={`flex h-10 w-10 items-center justify-center rounded-full border transition-all ${
                  isActive('/chat')
                    ? 'border-[#22c55e] bg-[#22c55e]/25 text-[#22c55e]'
                    : 'border-[#22c55e]/35 bg-[#22c55e]/12 text-[#22c55e] hover:bg-[#22c55e]/20'
                }`}
                aria-label="Chat"
                title="Chat"
              >
                <MessageCircle className="h-5 w-5" />
              </Link>
              <div className="flex items-center gap-3">
                <a
                  href="https://t.me/+nDdRxLhC6zkzNjhl"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-full text-[#e2e8f0] hover:bg-[#00f5d4]/20 hover:text-[#00f5d4] transition-all"
                  aria-label="Telegram"
                >
                  <Send className="h-5 w-5" />
                </a>
                <a
                  href="https://github.com/cutupdev/Solana-RWA-Smart-Contract"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-full text-[#e2e8f0] hover:bg-[#00f5d4]/20 hover:text-[#00f5d4] transition-all"
                  aria-label="GitHub"
                >
                  <Github className="h-5 w-5" />
                </a>
              </div>
            </div>
          </div>
        </>
      )}
      <WalletDetailsModal
        open={walletModalOpen}
        onClose={() => setWalletModalOpen(false)}
        onOpenChainModal={openChainModalRef}
      />
    </>
  )
}
