import type { Log, Provider } from 'ethers';

/** 二分查找 timestamp <= targetTs 的最近区块号 */
export async function findBlockAtOrBefore(
  provider: Provider,
  targetTs: number,
  maxBlock?: number
): Promise<number> {
  // Some RPC providers (e.g. QuickNode) enforce strict request-per-second limits.
  // This function may call `eth_getBlockByNumber` multiple times in a tight loop (binary search).
  // Add a small delay between requests to avoid tripping the RPC rate limit.
  // 默认 500ms（即每秒最多 2 次），可用环境变量覆盖。
  const throttleMs = Number(process.env.SETTLEMENT_FIND_BLOCK_THROTTLE_MS || '500');
  const latest = maxBlock ?? (await provider.getBlockNumber());
  let low = 0;
  let high = latest;

  while (low < high) {
    const mid = Math.floor((low + high + 1) / 2);
    const b = await provider.getBlock(mid);
    if (!b) {
      high = mid - 1;
      continue;
    }
    if (b.timestamp <= targetTs) {
      low = mid;
    } else {
      high = mid - 1;
    }

    if (throttleMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, throttleMs));
    }
  }
  return low;
}

/** BSC / 公链 getLogs 常限制区块跨度，分段拉取 */
export async function getLogsChunked(
  provider: Provider,
  filter: { address: string; topics: (string | null)[] },
  fromBlock: number,
  toBlock: number,
  chunkSize: number
): Promise<Log[]> {
  const out: Log[] = [];
  let start = fromBlock;
  while (start <= toBlock) {
    const end = Math.min(start + chunkSize - 1, toBlock);
    const part = await provider.getLogs({
      ...filter,
      fromBlock: start,
      toBlock: end,
    });
    out.push(...part);
    start = end + 1;
  }
  return out;
}
