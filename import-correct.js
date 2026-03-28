const { ethers } = require("hardhat");
const mysql = require('mysql2/promise');

async function main() {
  console.log("=== 批量导入用户数据 ===\n");
  
  const stakingAddr = "0xED24C652266674beF1514a671263b78628ec766e";
  const staking = await ethers.getContractAt("StakingContract", stakingAddr);
  
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'rwa_protocol_v2',
    password: 'wuxi3211',
    database: 'rwa_protocol_v2'
  });
  
  const [users] = await connection.execute(`
    SELECT DISTINCT user_address FROM locked_stakes WHERE is_withdrawn = 0
  `);
  
  console.log(`找到 ${users.length} 个用户\n`);
  
  let successCount = 0;
  
  for (const { user_address } of users) {
    try {
      console.log(`导入 ${successCount + 1}/${users.length}: ${user_address}`);
      
      const [stakes] = await connection.execute(`
        SELECT stake_id, amount, lock_period, lock_end_time 
        FROM locked_stakes 
        WHERE user_address = ? AND is_withdrawn = 0
      `, [user_address]);
      
      let totalRWA = 0n;
      for (const s of stakes) {
        totalRWA += BigInt(s.amount);
      }
      
      const userInfo = {
        totalStaked: 0,
        totalStakedRWA: totalRWA,
        referrer: ethers.ZeroAddress,
        userLevel: 1,
        lastClaimTime: 0
      };
      
      const rwaInfo = {
        totalStakedRWA: totalRWA,
        rwaPending: 0,
        lastWithdrawTime: 0,
        referrer: ethers.ZeroAddress,
        firstStakeTime: Math.floor(Date.now() / 1000),
        nodeLevel: 1,
        isActive: true
      };
      
      const rwaLocks = stakes.map(s => ({
        stakeId: s.stake_id,
        principal: BigInt(s.amount),
        lockPeriod: s.lock_period * 24 * 3600,
        lockEndTime: s.lock_end_time
      }));
      
      const tx = await staking.migrationImportUserBundle(
        user_address,
        userInfo,
        rwaInfo,
        [], // usdtLocks
        rwaLocks,
        0, 0, 0, 0, // flex amounts
        [], // history
        0, // globalDeltaTotalStaked
        totalRWA // globalDeltaTotalStakedRWA
      );
      
      await tx.wait();
      successCount++;
      console.log(`✅ 成功\n`);
      
    } catch (error) {
      console.error(`❌ 失败:`, error.message.substring(0, 100), '\n');
    }
  }
  
  await connection.end();
  console.log(`\n完成！成功: ${successCount}/${users.length}`);
}

main().catch(console.error);
