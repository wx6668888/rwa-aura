import { dataSlice, getAddress, id, type Provider } from 'ethers';
import { getLogsChunked } from './chainSettlementUtils';

const STAKE_EVENT_TOPIC = id('StakeEvent(address,uint256,address,uint256,uint256,uint256)');
const RWA_STAKE_EVENT_TOPIC = id('RWAStakeEvent(address,uint256,address,uint256,uint256,uint256)');

const DEFAULT_CHUNK = 4000;

function topicToAddress(topic: string): string {
  return getAddress(dataSlice(topic, 12));
}

/**
 * 从质押合约 StakeEvent / RWAStakeEvent 日志收集曾质押过的地址（不依赖数据库）
 */
export async function discoverStakerAddressesFromChain(params: {
  provider: Provider;
  stakingContractAddress: string;
  fromBlock: number;
  toBlock: number;
  logChunkSize?: number;
}): Promise<string[]> {
  const { provider, stakingContractAddress, fromBlock, toBlock } = params;
  const chunk = params.logChunkSize ?? DEFAULT_CHUNK;
  const addr = getAddress(stakingContractAddress);

  const [logsStake, logsRwa] = await Promise.all([
    getLogsChunked(
      provider,
      { address: addr, topics: [STAKE_EVENT_TOPIC] },
      fromBlock,
      toBlock,
      chunk
    ),
    getLogsChunked(
      provider,
      { address: addr, topics: [RWA_STAKE_EVENT_TOPIC] },
      fromBlock,
      toBlock,
      chunk
    ),
  ]);

  const set = new Set<string>();
  for (const log of [...logsStake, ...logsRwa]) {
    if (log.topics.length < 2) continue;
    try {
      set.add(topicToAddress(log.topics[1]).toLowerCase());
    } catch {
      /* skip malformed */
    }
  }
  return [...set];
}
