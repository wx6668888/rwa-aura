'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { X, ChevronRight, Search, HelpCircle, Check } from 'lucide-react'
import { useConnect, useConnectors } from 'wagmi'
import type { Connector } from 'wagmi'
import { bsc } from 'wagmi/chains'
import { toast } from 'sonner'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import { RWA_WALLET_ICONS } from '@/lib/rwa-wallet-icons'
import {
  isCapacitorNativeAndroid,
  isLikelyAndroidSystemWebView,
  isStandaloneWebApp,
  shouldHintInWalletBrowserForWc,
} from '@/lib/wallet-environment'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { rwaConnectGuideHref } from '@/components/wallet-connect-disclaimer'

/**
 * 主列表顺序。币安 / TP / OKX 各行对应 RainbowKit 各自的钱包连接器：无扩展时内部已是
 * 「该钱包的 WalletConnect」链路（含 bnc:// / tpoutside:// 等），与通用「WalletConnect」全量入口不同。
 */
const RWA_MENU_WALLET_IDS = ['binance', 'tokenPocket', 'metaMask', 'okx'] as const

type RkDetails = {
  id?: string
  name?: string
  showQrModal?: boolean
  isWalletConnectModalConnector?: boolean
}

function getRkDetails(c: Connector): RkDetails | undefined {
  return (c as Connector & { rkDetails?: RkDetails }).rkDetails
}

/**
 * RainbowKit 里多数钱包走 WalletConnect 时，wagmi 上 `connector.id` 仍是 `walletConnect`，
 * 真实入口区分在 `rkDetails.id`（与官网 Connect 列表一致）。
 */
function walletMenuId(c: Connector): string {
  const rk = getRkDetails(c)
  if (rk?.id) return rk.id
  return c.id
}

/** AppKit「Continue in … Wallet」层 z-index 低于本弹层时会被挡住，需先关 RWA 再 connect（同「搜索钱包」） */
function shouldCloseRwaModalBeforeConnect(c: Connector): boolean {
  const rk = getRkDetails(c)
  if (rk?.showQrModal === true || rk?.isWalletConnectModalConnector === true) return true
  const id = walletMenuId(c)
  return id === 'binance' || id === 'tokenPocket' || id === 'okx'
}

/** RainbowKit 下币安/TP/OKX 走独立 WC 实例且默认 showQrModal:false，桌面端常无配对 UI；需改走带 AppKit 的全量 WC 连接器 */
function shouldUseUniversalWalletConnectModal(c: Connector): boolean {
  const id = walletMenuId(c)
  if (id !== 'binance' && id !== 'tokenPocket' && id !== 'okx') return false
  return c.id === 'walletConnect'
}

function orderIndex(id: string): number {
  const i = (RWA_MENU_WALLET_IDS as readonly string[]).indexOf(id)
  return i === -1 ? 999 : i
}

function showMetaMaskInMenu(): boolean {
  if (typeof window === 'undefined') return true
  return !(isLikelyAndroidSystemWebView() || isCapacitorNativeAndroid())
}

function menuLabelForConnector(
  id: string,
  translate: (key: string) => string,
  fallbackName: string
): string {
  switch (id) {
    case 'binance':
      return translate('nav.connectMenuWalletBinance')
    case 'tokenPocket':
      return translate('nav.connectMenuWalletTp')
    case 'metaMask':
      return translate('nav.connectMenuWalletMetaMask')
    case 'okx':
      return translate('nav.connectMenuWalletOkx')
    default:
      return fallbackName
  }
}

