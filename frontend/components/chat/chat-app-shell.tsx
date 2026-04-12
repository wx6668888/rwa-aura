'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { X, Maximize2 } from 'lucide-react'
import { LazyDotLottieAnimation, encodePublicLottieSrc } from '@/components/lazy-dot-lottie'
import { useAccount, useSignMessage } from 'wagmi'
import { useRwaConnectMenu } from '@/components/providers/rwa-connect-wallet-context'
import { useChat } from '@/components/chat/chat-context'
import RoomList from '@/components/chat/RoomList'
import ChatRoom from '@/components/chat/ChatRoom'
import RedWalletPanel from '@/components/chat/RedWalletPanel'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import { ensureChatCredentials } from '@/lib/ensure-chat-credentials'
import { readPersistedChatAuth } from '@/lib/chat-auth-storage'

export type ChatAppShellProps = {
  variant: 'fullscreen' | 'sheet'
  onRequestClose?: () => void
  onOpenFullPage?: () => void
}

export function ChatAppShell({ variant, onRequestClose, onOpenFullPage }: ChatAppShellProps) {
  const { isAuthenticated, isAuthRestoring, login, establishSession, currentUser, isConnected } = useChat()
  const { address, isConnected: wagmiConnected } = useAccount()
  const { openConnectMenu } = useRwaConnectMenu()
  const { signMessageAsync } = useSignMessage()
  const connectThenSignRef = useRef(false)
  const autoLoginAttemptedRef = useRef(false)
  const { locale } = useLocale()
  const { t } = useTranslation(locale)

  useEffect(() => {
    if (variant !== 'fullscreen') return
    const html = document.documentElement
    const body = document.body
    const prevHtml = html.style.overflow
    const prevBody = body.style.overflow
    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    return () => {
      html.style.overflow = prevHtml
      body.style.overflow = prevBody
    }
  }, [variant])

  const toggleMobileSidebar = (open: boolean) => {
    if (open && typeof document !== 'undefined') {
      ;(document.activeElement as HTMLElement | null)?.blur?.()
    }
    setShowSidebar(open)
  }
  const [showWallet, setShowWallet] = useState(false)
  const [showSidebar, setShowSidebar] = useState(false)
  const [connectError, setConnectError] = useState('')
  const [isConnecting, setIsConnecting] = useState(false)

  useEffect(() => {
    const handler = (e: ErrorEvent) => {
      if (e.message?.includes('tronlink') || e.filename?.includes('chrome-extension')) {
        e.preventDefault()
        return true
      }
    }
    window.addEventListener('error', handler)
    return () => window.removeEventListener('error', handler)
  }, [])

  const runWalletChatLogin = useCallback(async () => {
    if (isAuthenticated) return
    if (!address) {
      throw new Error(t('chat.installWallet'))
    }
    const cached = readPersistedChatAuth()
    if (cached?.address?.toLowerCase() === address.toLowerCase()) {
      if (cached.sessionToken && cached.sessionToken.length > 8) {
        await establishSession(cached.address, {
          sessionToken: cached.sessionToken,
          signature: cached.signature,
        })
        return
      }
      if (cached.signature?.startsWith('0x')) {
        await establishSession(cached.address, { signature: cached.signature })
        return
      }
    }
    const auth = await ensureChatCredentials(address, signMessageAsync)
    if (!auth) {
      throw new Error(t('chat.failedToConnect'))
    }
    await establishSession(auth.address, {
      signature: auth.signature,
      sessionToken: auth.sessionToken,
    })
  }, [address, establishSession, isAuthenticated, signMessageAsync, t])

  useEffect(() => {
    if (
      !connectThenSignRef.current ||
      !wagmiConnected ||
      !address ||
      isAuthenticated ||
      isAuthRestoring
    ) {
      return
    }
    connectThenSignRef.current = false
    let cancelled = false
    ;(async () => {
      try {
        setIsConnecting(true)
        setConnectError('')
        await runWalletChatLogin()
      } catch (err: unknown) {
        if (!cancelled) {
          const e = err as { shortMessage?: string; message?: string }
          setConnectError(e?.shortMessage || e?.message || t('chat.failedToConnect'))
        }
      } finally {
        if (!cancelled) setIsConnecting(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [wagmiConnected, address, isAuthenticated, isAuthRestoring, runWalletChatLogin, t])

  useEffect(() => {
    if (autoLoginAttemptedRef.current) return
    if (!wagmiConnected || !address || isAuthenticated || isAuthRestoring) return

    autoLoginAttemptedRef.current = true
    ;(async () => {
      try {
        setIsConnecting(true)
        setConnectError('')
        await runWalletChatLogin()
      } catch (err: unknown) {
        const e = err as { shortMessage?: string; message?: string }
        setConnectError(e?.shortMessage || e?.message || t('chat.failedToConnect'))
      } finally {
        setIsConnecting(false)
      }
    })()
  }, [wagmiConnected, address, isAuthenticated, isAuthRestoring, runWalletChatLogin, t])

  const handleConnect = async () => {
    try {
      setConnectError('')
      if (wagmiConnected && address) {
        setIsConnecting(true)
        try {
          await runWalletChatLogin()
        } finally {
          setIsConnecting(false)
        }
        return
      }
      connectThenSignRef.current = true
      openConnectMenu()
    } catch (err: unknown) {
      const e = err as { shortMessage?: string; message?: string }
      setConnectError(e?.shortMessage || e?.message || t('chat.failedToConnect'))
      setIsConnecting(false)
    }
  }

  const handleGuestLogin = async () => {
    const guestAddr = `guest_${Math.random().toString(36).slice(2, 10)}`
    await login(guestAddr, null as never)
  }

  if (isAuthRestoring) {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col items-center justify-center overflow-hidden bg-void-black p-4">
        <div className="flex items-center gap-3 text-text-secondary">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-plasma-cyan/30 border-t-plasma-cyan" />
          <span className="font-mono text-[12px]">{t('chat.connecting')}</span>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    const shouldAutoSigning = wagmiConnected && address && !isAuthRestoring
    return (
      <div className="relative flex h-full min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto overscroll-y-contain bg-void-black p-4">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        <div
          className="pointer-events-none absolute left-1/2 top-[20%] h-[600px] w-[600px] -translate-x-1/2 rounded-full opacity-15 blur-[150px]"
          style={{ background: 'radial-gradient(circle, #00f5d4 0%, transparent 70%)' }}
        />
        <div
          className="pointer-events-none absolute bottom-[20%] right-[20%] h-[400px] w-[400px] rounded-full opacity-10 blur-[120px]"
          style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)' }}
        />
        <div
          className="pointer-events-none absolute left-[10%] top-[40%] h-[300px] w-[300px] rounded-full opacity-8 blur-[100px]"
          style={{ background: 'radial-gradient(circle, #f59e0b 0%, transparent 70%)' }}
        />

        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute h-1 w-1 animate-pulse rounded-full bg-plasma-cyan/20"
            style={{
              top: `${15 + i * 15}%`,
              left: `${10 + i * 15}%`,
              animationDelay: `${i * 0.5}s`,
              animationDuration: `${2 + i * 0.3}s`,
            }}
          />
        ))}

        <div className="relative z-10 w-full max-w-[420px]">
          <div className="mb-10 text-center">
            <div className="relative mx-auto mb-6 h-24 w-24">
              <img src="/icon.svg" alt="RWA Aura" className="h-full w-full rounded-2xl object-contain" />
              <div
                className="animate-pulse-glow absolute inset-0 rounded-2xl"
                style={{ boxShadow: '0 0 40px #00f5d420, 0 0 80px #00f5d410' }}
              />
            </div>
            <h1 className="font-heading text-[28px] font-bold leading-none tracking-tight text-text-primary">
              RWA{' '}
              <span className="bg-gradient-to-r from-plasma-cyan to-void-purple bg-clip-text text-transparent">
                Aura
              </span>
            </h1>
            <p className="mt-2 text-[13px] text-text-secondary">{t('chat.brandSubtitle')}</p>
            <div className="mt-3 flex items-center justify-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
                <span className="font-mono text-[10px] text-text-disabled">{t('chat.statsOnlineMock')}</span>
              </div>
              <span className="text-text-disabled/30">|</span>
              <span className="font-mono text-[10px] text-text-disabled">{t('chat.statsChannelsMock')}</span>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border-subtle bg-surface-1/80 backdrop-blur-xl">
            <div
              className="h-[2px]"
              style={{ background: 'linear-gradient(90deg, transparent, #00f5d4, #8b5cf6, transparent)' }}
            />

            <div className="p-6">
              {wagmiConnected && address && (
                <p className="mb-4 text-[11px] leading-relaxed text-text-secondary">
                  {t('chat.walletAlreadyConnected')}
                </p>
              )}
              <div className="mb-6 flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{
                    background: 'linear-gradient(135deg, #00f5d412, #00f5d408)',
                    border: '1px solid #00f5d420',
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00f5d4" strokeWidth="1.5">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                <div>
                  <div className="font-heading text-[14px] font-semibold text-text-primary">
                    {t('chat.web3AuthTitle')}
                  </div>
                  <div className="text-[11px] text-text-secondary">{t('chat.web3AuthDesc')}</div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => void handleConnect()}
                disabled={isConnecting || shouldAutoSigning}
                className="group relative w-full overflow-hidden rounded-xl py-3.5 font-heading text-[14px] font-semibold transition-all duration-300 disabled:opacity-60"
                style={{
                  background: 'linear-gradient(135deg, #0d9488, #0f766e)',
                  color: '#ffffff',
                  border: '1px solid rgba(255,255,255,0.22)',
                }}
              >
                <div
                  className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
                />
                <span className="relative z-10 flex items-center justify-center gap-2.5">
                  {isConnecting ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" />
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
                      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
                      <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
                    </svg>
                  )}
                  {isConnecting || shouldAutoSigning ? t('chat.connecting') : t('chat.connectWallet')}
                </span>
              </button>

              <div className="my-4 flex items-center gap-3">
                <div className="h-[1px] flex-1 bg-border-subtle" />
                <span className="font-mono text-[10px] text-text-disabled">{t('chat.or')}</span>
                <div className="h-[1px] flex-1 bg-border-subtle" />
              </div>

              <button
                type="button"
                onClick={() => void handleGuestLogin()}
                className="w-full rounded-xl border border-border-subtle bg-surface-2 py-3 font-heading text-[13px] font-medium text-text-secondary transition-all duration-200 hover:border-border-active hover:bg-surface-3 hover:text-text-primary"
              >
                <span className="flex items-center justify-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  {t('chat.browseAsGuest')}
                </span>
              </button>

              {connectError && (
                <div className="mt-3 rounded-lg border border-danger/20 bg-danger/10 px-3 py-2">
                  <p className="text-center text-[11px] text-danger">{connectError}</p>
                </div>
              )}

              <div className="mt-5 flex items-center justify-center gap-3 border-t border-border-subtle pt-4">
                <div className="flex items-center gap-1">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  <span className="text-[9px] text-text-disabled">{t('chat.noGasFees')}</span>
                </div>
                <div className="flex items-center gap-1">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  <span className="text-[9px] text-text-disabled">{t('chat.readOnlySignature')}</span>
                </div>
                <div className="flex items-center gap-1">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  <span className="text-[9px] text-text-disabled">{t('chat.nonCustodial')}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2.5">
            {[
              {
                icon: 'M13 10V3L4 14h7v7l9-11h-7z',
                label: t('chat.featureRealtime'),
                desc: t('chat.featureRealtimeDesc'),
                color: '#00f5d4',
              },
              {
                icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
                label: t('chat.featureSecure'),
                desc: t('chat.featureSecureDesc'),
                color: '#8b5cf6',
              },
              {
                icon:
                  'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
                label: t('chat.bots'),
                desc: 'Claude AI',
                color: '#f59e0b',
              },
            ].map((f) => (
              <div
                key={f.label}
                className="group rounded-xl border border-border-subtle bg-surface-1/60 px-2 py-4 text-center backdrop-blur-sm transition-all hover:border-border-active"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={f.color}
                  strokeWidth="1.5"
                  className="mx-auto mb-2 opacity-50 transition-opacity group-hover:opacity-80"
                >
                  <path d={f.icon} />
                </svg>
                <div className="mb-0.5 text-[11px] font-medium text-text-primary">{f.label}</div>
                <div className="font-mono text-[9px] text-text-disabled">{f.desc}</div>
              </div>
            ))}
          </div>

          <div className="mt-6 text-center">
            <p className="font-mono text-[10px] text-text-disabled">{t('chat.poweredBy')}</p>
          </div>
        </div>
      </div>
    )
  }

  const isSheet = variant === 'sheet'
  /** 与 navbar `GROUP_CHAT_MENU_LOTTIE`（`/Chat.lottie`）一致 */
  const chatSheetLottieSrc = encodePublicLottieSrc('/Chat.lottie')
  /** 群聊弹层顶栏动效上叠加礼花（同区域上层，非上方排版） */
  const chatSheetConfettiSrc = encodePublicLottieSrc('/礼花.lottie')

  return (
    <div className="flex h-full min-h-0 flex-1 touch-manipulation flex-col overflow-hidden bg-void-black">
      {/* 全屏聊天顶栏贴系统刘海；底部弹层(sheet)顶缘不在物理屏顶端，勿再套 safe-area-inset-top，否则 PWA 内会出现过大顶空白 */}
      <div className={isSheet ? 'pt-0' : 'pt-[env(safe-area-inset-top)]'}>
        {isSheet ? (
          <div className="shrink-0 border-b border-[#00f5d420]/15 bg-[#0a0a10]/50 px-4 pb-2.5 pt-2 backdrop-blur-sm">
            <div className="flex items-start gap-3">
              <div className="relative h-14 w-14 shrink-0 overflow-hidden bg-[#0d0d14]">
                <div className="relative z-0 h-full w-full">
                  <LazyDotLottieAnimation
                    src={chatSheetLottieSrc}
                    className="h-full w-full"
                    autoplay
                    loop
                    speed={1}
                    rootMargin="80px"
                    posterSrc=""
                  />
                </div>
                <div
                  className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
                  aria-hidden
                >
                  <LazyDotLottieAnimation
                    src={chatSheetConfettiSrc}
                    className="h-full w-full object-contain opacity-90"
                    autoplay
                    loop
                    speed={1}
                    rootMargin="80px"
                    posterSrc=""
                  />
                </div>
              </div>
              <div className="min-w-0 flex-1 pt-0.5">
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#00f5d4]/75">
                  {t('chat.sheetKicker')}
                </div>
                <div className="mt-0.5 text-base font-bold tracking-tight text-[#f1f5f9]">{t('chat.sheetTitle')}</div>
              </div>
              <div className="flex shrink-0 flex-wrap items-start justify-end gap-0.5 pt-0.5 sm:gap-1">
                {currentUser?.isAdmin ? (
                  <Link
                    href="/chat/admin"
                    className="hidden items-center rounded-full border border-[#00f5d460]/50 bg-[#00f5d414] px-2.5 py-1.5 font-mono text-[10px] text-[#00f5d4] transition-colors hover:bg-[#00f5d424] sm:inline-flex"
                  >
                    Admin
                  </Link>
                ) : null}
                {onOpenFullPage ? (
                  <button
                    type="button"
                    onClick={onOpenFullPage}
                    className="hidden rounded-full border border-[#00f5d440]/45 bg-[#00f5d412] px-2.5 py-1.5 font-mono text-[10px] text-[#00f5d4] transition-colors hover:bg-[#00f5d422] sm:inline-flex"
                  >
                    {t('chat.openFullChat')}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => toggleMobileSidebar(!showSidebar)}
                  className="rounded-full p-2 text-[#94a3b8] transition-colors hover:bg-white/[0.06] hover:text-[#f1f5f9] lg:hidden"
                  aria-label={t('chat.channels')}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                  </svg>
                </button>
                {onOpenFullPage ? (
                  <button
                    type="button"
                    onClick={onOpenFullPage}
                    className="rounded-full p-2 text-[#94a3b8] transition-colors hover:bg-white/[0.06] hover:text-[#00f5d4] sm:hidden"
                    aria-label={t('chat.openFullChat')}
                  >
                    <Maximize2 className="h-5 w-5" strokeWidth={2} />
                  </button>
                ) : null}
                {onRequestClose ? (
                  <button
                    type="button"
                    onClick={onRequestClose}
                    className="rounded-full p-2 text-[#94a3b8] transition-colors hover:bg-white/[0.06] hover:text-[#f1f5f9]"
                    aria-label={t('chat.closeChatPanelAria')}
                  >
                    <X className="h-5 w-5" strokeWidth={2} />
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex h-12 flex-shrink-0 items-center justify-between border-b border-border-subtle bg-surface-1/80 px-4 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-subtle bg-surface-2 text-text-disabled transition-colors hover:border-border-active hover:text-text-secondary"
                title={t('chat.backHome')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 5l-7 7 7 7" />
                </svg>
              </Link>
              <div className="flex items-center gap-2">
                <img src="/icon.svg" alt="RWA" className="h-7 w-7 rounded-lg object-contain" />
                <span className="font-heading text-[14px] font-bold text-text-primary">RWA</span>
                <span className="font-heading text-[14px] font-bold text-plasma-cyan">Aura</span>
              </div>
              <div className={`h-2 w-2 shrink-0 rounded-full ${isConnected ? 'bg-success' : 'bg-danger'}`} />
            </div>

            <div className="flex items-center gap-2">
              {currentUser?.isAdmin && (
                <Link
                  href="/chat/admin"
                  className="hidden items-center rounded-lg border border-[#00f5d460] bg-[#00f5d41a] px-2.5 py-1.5 font-mono text-[11px] text-[#00f5d4] hover:bg-[#00f5d42a] sm:inline-flex"
                >
                  Admin
                </Link>
              )}
              <div className="hidden items-center gap-1.5 rounded-lg border border-border-subtle bg-surface-2 px-3 py-1.5 font-mono text-[11px] text-text-secondary sm:flex">
                <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-success' : 'bg-danger'}`} />
                {currentUser?.address
                  ? `${currentUser.address.slice(0, 6)}...${currentUser.address.slice(-4)}`
                  : '—'}
              </div>
              <button
                type="button"
                onClick={() => toggleMobileSidebar(!showSidebar)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-subtle bg-surface-2 text-text-disabled transition-colors hover:text-text-secondary lg:hidden"
                aria-label={t('chat.channels')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="relative flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          <ChatRoom />
        </div>

        {showSidebar ? (
          <div
            role="presentation"
            className="absolute inset-0 z-10 bg-black/60 lg:hidden"
            onClick={() => toggleMobileSidebar(false)}
          />
        ) : null}

        <div
          className={`w-[260px] flex-shrink-0 border-l border-border-subtle bg-surface-1 ${
            showSidebar ? 'absolute inset-y-0 right-0 z-20 shadow-[-12px_0_32px_rgba(0,0,0,0.45)]' : 'hidden lg:block'
          }`}
        >
          <RoomList
            closeMobileSidebar={() => toggleMobileSidebar(false)}
            onOpenWallet={() => {
              setShowWallet(true)
              toggleMobileSidebar(false)
            }}
          />
        </div>

        {showWallet ? (
          <div className="hidden w-[300px] flex-shrink-0 border-l border-border-subtle md:block">
            <RedWalletPanel compact={false} />
          </div>
        ) : null}

        {showWallet ? (
          <div className="absolute inset-y-0 right-0 z-30 w-[88vw] max-w-[340px] border-l border-border-subtle bg-surface-1 shadow-2xl md:hidden">
            <div className="flex h-12 items-center justify-between border-b border-border-subtle px-3">
              <div className="font-heading text-[12px] font-semibold text-text-primary">{t('chat.redWalletTitle')}</div>
              <button
                type="button"
                onClick={() => setShowWallet(false)}
                className="h-7 w-7 rounded-md text-text-secondary hover:bg-surface-2 hover:text-text-primary"
                aria-label="Close wallet"
              >
                ✕
              </button>
            </div>
            <div className="h-[calc(100%-3rem)] min-h-0">
              <RedWalletPanel compact onClose={() => setShowWallet(false)} />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
