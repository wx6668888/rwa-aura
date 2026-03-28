import dotenv from 'dotenv';
import http from 'http';
import app from './app';
import logger from './utils/logger';
import { getPool } from './config/database.config';
import { EventMonitor } from './services/EventMonitor';

// Load environment variables
dotenv.config();

/**
 * Dev HTTP server. If STAKING_CONTRACT_ADDRESS and RPC are set, also starts EventMonitor
 * so that on-chain stakes sync to DB and 总留存 (team_total_deposited) updates.
 */

const port = parseInt(process.env.PORT || '3001', 10);

// Graceful shutdown
let server: http.Server | null = null;
let eventMonitor: EventMonitor | null = null;

// Test database connection before starting server
async function startServer() {
  try {
    logger.info('='.repeat(60));
    logger.info('RWA Protocol Backend Dev HTTP Server');
    logger.info('='.repeat(60));
    logger.info('');
    
    // Test database connection
    logger.info('Testing database connection...');
    logger.info(`DB Config: host=${process.env.DB_HOST || 'localhost'}, port=${process.env.DB_PORT || '3306'}, user=${process.env.DB_USER || 'rwa_user'}, database=${process.env.DB_NAME || 'rwa_protocol'}`);
    const pool = getPool();
    const connection = await pool.getConnection();
    logger.info('✅ Database connection established');
    connection.release();
    
    // Start HTTP server
    server = http.createServer(app);
    server.listen(port, async () => {
      logger.info(`✅ Listening on port ${port}`);
      logger.info('');
      logger.info('Available endpoints (dev):');
      logger.info('  GET  /health');
      logger.info('  GET  /api/user/:address');
      logger.info('  GET  /api/stakes/:address');
      logger.info('  GET  /api/rewards/:address');
      logger.info('  GET  /api/referrals/:address');
      logger.info('  GET  /api/level-history/:address');
      logger.info('  GET  /api/stats/global');
      logger.info('  GET  /api/price/rwa');
      logger.info('  GET  /api/market/overview');
      logger.info('  GET  /api/market/ohlcv');
      logger.info('  GET  /api/market/depth');
      logger.info('='.repeat(60));

      // 若配置了合约与 RPC，启动 EventMonitor（优先 BSC，与前端常用链一致），使链上质押/提现同步到 DB，总留存才会更新
      const rpcUrl = process.env.BSC_RPC_URL || process.env.BSC_TESTNET_RPC_URL || process.env.RPC_URL;
      const stakingContract = process.env.STAKING_CONTRACT_ADDRESS;
      if (rpcUrl && stakingContract) {
        try {
          eventMonitor = new EventMonitor({
            rpcUrl,
            stakingContractAddress: stakingContract,
            confirmationBlocks: parseInt(process.env.CONFIRMATION_BLOCKS || '12'),
            pollInterval: parseInt(process.env.POLL_INTERVAL || '5000'),
          });
          await eventMonitor.start();
          logger.info('✅ EventMonitor started (链上质押/提现将同步到 DB，总留存会更新)');
        } catch (err: any) {
          logger.warn('EventMonitor 未启动（链上事件不会同步）: ' + (err?.message || err));
        }
      } else {
        logger.info('未配置 STAKING_CONTRACT_ADDRESS 或 RPC，EventMonitor 未启动；总留存仅能通过回填接口更新');
      }
    });
  } catch (error: any) {
    logger.error('❌ Failed to start server:', error.message);
    logger.error('');
    logger.error('数据库连接失败！请检查：');
    logger.error('1. MySQL 服务是否正在运行');
    logger.error('2. 数据库配置是否正确（检查 backend/.env 文件）');
    logger.error('3. 数据库 rwa_protocol 是否已创建');
    logger.error('4. 用户 rwa_user 是否已创建并有权限');
    logger.error('');
    logger.error('快速配置数据库，请运行：');
    logger.error('  cd backend');
    logger.error('  .\\setup-database.ps1');
    logger.error('');
    process.exit(1);
  }
}

startServer();

// Graceful shutdown
function shutdown() {
  if (eventMonitor) {
    eventMonitor.stop();
    logger.info('EventMonitor stopped');
  }
  if (server) {
    server.close(() => {
      logger.info('✅ Dev HTTP server stopped');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
}

process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down dev HTTP server...');
  shutdown();
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down dev HTTP server...');
  shutdown();
});

