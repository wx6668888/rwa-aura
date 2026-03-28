/**
 * 用 MySQL referral_bindings 覆盖/补齐 bundles 里的推荐关系（referrer）。
 *
 * 为什么需要：
 * - 老合约链上 referrer 可能缺失（历史导入漏写）
 * - DB 中 referral_bindings 更完整（每笔质押都带推荐人，且已做去重/修复）
 *
 * 行为：
 * - 对每个 bundle（out/bundles/*.json）：
 *   - 取该 user 在 referral_bindings 中“最早的一条”作为最终 referrer
 *   - 覆盖 uInfo[4] 与 rInfo[3]
 *   - 若 DB 没有记录，则保持 bundle 原值不变
 *
 * 运行：
 *   DB_HOST=... DB_USER=... DB_PASSWORD=... DB_NAME=... \
 *   npx ts-node scripts/migration/02b-merge-referrers-from-db.ts
 *
 * 可选：
 *   BUNDLES_DIR=...  （默认 scripts/migration/out/bundles）
 */
import * as dotenv from 'dotenv'
import * as nodePath from 'path'
import * as fs from 'fs'
import * as path from 'path'
import mysql from 'mysql2/promise'
import { ethers } from 'ethers'

dotenv.config({ path: nodePath.resolve(__dirname, '../../backend/.env'), override: false })

function normAddr(x: unknown): string | null {
  const s = String(x || '').trim()
  if (!ethers.isAddress(s)) return null
  return ethers.getAddress(s)
}

async function main() {
  const bundlesDir = process.env.BUNDLES_DIR || path.join(__dirname, 'out', 'bundles')
  if (!fs.existsSync(bundlesDir)) throw new Error(`Missing bundles dir ${bundlesDir}`)

  const host = process.env.DB_HOST || 'localhost'
  const port = parseInt(process.env.DB_PORT || '3306', 10)
  const user = process.env.DB_USER
  const password = process.env.DB_PASSWORD
  const database = process.env.DB_NAME
  if (!user || !database) throw new Error('Missing DB config: DB_USER / DB_NAME')

  const conn = await mysql.createConnection({ host, port, user, password, database })

  const files = fs.readdirSync(bundlesDir).filter((f) => f.endsWith('.json')).sort()
  let ok = 0
  let skippedNoDb = 0
  let skippedInvalid = 0

  for (const fn of files) {
    const fp = path.join(bundlesDir, fn)
    let j: any
    try {
      j = JSON.parse(fs.readFileSync(fp, 'utf8'))
    } catch {
      skippedInvalid++
      continue
    }
    const userAddr = normAddr(j?.migrationImportUserBundleArgs?.user || j?.meta?.user || '')
    if (!userAddr) {
      skippedInvalid++
      continue
    }

    // 取最早绑定（timestamp 最小）
    const [rows] = await conn.execute<any[]>(
      `SELECT referrer_address
       FROM referral_bindings
       WHERE LOWER(user_address)=LOWER(?)
         AND referrer_address IS NOT NULL
         AND TRIM(referrer_address) <> ''
       ORDER BY timestamp ASC
       LIMIT 1`,
      [userAddr]
    )
    const ref = normAddr(rows?.[0]?.referrer_address)
    if (!ref || ref === ethers.ZeroAddress || ref.toLowerCase() === userAddr.toLowerCase()) {
      skippedNoDb++
      continue
    }

    const args = j.migrationImportUserBundleArgs
    if (!args?.uInfo || !args?.rInfo) {
      skippedInvalid++
      continue
    }

    // uInfo[4] = referrer, rInfo[3] = referrer
    args.uInfo[4] = ref
    args.rInfo[3] = ref

    // 同步 readable（若存在）
    if (j.readable?.userInfo) j.readable.userInfo.referrer = ref
    if (j.readable?.rwaInfo) j.readable.rwaInfo.referrer = ref

    fs.writeFileSync(fp, JSON.stringify(j, null, 2), 'utf8')
    ok++
  }

  await conn.end()
  console.log(`Merged referrers into bundles: ok=${ok} skippedNoDb=${skippedNoDb} skippedInvalid=${skippedInvalid} dir=${bundlesDir}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

