import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import mysql from 'mysql2/promise'

dotenv.config({ path: resolveEnvPath() })

function resolveEnvPath() {
  // backend/scripts -> repo_root/.env
  return path.resolve(__dirname, '../../.env')
}

async function main() {
  const host = String(process.env.DB_HOST || '127.0.0.1').trim()
  const port = parseInt(String(process.env.DB_PORT || '3306'), 10)
  const user = String(process.env.DB_USER || 'rwa_user').trim()
  const password = String(process.env.DB_PASSWORD || '').trim()
  const database = String(process.env.DB_NAME || 'rwa_protocol').trim()

  const sqlFile = path.resolve(__dirname, '../config/migrations/003_tron_topup_tables.sql')
  const sql = fs.readFileSync(sqlFile, 'utf8')

  const conn = await mysql.createConnection({
    host,
    port,
    user,
    password,
    database,
    multipleStatements: true,
  })

  try {
    console.log(`[apply] running: ${path.basename(sqlFile)}`)
    await conn.query(sql)

    const [addrRows] = await conn.query(
      `SELECT COUNT(*) as c FROM tron_deposit_addresses`
    )
    const [orderRows] = await conn.query(
      `SELECT COUNT(*) as c FROM tron_deposit_orders`
    )
    const [txRows] = await conn.query(
      `SELECT COUNT(*) as c FROM tron_deposit_transfers`
    )

    console.log('[apply] ok')
    console.log(`  tron_deposit_addresses: ${(addrRows as any[])[0]?.c ?? 0}`)
    console.log(`  tron_deposit_orders: ${(orderRows as any[])[0]?.c ?? 0}`)
    console.log(`  tron_deposit_transfers: ${(txRows as any[])[0]?.c ?? 0}`)
  } finally {
    await conn.end()
  }
}

main().catch((e) => {
  console.error('[apply] failed:', e?.message || e)
  process.exit(1)
})

