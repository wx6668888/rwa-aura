/**
 * 从老合约 StakeEvent / RWAStakeEvent 日志收集所有曾质押过的地址（去重）
 *
 * LEGACY_STAKING=0x... FROM_BLOCK=87485780 BSC_RPC_URL=... npx ts-node scripts/migration/01-list-legacy-stakers.ts
 *
 * 输出: scripts/migration/out/stakers.json（含 addresses 数组）
 */
import * as dotenv from 'dotenv';
import * as nodePath from 'path';
dotenv.config({ path: nodePath.resolve(__dirname, '../../.env'), override: true });

import { ethers } from 'ethers';
import * as fs from 'fs';

const STAKE_TOPIC = ethers.id('StakeEvent(address,uint256,address,uint256,uint256,uint256)');
const RWA_TOPIC = ethers.id('RWAStakeEvent(address,uint256,address,uint256,uint256,uint256)');

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function getLogsChunked(
  provider: ethers.Provider,
  filter: { address: string; topics: string[] },
  fromBlock: number,
  toBlock: number,
  chunk: number,
  sleepMs: number
): Promise<ethers.Log[]> {
  const out: ethers.Log[] = [];
  let start = fromBlock;
  while (start <= toBlock) {
    const end = Math.min(start + chunk - 1, toBlock);
    let attempt = 0;
    let part: ethers.Log[] = [];
    for (;;) {
      try {
        part = await provider.getLogs({ ...filter, fromBlock: start, toBlock: end });
        break;
      } catch (e) {
        attempt++;
        if (attempt > 8) throw e;
        await sleep(Math.min(2000 * attempt, 15000));
      }
    }
    out.push(...part);
    start = end + 1;
    if (sleepMs > 0 && start <= toBlock) await sleep(sleepMs);
  }
  return out;
}

function topic1ToAddress(topic: string): string {
  return ethers.getAddress(ethers.dataSlice(topic, 12));
}

async function main() {
  const legacy = (process.env.LEGACY_STAKING || '').trim();
  const rpc = process.env.BSC_RPC_URL || process.env.BSC_MAINNET_RPC_URL || 'https://bsc.publicnode.com';
  const fromBlock = parseInt(process.env.FROM_BLOCK || process.env.STAKING_DEPLOY_BLOCK || '0', 10);
  if (!legacy || !ethers.isAddress(legacy)) throw new Error('Set LEGACY_STAKING（老 Staking 地址，勿填新合约）');
  if (!fromBlock || fromBlock < 1) throw new Error('Set FROM_BLOCK or STAKING_DEPLOY_BLOCK (deployment block)');

  const provider = new ethers.JsonRpcProvider(rpc);
  const latest = await provider.getBlockNumber();
  const chunk = parseInt(process.env.LOG_CHUNK || '800', 10);
  const sleepMs = parseInt(process.env.LOG_CHUNK_SLEEP_MS || '400', 10);

  const addr = ethers.getAddress(legacy);
  const logsA = await getLogsChunked(
    provider,
    { address: addr, topics: [STAKE_TOPIC] },
    fromBlock,
    latest,
    chunk,
    sleepMs
  );
  const logsB = await getLogsChunked(
    provider,
    { address: addr, topics: [RWA_TOPIC] },
    fromBlock,
    latest,
    chunk,
    sleepMs
  );

  const set = new Set<string>();
  for (const log of [...logsA, ...logsB]) {
    if (log.topics.length < 2) continue;
    try {
      set.add(topic1ToAddress(log.topics[1]!).toLowerCase());
    } catch {
      /* skip */
    }
  }

  const addresses = [...set].sort().map((a) => ethers.getAddress(a));
  const outDir = nodePath.join(__dirname, 'out');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = nodePath.join(outDir, 'stakers.json');
  fs.writeFileSync(
    outPath,
    JSON.stringify({ meta: { legacy, fromBlock, toBlock: latest, count: addresses.length }, addresses }, null, 2),
    'utf8'
  );
  console.log('Wrote', outPath, 'count=', addresses.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
