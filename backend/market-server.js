/**
 * 简化的 Market 数据服务器
 * 只提供前端 Market 页面需要的 API
 */

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3001;

// 中间件
app.use(cors());
app.use(express.json());

// 生成模拟 OHLCV 数据
function generateMockOHLCV(days = 90) {
  const data = [];
  const now = Math.floor(Date.now() / 1000);
  const dayInSeconds = 24 * 60 * 60;
  
  let basePrice = 0.85;
  
  for (let i = days; i >= 0; i--) {
    const time = now - (i * dayInSeconds);
    const volatility = 0.02;
    const trend = Math.sin(i / 10) * 0.01;
    
    const open = basePrice + (Math.random() - 0.5) * volatility;
    const close = open + trend + (Math.random() - 0.5) * volatility;
    const high = Math.max(open, close) + Math.random() * volatility;
    const low = Math.min(open, close) - Math.random() * volatility;
    const volume = 10000 + Math.random() * 50000;
    
    data.push({
      time,
      open: parseFloat(open.toFixed(4)),
      high: parseFloat(high.toFixed(4)),
      low: parseFloat(low.toFixed(4)),
      close: parseFloat(close.toFixed(4)),
      volume: Math.floor(volume)
    });
    
    basePrice = close;
  }
  
  return data;
}

// 生成模拟深度数据
function generateMockDepthData() {
  const currentPrice = 0.8524;
  const buyOrders = [];
  const sellOrders = [];
  
  // 生成买单
  for (let i = 0; i < 20; i++) {
    const price = currentPrice - (i + 1) * 0.001;
    const amount = 1000 + Math.random() * 5000;
    buyOrders.push({
      price: parseFloat(price.toFixed(4)),
      amount: Math.floor(amount),
      total: Math.floor(amount * price)
    });
  }
  
  // 生成卖单
  for (let i = 0; i < 20; i++) {
    const price = currentPrice + (i + 1) * 0.001;
    const amount = 1000 + Math.random() * 5000;
    sellOrders.push({
      price: parseFloat(price.toFixed(4)),
      amount: Math.floor(amount),
      total: Math.floor(amount * price)
    });
  }
  
  return { buyOrders, sellOrders, currentPrice };
}

// 生成模拟成交记录
function generateMockTrades(count = 15) {
  const trades = [];
  const now = Date.now();
  const currentPrice = 0.8524;
  
  for (let i = 0; i < count; i++) {
    const isBuy = Math.random() > 0.5;
    const price = currentPrice + (Math.random() - 0.5) * 0.01;
    const amount = 100 + Math.random() * 1000;
    
    trades.push({
      time: new Date(now - i * 5000).toISOString(),
      type: isBuy ? 'buy' : 'sell',
      price: parseFloat(price.toFixed(4)),
      amount: Math.floor(amount),
      total: parseFloat((price * amount).toFixed(2))
    });
  }
  
  return trades;
}

// API 路由

// 市场概览
app.get('/api/market/overview', (req, res) => {
  res.json({
    success: true,
    data: {
      price: 0.8524,
      change24h: 5.24,
      high24h: 0.8901,
      low24h: 0.8102,
      volume24h: 1245000,
      marketCap: 8524000,
      isLive: false
    }
  });
});

// OHLCV K线数据
app.get('/api/market/ohlcv', (req, res) => {
  const days = parseInt(req.query.days) || 90;
  const data = generateMockOHLCV(days);
  
  res.json({
    success: true,
    data
  });
});

// 市场深度
app.get('/api/market/depth', (req, res) => {
  const data = generateMockDepthData();
  
  res.json({
    success: true,
    data
  });
});

// 最近成交
app.get('/api/market/trades', (req, res) => {
  const count = parseInt(req.query.count) || 15;
  const data = generateMockTrades(count);
  
  res.json({
    success: true,
    data
  });
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'market-data' });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`\n✅ Market Data Server 运行中`);
  console.log(`📍 地址: http://localhost:${PORT}`);
  console.log(`\n可用的 API 端点:`);
  console.log(`  GET /api/market/overview - 市场概览`);
  console.log(`  GET /api/market/ohlcv?days=90 - K线数据`);
  console.log(`  GET /api/market/depth - 市场深度`);
  console.log(`  GET /api/market/trades?count=15 - 最近成交`);
  console.log(`\n前端地址: http://localhost:3000/market\n`);
});
