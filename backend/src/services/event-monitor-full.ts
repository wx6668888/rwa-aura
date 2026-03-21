import dotenv from 'dotenv'
import logger from '../utils/logger'
import { EventMonitor } from './EventMonitor'
import { getPool } from '../config/database.config'
import { ethers } from 'ethers'
import { NodeLevelService } from './NodeLevelService'

dotenv.config()

/**
 * Standalone EventMonitor runner (no HTTP server).
 *
 * Why this exists:
 * - Production API process already runs EventMonitor, but some deployments
 *   prefer running monitor as a separate PM2 process.
 * - The previous "event-monitor-full.ts" script was a SQLite-only prototype
 *   and doesn't compile against the current MySQL services.
 */
async function main() {
  logger.info('[Monitor] starting standalone EventMonitor...')

  // Ensure DB is reachable early, so PM2 logs show the real reason.
  await getPool().getConnection()
  logger.info('[Monitor] database connection OK')

  const rpcUrl = process.env.BSC_RPC_URL || process.env.BSC_TESTNET_RPC_URL
  const stakingContractAddress = process.env.STAKING_CONTRACT_ADDRESS

  if (!rpcUrl) throw new Error('[Monitor] missing BSC_RPC_URL / BSC_TESTNET_RPC_URL')
  if (!stakingContractAddress) throw new Error('[Monitor] missing STAKING_CONTRACT_ADDRESS')

  const monitor = new EventMonitor({
    rpcUrl,
    stakingContractAddress,
    confirmationBlocks: parseInt(process.env.CONFIRMATION_BLOCKS || '12'),
    pollInterval: parseInt(process.env.POLL_INTERVAL || '5000'),
  })

  // Optional: node level sync helper (used by monitor for some updates)
  const provider = new ethers.JsonRpcProvider(rpcUrl)
  const backendPk = process.env.BACKEND_PRIVATE_KEY
  if (backendPk) {
    const backendWallet = new ethers.Wallet(backendPk, provider)
    const NODE_LEVEL_STAKING_ABI = [
      'function getUserStakeInfo(address userAddress) external view returns (uint256, uint256, uint256, uint256, address, uint8, uint256)',
      'function updateNodeLevel(address userAddress, uint8 newLevel) external',
    ]
    const nodeLevelService = new NodeLevelService({
      stakingContractAddress,
      stakingContractABI: NODE_LEVEL_STAKING_ABI,
      provider,
      backendWallet,
    })
    monitor.setNodeLevelService(nodeLevelService)
    logger.info('[Monitor] NodeLevelService enabled')
  } else {
    logger.warn('[Monitor] BACKEND_PRIVATE_KEY missing, NodeLevelService disabled')
  }

  await monitor.start()
  logger.info('[Monitor] EventMonitor started')

  // Keep process alive.
  process.stdin.resume()
}

main().catch((err) => {
  logger.error('[Monitor] fatal:', err)
  process.exit(1)
})

