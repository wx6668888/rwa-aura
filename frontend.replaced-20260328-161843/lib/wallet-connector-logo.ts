import type { Connector } from 'wagmi'

function lc(s: unknown) {
  if (s == null) return ''
  if (typeof s === 'string') return s.toLowerCase()
  // 有些连接器运行时可能不是字符串（对象/函数等），这里兜底避免崩溃
  return String(s).toLowerCase()
}

function svgDataUri(svg: string) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

function badgeSvg({
  bg,
  fg = '#ffffff',
  label,
  sublabel = '',
  shape = '',
}: {
  bg: string
  fg?: string
  label: string
  sublabel?: string
  shape?: string
}) {
  return svgDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
      <rect width="96" height="96" rx="24" fill="${bg}"/>
      ${shape}
      <text x="48" y="${sublabel ? '42' : '54'}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${sublabel ? '28' : '34'}" font-weight="700" fill="${fg}">${label}</text>
      ${sublabel ? `<text x="48" y="67" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" font-weight="700" fill="${fg}" opacity="0.9">${sublabel}</text>` : ''}
    </svg>
  `.replace(/\s+/g, ' ').trim())
}

const LOCAL_WALLET_ICONS = {
  metamask: badgeSvg({
    bg: '#f6851b',
    label: 'M',
    sublabel: 'META',
    shape:
      '<path d="M24 26 40 15l8 18-11 8-13-7zm48 0L56 15l-8 18 11 8 13-7zM29 58l13-12 6 6-11 11zm38 0L54 46l-6 6 11 11z" fill="#fff" opacity=".18"/>',
  }),
  walletconnect: badgeSvg({
    bg: '#3b99fc',
    label: 'WC',
    shape:
      '<path d="M28 34c6-6 15-9 20-9s14 3 20 9" stroke="#fff" stroke-width="6" stroke-linecap="round" fill="none"/><path d="M36 46c3-3 8-5 12-5s9 2 12 5" stroke="#fff" stroke-width="6" stroke-linecap="round" fill="none"/>',
  }),
  trustwallet: badgeSvg({
    bg: '#3375bb',
    label: 'TW',
    shape:
      '<path d="M48 18 70 26v15c0 16-10 28-22 37C36 69 26 57 26 41V26z" fill="#fff" opacity=".18"/>',
  }),
  okx: badgeSvg({
    bg: '#111111',
    fg: '#ffffff',
    label: 'OKX',
    shape:
      '<g fill="#fff" opacity=".14"><rect x="17" y="18" width="14" height="14" rx="3"/><rect x="33" y="18" width="14" height="14" rx="3"/><rect x="49" y="18" width="14" height="14" rx="3"/><rect x="65" y="18" width="14" height="14" rx="3"/></g>',
  }),
  binance: badgeSvg({
    bg: '#0f0f0f',
    fg: '#f3ba2f',
    label: 'BNB',
    shape:
      '<g fill="#f3ba2f" opacity=".18"><path d="M48 18 60 30 48 42 36 30z"/><path d="M30 36 39 45 30 54 21 45z"/><path d="M66 36 75 45 66 54 57 45z"/><path d="M48 48 60 60 48 72 36 60z"/></g>',
  }),
  rainbow: badgeSvg({
    bg: '#6d28d9',
    label: 'RB',
    shape:
      '<path d="M22 39c7-10 16-15 26-15s19 5 26 15" stroke="#f472b6" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M28 47c5-7 12-10 20-10s15 3 20 10" stroke="#60a5fa" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M34 55c4-4 9-6 14-6s10 2 14 6" stroke="#facc15" stroke-width="6" fill="none" stroke-linecap="round"/>',
  }),
  coinbase: badgeSvg({
    bg: '#0052ff',
    label: 'CB',
    shape:
      '<circle cx="48" cy="48" r="24" fill="#fff" opacity=".16"/><circle cx="48" cy="48" r="12" fill="#0052ff" opacity=".9"/>',
  }),
  rabby: badgeSvg({
    bg: '#ff6b35',
    label: 'R',
    sublabel: 'RABBY',
  }),
  phantom: badgeSvg({
    bg: '#6b3df4',
    label: 'P',
    sublabel: 'PHANTOM',
  }),
  safe: badgeSvg({
    bg: '#12b3a8',
    label: 'S',
    sublabel: 'SAFE',
  }),
  tokenpocket: badgeSvg({
    bg: '#4a90e2',
    label: 'TP',
  }),
  bitget: badgeSvg({
    bg: '#00d5c9',
    fg: '#002b36',
    label: 'BG',
  }),
  wallet: badgeSvg({
    bg: '#1f2937',
    label: 'W',
    sublabel: 'WALLET',
  }),
} as const

/**
 * 钱包连接器展示用 Logo。优先使用连接器自带的本地/data URL，
 * 否则回退到内置 SVG，避免依赖第三方远程图标。
 */
export function getWalletConnectorIconUrl(connector: Connector | undefined): string | null {
  if (!connector) return null

  const c = connector as Connector & { icon?: string; iconUrl?: string; rdns?: string }
  for (const k of [c.icon, c.iconUrl]) {
    if (typeof k === 'string' && (/^(\/|data:image\/|blob:)/i.test(k) || /^https?:\/\/localhost[:/]/i.test(k))) {
      return k
    }
  }

  const id = lc((c as any).id)
  const name = lc((c as any).name)
  const rdns = lc((c as any).rdns)
  const hay = `${id} ${name} ${rdns}`

  if (/\bmetamask|io\.metamask\b/.test(hay)) {
    return LOCAL_WALLET_ICONS.metamask
  }
  if (/\bwalletconnect|wallet_connect|\bwc\b/.test(hay)) {
    return LOCAL_WALLET_ICONS.walletconnect
  }
  if (/\btrust|trustwallet|com\.trustwallet\b/.test(hay)) {
    return LOCAL_WALLET_ICONS.trustwallet
  }
  if (/\bokx|okex|com\.okex|okexwallet\b/.test(hay)) {
    return LOCAL_WALLET_ICONS.okx
  }
  if (/\bbinance|bnb\s*chain|com\.binance\b/.test(hay)) {
    return LOCAL_WALLET_ICONS.binance
  }
  if (/\brainbow|rainbowkit\b/.test(hay)) {
    return LOCAL_WALLET_ICONS.rainbow
  }
  if (/\bcoinbase|cbwallet|com\.coinbase\b/.test(hay)) {
    return LOCAL_WALLET_ICONS.coinbase
  }
  if (/\brabby|io\.rabby\b/.test(hay)) {
    return LOCAL_WALLET_ICONS.rabby
  }
  if (/\bphantom|app\.phantom\b/.test(hay)) {
    return LOCAL_WALLET_ICONS.phantom
  }
  if (/\bsafe|safe\.global|app\.safe\b/.test(hay)) {
    return LOCAL_WALLET_ICONS.safe
  }
  if (/\btokenpocket\b/.test(hay)) {
    return LOCAL_WALLET_ICONS.tokenpocket
  }
  if (/\bbitget|com\.bitget\b/.test(hay)) {
    return LOCAL_WALLET_ICONS.bitget
  }

  return LOCAL_WALLET_ICONS.wallet
}
