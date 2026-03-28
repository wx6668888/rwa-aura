import express from 'express';
import { randomBytes } from 'crypto';
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import { transaction, query, databaseConfig } from '../config/database.config';
import { getBscRpcUrl } from '../config/rpc-url'
import { BSC_MAINNET_ADDRESSES } from '../config/bsc-mainnet-addresses'

const router = express.Router();

const ACTIVE_ORDER_STATUSES = ['pending', 'monitoring', 'paid_detected', 'confirmed'] as const;
const RELEASABLE_ORDER_STATUSES = ['expired', 'cancelled', 'completed'] as const;
const DEFAULT_BIND_MINUTES = Math.max(1, Number(process.env.TRON_TOPUP_BIND_MINUTES || '60'));

type ImportItem = {
  address?: string;
  privateKey?: string;
  privateKeyEncrypted?: string;
  note?: string;
};

function nowPlusMinutes(minutes: number): Date {
  return new Date(Date.now() + minutes * 60 * 1000);
}

function isTronAddress(value: unknown): value is string {
  return typeof value === 'string' && /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(value.trim());
}

function normalizeTronAddress(value: unknown): string {
  const s = String(value || '').trim();
  if (!isTronAddress(s)) {
    throw new Error('TRON 地址格式不正确');
  }
  return s;
}

function normalizeUserWallet(value: unknown): string {
  const s = String(value || '').trim();
  if (!ethers.isAddress(s)) {
    throw new Error('userWallet 不是有效的 EVM 地址');
  }
  return ethers.getAddress(s);
}

function makeOrderNo(): string {
  return `TTO${Date.now().toString(36).toUpperCase()}${randomBytes(4).toString('hex').toUpperCase()}`;
}

function calcRemainingSeconds(expiresAt: Date | string | null): number {
  if (!expiresAt) return 0;
  const expires = new Date(expiresAt).getTime();
  if (!Number.isFinite(expires)) return 0;
  return Math.max(0, Math.ceil((expires - Date.now()) / 1000));
}

async function releaseExpiredBindings(conn: any): Promise<void> {
  await conn.query(
    `UPDATE tron_deposit_orders
     SET status = 'expired',
         released_at = COALESCE(released_at, NOW()),
         updated_at = NOW()
     WHERE status IN ('pending', 'monitoring', 'confirmed')
       AND expires_at <= NOW()`
  );

  await conn.query(
    `UPDATE tron_deposit_addresses
     SET status = 'available',
         bound_user_wallet = NULL,
         bound_order_id = NULL,
         bound_until = NULL,
         updated_at = NOW()
     WHERE status = 'bound'
       AND bound_until <= NOW()`
  );
}

