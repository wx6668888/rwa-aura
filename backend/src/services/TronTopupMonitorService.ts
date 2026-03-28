import logger from '../utils/logger'
import { query, transaction } from '../config/database.config'
import { ethers } from 'ethers'
import { getBscRpcUrl } from '../config/rpc-url'
import { BSC_MAINNET_ADDRESSES } from '../config/bsc-mainnet-addresses'

type TronTopupMonitorConfig = {
  tronGridBaseUrl: string
  usdtTrc20Contract: string
  apiKey?: string
  pollIntervalMs: number
  maxOrdersPerPoll: number
  requestTimeoutMs: number
  confirmationBlocks: number
  tronScanBaseUrl?: string
}

const ERC20_ABI = [
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 value) returns (bool)',
  'function balanceOf(address account) view returns (uint256)',
  'function transfer(address to, uint256 value) returns (bool)',
]

function tronGridHeaders(apiKey?: string): Record<string, string> {
  if (!apiKey) return {}
  // TronGrid Pro key header (per official docs)
  return { 'TRON-PRO-API-KEY': apiKey }
}

function formatUsdtFromSun(valueSun: string, decimals = 6): string {
  const v = BigInt(valueSun)
  const d = 10n ** BigInt(decimals)
  const whole = v / d
  const frac = v % d
  const fracStr = frac.toString().padStart(decimals, '0')
  return `${whole.toString()}.${fracStr}`
}

function getTxHash(tx: any): string | null {
  const v =
    tx?.transaction_id?.hash ??
    tx?.transaction_id ??
    tx?.txID ??
    tx?.txid ??
    tx?.hash ??
    null
  if (!v) return null
  return String(v)
}

function normalizeTimestampMs(ts: any): number | null {
  const n = typeof ts === 'number' ? ts : Number(ts)
  if (!Number.isFinite(n) || n <= 0) return null
  // TronGrid 常见是毫秒；少数来源可能是秒。
  return n < 1000000000000 ? n * 1000 : n
}

function getToAddress(tx: any): string | null {
  const v = tx?.to ?? tx?.to_address ?? tx?.receiver_address ?? null
  if (!v) return null
  return String(v)
}

function getFromAddress(tx: any): string | null {
  const v = tx?.from ?? tx?.from_address ?? tx?.sender_address ?? null
  if (!v) return null
  return String(v)
}

function isSuccessTx(tx: any): boolean {
  const v = tx?.contractRet ?? tx?.contract_ret ?? null
  if (!v) return true // be tolerant: some payloads may omit this
  return String(v).toUpperCase() === 'SUCCESS'
}

function tryParseJson(input: any): any {
  if (!input) return null
  if (typeof input === 'object') return input
  if (typeof input !== 'string') return null
  try {
    return JSON.parse(input)
  } catch {
    return null
  }
}

function computeRwaWeiFromUsdtAmount(usdtAmount: string): bigint {
  // USDT 6 decimals -> RWA 18 decimals with fixed price 1 RWA = 0.85 USDT
  // rwaWei = usdtWei * 1e12 * 10000 / 8500
  const usdtWei6 = ethers.parseUnits(usdtAmount, 6)
  const mul = usdtWei6 * 10n ** 12n
  return (mul * 10000n) / 8500n
}

export class TronTopupMonitorService {
  private config: TronTopupMonitorConfig
  private intervalHandle: NodeJS.Timeout | null = null
  private inPoll = false

  // BSC issuance (direct RWA transfer to user)
  private bscProvider: ethers.JsonRpcProvider
  private backendWallet: ethers.Wallet
  private usdtToken: ethers.Contract
  private rwaToken: ethers.Contract
  private backendAddress: string

