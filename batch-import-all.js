const { ethers } = require("hardhat");
const mysql = require('mysql2/promise');

async function main() {
  console.log("=== 批量导入所有用户数据 ===\n");
  
  const stakingAddr = "0xED24C652266674beF1514a671263b78628ec766e";
  const staking = await ethers.getContractAt("StakingContract", stakingAddr);
  
  // 连接数据库
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'rwa_protocol_v2',
    password: 'wuxi3211',
    database: 'rwa_protocol_v2'
  });
  
  // 获取所有用户
  const [users] = await connection.execute(`
    SELECT DISTINCT user_address FROM locked_stakes WHERE is_withdrawn = 0
  `);
  
  console.log(`找到 ${users.length} 个用户需要导入\n`);
  
  let successCount = 0;
  
  for (const { user_address } of users) {
    try {
      console.log(`导入用户 ${successCount + 1}/${users.length}: ${user_address}`);
      
      // 获取该用户的所有质押记录
      const [stakes] = await connection.execute(`
        SELECT stake_id, amount, lock_period, lock_end_time 
        FROM locked_stakes 
        WHERE user_address = ? AND is_withdrawn = 0
      `, [user_address]);
      
      // 计算总质押
      let totalRWA = 0n;
      for (const stake of stakes) {
        totalRWA += BigInt(stake.amount);
      }
      
      // 构建UserInfo
      const userInfo = {
        totalStaked: 0,
        totalStakedRWA: totalRWA,
        referrer: ethers.ZeroAddress,
        userLevel: 1,
        lastClaimTime: 0
      };
      
      // 构建RWA锁定本金数组
      const rwaLocks = stakes.map(s => ({
        stakeId: s.stake_id,
        principal: BigInt(s.amount),
        lockPeriod: s.lock_period * 24 * 3600,
        lockEndTime: s.lock_end_time
      }));
      
      // 导入用户
      const tx = await staking.migrationImportUser(
        user_address,
        userInfo,
        [], // usdtLocks
        rwaLocks,
        0, // usdtFlexPrincipal
        0, // rwaFlexPrincipal
        [] // stakeHistory
      );
      
      await tx.wait();
      successCount++;
      console.log(`✅ 成功 (${successCount}/${users.length})\n`);
      
    } catch (error) {
      console.error(`❌ 失败:`, error.message, '\n');
    }
  }
  
  await connection.end();
  console.log(`\n✅ 导入完成！成功: ${successCount}/${users.length}`);
}

main().catch(console.error);
