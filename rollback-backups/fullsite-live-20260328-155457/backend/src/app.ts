import express, { Application, Request, Response, NextFunction } from 'express';
import cors, { type CorsOptions } from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import apiRoutes from './routes/api';
import unifiedDataRoutes from './routes/unified-data';
import portfolioV2Routes from './routes/portfolio-v2';
import earningsV2Routes from './routes/earnings-v2';
import withdrawV2Routes from './routes/withdraw-v2';
import homepageStatsRoutes from './routes/homepage-stats';
import analyticsStatsRoutes from './routes/analytics-stats';
import referralRewardsRoutes from './routes/referral-rewards';
import referralRewardsDetailRoutes from './routes/referral-rewards-detail';
import historyRoutes from './routes/history';
import relayerRoutes from './routes/relayer';
import tronTopupRoutes from './routes/tron-topup';
import adminRoutes from './routes/admin';
import adminExtendedRoutes from './routes/admin-extended';
import ingestRoutes from './routes/ingest';
import priceRoutes from './routes/price';
import walletHistoryRoutes from './routes/wallet-history';
import logger from './utils/logger';

const app: Application = express();

// 安全中间件
app.use(helmet());

// CORS：支持逗号分隔多来源（生产须含前端域，如 https://rwaprotocol.dpdns.org）
// 未设置或 * 时等价于允许任意来源（origin: true 会回显请求 Origin，便于跨子域 API）
function corsOriginResolver(): CorsOptions['origin'] {
  const raw = process.env.CORS_ORIGIN?.trim();
  if (!raw || raw === '*') return true;
  const list = raw.split(',').map((s) => s.trim()).filter(Boolean);
  if (list.includes('*')) return true;
  return (origin, cb) => {
    if (!origin) return cb(null, true);
    cb(null, list.includes(origin));
  };
}

app.use(
  cors({
    origin: corsOriginResolver(),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
  })
);

// 请求日志
app.use(morgan('combined', {
  stream: {
    write: (message: string) => logger.info(message.trim())
  }
}));

// Body 解析
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 健康检查
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// RWA 价格（PriceOracle Redis / DB）；同时挂根路径，兼容 API 子域未带 /api 的前端配置
app.use('/', priceRoutes);
// API 路由 - 具体路由在前，模糊路由在后
app.use('/api/admin', adminRoutes);
app.use('/api/admin', adminExtendedRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/referral-rewards-detail', referralRewardsDetailRoutes);
app.use('/api', priceRoutes);
app.use('/api', ingestRoutes);
app.use('/api/withdraw-v2', withdrawV2Routes); // 新增：优化版 Withdraw API
app.use('/api', portfolioV2Routes); // 新增：优化版 Portfolio API
app.use('/api', earningsV2Routes); // 新增：优化版 Earnings API
app.use('/api', relayerRoutes);
app.use('/api', tronTopupRoutes);
app.use('/api', homepageStatsRoutes);
app.use('/api', analyticsStatsRoutes);
app.use('/api', referralRewardsRoutes);
app.use('/api', walletHistoryRoutes);
app.use('/api', unifiedDataRoutes);
app.use('/api', apiRoutes);

// 404 处理
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Not found'
  });
});

// 错误处理
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

export default app;
