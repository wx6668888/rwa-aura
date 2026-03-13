import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import apiRoutes from './routes/api';
import unifiedDataRoutes from './routes/unified-data';
import homepageStatsRoutes from './routes/homepage-stats';
import referralRewardsRoutes from './routes/referral-rewards';
import historyRoutes from './routes/history';
import relayerRoutes from './routes/relayer';
import logger from './utils/logger';

const app: Application = express();

// 安全中间件
app.use(helmet());

// CORS 配置
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

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

// API 路由 - 具体路由在前，模糊路由在后
app.use('/api/history', historyRoutes);
app.use('/api', relayerRoutes);
app.use('/api', homepageStatsRoutes);
app.use('/api', referralRewardsRoutes);
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
