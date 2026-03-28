const { ethers } = require("hardhat");
const mysql = require('mysql2/promise');

async function main() {
  console.log("=== 批量导入所有用户 ===\n");
  
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
  const now = Math.floor(Date.now()/1000);
  
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
        rwaPending: 0,
        usdtRewards: 0,
        lastWithdrawTime: 0,
        referrer: ethers.ZeroAddress,
        firstStakeTime: now,
        nodeLevel: 1,
        isActive: true
      };
      
      const rwaInfo = {
        totalStakedRWA: totalRWA,
        rwaPending: 0,
        lastWithdrawTime: 0,
        referrer: ethers.ZeroAddress,
        firstStakeTime: now,
        nodeLevel: 1,
        isActive: true
      };
      
      const rwaLocks = stakes.map(s => ({
        stakeId: s.stake_id,
        totalAmount: BigInt(s.amount),
        principalAmount: BigInt(s.amount),
        lockStartTime: now,
        lockEndTime: s.lock_end_time,
        isWithdrawn: false,
        lockPeriod: s.lock_period
      }));
      
      const tx = await staking.migrationImportUserBundle(
        user_address, userInfo, rwaInfo, [], rwaLocks, 0, 0, 0, 0, [], 0, totalRWA
      );
      
      await tx.wait();
      successCount++;
      console.log(`✅ 成功 (${successCount}/${users.length})\n`);
      
    } catch (error) {
      console.error(`❌ 失败:`, error.message.substring(0, 150), '\n');
    }
  }
  
  await connection.end();
  console.log(`\n✅ 完成！成功: ${successCount}/${users.length}`);
}

main().catch(console.error);
