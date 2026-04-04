'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useAccount, useSignMessage } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { ChatProvider, useChat } from '@/components/chat/chat-context';
import RoomList from '@/components/chat/RoomList';
import ChatRoom from '@/components/chat/ChatRoom';
import RedWalletPanel from '@/components/chat/RedWalletPanel';
import { useLocale } from '@/components/locale-provider';
import { useTranslation } from '@/lib/i18n';
import { fetchChatAuthSigningMessage } from '@/lib/chat-api';

// Error boundary to catch extension injection errors (TronLink etc.)
class ChatErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: any) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: any) {
    // Ignore browser extension errors
    if (error?.message?.includes('tronlink') || error?.stack?.includes('chrome-extension')) {
      this.setState({ hasError: false });
    }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-void-black flex items-center justify-center">
          <div className="text-center">
            <p className="text-text-primary mb-2">发生错误</p>
            <button onClick={() => this.setState({ hasError: false })}
              className="text-plasma-cyan text-sm underline">重试</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function ChatApp() {
  const { isAuthenticated, isAuthRestoring, login, establishSession, currentUser, isConnected } = useChat();
  const { address, isConnected: wagmiConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { signMessageAsync } = useSignMessage();
  const connectThenSignRef = useRef(false);
  const autoLoginAttemptedRef = useRef(false);
  const { locale, setLocale } = useLocale();
  const { t } = useTranslation(locale);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.overflow;
    const prevBody = body.style.overflow;
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    return () => {
      html.style.overflow = prevHtml;
      body.style.overflow = prevBody;
    };
  }, []);

  // 进入聊天页默认中文（仍然保留右上角中文/EN 手动切换）
  const setDefaultLocaleOnceRef = useRef(false);
  useEffect(() => {
    if (setDefaultLocaleOnceRef.current) return;
    setDefaultLocaleOnceRef.current = true;
    if (locale !== 'zh') setLocale('zh');
  }, [locale, setLocale]);

  const toggleMobileSidebar = (open: boolean) => {
    if (open && typeof document !== 'undefined') {
      (document.activeElement as HTMLElement | null)?.blur?.();
    }
    setShowSidebar(open);
  };
  const [showWallet, setShowWallet] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [connectError, setConnectError] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  // Suppress extension injection errors globally
  useEffect(() => {
    const handler = (e: ErrorEvent) => {
      if (e.message?.includes('tronlink') || e.filename?.includes('chrome-extension')) {
        e.preventDefault();
        return true;
      }
    };
    window.addEventListener('error', handler);
    return () => window.removeEventListener('error', handler);
  }, []);

  const runWalletChatLogin = useCallback(async () => {
    if (!address) {
      throw new Error(t('chat.installWallet'));
    }
    const message = await fetchChatAuthSigningMessage();
    const signature = await signMessageAsync({ message, account: address as `0x${string}` });
    if (typeof signature !== 'string' || !signature.startsWith('0x')) {
      throw new Error(t('chat.failedToConnect'));
    }
    await establishSession(address, signature);
  }, [address, establishSession, signMessageAsync, t]);

