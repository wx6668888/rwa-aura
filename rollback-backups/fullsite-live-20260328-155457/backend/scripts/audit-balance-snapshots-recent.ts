/**
 * 审计：最近 N 笔 stake_events 是否各自产生了且仅产生 1 条 stake 快照
 *
 * 目的：确保“以后不会再重复写入 balance_snapshots”，从而明早日结不会再偏多。
 *
 * 用法：
 *   cd backend
 *   npx ts-node scripts/audit-balance-snapshots-recent.ts --limit 100
 */
import dotenv from 'dotenv'
import path from 'path'
import mysql from 'mysql2/promise'

dotenv.config({ path: path.join(__dirname, '../.env') })

function argInt(name: string, fallback: number): number {
  const idx = process.argv.indexOf(name)
  if (idx === -1) return fallback
  const v = parseInt(process.argv[idx + 1] ?? '', 10)
  return Number.isFinite(v) ? v : fallback
}

async function main() {
  const limit = argInt('--limit', 100)

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'rwa_protocol_v2',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'rwa_protocol_v2',
  })

  const [badRows] = await conn.query<any[]>(
    `
    SELECT
      se.id,
      se.event_type AS asset_type,
      se.user_address,
      se.amount,
      se.lock_period,
      se.timestamp,
      se.tx_hash,
      COUNT(bs.id) AS snapshot_count
    FROM (
      SELECT *
      FROM stake_events
      ORDER BY block_number DESC
      LIMIT ?
    ) se
    LEFT JOIN balance_snapshots bs
      ON bs.tx_hash = se.tx_hash
     AND LOWER(bs.user_address) = LOWER(se.user_address)
     AND bs.asset_type = se.event_type
     AND bs.event_type = 'stake'
     AND bs.timestamp = se.timestamp
     AND bs.amount = se.amount
     AND bs.balance_type = CASE
       WHEN se.lock_period = 0 THEN 'flexible'
       ELSE CONCAT('locked_', se.lock_period)
     END
    GROUP BY se.id
    HAVING COUNT(bs.id) != 1
    ORDER BY snapshot_count DESC, se.id ASC
    `,
    [limit],
  )

  const [okCountRows] = await conn.query<any[]>(
    `
    SELECT
      SUM(CASE WHEN t.snapshot_count = 1 THEN 1 ELSE 0 END) AS ok,
      SUM(CASE WHEN t.snapshot_count != 1 THEN 1 ELSE 0 END) AS bad
    FROM (
      SELECT se.id, COUNT(bs.id) AS snapshot_count
      FROM (
        SELECT *
        FROM stake_events
        ORDER BY block_number DESC
        LIMIT ?
      ) se
      LEFT JOIN balance_snapshots bs
        ON bs.tx_hash = se.tx_hash
       AND LOWER(bs.user_address) = LOWER(se.user_address)
       AND bs.asset_type = se.event_type
       AND bs.event_type = 'stake'
       AND bs.timestamp = se.timestamp
       AND bs.amount = se.amount
       AND bs.balance_type = CASE
         WHEN se.lock_period = 0 THEN 'flexible'
         ELSE CONCAT('locked_', se.lock_period)
       END
      GROUP BY se.id
    ) t
    `,
    [limit],
  )

  console.log('=== Recent snapshot idempotency check ===')
  console.log(`limit=${limit}`)
  console.log(okCountRows?.[0] ?? {})
  console.log('bad sample (first 30):')
  console.dir(badRows?.slice(0, 30) ?? [], { depth: null })

  await conn.end()
}

main().catch((e) => {
  console.error('Audit failed:', e)
  process.exit(1)
})

