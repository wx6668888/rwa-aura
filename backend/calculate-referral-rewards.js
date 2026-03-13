const { getPool } = require('./dist/config/database.config');

async function calculateReferralRewards() {
  const pool = getPool();
  
  try {
    // 获取所有锁仓质押（lock_period > 0）
    const [stakes] = await pool.query(`
      SELECT s.*, r.referrer_address 
      FROM stake_events s
      LEFT JOIN referral_bindings r ON LOWER(s.user_address) = LOWER(r.user_address)
      WHERE s.lock_period > 0 AND r.referrer_address IS NOT NULL
    `);
    
    console.log(`Found ${stakes.length} locked stakes with referrers`);
    
    for (const stake of stakes) {
      const amount = BigInt(stake.amount);
      const rewardRate = 3; // 3% = 300 basis points
      
      let rewardAmount;
      const stakeType = stake.event_type === 'USDT_STAKE' ? 'USDT' : 'RWA';
      
      if (stake.event_type === 'USDT_STAKE') {
        rewardAmount = amount * BigInt(3) / BigInt(100);
      } else if (stake.event_type === 'RWA_STAKE') {
        // RWA × 0.85 × 3%
        rewardAmount = amount * BigInt(85) * BigInt(3) / BigInt(10000);
      }
      
      const stakeTime = new Date(stake.timestamp * 1000);
      const maturityTime = new Date((stake.timestamp + stake.lock_period * 86400) * 1000);
      
      console.log(`Stake: ${stakeType}, Amount: ${amount.toString()}, Reward: ${rewardAmount.toString()}`);
      
      // 插入奖励记录（转换为以太单位）
      await pool.query(`
        INSERT INTO direct_referral_rewards 
        (referrer_address, referee_address, stake_id, stake_amount, stake_type, 
         referrer_level, reward_rate, reward_amount, stake_time, maturity_time, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        stake.referrer_address,
        stake.user_address,
        stake.stake_id || 0,
        (Number(amount) / 1e18).toFixed(18), // 转换为以太
        stakeType,
        1,
        rewardRate * 100,
        (Number(rewardAmount) / 1e18).toFixed(18), // 转换为以太
        stakeTime,
        maturityTime,
        'MATURED'
      ]);
    }
    
    console.log('✅ Referral rewards calculated!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

calculateReferralRewards();
