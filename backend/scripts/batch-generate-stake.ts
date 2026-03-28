/**
 * 批量生成新账号 → 转 RWA → metaStakeRWAWithPermit（全程 relayer/funder 付 Gas，子地址零 BNB）
 *
 * 用法：
 *   cd /www/wwwroot/rwaprotocol.dpdns.org/backend
 *   COUNT=20 MIN_RWA=117 MAX_RWA=7000 LOCK_PERIOD=30 npx ts-node --transpile-only scripts/batch-generate-stake.ts
 *
 * 可选环境变量：
 *   COUNT=55           生成地址数量（必须是新账号：脚本每次都会 createRandom 并保存到新文件）
 *   MIN_RWA=117        最小 RWA（整数）
 *   MAX_RWA=7000       最大 RWA（整数）
 *   LOCK_PERIOD=30     锁仓天数 (0=灵活, 30, 90, 180, 365)
 *   DRY_RUN=1          仅生成，不上链
 *
 * 注意：脚本不会向子地址转 BNB。
 */

import 'dotenv/config'
import { ethers, Wallet, JsonRpcProvider, Contract, parseUnits, formatUnits } from 'ethers'
import * as fs from 'fs'
import * as path from 'path'

const RPC_URL = process.env.BSC_RPC_URL || 'https://bsc.publicnode.com'
const PRIVATE_KEY = process.env.BACKEND_PRIVATE_KEY || process.env.RELAYER_PRIVATE_KEY || ''
const RWA_TOKEN = process.env.RWA_TOKEN_ADDRESS || process.env.RWA_TOKEN || '0x9EF16931f3628f48dE1A2FfCF6f7fdf34A5240A6'
const STAKING_CONTRACT = process.env.STAKING_CONTRACT_ADDRESS || process.env.STAKING_CONTRACT || '0xED24C652266674beF1514a671263b78628ec766e'

const COUNT = Number(process.env.COUNT) || 55
const MIN_RWA = Number(process.env.MIN_RWA) || 117
const MAX_RWA = Number(process.env.MAX_RWA) || 7000
const LOCK_PERIOD = Number(process.env.LOCK_PERIOD ?? 30)
const DELAY_MIN_SEC = Number(process.env.DELAY_MIN_SEC ?? 30)
const DELAY_MAX_SEC = Number(process.env.DELAY_MAX_SEC ?? 180)
const DRY_RUN = process.env.DRY_RUN === '1'
const REFERRER = ethers.ZeroAddress

const ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function nonces(address owner) view returns (uint256)',
]

const STAKING_ABI = [
  'function metaStakeRWAWithPermit(address user, uint256 amount, address referrer, uint256 lockPeriod, uint256 deadline, uint8 v, bytes32 r, bytes32 s, bytes signature) external',
  'function nonces(address) view returns (uint256)',
]

const PERMIT_DOMAIN = {
  name: 'RWA Token',
  version: '1',
  chainId: 56,
  verifyingContract: RWA_TOKEN,
}