  constructor(config: TronTopupMonitorConfig) {
    this.config = config

    // Tron monitoring service also needs BSC access to execute "receive USDT -> issue RWA"
    const rpcUrl = getBscRpcUrl()
    const backendPrivateKey = process.env.BACKEND_PRIVATE_KEY
    if (!backendPrivateKey) {
      throw new Error('BACKEND_PRIVATE_KEY 未配置，无法执行 RWA 发放')
    }

    this.bscProvider = new ethers.JsonRpcProvider(rpcUrl)
    this.backendWallet = new ethers.Wallet(backendPrivateKey, this.bscProvider)
    this.backendAddress = this.backendWallet.address

    this.usdtToken = new ethers.Contract(BSC_MAINNET_ADDRESSES.usdtToken, ERC20_ABI, this.backendWallet)
    this.rwaToken = new ethers.Contract(BSC_MAINNET_ADDRESSES.rwaToken, ERC20_ABI, this.backendWallet)
  }

  start() {
    if (this.intervalHandle) return

    logger.info(
      `[TronTopupMonitor] start pollIntervalMs=${this.config.pollIntervalMs} maxOrdersPerPoll=${this.config.maxOrdersPerPoll}`
    )

    // Run immediately
    void this.pollOnce()

    this.intervalHandle = setInterval(() => {
      void this.pollOnce()
    }, this.config.pollIntervalMs)
  }

