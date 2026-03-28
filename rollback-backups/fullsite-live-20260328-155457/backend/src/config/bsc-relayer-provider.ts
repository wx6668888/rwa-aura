import { FallbackProvider, JsonRpcProvider } from 'ethers';

/** 与 BscScan 主网一致；多节点降低「只连到一个异常 RPC 却拿到假 hash」的概率 */
const BSC_DEFAULT_RPCS = [
  'https://bsc-dataseed.binance.org',
  'https://bsc-dataseed1.binance.org',
  'https://bsc-dataseed2.binance.org',
  'https://bsc-dataseed3.binance.org',
  'https://bsc-dataseed4.binance.org',
  'https://bsc.publicnode.com',
];

function collectRpcUrls(): string[] {
  const out: string[] = [];
  const push = (u: string) => {
    const t = u.trim().replace(/\/$/, '');
    if (t && !out.includes(t)) out.push(t);
  };
  if (process.env.BSC_RPC_URL) push(process.env.BSC_RPC_URL);
  if (process.env.BSC_RPC_URLS) {
    for (const part of process.env.BSC_RPC_URLS.split(',')) push(part);
  }
  for (const d of BSC_DEFAULT_RPCS) push(d);
  return out;
}

/** 供日志 / 健康检查 */
export function getBscRelayerRpcUrlList(): string[] {
  return collectRpcUrls();
}

/**
 * 中继发交易、读 nonce 共用：quorum=1，多 URL 轮询/容错。
 * 勿与「只读监控」共用单点 RPC 配置混为一谈。
 */
export const bscRelayerProvider = (() => {
  const urls = collectRpcUrls();
  const configs = urls.map((url, i) => ({
    provider: new JsonRpcProvider(url, 56),
    priority: i + 1,
    stallTimeout: 2000,
    weight: 1,
  }));
  return new FallbackProvider(configs, 56, { quorum: 1 });
})();
