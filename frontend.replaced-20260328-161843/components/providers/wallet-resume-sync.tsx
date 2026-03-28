'use client'

/**
 * H5 / 移动浏览器：从钱包 App 返回当前页时，页面通常不会整页刷新，
 * wagmi 不会自动再跑一遍存储里的会话恢复。在 visibility / focus / pageshow 时触发 reconnect。
 *
 * 注意：部分 WebView / 隐私模式会禁用或限制 localStorage；reconnect 在个别环境下也可能抛错，
 * 必须全部吞掉，否则会触发 Next.js「Application error: a client-side exception」。
 */
import { useEffect, useRef } from 'react'
import { useAccount, useReconnect } from 'wagmi'
import { WALLETCONNECT_RELAY_URL } from '@/lib/wagmi'

function safeLocalStorageGet(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function safeLocalStorageSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* ignore */
  }
}

function safeLocalStorageRemove(key: string) {
  try {
    localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}

export function WalletResumeSync() {
  const { isConnected } = useAccount()
  const { reconnect } = useReconnect()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const busyRef = useRef(false)
  const burstTimersRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const wasHiddenRef = useRef(false)
  const isConnectedRef = useRef(isConnected)
  const currentRunIdRef = useRef(0)
  const retryTimersRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const HARD_RELOAD_ONCE_KEY = '__rwa_wallet_hard_reload_once__'

  const FAST_RETURN_FLAG = '__rwa_wallet_fast_return_ts__'

  // 判断是否存在 WalletConnect 本地 session（仅用于控制部分“加速返回时”的兜底策略）。
  // 重要：自动 reconnect 本身不能被禁止，否则“第一次从币安返回不配对、第二次才行”的问题会出现。
  const hasWalletConnectSession = () => {
    try {
      const WC_STORAGE_PREFIX = 'wc@2:ethereum_provider:'
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (k && k.startsWith(WC_STORAGE_PREFIX)) return true
      }
      return false
    } catch {
      return false
    }
  }

  // 始终持有最新的 isConnected，避免 setTimeout 闭包读到旧值
  useEffect(() => {
    isConnectedRef.current = isConnected
  }, [isConnected])

  useEffect(() => {
    // WalletConnect 的本地 session/transport 缓存在 localStorage。
    // 当我们切换了 relayUrl（例如从 proxy 回退到官方 relay）后，
    // 旧 transport 可能导致连接卡住/一直转圈。这里做一次“relayUrl 变更即清缓存”。
    const WC_STORAGE_PREFIX = 'wc@2:ethereum_provider:'
    const RELAY_URL_KEY = '__rwa_last_wc_relay_url__'

    if (typeof window !== 'undefined') {
      try {
        const last = localStorage.getItem(RELAY_URL_KEY) || ''
        const current = WALLETCONNECT_RELAY_URL || ''
        if (last !== current) {
          const keys: string[] = []
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i)
            if (k && k.startsWith(WC_STORAGE_PREFIX)) keys.push(k)
          }
          for (const k of keys) localStorage.removeItem(k)
          localStorage.setItem(RELAY_URL_KEY, current)
        }
      } catch {
        // ignore: 部分隐私模式可能禁用 localStorage
      }
    }

    const clearBurstTimers = () => {
      for (const t of burstTimersRef.current) clearTimeout(t)
      burstTimersRef.current = []
    }

    const clearRetryTimers = () => {
      for (const t of retryTimersRef.current) clearTimeout(t)
      retryTimersRef.current = []
    }

    const runOnce = () => {
      if (typeof document === 'undefined' || document.visibilityState !== 'visible') return
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        const runId = ++currentRunIdRef.current
        clearRetryTimers()

        const doReconnect = () => {
          // 已连接则不再重试
          if (isConnectedRef.current) return
          if (busyRef.current) return

          busyRef.current = true
          try {
            reconnect(undefined, {
              onSettled: () => {
                busyRef.current = false
              },
            })
          } catch {
            busyRef.current = false
          }
        }

        // 首次立即尝试
        doReconnect()

        // 第二、第三次：对 WalletConnect 在国内网络下“首次 settle 未能被前端吃到”
        // 的情况做兜底（最多尝试 2 次补偿，避免死循环）。
        const scheduleRetry = (ms: number) => {
          const t = setTimeout(() => {
            if (currentRunIdRef.current !== runId) return
            if (isConnectedRef.current) return
            doReconnect()
          }, ms)
          retryTimersRef.current.push(t)
        }

        scheduleRetry(2500)
        scheduleRetry(6500)
      }, 120)
    }

    const runBurst = () => {
      clearBurstTimers()
      runOnce()
      const steps = [320, 1100]
      for (const ms of steps) {
        const t = setTimeout(() => runOnce(), ms)
        burstTimersRef.current.push(t)
      }
    }

    /** 仅「从后台回到前台」时用 burst，避免首屏因陈旧 localStorage 标记连打 reconnect 导致异常 */
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        wasHiddenRef.current = true
        return
      }
      if (document.visibilityState !== 'visible') return

      if (wasHiddenRef.current) {
        wasHiddenRef.current = false
        const now = Date.now()
        const raw = safeLocalStorageGet(FAST_RETURN_FLAG)
        const ts = raw ? Number(raw) : 0
        const isFastReturnWindow = Number.isFinite(ts) && ts > 0 && now - ts < 120_000
        if (isFastReturnWindow) {
          safeLocalStorageRemove(FAST_RETURN_FLAG)
          // 仅当本地确实存在 WalletConnect session 时，才需要跑 burst + 兜底刷新。
          // 否则在 Binance/OKX 等“非 WC 深链返回”场景里，可能导致首轮返回时不触发预期 UI 更新，
          // 用户体感上就会像“第一次没反应，第二次才配对”。
          const wcSession = hasWalletConnectSession()
          if (!wcSession) {
            runOnce()
            return
          }

          runBurst()
          // 兜底：如果国内网络下 WalletConnect session settle 回来但前端未同步，
          // 用户需要手动刷新才能看到已连接，这里做一次“自动刷新”补偿。
          const reloadRaw = safeLocalStorageGet(HARD_RELOAD_ONCE_KEY)
          const reloadTs = reloadRaw ? Number(reloadRaw) : 0
          const alreadyReloadedRecently =
            Number.isFinite(reloadTs) && reloadTs > 0 && now - reloadTs < 60_000

          if (!alreadyReloadedRecently) {
            const t = setTimeout(() => {
              if (isConnectedRef.current) return
              safeLocalStorageSet(HARD_RELOAD_ONCE_KEY, String(Date.now()))
              // 只在当前域名内刷新，避免破坏其它跳转场景
              if (typeof window !== 'undefined' && window.location?.hostname?.includes('rwaprotocol')) {
                window.location.reload()
              }
            }, 10_500)
            retryTimersRef.current.push(t)
          }
          return
        }
      }
      runOnce()
    }

    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        runOnce()
        return
      }
      onVisibility()
    }

    const onPageHide = () => {
      safeLocalStorageSet(FAST_RETURN_FLAG, String(Date.now()))
    }

    const onFocusOrOnline = () => {
      if (document.visibilityState === 'visible') runOnce()
    }

    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('focus', onFocusOrOnline)
    window.addEventListener('pageshow', onPageShow)
    window.addEventListener('pagehide', onPageHide)
    window.addEventListener('online', onFocusOrOnline)

    // 首屏：只跑一次，不读 burst 标记（避免与 visibility/focus/pageshow 叠加）
    const initial = setTimeout(() => {
      if (document.visibilityState === 'visible') runOnce()
    }, 280)

    return () => {
      clearTimeout(initial)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('focus', onFocusOrOnline)
      window.removeEventListener('pageshow', onPageShow)
      window.removeEventListener('pagehide', onPageHide)
      window.removeEventListener('online', onFocusOrOnline)
      if (timerRef.current) clearTimeout(timerRef.current)
      clearBurstTimers()
      clearRetryTimers()
    }
  }, [reconnect])

  return null
}
