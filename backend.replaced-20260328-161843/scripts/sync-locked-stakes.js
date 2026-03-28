const { ethers } = require('ethers');
const mysql = require('mysql2/promise');
require('dotenv').config();

/**
 * 从链上同步锁仓质押记录到 locked_stakes 表
 */
async function syncLockedStakes() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  const rpcUrl =
    process.env.BSC_RPC_URL ||
    process.env.BSC_TESTNET_RPC_URL ||
    process.env.RPC_URL ||
    'https://bsc.publicnode.com';
  const provider = new ethers.JsonRpcProvider(rpcUrl);

  const stakingContractAddress = process.env.STAKING_CONTRACT_ADDRESS;

  try {
    console.log('📊 开始同步锁仓质押记录...\n');

    // 获取所有用户地址
    const [rows] = await connection.query('SELECT user_address FROM user_stats');
    const users = rows;

    console.log(`找到 ${users.length} 个用户\n`);

    const stakingContract = new ethers.Contract(
      stakingContractAddress,
      [
        'function getRWALockedPrincipals(address user) view returns (uint256[] stakeIds, uint256[] amounts, uint256[] lockStartTimes, uint256[] lockEndTimes, bool[] canWithdraw, bool[] isWithdrawn)',
        'function getUSDTLockedPrincipals(address user) view returns (uint256[] stakeIds, uint256[] amounts, uint256[] lockStartTimes, uint256[] lockEndTimes, bool[] canWithdraw, bool[] isWithdrawn)'
      ],
      provider
    );

    let totalInserted = 0;

    for (const user of users) {
      const userAddress = user.user_address;
      
      try {
        // 1. 读取RWA锁仓
        const [rwaStakeIds, rwaAmounts, rwaLockStartTimes, rwaLockEndTimes, , rwaIsWithdrawn] = 
          await stakingContract.getRWALockedPrincipals(userAddress);

        for (let i = 0; i < rwaStakeIds.length; i++) {
          const stakeId = `rwa_${rwaStakeIds[i]}`;
          const amount = (rwaAmounts[i] * 2n).toString(); // 合约存储50%，实际是100%
          const lockPeriod = Math.floor((Number(rwaLockEndTimes[i]) - Number(rwaLockStartTimes[i])) / 86400);
          
          await connection.query(`
            INSERT INTO locked_stakes 
            (user_address, stake_id, amount, is_rwa_stake, lock_period, lock_end_time, is_withdrawn, block_number, transaction_hash)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
              amount = VALUES(amount),
              is_withdrawn = VALUES(is_withdrawn)
          `, [
            userAddress,
            stakeId,
            amount,
            1, // is_rwa_stake
            lockPeriod,
            Number(rwaLockEndTimes[i]),
            rwaIsWithdrawn[i] ? 1 : 0,
            0, // block_number (unknown)
            '0x0' // transaction_hash (unknown)
          ]);
          
          totalInserted++;
          console.log(`✅ ${userAddress}: RWA锁仓 ${stakeId}, ${(Number(amount)/1e18).toFixed(2)} RWA, ${lockPeriod}天`);
        }

        // 2. 读取USDT锁仓
        const [usdtStakeIds, usdtAmounts, usdtLockStartTimes, usdtLockEndTimes, , usdtIsWithdrawn] = 
          await stakingContract.getUSDTLockedPrincipals(userAddress);

        for (let i = 0; i < usdtStakeIds.length; i++) {
          const stakeId = `usdt_${usdtStakeIds[i]}`;
          const amount = (usdtAmounts[i] * 2n).toString(); // 合约存储50%，实际是100%
          const lockPeriod = Math.floor((Number(usdtLockEndTimes[i]) - Number(usdtLockStartTimes[i])) / 86400);
          
          await connection.query(`
            INSERT INTO locked_stakes 
            (user_address, stake_id, amount, is_rwa_stake, lock_period, lock_end_time, is_withdrawn, block_number, transaction_hash)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
              amount = VALUES(amount),
              is_withdrawn = VALUES(is_withdrawn)
          `, [
            userAddress,
            stakeId,
            amount,
            0, // is_rwa_stake
            lockPeriod,
            Number(usdtLockEndTimes[i]),
            usdtIsWithdrawn[i] ? 1 : 0,
            0,
            '0x0'
          ]);
          
          totalInserted++;
          console.log(`✅ ${userAddress}: USDT锁仓 ${stakeId}, ${(Number(amount)/1e18).toFixed(2)} USDT, ${lockPeriod}天`);
        }

      } catch (error) {
        console.error(`❌ ${userAddress}: ${error.message}`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`✅ 同步完成: 共插入 ${totalInserted} 条锁仓记录`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ 同步失败:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

syncLockedStakes().catch(console.error);