function serializeOrder(row: any) {
  return {
    id: row.id,
    orderNo: row.order_no,
    userWallet: row.user_wallet,
    depositAddress: row.deposit_address,
    status: row.status,
    expiresAt: row.expires_at,
    paidAt: row.paid_at,
    confirmedAt: row.confirmed_at,
    releasedAt: row.released_at,
    lastTxid: row.last_txid,
    lastPaidAmount: row.last_paid_amount,
    remainingSeconds: calcRemainingSeconds(row.expires_at),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function requireAdminToken(req: express.Request, res: express.Response): boolean {
  // Allow local calls without requiring a token.
  // This is used for ops tooling / admin actions from the server itself.
  const ipRaw = (req.socket?.remoteAddress || '').toString()
  const ip = ipRaw.replace(/^::ffff:/, '')
  if (ip === '127.0.0.1' || ip === '::1') {
    return true
  }

  const expected = String(process.env.TRON_TOPUP_ADMIN_TOKEN || '').trim();
  if (!expected) {
    res.status(503).json({
      success: false,
      error: 'TRON_TOPUP_ADMIN_TOKEN 未配置，已拒绝地址池导入请求',
    });
    return false;
  }
  const actual =
    String(req.headers['x-admin-token'] || '').trim() ||
    String(req.body?.adminToken || '').trim();
  if (actual !== expected) {
    res.status(401).json({
      success: false,
      error: '管理员令牌无效',
    });
    return false;
  }
  return true;
}

function isLocalRequest(req: express.Request): boolean {
  const ipRaw = (req.socket?.remoteAddress || '').toString()
  const ip = ipRaw.replace(/^::ffff:/, '')
  return ip === '127.0.0.1' || ip === '::1'
}

async function applyTronTopupSql(): Promise<void> {
  const sqlFile = path.resolve(__dirname, '../../config/migrations/003_tron_topup_tables.sql')
  const sql = fs.readFileSync(sqlFile, 'utf8')

  const conn = await mysql.createConnection({
    host: databaseConfig.host,
    port: databaseConfig.port,
    user: databaseConfig.user,
    password: databaseConfig.password,
    database: databaseConfig.database,
    multipleStatements: true,
  })

  try {
    await conn.query(sql)
  } finally {
    await conn.end()
  }
}

router.post('/tron-topup/admin/apply-tables', async (req, res) => {
  try {
    if (!isLocalRequest(req)) {
      return res.status(403).json({ success: false, error: '仅允许本机调用' })
    }
    await applyTronTopupSql()

    const [addrRows] = await query<any[]>(
      `SELECT COUNT(*) as c FROM tron_deposit_addresses`
    )
    const [orderRows] = await query<any[]>(
      `SELECT COUNT(*) as c FROM tron_deposit_orders`
    )
    const [txRows] = await query<any[]>(
      `SELECT COUNT(*) as c FROM tron_deposit_transfers`
    )

    return res.json({
      success: true,
      data: {
        tron_deposit_addresses: (addrRows as any[])[0]?.c ?? 0,
        tron_deposit_orders: (orderRows as any[])[0]?.c ?? 0,
        tron_deposit_transfers: (txRows as any[])[0]?.c ?? 0,
      },
    })
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error?.message || 'apply tables failed',
    })
  }
})

// Debug: remoteAddress inspection (only for local use)
router.get('/tron-topup/admin/remote-info', (req, res) => {
  try {
    if (!isLocalRequest(req)) {
      return res.status(403).json({ success: false, error: '仅允许本机调用' })
    }
    const ipRaw = (req.socket?.remoteAddress || '').toString()
    const ip = ipRaw.replace(/^::ffff:/, '')
    return res.json({
      success: true,
      remoteAddressRaw: ipRaw,
      remoteAddressNormalized: ip,
      isLocalRequest: isLocalRequest(req),
      hasAdminToken: !!String(process.env.TRON_TOPUP_ADMIN_TOKEN || '').trim(),
    })
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e?.message || 'debug failed' })
  }
})

// Local-only: force mark an order as confirmed and insert a simulated TRC20 transfer record.
// This is for ops/testing to validate the "confirmed -> issue RWA" pipeline.
router.post('/tron-topup/admin/force-confirm', async (req, res) => {
  try {
    if (!isLocalRequest(req)) {
      return res.status(403).json({ success: false, error: '仅允许本机调用' })
    }

    const orderNo = String(req.body?.orderNo || '').trim()
    const txid = String(req.body?.txid || `SIMULATED_${Date.now().toString(16)}`).trim()
    const amount = String(req.body?.amount || req.body?.usdtAmount || '').trim()

    if (!orderNo) {
      return res.status(400).json({ success: false, error: 'orderNo 不能为空' })
    }
    if (!amount || !/^[0-9]+(\.[0-9]+)?$/.test(amount) || Number(amount) <= 0) {
      return res.status(400).json({ success: false, error: 'amount 必须是大于 0 的数字字符串（USDT）' })
    }

    let orderRow: any = null
    await transaction(async (conn) => {
      await releaseExpiredBindings(conn)

      const [rows] = await conn.query<any[]>(
        `SELECT * FROM tron_deposit_orders WHERE order_no = ? LIMIT 1 FOR UPDATE`,
        [orderNo]
      )
      orderRow = (rows as any[])[0]
      if (!orderRow) {
        throw new Error('订单不存在')
      }

      const status = String(orderRow.status || '')
      if (!['monitoring', 'confirmed'].includes(status)) {
        throw new Error(`订单状态不允许 force-confirm（当前=${status}）`)
      }

      await conn.query(
        `UPDATE tron_deposit_orders
         SET status = 'confirmed',
             paid_at = COALESCE(paid_at, NOW()),
             confirmed_at = COALESCE(confirmed_at, NOW()),
             last_txid = ?,
             last_paid_amount = ?,
             updated_at = NOW()
         WHERE id = ?`,
        [txid, amount, orderRow.id]
      )

      await conn.query(
        `INSERT INTO tron_deposit_transfers
           (order_id, txid, from_address, to_address, token_symbol, token_contract, amount, block_number, confirmed_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'USDT', ?, ?, NULL, NOW(), NOW(), NOW())
         ON DUPLICATE KEY UPDATE
           amount = VALUES(amount),
           confirmed_at = COALESCE(confirmed_at, VALUES(confirmed_at)),
           updated_at = NOW()`,
        [
          orderRow.id,
          txid,
          String(req.body?.fromAddress || '').trim() || null,
          orderRow.deposit_address,
          String(process.env.TRON_TOPUP_USDT_TRC20_CONTRACT || '').trim() || 'TRC20_USDT',
          amount,
        ]
      )
    })

    const rows2 = await query<any[]>(
      `SELECT * FROM tron_deposit_orders WHERE order_no = ? LIMIT 1`,
      [orderNo]
    )
    const next = (rows2 as any[])[0]
    return res.json({ success: true, data: serializeOrder(next) })
  } catch (e: any) {
    return res.status(400).json({ success: false, error: e?.message || 'force-confirm failed' })
  }
})

