/**
 * 把 DB(referral_bindings) 中的推荐关系写回链上（StakingContract.setReferrer）。
 *
 * 使用方式（示例）：
 *  1) 导出 owner 私钥并设置 RPC/DB：
 *     SETREFERRERS_PRIVATE_KEY=0x... BSC_RPC_URL=https://... DB_HOST=... DB_USER=... DB_PASSWORD=... DB_NAME=...
 *  2) 运行：
 *     node update-referrers.js --dry-run
 *     node update-referrers.js --limit 50 --sleepMs 1500
 */

const dotenv = require('dotenv')
const fs = require('fs')

// 优先加载 backend/.env（通常包含 DB & RPC 配置），找不到再退回根目录 .env
for (const p of ['backend/.env', '.env']) {
  try {
    if (fs.existsSync(p)) {
      dotenv.config({ path: p })
      break
    }
  } catch {
    /* ignore */
  }
}

const { ethers } = require('ethers')
const mysql = require('mysql2/promise')

function getArg(name, fallback) {
  const prefix = `--${name}=`
  const found = process.argv.find((a) => a.startsWith(prefix))
  if (found) return found.slice(prefix.length)
  const only = process.argv.includes(`--${name}`)
  return only ? true : fallback
}

function normalizeAddr(addr) {
  const s = String(addr || '').trim()
  if (!ethers.isAddress(s)) return null
  return ethers.getAddress(s)
}