  stop() {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle)
      this.intervalHandle = null
    }
    logger.info('[TronTopupMonitor] stopped')
  }

  private async releaseExpired() {
    // Expire orders and release bound addresses based on time.
    await query(
      `UPDATE tron_deposit_orders
       SET status = 'expired',
           released_at = COALESCE(released_at, NOW()),
           updated_at = NOW()
       WHERE status IN ('pending', 'monitoring', 'paid_detected', 'confirmed')
         AND expires_at <= NOW()`
    )

    await query(
      `UPDATE tron_deposit_addresses
       SET status = 'available',
           bound_user_wallet = NULL,
           bound_order_id = NULL,
           bound_until = NULL,
           updated_at = NOW()
       WHERE status = 'bound'
         AND bound_until <= NOW()`
    )
  }

  private async fetchTronTrc20Incoming({
    depositAddress,
  }: {
    depositAddress: string
  }): Promise<any[]> {
    const base = this.config.tronGridBaseUrl.replace(/\/$/, '')
    const url = `${base}/v1/accounts/${encodeURIComponent(
      depositAddress
    )}/transactions/trc20?limit=50&only_confirmed=true&order_by=block_timestamp,desc&contract_address=${encodeURIComponent(
      this.config.usdtTrc20Contract
    )}`

    const controller = new AbortController()
    const t = setTimeout(() => controller.abort(), this.config.requestTimeoutMs)

    try {
      const r = await fetch(url, {
        method: 'GET',
        headers: tronGridHeaders(this.config.apiKey),
        signal: controller.signal,
      })

      if (r.status === 429) {
        const retryAfter = r.headers.get('retry-after')
        const retryAfterMs = retryAfter ? Number(retryAfter) * 1000 : 5000
        throw new Error(`TRONGRID_429 retryAfterMs=${retryAfterMs}`)
      }

      if (!r.ok) {
        const txt = await r.text().catch(() => '')
        throw new Error(`TronGrid ${r.status} ${r.statusText} ${txt.slice(0, 300)}`)
      }

      const json: any = await r.json()
      const data = Array.isArray(json?.data) ? (json.data as any[]) : []
      return data
    } finally {
      clearTimeout(t)
    }
  }

  private async fetchTronTrc20IncomingTronScan({
    depositAddress,
  }: {
    depositAddress: string
  }): Promise<any[]> {
    // TronScan 兜底：更像你在 raweb.qzz.io 里用的字段结构
    const base = (this.config.tronScanBaseUrl || 'https://apilist.tronscanapi.com').replace(/\/$/, '')
    const url = `${base}/api/transfer/trc20?limit=50&toAddress=${encodeURIComponent(
      depositAddress
    )}&contract_address=${encodeURIComponent(this.config.usdtTrc20Contract)}&sort=-timestamp`

    const controller = new AbortController()
    const t = setTimeout(() => controller.abort(), this.config.requestTimeoutMs)
    try {
      const r = await fetch(url, { method: 'GET', signal: controller.signal })
      if (!r.ok) {
        const txt = await r.text().catch(() => '')
        throw new Error(`TronScan ${r.status} ${r.statusText} ${txt.slice(0, 200)}`)
      }
      const json: any = await r.json()
      const tokenTransfers = Array.isArray(json?.token_transfers) ? json.token_transfers : []
      return tokenTransfers.map((x: any) => ({
        transaction_id: x?.transaction_id,
        to: x?.to_address,
        from: x?.from_address ?? null,
        value: x?.quant ?? x?.value ?? '0',
        block_timestamp: x?.block_ts ?? x?.block_timestamp ?? null,
        token_info: {
          address: this.config.usdtTrc20Contract,
          decimals: 6,
          symbol: 'USDT',
        },
        contractRet: 'SUCCESS',
      }))
    } finally {
      clearTimeout(t)
    }
  }

  private async fetchLatestBlockNumber(): Promise<number | null> {
    const base = this.config.tronGridBaseUrl.replace(/\/$/, '')
    const url = `${base}/v1/blocks/latest`

    const controller = new AbortController()
    const t = setTimeout(() => controller.abort(), this.config.requestTimeoutMs)

    try {
      const r = await fetch(url, {
        method: 'GET',
        headers: tronGridHeaders(this.config.apiKey),
        signal: controller.signal,
      })

      if (!r.ok) {
        const txt = await r.text().catch(() => '')
        throw new Error(`TronGrid latest block ${r.status} ${r.statusText} ${txt.slice(0, 300)}`)
      }

      const json: any = await r.json()

      const rawNum =
        json?.block_header?.raw_data?.number ??
        json?.block_header?.number ??
        json?.blockNumber ??
        json?.block_number ??
        null

      const n = rawNum == null ? null : Number(rawNum)
      return Number.isFinite(n) ? n : null
    } finally {
      clearTimeout(t)
    }
  }

  private async fetchTronTransaction(txid: string): Promise<any | null> {
    const base = this.config.tronGridBaseUrl.replace(/\/$/, '')
    const url = `${base}/v1/transactions/${encodeURIComponent(txid)}`

    const controller = new AbortController()
    const t = setTimeout(() => controller.abort(), this.config.requestTimeoutMs)

    try {
      const r = await fetch(url, {
        method: 'GET',
        headers: tronGridHeaders(this.config.apiKey),
        signal: controller.signal,
      })

      if (!r.ok) {
        const txt = await r.text().catch(() => '')
        throw new Error(
          `TronGrid tx ${txid.slice(0, 10)}... ${r.status} ${r.statusText} ${txt.slice(0, 200)}`
        )
      }

      const json: any = await r.json()
      // Some payloads nest the transaction under `data`.
      return json?.data ?? json
    } finally {
      clearTimeout(t)
    }
  }

  private async completeOrderAndRelease(orderId: number): Promise<void> {
    // Mark completed and release the bound TRON deposit address back to pool.
    await query(
      `UPDATE tron_deposit_orders
       SET status = 'completed',
           released_at = COALESCE(released_at, NOW()),
           updated_at = NOW()
       WHERE id = ? AND status IN ('confirmed', 'completed')`,
      [orderId]
    )

    await query(
      `UPDATE tron_deposit_addresses
       SET status = 'available',
           bound_user_wallet = NULL,
           bound_order_id = NULL,
           bound_until = NULL,
           updated_at = NOW()
       WHERE status = 'bound'
         AND bound_order_id = ?`,
      [orderId]
    )
  }

  private async tryIssueRwaForOrder(order: any, usdtAmountStr: string): Promise<void> {
    const orderId = Number(order.id)
    const userWallet = String(order.user_wallet)
    if (!orderId || !userWallet) throw new Error('orderId/user_wallet missing')
    const usdtNum = Number(usdtAmountStr)
    if (!Number.isFinite(usdtNum) || usdtNum <= 0) throw new Error('usdtAmountStr invalid')

    const metaObj = tryParseJson(order.meta) || {}
    const existingTransferTxHash = metaObj.transferTxHash

    // If transfer already recorded, only finalize DB/release.
    if (existingTransferTxHash) {
      await this.completeOrderAndRelease(orderId)
      return
    }

    const rwaAmountWei18 = computeRwaWeiFromUsdtAmount(usdtAmountStr)
    if (rwaAmountWei18 <= 0n) throw new Error('rwaAmountWei18 computed <= 0')

    // Direct transfer RWA from backend wallet to user wallet.
    // NOTE: This requires backend wallet to already hold enough RWA.
    const backendRwaBal: bigint = await this.rwaToken.balanceOf(this.backendAddress)
    if (backendRwaBal < rwaAmountWei18) {
      throw new Error(
        `backend RWA余额不足 need=${rwaAmountWei18.toString()} have=${backendRwaBal.toString()}`
      )
    }

    const transferTx = await this.rwaToken.transfer(userWallet, rwaAmountWei18)
    const transferReceipt = await transferTx.wait()
    const transferTxHash = transferReceipt.hash

    // Finalize DB + record transfer tx hash + release.
    await query(
      `UPDATE tron_deposit_orders
       SET meta = JSON_SET(COALESCE(meta, JSON_OBJECT()), '$.transferTxHash', ?, '$.rwaAmountWei18', ?),
           status = 'completed',
           released_at = COALESCE(released_at, NOW()),
           updated_at = NOW()
       WHERE id = ? AND status = 'confirmed'`,
      [transferTxHash, rwaAmountWei18.toString(), orderId]
    )

    await query(
      `UPDATE tron_deposit_addresses
       SET status = 'available',
           bound_user_wallet = NULL,
           bound_order_id = NULL,
           bound_until = NULL,
           updated_at = NOW()
       WHERE status = 'bound'
         AND bound_order_id = ?`,
      [orderId]
    )
  }

  private async pollOnce(): Promise<void> {
    if (this.inPoll) return
    this.inPoll = true

    try {
      await this.releaseExpired()

      const orders = await query<any[]>(
        `SELECT *
         FROM tron_deposit_orders
         WHERE status IN ('monitoring', 'confirmed')
           AND (status = 'confirmed' OR expires_at > NOW())
         ORDER BY id ASC
         LIMIT ?`,
        [this.config.maxOrdersPerPoll]
      )

      if (!orders.length) return

      for (const order of orders) {
        const orderId = Number(order.id)
        const depositAddress = String(order.deposit_address)
        const status = String(order.status)
        const createdAtMs = normalizeTimestampMs(order.created_at) ?? null
        const expiresAtMs = normalizeTimestampMs(order.expires_at) ?? null

        try {
          if (status === 'monitoring') {
            const lastTxid = order.last_txid ? String(order.last_txid) : null

            // TronGrid 主查询：only_confirmed + 按区块时间倒序
            let txs: any[] = []
            try {
              txs = await this.fetchTronTrc20Incoming({ depositAddress })
            } catch (e: any) {
              if (String(e?.message || '').startsWith('TRONGRID_429')) {
                // 触发限流退避：避免本轮把 API 打爆
                const m = String(e?.message || '')
                const retryMatch = m.match(/retryAfterMs=(\d+)/)
                const retryAfterMs = retryMatch ? Number(retryMatch[1]) : 5000
                await new Promise((r) => setTimeout(r, Math.min(30000, retryAfterMs)))
                // 429 时也走 TronScan 兜底，避免该轮 TronGrid 完全不可用导致漏扫
                try {
                  txs = await this.fetchTronTrc20IncomingTronScan({ depositAddress })
                } catch {
                  // ignore fallback errors; empty txs check will handle it
                }
              }
              // 其他错误走 TronScan 兜底
            }

            // 如果 TronGrid 返回空，尝试 TronScan 兜底
            if (!txs.length) {
              try {
                txs = await this.fetchTronTrc20IncomingTronScan({ depositAddress })
              } catch {
                // ignore fallback errors; log at outer catch
              }
            }

            if (!txs.length) continue

            const found = txs.find((tx) => {
              const hash = getTxHash(tx)
              if (!hash) return false
              if (lastTxid && hash === lastTxid) return false
              if (!isSuccessTx(tx)) return false

              // raweb 主要使用 to == depositAddress 作为“入账”条件
              const to = getToAddress(tx)
              if (to !== depositAddress) return false

              // 分配窗口过滤：只处理 assigned~expires 的入账，防止扫到历史
              const txMs = normalizeTimestampMs(tx?.block_timestamp ?? tx?.blockTimestamp)
              if (!txMs || createdAtMs == null || expiresAtMs == null) return true
              if (txMs < createdAtMs) return false
              if (txMs > expiresAtMs) return false
              return true
            })

            if (!found) continue

            const txid = getTxHash(found)!
            const valueSun = found?.value ?? found?.amount ?? '0'
            if (!valueSun) continue

            const decimalsRaw = found?.token_info?.decimals
            const decimals = typeof decimalsRaw === 'number' ? decimalsRaw : 6
            const amount = formatUsdtFromSun(String(valueSun), Number(decimals))

            // 如果有块号字段则写入；没有也允许为空（schema 允许 NULL）
            const rawBlockNumber =
              found?.block_number ??
              found?.blockNumber ??
              found?.block_header?.raw_data?.number ??
              null
            const blockNumber = rawBlockNumber == null ? null : Number(rawBlockNumber)

            await transaction(async (conn) => {
              await conn.query(
                `UPDATE tron_deposit_orders
                 SET status = 'confirmed',
                     paid_at = COALESCE(paid_at, NOW()),
                     confirmed_at = COALESCE(confirmed_at, NOW()),
                     last_txid = ?,
                     last_paid_amount = ?,
                     updated_at = NOW()
                 WHERE id = ?
                   AND status = 'monitoring'`,
                [txid, amount, orderId]
              )

              await conn.query(
                `INSERT INTO tron_deposit_transfers
                   (order_id, txid, from_address, to_address, token_symbol, token_contract, amount, block_number, confirmed_at, created_at, updated_at)
                 VALUES (?, ?, ?, ?, 'USDT', ?, ?, ?, NOW(), NOW(), NOW())
                 ON DUPLICATE KEY UPDATE
                   updated_at = NOW()`,
                [
                  orderId,
                  txid,
                  getFromAddress(found) ?? null,
                  depositAddress,
                  this.config.usdtTrc20Contract,
                  amount,
                  blockNumber,
                ]
              )
            })

            logger.info(
              `[TronTopupMonitor] order confirmed (tron received) orderId=${orderId} txid=${txid} amount=${amount} deposit=${depositAddress}`
            )

            // After confirmed, issue RWA to user's BSC wallet and then release the deposit address.
            await this.tryIssueRwaForOrder(order, amount)
          } else if (status === 'confirmed') {
            const metaObj = tryParseJson(order.meta) || {}
            const usdtAmountStr =
              order.last_paid_amount != null
                ? String(order.last_paid_amount)
                : metaObj?.requestedUsdtAmount != null
                  ? String(metaObj.requestedUsdtAmount)
                  : ''
            if (!usdtAmountStr) throw new Error('confirmed order missing usdtAmount')
            await this.tryIssueRwaForOrder(order, usdtAmountStr)
          } else {
            continue
          }
        } catch (e: any) {
          logger.error('[TronTopupMonitor] poll order failed:', {
            orderId,
            depositAddress,
            status,
            error: e?.message || e,
          })
        }
      }
    } catch (e: any) {
      logger.error('[TronTopupMonitor] pollOnce fatal:', e?.message || e)
    } finally {
      this.inPoll = false
    }
  }
}