// Local-only: read raw order row (includes meta/tx hashes) for debugging.
router.get('/tron-topup/admin/order-raw/:id', async (req, res) => {
  try {
    if (!isLocalRequest(req)) {
      return res.status(403).json({ success: false, error: '仅允许本机调用' })
    }
    const id = String(req.params.id || '').trim()
    if (!id) return res.status(400).json({ success: false, error: 'id 不能为空' })

    const isNumeric = /^[0-9]+$/.test(id)
    const rows = await query<any[]>(
      `SELECT * FROM tron_deposit_orders WHERE ${isNumeric ? 'id = ?' : 'order_no = ?'} LIMIT 1`,
      [isNumeric ? Number(id) : id]
    )
    const row = (rows as any[])[0]
    if (!row) return res.status(404).json({ success: false, error: '订单不存在' })
    return res.json({ success: true, data: row })
  } catch (e: any) {
    return res.status(400).json({ success: false, error: e?.message || 'order raw failed' })
  }
})

// Local-only: immediately execute BSC issuance for a confirmed order.
// WARNING: This will perform real on-chain transactions using BACKEND_PRIVATE_KEY.
router.post('/tron-topup/admin/issue-now', async (req, res) => {
  try {
    if (!isLocalRequest(req)) {
      return res.status(403).json({ success: false, error: '仅允许本机调用' })
    }

    const orderNo = String(req.body?.orderNo || '').trim()
    if (!orderNo) return res.status(400).json({ success: false, error: 'orderNo 不能为空' })

    const backendPrivateKey = String(process.env.BACKEND_PRIVATE_KEY || '').trim()
    if (!backendPrivateKey) return res.status(503).json({ success: false, error: 'BACKEND_PRIVATE_KEY 未配置' })

    const ERC20_ABI = [
      'function balanceOf(address account) view returns (uint256)',
      'function transfer(address to, uint256 value) returns (bool)',
    ]

    // Load order
    const rows = await query<any[]>(
      `SELECT * FROM tron_deposit_orders WHERE order_no = ? LIMIT 1`,
      [orderNo]
    )
    const order = (rows as any[])[0]
    if (!order) return res.status(404).json({ success: false, error: '订单不存在' })
    if (String(order.status) !== 'confirmed') {
      return res.status(400).json({ success: false, error: `订单状态必须是 confirmed（当前=${order.status}）` })
    }

    const usdtAmountStr = String(order.last_paid_amount || '').trim()
    if (!usdtAmountStr) return res.status(400).json({ success: false, error: '订单缺少 last_paid_amount' })

    const userWallet = String(order.user_wallet || '').trim()
    if (!ethers.isAddress(userWallet)) {
      return res.status(400).json({ success: false, error: 'user_wallet 不是有效的 EVM 地址' })
    }

    // Compute RWA amount: rwaWei18 = usdtWei6 * 1e12 * 10000 / 8500
    const usdtWei6 = ethers.parseUnits(usdtAmountStr, 6)
    const rwaWei18 = (usdtWei6 * 10n ** 12n * 10000n) / 8500n

    const provider = new ethers.JsonRpcProvider(getBscRpcUrl())
    const wallet = new ethers.Wallet(backendPrivateKey, provider)
    const rwaToken = new ethers.Contract(BSC_MAINNET_ADDRESSES.rwaToken, ERC20_ABI, wallet)
    const backendAddress = wallet.address

    // Transfer RWA to user
    const backendRwaBal: bigint = await rwaToken.balanceOf(backendAddress)
    if (backendRwaBal < rwaWei18) {
      return res.status(400).json({
        success: false,
        error: `后端钱包 RWA 余额不足 need=${rwaWei18.toString()} have=${backendRwaBal.toString()}`,
      })
    }

    const transferTx = await rwaToken.transfer(ethers.getAddress(userWallet), rwaWei18)
    const transferReceipt = await transferTx.wait()
    const transferTxHash = String(transferReceipt.hash)

    // Finalize DB and release address
    await transaction(async (conn) => {
      await conn.query(
        `UPDATE tron_deposit_orders
         SET meta = JSON_SET(COALESCE(meta, JSON_OBJECT()),
                             '$.transferTxHash', ?,
                             '$.rwaAmountWei18', ?),
             status = 'completed',
             released_at = COALESCE(released_at, NOW()),
             updated_at = NOW()
         WHERE id = ? AND status = 'confirmed'`,
        [transferTxHash, rwaWei18.toString(), order.id]
      )

      await conn.query(
        `UPDATE tron_deposit_addresses
         SET status = 'available',
             bound_user_wallet = NULL,
             bound_order_id = NULL,
             bound_until = NULL,
             updated_at = NOW()
         WHERE status = 'bound' AND bound_order_id = ?`,
        [order.id]
      )
    })

    return res.json({
      success: true,
      data: {
        orderNo,
        usdtAmount: usdtAmountStr,
        rwaAmountWei18: rwaWei18.toString(),
        transferTxHash,
      },
    })
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e?.message || 'issue-now failed' })
  }
})