async function main() {
  const stakingAddr = String(getArg('staking', process.env.STAKING_CONTRACT || process.env.STAKING_CONTRACT_ADDRESS || ''));
  if (!stakingAddr) throw new Error('Missing staking contract address: pass --staking=... or set STAKING_CONTRACT/STAKING_CONTRACT_ADDRESS')

  const rpcUrl = String(getArg('rpc', process.env.BSC_RPC_URL || process.env.BSC_MAINNET_RPC_URL || ''))
  if (!rpcUrl) throw new Error('Missing RPC url: pass --rpc=... or set BSC_RPC_URL/BSC_MAINNET_RPC_URL')

  const dryRun = Boolean(getArg('dry-run', false) === true || process.argv.includes('--dry-run'))

  const privateKey =
    String(
      getArg('pk', process.env.SETREFERRERS_PRIVATE_KEY || process.env.PRIVATE_KEY || process.env.BACKEND_PRIVATE_KEY || '')
    )
  // dry-run 不发送交易，不需要 owner 私钥；正式写入才需要
  if (!dryRun && (!privateKey || !privateKey.startsWith('0x'))) {
    throw new Error('Missing owner private key: set SETREFERRERS_PRIVATE_KEY (recommended) or PRIVATE_KEY')
  }

  // Basic skip list: stolen referrer addresses
  const stolenAddrRaw = process.env.SKIP_REFERRER_ADDRESS || '0x08ea66321c4dd47468c3adc55d06c5de7129a292'
  const stolenAddrs = String(stolenAddrRaw)
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => normalizeAddr(x))
    .filter(Boolean)

  const start = Number(getArg('start', 0) || 0)
  const limit = process.env.IMPORT_LIMIT ? Number(process.env.IMPORT_LIMIT) : Number(getArg('limit', '0') || 0)
  const sleepMs = Number(getArg('sleepMs', '1200') || 1200)

  const dbHost = String(getArg('dbHost', process.env.DB_HOST || 'localhost'))
  const dbUser = String(getArg('dbUser', process.env.DB_USER || ''))
  const dbPassword = String(getArg('dbPassword', process.env.DB_PASSWORD || ''))
  const dbName = String(getArg('dbName', process.env.DB_NAME || ''))
  if (!dbUser || !dbName) {
    throw new Error('Missing DB config: set DB_USER and DB_NAME (optionally DB_HOST/DB_PASSWORD)')
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl)
  const signerOrProvider = privateKey && privateKey.startsWith('0x') ? new ethers.Wallet(privateKey, provider) : provider

  // Minimal ABI: 不依赖本地 artifacts，直接按链上函数名调用
  // 如果你的链上函数签名不同，请把函数参数顺序/类型告诉我再调整。
  const STAKING_ABI = [
    'function setReferrer(address user, address referrer) external',
    'function getReferralInfo(address userAddress) external view returns (address referrer, bool hasReferrer)',
  ]
  const staking = new ethers.Contract(stakingAddr, STAKING_ABI, signerOrProvider)

  const conn = await mysql.createConnection({
    host: dbHost,
    user: dbUser,
    password: dbPassword,
    database: dbName,
  })

  const whereClause = '1=1'
  const sql = `SELECT user_address, referrer_address FROM referral_bindings WHERE ${whereClause} ORDER BY timestamp ASC`
  const [rows] = await conn.execute(sql)
  const bindings = Array.isArray(rows) ? rows : []

  console.log(`找到 ${bindings.length} 个推荐关系（从 DB 读取）`)
  console.log(`参数：start=${start} limit=${limit || '∞'} dryRun=${dryRun} sleepMs=${sleepMs}`)
  if (start >= bindings.length) {
    console.log('start 超出范围，退出')
    await conn.end()
    return
  }

  const slice = limit > 0 ? bindings.slice(start, start + limit) : bindings.slice(start)

  let ok = 0
  let skip = 0
  let fail = 0

  for (let i = 0; i < slice.length; i++) {
    const { user_address, referrer_address } = slice[i] || {}
    const user = normalizeAddr(user_address)
    const ref = normalizeAddr(referrer_address)
    if (!user || !ref) {
      fail++
      console.warn(`[${i + 1}/${slice.length}] 无效地址 user=${user_address} ref=${referrer_address}`)
      continue
    }
    if (stolenAddrs.some((x) => x.toLowerCase() === ref.toLowerCase())) {
      skip++
      console.log(`[${i + 1}/${slice.length}] 跳过 ${user.slice(0, 10)}... -> ${ref.slice(0, 10)}... (skip list)`)
      continue
    }
    if (user.toLowerCase() === ref.toLowerCase()) {
      skip++
      console.log(`[${i + 1}/${slice.length}] 跳过 ${user.slice(0, 10)}... 自荐为自己`)
      continue
    }

    try {
      // 以链上为准：
      // 1) 若链上已有推荐关系（hasReferrer=true 且非 0），则无论与 DB 是否一致都跳过（避免“改错人”）
      // 2) 仅当链上没有推荐关系（hasReferrer=false 或 referrer==0x0）时才写入
      let onchainRef = ethers.ZeroAddress
      let has = false
      let chainReadOk = true
      let chainReadErr = ''
      try {
        const info = await staking.getReferralInfo(user)
        onchainRef = String(info?.[0] || ethers.ZeroAddress)
        has = Boolean(info?.[1])
      } catch (e) {
        chainReadOk = false
        chainReadErr = e?.error?.message || e?.message || String(e)
      }

      if (!chainReadOk) {
        fail++
        console.warn(
          `[${i + 1}/${slice.length}] 链上读取 getReferralInfo 失败，跳过 ${user.slice(0, 10)}... -> ${ref.slice(
            0,
            10
          )}... err=${String(chainReadErr).slice(0, 80)}`
        )
        continue
      }

      const need = !has || !onchainRef || onchainRef === ethers.ZeroAddress

      if (!need) {
        skip++
        console.log(`[${i + 1}/${slice.length}] 已有推荐关系，跳过 ${user.slice(0, 10)}... -> ${ref.slice(0, 10)}...`)
        continue
      }

      console.log(`[${i + 1}/${slice.length}] setReferrer ${user.slice(0, 10)}... -> ${ref.slice(0, 10)}...`)
      if (!dryRun) {
        const tx = await staking.setReferrer(user, ref)
        await tx.wait()
      }
      ok++
    } catch (e) {
      fail++
      const msg = e?.error?.message || e?.message || String(e)
      console.warn(`[${i + 1}/${slice.length}] 失败 ${user.slice(0, 10)}... -> ${ref.slice(0, 10)}... err=${msg.slice(0, 90)}`)
    }

    if (sleepMs > 0) await new Promise((r) => setTimeout(r, sleepMs))
  }

  await conn.end()
  console.log(`完成：成功=${ok} 跳过=${skip} 失败=${fail}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