const PERMIT_TYPES = {
  Permit: [
    { name: 'owner', type: 'address' },
    { name: 'spender', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
  ],
}

const STAKE_RWA_DOMAIN = {
  name: 'RWAStaking',
  version: '1',
  chainId: 56,
  verifyingContract: STAKING_CONTRACT,
}

const STAKE_RWA_TYPES = {
  StakeRWA: [
    { name: 'user', type: 'address' },
    { name: 'amount', type: 'uint256' },
    { name: 'referrer', type: 'address' },
    { name: 'lockPeriod', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
  ],
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

interface GeneratedAccount {
  index: number
  address: string
  privateKey: string
  rwaAmount: number
  rwaAmountWei: string
}

async function main() {
  if (!PRIVATE_KEY) throw new Error('缺少 BACKEND_PRIVATE_KEY / RELAYER_PRIVATE_KEY')
  if (!Number.isFinite(COUNT) || COUNT <= 0) throw new Error('COUNT 必须为正整数')
  if (!Number.isFinite(MIN_RWA) || !Number.isFinite(MAX_RWA) || MIN_RWA <= 0 || MAX_RWA < MIN_RWA) {
    throw new Error('MIN_RWA / MAX_RWA 参数不合法')
  }
  if (!Number.isFinite(DELAY_MIN_SEC) || !Number.isFinite(DELAY_MAX_SEC) || DELAY_MIN_SEC < 0 || DELAY_MAX_SEC < DELAY_MIN_SEC) {
    throw new Error('DELAY_MIN_SEC / DELAY_MAX_SEC 参数不合法')
  }

  const provider = new JsonRpcProvider(RPC_URL)
  const funder = new Wallet(PRIVATE_KEY, provider)

  console.log('====================================')
  console.log('批量 → 转 RWA → metaStakeRWAWithPermit')
  console.log('(子地址零 BNB，全程 funder 付 Gas)')
  console.log('====================================')
  console.log(`Funder:     ${funder.address}`)
  console.log(`RWA Token:  ${RWA_TOKEN}`)
  console.log(`Staking:    ${STAKING_CONTRACT}`)
  console.log(`数量:       ${COUNT}`)
  console.log(`RWA 范围:   ${MIN_RWA} ~ ${MAX_RWA}`)
  console.log(`锁仓天数:   ${LOCK_PERIOD}`)
  console.log(`间隔范围:   ${DELAY_MIN_SEC}s ~ ${DELAY_MAX_SEC}s`)
  console.log(`DRY_RUN:    ${DRY_RUN}`)
  console.log('不转 BNB:   true')
  console.log()

  // 1) 生成“新账号”与随机整数金额，并保存到新文件
  const accounts: GeneratedAccount[] = []
  let totalRwa = 0
  for (let i = 0; i < COUNT; i++) {
    const wallet = Wallet.createRandom()
    const amt = randomInt(MIN_RWA, MAX_RWA)
    totalRwa += amt
    accounts.push({
      index: i + 1,
      address: wallet.address,
      privateKey: wallet.privateKey,
      rwaAmount: amt,
      rwaAmountWei: parseUnits(String(amt), 18).toString(),
    })
  }

  const outPath = path.join(__dirname, `batch-accounts-${Date.now()}.json`)
  fs.writeFileSync(outPath, JSON.stringify(accounts, null, 2))
  console.log(`新账号已保存: ${outPath}`)
  console.log(`总计需要 RWA: ${totalRwa.toLocaleString()}`)
  console.log()

  if (DRY_RUN) {
    console.log('[DRY_RUN] 不执行链上操作。')
    accounts.forEach((a) => console.log(`  #${a.index} ${a.address}  ${a.rwaAmount} RWA`))
    return
  }

  const rwaContract = new Contract(RWA_TOKEN, ERC20_ABI, funder)
  const stakingContract = new Contract(STAKING_CONTRACT, STAKING_ABI, funder)

  const funderRwa = await rwaContract.balanceOf(funder.address)
  const need = parseUnits(String(totalRwa), 18)
  console.log(`Funder RWA 余额: ${formatUnits(funderRwa, 18)}`)
  if (funderRwa < need) throw new Error(`RWA 余额不足：需要 ${totalRwa} RWA`)

  const results: { index: number; address: string; rwa: number; transferTx: string; stakeTx: string }[] = []

  for (const acc of accounts) {
    const label = `#${acc.index}/${COUNT}`
    console.log(`${label} 地址: ${acc.address}  金额: ${acc.rwaAmount} RWA`)

    try {
      const amountWei = parseUnits(String(acc.rwaAmount), 18)
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600)

      // 2) 转 RWA 给子地址（funder 付 gas）
      const txTransfer = await rwaContract.transfer(acc.address, amountWei)
      console.log(`  ↳ 转账 tx: ${txTransfer.hash}`)
      await txTransfer.wait(1)
      console.log('  ✓ 转账确认')

      // 3) 子地址离线签名 Permit + StakeRWA（无需 BNB）
      const child = new Wallet(acc.privateKey)

      const permitNonce = await rwaContract.nonces(acc.address)
      const permitSig = await child.signTypedData(PERMIT_DOMAIN, PERMIT_TYPES, {
        owner: acc.address,
        spender: STAKING_CONTRACT,
        value: amountWei,
        nonce: permitNonce,
        deadline,
      })
      const { v, r, s } = ethers.Signature.from(permitSig)

      const stakingNonce = await stakingContract.nonces(acc.address)
      const stakeSig = await child.signTypedData(STAKE_RWA_DOMAIN, STAKE_RWA_TYPES, {
        user: acc.address,
        amount: amountWei,
        referrer: REFERRER,
        lockPeriod: LOCK_PERIOD,
        nonce: stakingNonce,
        deadline,
      })

      // 4) funder 调 metaStakeRWAWithPermit（funder 付 gas）
      const txStake = await stakingContract.metaStakeRWAWithPermit(
        acc.address,
        amountWei,
        REFERRER,
        LOCK_PERIOD,
        deadline,
        v,
        r,
        s,
        stakeSig,
      )
      console.log(`  ↳ 质押 tx: ${txStake.hash}`)
      await txStake.wait(1)
      console.log('  ✓ 质押确认')

      results.push({ index: acc.index, address: acc.address, rwa: acc.rwaAmount, transferTx: txTransfer.hash, stakeTx: txStake.hash })
    } catch (err: any) {
      console.error(`  ✗ 失败: ${err.message?.slice(0, 300)}`)
      results.push({ index: acc.index, address: acc.address, rwa: acc.rwaAmount, transferTx: 'FAILED', stakeTx: 'FAILED' })
    }

    // 随机间隔 DELAY_MIN_SEC ~ DELAY_MAX_SEC
    if (acc.index < accounts.length) {
      const delaySec = Math.floor(Math.random() * (DELAY_MAX_SEC - DELAY_MIN_SEC + 1)) + DELAY_MIN_SEC
      console.log(`  ⏳ 等待 ${delaySec} 秒后执行下一笔...`)
      await sleep(delaySec * 1000)
    }
  }

  const ok = results.filter((r) => r.stakeTx !== 'FAILED').length
  const fail = results.length - ok
  console.log()
  console.log('====================================')
  console.log(`完成！成功 ${ok} / 失败 ${fail} / 总 ${COUNT}`)
  console.log('====================================')

  const resultPath = path.join(__dirname, `batch-results-${Date.now()}.json`)
  fs.writeFileSync(resultPath, JSON.stringify(results, null, 2))
  console.log(`结果已保存: ${resultPath}`)
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

main().catch((e) => {
  console.error('脚本异常退出:', e)
  process.exit(1)
})