router.post('/tron-topup/address-pool/import', async (req, res) => {
  if (!requireAdminToken(req, res)) return;

  try {
    const rawItems = Array.isArray(req.body?.items)
      ? req.body.items
      : Array.isArray(req.body?.addresses)
        ? req.body.addresses.map((address: string) => ({ address }))
        : [];

    if (rawItems.length === 0) {
      return res.status(400).json({
        success: false,
        error: '请提供 items 或 addresses 数组',
      });
    }

    const items: ImportItem[] = rawItems;
    let inserted = 0;
    let updated = 0;

    for (const item of items) {
      const address = normalizeTronAddress(item.address);
      const privateKeyEncrypted = String(
        item.privateKeyEncrypted || item.privateKey || ''
      ).trim() || null;
      const note = String(item.note || '').trim() || null;

      const existing = await query<any[]>(
        'SELECT id FROM tron_deposit_addresses WHERE address = ? LIMIT 1',
        [address]
      );

      await query(
        `INSERT INTO tron_deposit_addresses
          (address, private_key_encrypted, note, status, created_at, updated_at)
         VALUES (?, ?, ?, 'available', NOW(), NOW())
         ON DUPLICATE KEY UPDATE
          private_key_encrypted = COALESCE(VALUES(private_key_encrypted), private_key_encrypted),
          note = COALESCE(VALUES(note), note),
          updated_at = NOW()`,
        [address, privateKeyEncrypted, note]
      );

      if ((existing as any[]).length > 0) updated += 1;
      else inserted += 1;
    }

    return res.json({
      success: true,
      data: {
        inserted,
        updated,
        total: rawItems.length,
      },
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      error: error?.message || '导入地址池失败',
    });
  }
});