function WalletRow({
  connector,
  busy,
  onPick,
  label,
}: {
  connector: Connector
  busy: boolean
  onPick: (c: Connector) => void
  label: string
}) {
  const menuId = walletMenuId(connector)
  //  curated 图标优先：WC 链路上 connector.icon 在部分 WebView 无效；外链易被拦截
  const iconSrc =
    RWA_WALLET_ICONS[menuId] ??
    RWA_WALLET_ICONS[connector.id] ??
    connector.icon ??
    '/icon.svg'

  return (
    <button
      type="button"
      onClick={() => onPick(connector)}
      className={`flex w-full items-center gap-3 py-3.5 pl-1 pr-1 text-left transition-opacity hover:opacity-90 ${busy ? 'pointer-events-none opacity-50' : ''}`}
    >
      <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-[10px] bg-[#262626]">
        <img src={iconSrc} alt="" className="h-full w-full object-cover" />
      </div>
      <span className="min-w-0 flex-1 truncate text-[16px] font-semibold text-white">{label}</span>
      <ChevronRight className="h-5 w-5 shrink-0 text-[#737373]" aria-hidden />
    </button>
  )
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RwaConnectWalletModal({ open, onOpenChange }: Props) {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const connectors = useConnectors()
  const { connectAsync } = useConnect()
  const { openConnectModal } = useConnectModal()
  const [termsOk, setTermsOk] = useState(true)
  const [showWcEnvHint, setShowWcEnvHint] = useState(false)
  /** 主屏幕 PWA / standalone：先关再连会丢掉用户手势，AppKit 无响应；改为穿透遮罩让 WC 层可操作 */
  const [wcUiPassThrough, setWcUiPassThrough] = useState(false)

  useEffect(() => {
    if (open) setShowWcEnvHint(shouldHintInWalletBrowserForWc())
  }, [open])
  /** 勿用 useConnect().isPending 锁全表：WC 深链/弹窗在部分环境永不 settle，会导致整窗永久灰置 */
  const [connectingKey, setConnectingKey] = useState<string | null>(null)
  const connectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearConnectTimeout = useCallback(() => {
    if (connectTimeoutRef.current) {
      clearTimeout(connectTimeoutRef.current)
      connectTimeoutRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!open) {
      setConnectingKey(null)
      clearConnectTimeout()
      setWcUiPassThrough(false)
    }
  }, [open, clearConnectTimeout])

  /** 与 RainbowKit「WalletConnect」项一致：优先带 AppKit / 全量钱包弹层的实例 */
  const wcConnector = useMemo(() => {
    const wcCandidates = connectors.filter((c) => walletMenuId(c) === 'walletConnect')
    const withModal = wcCandidates.find((c) => {
      const rk = getRkDetails(c)
      return rk?.showQrModal === true || rk?.isWalletConnectModalConnector === true
    })
    return withModal ?? wcCandidates[0]
  }, [connectors])

  const mainConnectors = useMemo(() => {
    const want = new Set<string>(RWA_MENU_WALLET_IDS)
    const list = connectors.filter((c) => want.has(walletMenuId(c)))
    const filtered = list.filter((c) =>
      walletMenuId(c) === 'metaMask' ? showMetaMaskInMenu() : true
    )
    const seen = new Set<string>()
    const uniq: Connector[] = []
    for (const c of filtered) {
      const mid = walletMenuId(c)
      if (seen.has(mid)) continue
      seen.add(mid)
      uniq.push(c)
    }
    return uniq.sort((a, b) => orderIndex(walletMenuId(a)) - orderIndex(walletMenuId(b)))
  }, [connectors])

  /** 与 RainbowKit 里点选 WalletConnect 一致：走带弹层的 WC 连接器；失败时退回官方 Connect 弹窗 */
  const openWalletConnectAll = useCallback(() => {
    if (!termsOk) {
      toast.message(t('nav.connectMenuTitle'), { description: t('nav.connectMenuTermsRequired') })
      return
    }
    const run = async () => {
      try {
        if (wcConnector) {
          await connectAsync({ connector: wcConnector, chainId: bsc.id })
          onOpenChange(false)
          return
        }
        openConnectModal?.()
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        if (msg.toLowerCase().includes('user rejected') || msg.toLowerCase().includes('denied')) return
        toast.error(t('nav.walletConnectFailedTitle'), { description: msg || t('nav.walletConnectFailedDesc') })
        openConnectModal?.()
      } finally {
        setWcUiPassThrough(false)
      }
    }
    if (typeof window !== 'undefined' && isStandaloneWebApp()) {
      setWcUiPassThrough(true)
      void run()
      return
    }
    onOpenChange(false)
    window.setTimeout(() => {
      void run()
    }, 0)
  }, [connectAsync, onOpenChange, openConnectModal, termsOk, t, wcConnector])

  const runConnect = useCallback(
    async (c: Connector) => {
      if (!termsOk) {
        toast.message(t('nav.connectMenuTitle'), { description: t('nav.connectMenuTermsRequired') })
        return
      }
      if (shouldUseUniversalWalletConnectModal(c)) {
        openWalletConnectAll()
        return
      }
      const key = walletMenuId(c)

      const execute = async () => {
        clearConnectTimeout()
        setConnectingKey(key)
        connectTimeoutRef.current = setTimeout(() => {
          connectTimeoutRef.current = null
          setConnectingKey(null)
          toast.message(t('nav.connectMenuTitle'), {
            description: t('nav.connectMenuTimeoutHint'),
          })
        }, 90_000)
        try {
          await connectAsync({ connector: c, chainId: bsc.id })
          onOpenChange(false)
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e)
          if (msg.toLowerCase().includes('user rejected') || msg.toLowerCase().includes('denied')) return
          toast.error(t('nav.walletConnectFailedTitle'), { description: msg || t('nav.walletConnectFailedDesc') })
        } finally {
          clearConnectTimeout()
          setConnectingKey(null)
          setWcUiPassThrough(false)
        }
      }

      if (shouldCloseRwaModalBeforeConnect(c)) {
        if (typeof window !== 'undefined' && isStandaloneWebApp()) {
          setWcUiPassThrough(true)
          void execute()
          return
        }
        onOpenChange(false)
        window.setTimeout(() => {
          void execute()
        }, 0)
        return
      }

      void execute()
    },
    [clearConnectTimeout, connectAsync, onOpenChange, openWalletConnectAll, termsOk, t]
  )

  const termsBlock: ReactNode = (
    <>
      {t('nav.connectMenuTermsBefore')}{' '}
      <Link href="/terms" className="font-medium text-[#60a5fa] underline-offset-2 hover:underline">
        {t('nav.connectMenuTermsLinkTerms')}
      </Link>{' '}
      {t('nav.connectMenuTermsMid')}{' '}
      <Link href="/privacy" className="font-medium text-[#60a5fa] underline-offset-2 hover:underline">
        {t('nav.connectMenuTermsLinkPrivacy')}
      </Link>
    </>
  )

  if (!open) return null

  return (
    <div
      className={`fixed inset-0 z-[220] flex items-end justify-center sm:items-center ${
        wcUiPassThrough
          ? 'pointer-events-none bg-transparent backdrop-blur-none'
          : 'bg-black/55 backdrop-blur-[6px]'
      }`}
      role="presentation"
      onClick={() => (wcUiPassThrough ? undefined : onOpenChange(false))}
    >
      <div
        role="dialog"
        aria-modal
        aria-labelledby="rwa-connect-menu-title"
        className={`relative flex max-h-[min(92vh,720px)] w-full max-w-[400px] flex-col overflow-hidden rounded-t-[20px] bg-[#1a1a1a] shadow-[0_-16px_64px_rgba(0,0,0,0.45)] sm:rounded-[20px] ${
          wcUiPassThrough ? 'pointer-events-none opacity-0' : ''
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="relative flex shrink-0 items-center justify-center px-4 pb-2 pt-5">
          <Link
            href={rwaConnectGuideHref()}
            target="_blank"
            rel="noreferrer"
            className="absolute left-4 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-[#a3a3a3] transition-colors hover:bg-white/[0.06] hover:text-white"
            aria-label={t('nav.connectMenuHelpAria')}
          >
            <HelpCircle className="h-[22px] w-[22px] stroke-[1.75]" />
          </Link>
          <h2 id="rwa-connect-menu-title" className="text-[17px] font-semibold tracking-tight text-white">
            {t('nav.connectMenuTitle')}
          </h2>
          <button
            type="button"
            className="absolute right-4 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-[#a3a3a3] transition-colors hover:bg-white/[0.06] hover:text-white"
            onClick={() => onOpenChange(false)}
            aria-label={t('nav.connectMenuCloseAria')}
          >
            <X className="h-[22px] w-[22px]" />
          </button>
        </header>

        {showWcEnvHint ? (
          <p className="mx-4 mb-1 shrink-0 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2.5 text-left text-[12px] leading-snug text-amber-100/95">
            {t('nav.connectMenuWcEnvHint')}
          </p>
        ) : null}

        <div className="flex shrink-0 items-start gap-3 px-5 pb-4 pt-1">
          <button
            type="button"
            role="checkbox"
            aria-checked={termsOk}
            onClick={() => setTermsOk((v) => !v)}
            className={`mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
              termsOk ? 'border-[#3b82f6] bg-[#3b82f6]' : 'border-[#525252] bg-transparent'
            }`}
          >
            {termsOk ? <Check className="h-3 w-3 text-white" strokeWidth={3} /> : null}
          </button>
          <span className="text-left text-[14px] leading-snug text-[#999999]">{termsBlock}</span>
        </div>

        <div className="min-h-0 flex-1 space-y-0 overflow-y-auto px-4 pb-2 [overscroll-behavior:contain]">
          {mainConnectors.map((c) => (
            <WalletRow
              key={walletMenuId(c)}
              connector={c}
              busy={connectingKey === walletMenuId(c)}
              onPick={runConnect}
              label={menuLabelForConnector(walletMenuId(c), t, c.name)}
            />
          ))}
        </div>

        <div className="shrink-0 px-4 pb-1 pt-1">
          <button
            type="button"
            onClick={openWalletConnectAll}
            className="flex w-full items-center gap-3 py-3.5 pl-1 pr-1 text-left transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-40"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-[#262626] text-[#a3a3a3]">
              <Search className="h-5 w-5" strokeWidth={2} />
            </div>
            <span className="min-w-0 flex-1 text-[16px] font-semibold text-white">{t('nav.connectMenuSearchWallet')}</span>
            <span className="mr-1 shrink-0 rounded-full bg-[#333333] px-2 py-0.5 text-[12px] font-medium text-[#a3a3a3]">
              {t('nav.connectMenuSearchSub')}
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-[#737373]" aria-hidden />
          </button>
        </div>

        <p className="flex shrink-0 flex-wrap items-center justify-center gap-x-1.5 gap-y-1 px-4 pb-4 pt-1 text-center text-[11px] leading-none text-[#737373]">
          <span className="text-[#8a8a8a]">{t('nav.connectMenuFooterBefore')}</span>
          <span className="inline-flex items-center gap-1">
            <span className="rounded-md border border-[#3f3f3f] bg-[#252525] px-[5px] py-[3px] text-[10px] font-semibold tracking-tight text-[#9ca3af] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              .
            </span>
            <span className="rounded-md border border-[#3f3f3f] bg-[#252525] px-[6px] py-[3px] text-[10px] font-semibold tracking-tight text-[#9ca3af] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              rwa
            </span>
            <span className="rounded-md border border-[#3f3f3f] bg-[#252525] px-[5px] py-[3px] text-[10px] font-semibold tabular-nums tracking-tight text-[#9ca3af] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              /2026
            </span>
          </span>
        </p>
      </div>
    </div>
  )
}
