import mysql from 'mysql2/promise';
import { resolve } from 'path';
import { config as dotenvConfig } from 'dotenv';

// PM2 可能注入带 \r 的旧 env；须用 .env 覆盖并规范化字符串
dotenvConfig({ path: resolve(__dirname, '../../.env'), override: true });

function envStr(key: string, fallback: string): string {
  const v = process.env[key];
  if (v == null || String(v).trim() === '') return fallback;
  return String(v).replace(/\r/g, '').trim();
}

/**
 * Database Configuration
 * 
 * CRITICAL SECURITY NOTES:
 * 1. Database should only allow local connections
 * 2. Use strong passwords
 * 3. All amount fields use DECIMAL(38, 0) for 18-bit integers
 * 4. NEVER use LIKE queries on referral_path - use referral_relations table
 */

export interface DatabaseConfig {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
    connectionLimit: number;
    waitForConnections: boolean;
    queueLimit: number;
}

export const databaseConfig: DatabaseConfig = {
    host: envStr('DB_HOST', '127.0.0.1'),
    port: parseInt(envStr('DB_PORT', '3306'), 10),
    user: envStr('DB_USER', 'rwa_user'),
    password: envStr('DB_PASSWORD', ''),
    database: envStr('DB_NAME', 'rwa_protocol'),
    connectionLimit: 20,
    waitForConnections: true,
    queueLimit: 0
};

// Create connection pool
let pool: mysql.Pool | null = null;

export function getPool(): mysql.Pool {
    if (!pool) {
        pool = mysql.createPool(databaseConfig);
        
        // Test connection - this is required for the backend to work
        pool.getConnection()
            .then(connection => {
                console.log('✅ Database connection established');
                connection.release();
            })
            .catch(error => {
                console.error('❌ Database connection failed:', error.message);
                console.error('');
                console.error('请检查数据库配置：');
                console.error('1. MySQL 服务是否正在运行');
                console.error('2. 数据库用户和密码是否正确（检查 backend/.env 文件）');
                console.error('3. 数据库 rwa_protocol 是否已创建');
                console.error('4. 用户 rwa_user 是否有权限访问数据库');
                console.error('');
                console.error('快速配置数据库，请运行：');
                console.error('  cd backend');
                console.error('  .\\setup-database.ps1');
                console.error('');
                // Don't throw here - let individual queries handle errors
                // But log the error clearly so user knows what to do
            });
    }
    
    return pool;
}

export async function closePool(): Promise<void> {
    if (pool) {
        await pool.end();
        pool = null;
        console.log('Database connection pool closed');
    }
}

/**
 * Execute query with automatic connection management
 */
export async function query<T = any>(
    sql: string,
    params?: any[]
): Promise<T> {
    const connection = await getPool().getConnection();
    
    try {
        const [rows] = await connection.query(sql, params);
        return rows as T;
    } finally {
        connection.release();
    }
}

/**
 * Execute transaction with automatic rollback on error
 */
export async function transaction<T>(
    callback: (connection: mysql.PoolConnection) => Promise<T>
): Promise<T> {
    const connection = await getPool().getConnection();
    
    try {
        await connection.beginTransaction();
        const result = await callback(connection);
        await connection.commit();
        return result;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

/**
 * Health check
 */
export async function healthCheck(): Promise<boolean> {
    try {
        await query('SELECT 1');
        return true;
    } catch (error) {
        console.error('Database health check failed:', error);
        return false;
    }
}

/**
 * Get database statistics
 */
export async function getStats(): Promise<{
    totalUsers: number;
    totalStakes: number;
    totalStaked: string;
    totalRewards: number;
}> {
    const [users] = await query<any[]>('SELECT COUNT(*) as count FROM users');
    const [stakes] = await query<any[]>('SELECT COUNT(*) as count FROM stakes');
    const [staked] = await query<any[]>('SELECT SUM(total_staked) as total FROM users');
    const [rewards] = await query<any[]>('SELECT COUNT(*) as count FROM rewards');
    
    return {
        totalUsers: users[0].count,
        totalStakes: stakes[0].count,
        totalStaked: staked[0].total || '0',
        totalRewards: rewards[0].count
    };
}

export default {
    getPool,
    closePool,
    query,
    transaction,
    healthCheck,
    getStats
};