router.post('/tron-topup/order', async (req, res) => {
  try {
    const userWallet = normalizeUserWallet(req.body?.userWallet);
    const rawUsdtAmount = req.body?.usdtAmount
    const usdtAmountStr =
      rawUsdtAmount == null ? '' : String(rawUsdtAmount).trim()
    const requestedUsdtAmount =
      usdtAmountStr && /^[0-9]+(\.[0-9]+)?$/.test(usdtAmountStr) && Number(usdtAmountStr) > 0
        ? usdtAmountStr
        : null

    const result = await transaction(async (conn) => {
      await releaseExpiredBindings(conn);

      const [existingRows] = await conn.query(
        `SELECT *
         FROM tron_deposit_orders
         WHERE user_wallet = ?
           AND status IN ('pending', 'monitoring', 'paid_detected', 'confirmed')
           AND expires_at > NOW()
         ORDER BY id DESC
         LIMIT 1`,
        [userWallet]
      );

      const existingOrder = (existingRows as any[])[0];
      if (existingOrder) {
        return {
          reused: true,
          order: serializeOrder(existingOrder),
        };
      }

      const [addressRows] = await conn.query(
        `SELECT *
         FROM tron_deposit_addresses
         WHERE status = 'available'
         ORDER BY RAND()
         LIMIT 1
         FOR UPDATE`
      );

      const selectedAddress = (addressRows as any[])[0];
      if (!selectedAddress) {
        throw new Error('当前没有可分配的 TRON 充值地址');
      }

      const orderNo = makeOrderNo();
      const expiresAt = nowPlusMinutes(DEFAULT_BIND_MINUTES);
      const meta = requestedUsdtAmount
        ? JSON.stringify({ requestedUsdtAmount })
        : null;

      const [insertResult] = await conn.query(
        `INSERT INTO tron_deposit_orders
          (order_no, user_wallet, deposit_address, status, expires_at, meta, created_at, updated_at)
         VALUES (?, ?, ?, 'monitoring', ?, ?, NOW(), NOW())`,
        [orderNo, userWallet, selectedAddress.address, expiresAt, meta]
      );

      const orderId = (insertResult as any).insertId;

      await conn.query(
        `UPDATE tron_deposit_addresses
         SET status = 'bound',
             bound_user_wallet = ?,
             bound_order_id = ?,
             bound_until = ?,
             updated_at = NOW()
         WHERE id = ?`,
        [userWallet, orderId, expiresAt, selectedAddress.id]
      );

      const [orderRows] = await conn.query(
        'SELECT * FROM tron_deposit_orders WHERE id = ? LIMIT 1',
        [orderId]
      );

      return {
        reused: false,
        order: serializeOrder((orderRows as any[])[0]),
      };
    });

    return res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      error: error?.message || '创建充值订单失败',
    });
  }
});

router.get('/tron-topup/order/:id', async (req, res) => {
  try {
    const id = String(req.params.id || '').trim();
    if (!id) {
      return res.status(400).json({
        success: false,
        error: '订单参数不能为空',
      });
    }

    await transaction(async (conn) => {
      await releaseExpiredBindings(conn);
    });

    const isNumeric = /^[0-9]+$/.test(id);
    const rows = await query<any[]>(
      `SELECT *
       FROM tron_deposit_orders
       WHERE ${isNumeric ? 'id = ?' : 'order_no = ?'}
       LIMIT 1`,
      [isNumeric ? Number(id) : id]
    );

    const order = (rows as any[])[0];
    if (!order) {
      return res.status(404).json({
        success: false,
        error: '订单不存在',
      });
    }

    return res.json({
      success: true,
      data: serializeOrder(order),
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      error: error?.message || '查询充值订单失败',
    });
  }
});

router.get('/tron-topup/address-pool/stats', async (_req, res) => {
  try {
    const rows = await query<any[]>(
      `SELECT status, COUNT(*) AS count
       FROM tron_deposit_addresses
       GROUP BY status`
    );

    const summary = {
      available: 0,
      bound: 0,
      disabled: 0,
    };

    for (const row of rows as any[]) {
      const key = String(row.status || '');
      if (key in summary) {
        (summary as any)[key] = Number(row.count || 0);
      }
    }

    return res.json({
      success: true,
      data: summary,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error?.message || '查询地址池统计失败',
    });
  }
});

export default router;
router;
