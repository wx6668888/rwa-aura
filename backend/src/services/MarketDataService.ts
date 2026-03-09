import { ethers } from 'ethers';

interface OHLCVData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface DepthOrder {
  price: number;
  volume: number;
}

interface Trade {
  time: number;
  type: 'buy' | 'sell';
  price: number;
  amount: number;
  total: number;
}

export class MarketDataService {
  private provider: ethers.JsonRpcProvider;
  private tokenAddress: string;

  constructor(provider: ethers.JsonRpcProvider, tokenAddress: string) {
    this.provider = provider;
    this.tokenAddress = tokenAddress;
  }

  // 生成模拟 OHLCV 数据（90天）
  generateMockOHLCV(days: number = 90): OHLCVData[] {
    const data: OHLCVData[] = [];
    let price = 0.50;
    const now = Date.now();
    
    for (let i = days; i >= 0; i--) {
      const time = now - i * 24 * 60 * 60 * 1000;
      const change = (Math.random() - 0.48) * 0.02;
      price = Math.max(0.40, Math.min(0.90, price + change));
      
      const open = price;
      const close = price + (Math.random() - 0.5) * 0.01;
      const high = Math.max(open, close) + Math.random() * 0.005;
      const low = Math.min(open, close) - Math.random() * 0.005;
      const volume = Math.floor(Math.random() * 50000) + 10000;
      
      data.push({ 
        time: Math.floor(time / 1000), 
        open, 
        high, 
        low, 
        close, 
        volume 
      });
    }
    
    return data;
  }

  // 生成模拟深度数据
  generateMockDepthData() {
    const currentPrice = 0.8524;
    const buyOrders: DepthOrder[] = [];
    const sellOrders: DepthOrder[] = [];
    
    // 买单（当前价格左侧）
    for (let i = 0; i < 50; i++) {
      const price = currentPrice - (i * 0.001);
      const volume = Math.floor(Math.random() * 10000) + 5000;
      buyOrders.push({ price, volume });
    }
    
    // 卖单（当前价格右侧）
    for (let i = 0; i < 50; i++) {
      const price = currentPrice + (i * 0.001);
      const volume = Math.floor(Math.random() * 10000) + 5000;
      sellOrders.push({ price, volume });
    }
    
    return { buyOrders, sellOrders, currentPrice };
  }

  // 生成模拟成交记录
  generateMockTrades(count: number = 15): Trade[] {
    const trades: Trade[] = [];
    const now = Date.now();
    
    for (let i = 0; i < count; i++) {
      const time = now - i * 3000;
      const type = Math.random() > 0.5 ? 'buy' : 'sell';
      const price = 0.8524 + (Math.random() - 0.5) * 0.01;
      const amount = Math.floor(Math.random() * 50000) + 100;
      const total = price * amount;
      
      trades.push({
        time,
        type,
        price,
        amount,
        total,
      });
    }
    
    return trades;
  }

  // 获取市场概览数据
  getMarketOverview() {
    return {
      price: 0.8524,
      change24h: 5.24,
      high24h: 0.8901,
      low24h: 0.8102,
      volume24h: 1245000,
      marketCap: 8524000,
      isLive: false,
    };
  }

  // TODO: 集成 PancakeSwap V3 Subgraph
  async fetchLiveData() {
    // 未来实现：从 PancakeSwap Subgraph 获取实时数据
    throw new Error('Live data not implemented yet');
  }
}
