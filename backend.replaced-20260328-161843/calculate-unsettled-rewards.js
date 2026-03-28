const mysql = require('mysql2/promise');
const { ethers } = require('ethers');
require('dotenv').config();

const userAddress = '0x0fc49964F76696abeD8c11C568c04A72aebDB15b';

// 收益率配置
const BASE_RATE = 0.001; // 0.1%每天
const LOCK_BONUS = {
  0: 0,      // 灵活：0%
  30: 0.10,  // 30天：+10%
  90: 0.20,  // 90天：+20%
  180: 0.30, // 180天：+30%
  365: 0.50  // 365天：+50%
};

(async () => {
  const conn = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'wuxi3211',
    database: 'rwa_protocol'
  });
  
  // 获取当前时间
  const now = Math.floor(Date.now() / 1000);
  const nowDate = new Date();
  
  console.log('=== 用户未结算收益计算 ===');
  console.log('用户地址:', userAddress);
  console.log('当前时间:', nowDate.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }));
  console.log('Unix时间戳:', now);
  console.log('');
  
  // 查询用户的所有质押记录
  const [stakes] = await conn.query(
    `SELECT stake_id, amount, event_type, lock_period, timestamp, tx_hash
     FROM stake_events
     WHERE LOWER(user_address) = LOWER(?)
     ORDER BY timestamp ASC`,
    [userAddress]
  );
  
  if (stakes.length === 0) {
    console.log('❌ 该用户没有任何质押记录');
    await conn.end();
    return;
  }
  
  console.log(`找到 ${stakes.length} 条质押记录\n`);
  
  let totalUnsettled = 0;
  
  for (const stake of stakes) {
    const amount = parseFloat(stake.amount) / 1e18;
    const lockPeriod = stake.lock_period;
    const stakeTime = Number(stake.timestamp);
    const stakeDate = new Date(stakeTime * 1000);
    
    console.log(`--- 质押记录 #${stake.stake_id} ---`);
    console.log(`类型: ${stake.event_type}`);
    console.log(`金额: ${amount.toFixed(2)}`);
    console.log(`锁仓期: ${lockPeriod}天`);
    console.log(`质押时间: ${stakeDate.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`);
    
    // 计算未结算收益
    // 从上次08:00（UTC 00:00）开始计算
    const last8AM = Math.floor(now / 86400) * 86400; // UTC 00:00 = 北京08:00
    const startTime = Math.max(stakeTime, last8AM);
    const duration = now - startTime;
    
    const lockBonus = LOCK_BONUS[lockPeriod] || 0;
    const dailyRate = BASE_RATE * (1 + lockBonus);
    const secondRate = dailyRate / 86400;
    const unsettled = amount * secondRate * duration;
    
    totalUnsettled += unsettled;
    
    console.log(`每日收益率: ${(dailyRate * 100).toFixed(2)}% (基础0.1% + 锁仓加成${(lockBonus * 100).toFixed(0)}%)`);
    console.log(`计算起始时间: ${new Date(startTime * 1000).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`);
    console.log(`持续时长: ${Math.floor(duration / 3600)}小时 ${Math.floor((duration % 3600) / 60)}分钟`);
    console.log(`未结算收益: ${unsettled.toFixed(6)} ${stake.event_type}`);
    console.log('');
  }
  
  // 分类统计
  let usdtUnsettled = 0;
  let rwaUnsettled = 0;
  
  for (const stake of stakes) {
    const amount = parseFloat(stake.amount) / 1e18;
    const lockPeriod = stake.lock_period;
    const stakeTime = Number(stake.timestamp);
    
    const last8AM = Math.floor(now / 86400) * 86400;
    const startTime = Math.max(stakeTime, last8AM);
    const duration = now - startTime;
    
    const lockBonus = LOCK_BONUS[lockPeriod] || 0;
    const dailyRate = BASE_RATE * (1 + lockBonus);
    const secondRate = dailyRate / 86400;
    const unsettled = amount * secondRate * duration;
    
    if (stake.event_type === 'USDT') {
      usdtUnsettled += unsettled;
    } else {
      rwaUnsettled += unsettled;
    }
  }
  
  // RWA价格：0.85 USDT
  const RWA_PRICE = 0.85;
  const usdtToRwa = usdtUnsettled / RWA_PRICE;
  const totalRwa = usdtToRwa + rwaUnsettled;
  
  console.log('=== 汇总（统一换算为RWA）===');
  console.log(`USDT未结算收益: ${usdtUnsettled.toFixed(6)} USDT`);
  console.log(`  换算为RWA: ${usdtToRwa.toFixed(6)} RWA (按0.85汇率)`);
  console.log(`RWA未结算收益: ${rwaUnsettled.toFixed(6)} RWA`);
  console.log(`---`);
  console.log(`总未结算收益: ${totalRwa.toFixed(6)} RWA`);
  console.log(`下次结算时间: 明天 08:00:00 (北京时间)`);
  
  await conn.end();
})();
