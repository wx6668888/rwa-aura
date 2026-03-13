const { getPool } = require('./dist/config/database.config');

async function recalculateReferralRewards() {
  const pool = getPool();
  
  try {
    // 清空现有奖励
    await pool.query('DELETE FROM direct_referral_rewards');
    console.log('Cleared existing rewards');
    
    // 获取所有锁仓质押（lock_period >= 30天，金额 >= 100 USDT）
    const [stakes] = await pool.query(`
      SELECT s.*, r.referrer_address 
      FROM stake_events s
      LEFT JOIN referral_bindings r ON LOWER(s.user_address) = LOWER(r.user_address)
      WHERE s.lock_period >= 30 
        AND r.referrer_address IS NOT NULL
    `);
    
    console.log(`Found ${stakes.length} qualified stakes`);
    
    for (const stake of stakes) {
      const amount = BigInt(stake.amount);
      const amountInUSDT = stake.event_type === 'USDT_STAKE' 
        ? Number(amount) / 1e18 
        : (Number(amount) / 1e18) * 0.85;
      
      // 检查金额是否 >= 100 USDT
      if (amountInUSDT < 100) {
        console.log(`Skip: ${stake.event_type} amount ${amountInUSDT.toFixed(2)} < 100 USDT`);
        continue;
      }
      
      const rewardRate = 0.03; // 3%
      let rewardAmount;
      const stakeType = stake.event_type === 'USDT_STAKE' ? 'USDT' : 'RWA';
      
      if (stake.event_type === 'USDT_STAKE') {
        rewardAmount = amount * BigInt(3) / BigInt(100);
      } else {
        rewardAmount = amount * BigInt(85) * BigInt(3) / BigInt(10000);
      }
      
      const stakeTime = new Date(stake.timestamp * 1000);
      const maturityTime = new Date((stake.timestamp + stake.lock_period * 86400) * 1000);
      
      console.log(`✓ Qualified: ${stakeType}, Amount: ${amountInUSDT.toFixed(2)} USDT, Reward: ${(Number(rewardAmount) / 1e18).toFixed(2)} USDT`);
      
      // 插入奖励记录（状态为PENDING，等待周五发放）
      await pool.query(`
        INSERT INTO direct_referral_rewards 
        (referrer_address, referee_address, stake_id, stake_amount, stake_type, 
         referrer_level, reward_rate, reward_amount, stake_time, maturity_time, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        stake.referrer_address,
        stake.user_address,
        stake.stake_id || 0,
        (Number(amount) / 1e18).toFixed(18),
        stakeType,
        1,
        rewardRate * 100 * 100, // 300 basis points
        (Number(rewardAmount) / 1e18).toFixed(18),
        stakeTime,
        maturityTime,
        'PENDING' // 等待周五发放
      ]);
    }
    
    console.log('✅ Referral rewards recalculated!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

recalculateReferralRewards();
