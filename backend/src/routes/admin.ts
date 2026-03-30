import express from 'express';
import cors from 'cors';
import { query } from '../config/database.config';
import logger from '../utils/logger';
import { BALANCE_SNAPSHOTS_EFFECTIVE_SUBQUERY } from '../sql/balanceSnapshotsEffective';

const router = express.Router();

// 基础认证中间件（简单版，生产环境需要JWT）
const adminAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const token = req.headers.authorization;
    // TODO: 实现真正的JWT验证
    if (!token || token !== `Bearer ${process.env.ADMIN_TOKEN}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
};

// 应用认证到所有admin路由
router.use(adminAuth);

// ==================== 仪表板统计 ====================
router.get('/dashboard/stats', async (req, res) => {
    try {
        const [
            totalUsers,
            totalStakes,
            totalRewards,
            totalWithdrawals,
            recentActivity
        ] = await Promise.all([
            query('SELECT COUNT(*) as count FROM users'),
            query('SELECT COUNT(*) as count, SUM(CAST(amount AS DECIMAL(38,0))) as total FROM stake_events'),
            query('SELECT COUNT(*) as count FROM rewards'),
            query('SELECT COUNT(*) as count FROM withdrawal_events'),
            query(`
                SELECT 'stake' as type, user_address, amount, timestamp, tx_hash 
                FROM stake_events 
                ORDER BY id DESC LIMIT 10
            `)
        ]);

        res.json({
            success: true,
            data: {
                users: (totalUsers as any[])[0].count,
                stakes: {
                    count: (totalStakes as any[])[0].count,
                    total: (totalStakes as any[])[0].total || 0
                },
                rewards: (totalRewards as any[])[0].count,
                withdrawals: (totalWithdrawals as any[])[0].count,
                recentActivity
            }
        });
    } catch (error) {
        logger.error('Dashboard stats error:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
});

// ==================== 通用表查询 ====================
router.get('/table/:tableName', async (req, res) => {
    try {
        const { tableName } = req.params;
        const { page = 1, limit = 20, sortBy, sortOrder = 'DESC' } = req.query;
        
        // 白名单验证
        const allowedTables = [
            'users', 'stakes', 'stake_events', 'rwa_stakes', 'user_stake_orders',
            'balance_snapshots', 'rewards', 'yield_settlements', 'reward_updates',
            'direct_referral_rewards', 'referral_bindings', 'referral_settlement_batches',
            'referral_quality_score', 'withdrawal_events', 'emergency_withdrawals',
            'node_level_history', 'node_level_updates', 'rwa_locked_principals',
            'lock_maturity_events', 'user_stats', 'event_processing_state',
            'sync_status', 'homepage_stats', 'strwa_mints', 'token_burns',
            'system_config_changes', 'daily_settlements'
        ];
        
        if (!allowedTables.includes(tableName)) {
            return res.status(400).json({ error: 'Invalid table name' });
        }

        const offset = (Number(page) - 1) * Number(limit);
        
        // 获取总数
        const [countResult] = await query(`SELECT COUNT(*) as total FROM ${tableName}`);
        const total = (countResult as any).total;
        
        // 获取数据
        let orderClause = 'ORDER BY id DESC';
        if (sortBy) {
            orderClause = `ORDER BY ${sortBy} ${sortOrder}`;
        }
        
        const data = await query(
            `SELECT * FROM ${tableName} ${orderClause} LIMIT ? OFFSET ?`,
            [Number(limit), offset]
        );

        res.json({
            success: true,
            data: {
                tableName,
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / Number(limit)),
                rows: data
            }
        });
    } catch (error) {
        logger.error(`Table query error:`, error);
        res.status(500).json({ error: 'Failed to fetch table data' });
    }
});

// ==================== 用户钱包余额管理 ====================
router.get('/wallets/balances', async (req, res) => {
    try {
        const { page = 1, limit = 20, sortBy = 'total_balance', sortOrder = 'DESC' } = req.query;
        const offset = (Number(page) - 1) * Number(limit);
        
        // 从 balance_snapshots 汇总（逻辑去重后，与 dedupe 脚本 / 唯一索引一致）
        const balances = await query(`
            SELECT 
                u.address as user_address,
                u.node_level,
                COALESCE(SUM(CASE WHEN bs.asset_type = 'USDT' THEN CAST(bs.amount AS DECIMAL(38,0)) ELSE 0 END), 0) / 1e18 as usdt_balance,
                COALESCE(SUM(CASE WHEN bs.asset_type = 'RWA' THEN CAST(bs.amount AS DECIMAL(38,0)) ELSE 0 END), 0) / 1e18 as rwa_balance,
                (COALESCE(SUM(CASE WHEN bs.asset_type = 'USDT' THEN CAST(bs.amount AS DECIMAL(38,0)) ELSE 0 END), 0) + 
                 COALESCE(SUM(CASE WHEN bs.asset_type = 'RWA' THEN CAST(bs.amount AS DECIMAL(38,0)) ELSE 0 END), 0) * 0.85) / 1e18 as total_balance_usd
            FROM users u
            LEFT JOIN ${BALANCE_SNAPSHOTS_EFFECTIVE_SUBQUERY} ON LOWER(u.address) = LOWER(bs.user_address)
            GROUP BY u.address, u.node_level
            ORDER BY ${sortBy === 'usdt_balance' ? 'usdt_balance' : sortBy === 'rwa_balance' ? 'rwa_balance' : 'total_balance_usd'} ${sortOrder}
            LIMIT ? OFFSET ?
        `, [Number(limit), offset]);
        
        // 获取总数
        const [countResult] = await query('SELECT COUNT(*) as total FROM users');
        const total = (countResult as any).total;

        res.json({
            success: true,
            data: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / Number(limit)),
                balances
            }
        });
    } catch (error) {
        logger.error('Wallets balances error:', error);
        res.status(500).json({ error: 'Failed to fetch wallet balances' });
    }
});

// ==================== 用户管理 ====================
router.get('/users', async (req, res) => {
    try {
        const { page = 1, limit = 20, search } = req.query;
        const offset = (Number(page) - 1) * Number(limit);
        
        let whereClause = '';
        let params: any[] = [];
        
        if (search) {
            whereClause = 'WHERE LOWER(address) LIKE ?';
            params.push(`%${(search as string).toLowerCase()}%`);
        }
        
        const [countResult] = await query(`SELECT COUNT(*) as total FROM users ${whereClause}`, params);
        const total = (countResult as any).total;
        
        const users = await query(
            `SELECT * FROM users ${whereClause} ORDER BY id DESC LIMIT ? OFFSET ?`,
            [...params, Number(limit), offset]
        );

        res.json({
            success: true,
            data: { total, page: Number(page), limit: Number(limit), users }
        });
    } catch (error) {
        logger.error('Users query error:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// ==================== 质押管理 ====================
router.get('/stakes/summary', async (req, res) => {
    try {
        const [usdtStakes, rwaStakes, byLockPeriod] = await Promise.all([
            query(`
                SELECT COUNT(*) as count, SUM(CAST(amount AS DECIMAL(38,0)))/1e18 as total
                FROM stake_events 
                WHERE event_type IN ('USDT_STAKE', 'USDT')
            `),
            query(`
                SELECT COUNT(*) as count, SUM(CAST(amount AS DECIMAL(38,0)))/1e18 as total
                FROM stake_events 
                WHERE event_type IN ('RWA_STAKE', 'RWA')
            `),
            query(`
                SELECT lock_period, COUNT(*) as count, SUM(CAST(amount AS DECIMAL(38,0)))/1e18 as total
                FROM stake_events
                GROUP BY lock_period
                ORDER BY lock_period
            `)
        ]);

        res.json({
            success: true,
            data: {
                usdt: (usdtStakes as any[])[0],
                rwa: (rwaStakes as any[])[0],
                byLockPeriod
            }
        });
    } catch (error) {
        logger.error('Stakes summary error:', error);
        res.status(500).json({ error: 'Failed to fetch stakes summary' });
    }
});

// ==================== 授权记录管理 ====================
router.get('/approvals', async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const offset = (Number(page) - 1) * Number(limit);
        
        const [countResult] = await query('SELECT COUNT(*) as total FROM approval_events');
        const total = (countResult as any).total;
        
        const approvals = await query(
            `SELECT * FROM approval_events ORDER BY id DESC LIMIT ? OFFSET ?`,
            [Number(limit), offset]
        );

        res.json({
            success: true,
            data: { total, page: Number(page), limit: Number(limit), approvals }
        });
    } catch (error) {
        logger.error('Approvals query error:', error);
        res.status(500).json({ error: 'Failed to fetch approvals' });
    }
});

export default router;
