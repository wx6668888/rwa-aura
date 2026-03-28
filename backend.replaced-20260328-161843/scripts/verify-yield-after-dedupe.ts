/**
 * 验证：对指定用户/指定结算窗口，用 PreciseYieldCalculator 计算的收益
 * 是否符合“去重后的快照本金口径”，避免再次出现倍数放大。
 *
 * 只做计算，不写链，不写数据库。
 *
 * 用法：
 *   cd backend
 *   npx ts-node scripts/verify-yield-after-dedupe.ts --user <0x...> --toTime <unixSeconds>
 */
import dotenv from 'dotenv'
import path from 'path'
import { ethers } from 'ethers'
import { PreciseYieldCalculator } from '../src/services/PreciseYieldCalculator'

dotenv.config({ path: path.join(__dirname, '../.env') })

function argStr(name: string, fallback: string): string {
  const idx = process.argv.indexOf(name)
  if (idx === -1) return fallback
  const v = process.argv[idx + 1]
  return v ?? fallback
}

function argNum(name: string, fallback: number): number {
  const idx = process.argv.indexOf(name)
  if (idx === -1) return fallback
  const v = parseInt(process.argv[idx + 1] ?? '', 10)
  return Number.isFinite(v) ? v : fallback
}

function shanghaiLocal8amUnix(y: number, m: number, d: number): number {
  return Math.floor(Date.UTC(y, m - 1, d, 0, 0, 0) / 1000)
}

function getShanghaiYMDFromUnix(nowSec: number): { y: number; m: number; d: number } {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const s = fmt.format(new Date(nowSec * 1000))
  const [y, m, d] = s.split('-').map((x) => parseInt(x, 10))
  return { y, m, d }
}

function getLastCompletedShanghai8AM(nowSec: number): number {
  const { y, m, d } = getShanghaiYMDFromUnix(nowSec)
  const today8 = shanghaiLocal8amUnix(y, m, d)
  if (nowSec < today8) return today8 - 86400
  return today8
}

async function main() {
  const user = argStr('--user', '')
  if (!user) throw new Error('--user is required')

  const nowSec = Math.floor(Date.now() / 1000)
  const toTime = argNum('--toTime', getLastCompletedShanghai8AM(nowSec))
  const fromTime = toTime - 86400

  const calc = new PreciseYieldCalculator()

  console.log('=== PreciseYieldCalculator verify ===')
  console.log({ user, fromTime, toTime, fromISO: new Date(fromTime * 1000).toISOString(), toISO: new Date(toTime * 1000).toISOString() })

  // RWA bucket (assetType='RWA')：amount 已经是合约内部 18 decimals
  const rwaRes = await calc.calculateYield(user, 'RWA', fromTime, toTime)
  const usdtRes = await calc.calculateYield(user, 'USDT', fromTime, toTime)

  const rwaHuman = ethers.formatEther(rwaRes.totalYield)
  const usdtHuman = ethers.formatEther(usdtRes.totalYield)

  console.log('RWA yield (human 18 decimals):', rwaHuman)
  console.log('USDT yield (human 18 decimals):', usdtHuman)

  console.log('RWA details sample:', (rwaRes.details ?? []).slice(0, 1))
  console.log('USDT details sample:', (usdtRes.details ?? []).slice(0, 1))
}

main().catch((e) => {
  console.error('Verify failed:', e)
  process.exit(1)
})

