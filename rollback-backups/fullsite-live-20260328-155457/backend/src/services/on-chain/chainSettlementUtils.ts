import type { Log, Provider } from 'ethers';

/** 二分查找 timestamp <= targetTs 的最近区块号 */
export async function findBlockAtOrBefore(
  provider: Provider,
  targetTs: number,
  maxBlock?: number
): Promise<number> {
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
