const { ethers } = require('ethers');
const mysql = require('mysql2/promise');
require('dotenv').config();

/**
 * 初始化提现页面数据
 * 从链上同步所有用户的 referral_balance, dividend_balance, strwa_balance
 */
async function initWithdrawData() {
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

  try {
    console.log('📊 开始初始化提现数据...\n');

    // 获取所有用户地址
    const [rows] = await connection.query('SELECT user_address FROM user_stats');
    const users = rows;

    console.log(`找到 ${users.length} 个用户\n`);

    const referralPoolAddress = process.env.REFERRAL_REWARD_POOL;
    const stakingContractAddress = process.env.STAKING_CONTRACT_ADDRESS;
    const strwaAddress = process.env.STRWA_ADDRESS;

    let successCount = 0;
    let errorCount = 0;

    for (const user of users) {
      const userAddress = user.user_address;
      
      try {
        let referralBalance = '0';
        let dividendBalance = '0';
        let strwaBalance = '0';

        // 1. 读取推荐奖励
        if (referralPoolAddress) {
          try {
            const contract = new ethers.Contract(
              referralPoolAddress,
              ['function withdrawableBalance(address) view returns (uint256)'],
              provider
            );
            const balance = await contract.withdrawableBalance(userAddress);
            referralBalance = balance.toString();
          } catch (err) {
            console.log(`  ⚠️  无法读取推荐奖励: ${userAddress}`);
          }
        }

        // 2. 读取分红
        if (stakingContractAddress) {
          try {
            const contract = new ethers.Contract(
              stakingContractAddress,
              ['function dividends(address) view returns (uint256)'],
              provider
            );
            const balance = await contract.dividends(userAddress);
            dividendBalance = balance.toString();
          } catch (err) {
            console.log(`  ⚠️  无法读取分红: ${userAddress}`);
          }
        }

        // 3. 读取stRWA余额
        if (strwaAddress) {
          try {
            const contract = new ethers.Contract(
              strwaAddress,
              ['function balanceOf(address) view returns (uint256)'],
              provider
            );
            const balance = await contract.balanceOf(userAddress);
            strwaBalance = balance.toString();
          } catch (err) {
            console.log(`  ⚠️  无法读取stRWA: ${userAddress}`);
          }
        }

        // 更新数据库
        await connection.query(`
          UPDATE user_stats
          SET 
            referral_balance = ?,
            dividend_balance = ?,
            strwa_balance = ?,
            updated_at = NOW()
          WHERE user_address = ?
        `, [referralBalance, dividendBalance, strwaBalance, userAddress]);

        successCount++;
        console.log(`✅ ${userAddress}: 推荐=${(Number(referralBalance)/1e6).toFixed(2)} USDT, 分红=${(Number(dividendBalance)/1e6).toFixed(2)} USDT, stRWA=${(Number(strwaBalance)/1e18).toFixed(2)}`);

      } catch (error) {
        errorCount++;
        console.error(`❌ ${userAddress}: ${error.message}`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`✅ 初始化完成: ${successCount} 成功, ${errorCount} 失败`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ 初始化失败:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

initWithdrawData().catch(console.error);