  /** RainbowKit 连接完成后自动走签名，避免「连一次钱包再点一次」 */
  useEffect(() => {
    if (
      !connectThenSignRef.current ||
      !wagmiConnected ||
      !address ||
      isAuthenticated ||
      isAuthRestoring
    ) {
      return;
    }
    connectThenSignRef.current = false;
    let cancelled = false;
    (async () => {
      try {
        setIsConnecting(true);
        setConnectError('');
        await runWalletChatLogin();
      } catch (err: any) {
        if (!cancelled) {
          setConnectError(err?.shortMessage || err?.message || t('chat.failedToConnect'));
        }
      } finally {
        if (!cancelled) setIsConnecting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [wagmiConnected, address, isAuthenticated, isAuthRestoring, runWalletChatLogin, t]);

  // 主站已连好钱包时：无需再点“签名进入聊天”，直接发起一次签名进入
  useEffect(() => {
    if (autoLoginAttemptedRef.current) return;
    if (!wagmiConnected || !address || isAuthenticated || isAuthRestoring) return;

    autoLoginAttemptedRef.current = true;
    (async () => {
      try {
        setIsConnecting(true);
        setConnectError('');
        await runWalletChatLogin();
      } catch (err: any) {
        setConnectError(err?.shortMessage || err?.message || t('chat.failedToConnect'));
      } finally {
        setIsConnecting(false);
      }
    })();
  }, [wagmiConnected, address, isAuthenticated, isAuthRestoring, runWalletChatLogin, t]);

  const handleConnect = async () => {
    try {
      setConnectError('');
      if (wagmiConnected && address) {
        setIsConnecting(true);
        try {
          await runWalletChatLogin();
        } finally {
          setIsConnecting(false);
        }
        return;
      }
      connectThenSignRef.current = true;
      if (openConnectModal) {
        openConnectModal();
      } else {
        connectThenSignRef.current = false;
        setConnectError(t('chat.installWallet'));
      }
    } catch (err: any) {
      setConnectError(err?.shortMessage || err?.message || t('chat.failedToConnect'));
      setIsConnecting(false);
    }
  };

  const handleGuestLogin = async () => {
    const guestAddr = `guest_${Math.random().toString(36).slice(2, 10)}`;
    await login(guestAddr, null as any);
  };

  if (isAuthRestoring) {
    return (
      <div className="h-[100dvh] max-h-[100dvh] overflow-hidden bg-void-black flex items-center justify-center p-4">
        <div className="flex items-center gap-3 text-text-secondary">
          <div className="w-4 h-4 border-2 border-plasma-cyan/30 border-t-plasma-cyan rounded-full animate-spin" />
          <span className="text-[12px] font-mono">{t('chat.connecting')}</span>
        </div>
      </div>
    );
  }

  // ========== Login Screen ==========
  if (!isAuthenticated) {
    const shouldAutoSigning = wagmiConnected && address && !isAuthRestoring;
    return (
      <div className="h-[100dvh] max-h-[100dvh] overflow-y-auto overscroll-y-contain bg-void-black flex items-center justify-center p-4 relative">
        {/* Background grid */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

        {/* Ambient glow effects */}
        <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-15 blur-[150px] pointer-events-none"
          style={{ background: 'radial-gradient(circle, #00f5d4 0%, transparent 70%)' }} />
        <div className="absolute bottom-[20%] right-[20%] w-[400px] h-[400px] rounded-full opacity-10 blur-[120px] pointer-events-none"
          style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)' }} />
        <div className="absolute top-[40%] left-[10%] w-[300px] h-[300px] rounded-full opacity-8 blur-[100px] pointer-events-none"
          style={{ background: 'radial-gradient(circle, #f59e0b 0%, transparent 70%)' }} />

        {/* Floating particles */}
        {[...Array(6)].map((_, i) => (
          <div key={i} className="absolute w-1 h-1 rounded-full bg-plasma-cyan/20 animate-pulse"
            style={{ top: `${15 + i * 15}%`, left: `${10 + i * 15}%`, animationDelay: `${i * 0.5}s`, animationDuration: `${2 + i * 0.3}s` }} />
        ))}

        <div className="max-w-[420px] w-full relative z-10">
          {/* Logo + Brand */}
          <div className="text-center mb-10">
            <div className="relative w-24 h-24 mx-auto mb-6">
              <img src="/icon.svg" alt="RWA Aura" className="w-full h-full object-contain rounded-2xl" />
              <div className="absolute inset-0 rounded-2xl animate-pulse-glow"
                style={{ boxShadow: '0 0 40px #00f5d420, 0 0 80px #00f5d410' }} />
            </div>
            <h1 className="text-[28px] font-heading font-bold text-text-primary tracking-tight leading-none">
              RWA <span className="bg-gradient-to-r from-plasma-cyan to-void-purple bg-clip-text text-transparent">Aura</span>
            </h1>
            <p className="text-[13px] text-text-secondary mt-2">{t('chat.brandSubtitle')}</p>
            <div className="flex items-center justify-center gap-4 mt-3">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                <span className="text-[10px] font-mono text-text-disabled">{t('chat.statsOnlineMock')}</span>
              </div>
              <span className="text-text-disabled/30">|</span>
              <span className="text-[10px] font-mono text-text-disabled">{t('chat.statsChannelsMock')}</span>
            </div>
          </div>

          {/* Main Connect Card */}
          <div className="bg-surface-1/80 backdrop-blur-xl border border-border-subtle rounded-2xl overflow-hidden">
            {/* Card header with gradient line */}
            <div className="h-[2px]" style={{ background: 'linear-gradient(90deg, transparent, #00f5d4, #8b5cf6, transparent)' }} />

              <div className="p-6">
              {wagmiConnected && address && (
                <p className="text-[11px] text-text-secondary mb-4 leading-relaxed">
                  {t('chat.walletAlreadyConnected')}
                </p>
              )}
              {/* Auth method */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #00f5d412, #00f5d408)', border: '1px solid #00f5d420' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00f5d4" strokeWidth="1.5">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                </div>
                <div>
                  <div className="text-[14px] font-heading font-semibold text-text-primary">{t('chat.web3AuthTitle')}</div>
                  <div className="text-[11px] text-text-secondary">{t('chat.web3AuthDesc')}</div>
                </div>
              </div>

              {/* Connect Wallet Button */}
              <button type="button" onClick={handleConnect} disabled={isConnecting || shouldAutoSigning}
                className="w-full py-3.5 rounded-xl font-heading font-semibold text-[14px] transition-all duration-300 relative group overflow-hidden disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #00f5d418, #00f5d410)', color: '#00f5d4', border: '1px solid #00f5d435' }}>
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ background: 'linear-gradient(135deg, #00f5d425, #00f5d418)' }} />
                <span className="relative z-10 flex items-center justify-center gap-2.5">
                  {isConnecting ? (
                    <div className="w-4 h-4 border-2 border-plasma-cyan/30 border-t-plasma-cyan rounded-full animate-spin" />
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>
                    </svg>
                  )}
                  {isConnecting || shouldAutoSigning ? t('chat.connecting') : t('chat.connectWallet')}
                </span>
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-[1px] bg-border-subtle" />
                <span className="text-[10px] font-mono text-text-disabled">{t('chat.or')}</span>
                <div className="flex-1 h-[1px] bg-border-subtle" />
              </div>

              {/* Guest Mode */}
              <button type="button" onClick={handleGuestLogin}
                className="w-full py-3 rounded-xl font-heading font-medium text-[13px] transition-all duration-200 bg-surface-2 text-text-secondary border border-border-subtle hover:border-border-active hover:text-text-primary hover:bg-surface-3">
                <span className="flex items-center justify-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                  </svg>
                  {t('chat.browseAsGuest')}
                </span>
              </button>

              {connectError && (
                <div className="mt-3 px-3 py-2 rounded-lg bg-danger/10 border border-danger/20">
                  <p className="text-[11px] text-danger text-center">{connectError}</p>
                </div>
              )}

              {/* Security note */}
              <div className="flex items-center justify-center gap-3 mt-5 pt-4 border-t border-border-subtle">
                <div className="flex items-center gap-1">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  <span className="text-[9px] text-text-disabled">{t('chat.noGasFees')}</span>
                </div>
                <div className="flex items-center gap-1">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  <span className="text-[9px] text-text-disabled">{t('chat.readOnlySignature')}</span>
                </div>
                <div className="flex items-center gap-1">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  <span className="text-[9px] text-text-disabled">{t('chat.nonCustodial')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Feature cards */}
          <div className="grid grid-cols-3 gap-2.5 mt-5">
            {[
              { icon: 'M13 10V3L4 14h7v7l9-11h-7z', label: t('chat.featureRealtime'), desc: t('chat.featureRealtimeDesc'), color: '#00f5d4' },
              { icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', label: t('chat.featureSecure'), desc: t('chat.featureSecureDesc'), color: '#8b5cf6' },
              { icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z', label: t('chat.bots'), desc: 'Claude AI', color: '#f59e0b' },
            ].map((f) => (
              <div key={f.label} className="text-center py-4 px-2 rounded-xl bg-surface-1/60 backdrop-blur-sm border border-border-subtle hover:border-border-active transition-all group">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={f.color} strokeWidth="1.5"
                  className="mx-auto mb-2 opacity-50 group-hover:opacity-80 transition-opacity">
                  <path d={f.icon} />
                </svg>
                <div className="text-[11px] font-medium text-text-primary mb-0.5">{f.label}</div>
                <div className="text-[9px] text-text-disabled font-mono">{f.desc}</div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="text-center mt-6">
            <p className="text-[10px] text-text-disabled font-mono">{t('chat.poweredBy')}</p>
          </div>
        </div>
      </div>
    );
  }

  // ========== Main Chat ==========
  return (
    <div className="h-[100dvh] max-h-[100dvh] overflow-hidden bg-void-black flex flex-col min-h-0 touch-manipulation">
      {/* Top bar */}
      <div className="pt-[env(safe-area-inset-top)]">
        <div className="h-12 border-b border-border-subtle bg-surface-1/80 backdrop-blur-sm flex items-center justify-between px-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-2 border border-border-subtle text-text-disabled hover:text-text-secondary hover:border-border-active transition-colors"
              title={t('chat.backHome')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 5l-7 7 7 7"/>
              </svg>
            </Link>
            <button
              type="button"
              onClick={() => toggleMobileSidebar(!showSidebar)}
              className="lg:hidden w-8 h-8 rounded-lg bg-surface-2 border border-border-subtle flex items-center justify-center text-text-disabled hover:text-text-secondary transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <img src="/icon.svg" alt="RWA" className="w-7 h-7 rounded-lg object-contain" />
              <span className="text-[14px] font-heading font-bold text-text-primary">RWA</span>
              <span className="text-[14px] font-heading font-bold text-plasma-cyan">Aura</span>
            </div>
            <div className={`w-2 h-2 rounded-full shrink-0 ${isConnected ? 'bg-success' : 'bg-danger'}`} />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg border border-border-subtle bg-surface-2 p-0.5">
              <button
                type="button"
                onClick={() => setLocale('zh')}
                className={`px-2 py-1 rounded-md text-[10px] font-mono transition-colors ${locale === 'zh' ? 'bg-plasma-cyan/15 text-plasma-cyan' : 'text-text-disabled hover:text-text-secondary'}`}
              >
                {t('chat.langZh')}
              </button>
              <button
                type="button"
                onClick={() => setLocale('en')}
                className={`px-2 py-1 rounded-md text-[10px] font-mono transition-colors ${locale === 'en' ? 'bg-plasma-cyan/15 text-plasma-cyan' : 'text-text-disabled hover:text-text-secondary'}`}
              >
                {t('chat.langEn')}
              </button>
            </div>
            {/* Wallet entry moved to sidebar menu */}

            <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-text-secondary font-mono bg-surface-2 px-3 py-1.5 rounded-lg border border-border-subtle">
              <div className="w-2 h-2 rounded-full bg-success" />
              {currentUser?.address.slice(0, 6)}...{currentUser?.address.slice(-4)}
            </div>
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex min-h-0 relative">
        {/* Sidebar */}
        <div className={`w-[260px] border-r border-border-subtle flex-shrink-0
          ${showSidebar ? 'absolute inset-y-0 left-0 z-20' : 'hidden lg:block'}`}>
          <RoomList
            closeMobileSidebar={() => toggleMobileSidebar(false)}
            onOpenWallet={() => {
              setShowWallet(true);
              toggleMobileSidebar(false);
            }}
          />
        </div>

        {showSidebar && (
          <div
            role="presentation"
            className="absolute inset-0 bg-black/60 z-10 lg:hidden"
            onClick={() => toggleMobileSidebar(false)}
          />
        )}

        {/* Chat */}
        <div className="flex-1 flex min-w-0">
          <ChatRoom />
        </div>

        {/* Red wallet panel (desktop) */}
        {showWallet && (
          <div className="w-[300px] border-l border-border-subtle flex-shrink-0 hidden md:block">
            <RedWalletPanel compact={false} />
          </div>
        )}

        {/* Red wallet panel (mobile/tablet drawer) */}
        {showWallet && (
          <div className="md:hidden absolute inset-y-0 right-0 z-30 w-[88vw] max-w-[340px] border-l border-border-subtle bg-surface-1 shadow-2xl">
            <div className="h-12 px-3 border-b border-border-subtle flex items-center justify-between">
              <div className="text-[12px] font-heading font-semibold text-text-primary">{t('chat.redWalletTitle')}</div>
              <button
                type="button"
                onClick={() => setShowWallet(false)}
                className="w-7 h-7 rounded-md hover:bg-surface-2 text-text-secondary hover:text-text-primary"
                aria-label="Close wallet"
              >
                ✕
              </button>
            </div>
            <div className="h-[calc(100%-3rem)] min-h-0">
              <RedWalletPanel compact={true} onClose={() => setShowWallet(false)} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <ChatErrorBoundary>
      <ChatProvider>
        <ChatApp />
      </ChatProvider>
    </ChatErrorBoundary>
  );
}
