import { ethers } from 'ethers';
import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import path from 'path';

// 加载环境变量
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const RPC_URL = process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org/';
const provider = new ethers.JsonRpcProvider(RPC_URL);

// 合约地址
const STAKING_CONTRACT = process.env.STAKING_CONTRACT_ADDRESS || '0xED24C652266674beF1514a671263b78628ec766e';
const RWA_TOKEN = process.env.RWA_TOKEN_ADDRESS || '0x9EF16931f3628f48dE1A2FfCF6f7fdf34A5240A6';
const USDT_TOKEN = process.env.USDT_TOKEN_ADDRESS || '0x55d398326f99059fF775485246999027B3197955';
const TREASURY_ADDRESS = process.env.TREASURY_ADDRESS || '0x80c992C57c6439163E14050d01d1387706a27D37';
const COMMUNITY_POOL = process.env.TEAM_DIVIDEND_POOL_ADDRESS || '0x1616E70452c5A4adcF9faA93c5a4A691d0215924';

const TG_BOT_TOKEN = '8757394124:AAEkWBgSRukSkTi-NeUjkcKGSV14mLspOek';
const CHAT_ID = '1689217781';

const ERC20_ABI = ["function balanceOf(address owner) view returns (uint256)"];

const rwaContract = new ethers.Contract(RWA_TOKEN, ERC20_ABI, provider);
const usdtContract = new ethers.Contract(USDT_TOKEN, ERC20_ABI, provider);

const dbConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};

async function getDailyReport() {
  const pool = mysql.createPool(dbConfig);
  let report = `📊 *RWA Protocol 每日运营简报*\n📅 日期: ${new Date().toISOString().split('T')[0]}\n\n`;

  try {
    // 1. 链上获取余额
    const usdtStakingBalRaw = await usdtContract.balanceOf(STAKING_CONTRACT);
    const rwaStakingBalRaw = await rwaContract.balanceOf(STAKING_CONTRACT);
    const rwaTreasuryBalRaw = await rwaContract.balanceOf(TREASURY_ADDRESS);
    const rwaPoolBalRaw = await rwaContract.balanceOf(COMMUNITY_POOL);
    
    const usdtStakingBal = ethers.formatUnits(usdtStakingBalRaw, 18);
    const rwaStakingBal = ethers.formatUnits(rwaStakingBalRaw, 18);
    const rwaTreasuryBal = ethers.formatUnits(rwaTreasuryBalRaw, 18);
    const rwaPoolBal = ethers.formatUnits(rwaPoolBalRaw, 18);

    // Relayer 钱包 - 修正: 将 provider 传入 Wallet，否则无法查余额!
    let gasStatus = '未知';
    if(process.env.RELAYER_PRIVATE_KEY) {
       let pKey = process.env.RELAYER_PRIVATE_KEY;
       if (!pKey.startsWith('0x')) pKey = '0x' + pKey;
       
       const relayerWallet = new ethers.Wallet(pKey, provider); // 必须传 provider
       const bnbBalanceRaw = await provider.getBalance(relayerWallet.address);
       const bnbBalance = ethers.formatEther(bnbBalanceRaw);
       
       if(parseFloat(bnbBalance) < 0.05) {
           gasStatus = `⚠️ 极低(${parseFloat(bnbBalance).toFixed(4)} BNB)`;
       } else {
           gasStatus = `🟢 充足(${parseFloat(bnbBalance).toFixed(4)} BNB)`;
       }
    }

    report += `💰 *【全局资金状态 (链上真实数据)】*\n`;
    report += `- USDT 总质押池：\`${parseFloat(usdtStakingBal).toFixed(2)}\` USDT\n`;
    report += `- RWA 总质押池：\`${parseFloat(rwaStakingBal).toFixed(2)}\` RWA\n`;
    report += `- 国库储备池：\`${parseFloat(rwaTreasuryBal).toFixed(2)}\` RWA\n`;
    report += `- 社区奖励池：\`${parseFloat(rwaPoolBal).toFixed(2)}\` RWA\n`;
    report += `- 代付钱包Gas：${gasStatus}\n\n`;

    // 2. 数据库查询 (今日增量)
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayStartUnix = Math.floor(todayStart.getTime() / 1000);
    
    const [totalUsersRows]: any = await pool.query(`SELECT COUNT(*) as total FROM users`);
    const totalUsers = totalUsersRows[0].total;

    const [todayUsdtStakes]: any = await pool.query(
      `SELECT SUM(CAST(amount AS DECIMAL(38,0))) as total FROM stake_events WHERE event_type = 'USDT' AND timestamp >= ?`, [todayStartUnix]
    );
    const todayUsdtStakeTotal = todayUsdtStakes[0].total ? (todayUsdtStakes[0].total / 1e18).toFixed(2) : '0.00';

    const [todayRwaStakes]: any = await pool.query(
      `SELECT SUM(CAST(amount AS DECIMAL(38,0))) as total FROM stake_events WHERE event_type = 'RWA' AND timestamp >= ?`, [todayStartUnix]
    );
    const todayRwaStakeTotal = todayRwaStakes[0].total ? (todayRwaStakes[0].total / 1e18).toFixed(2) : '0.00';

    const [todayUsdtWithdrawals]: any = await pool.query(
      `SELECT SUM(CAST(amount AS DECIMAL(38,0))) as total FROM withdrawal_events WHERE event_type LIKE '%USDT%' AND timestamp >= ?`, [todayStartUnix]
    );
    const todayUsdtWithdrawTotal = todayUsdtWithdrawals[0].total ? (todayUsdtWithdrawals[0].total / 1e18).toFixed(2) : '0.00';
    
    const [todayRwaWithdrawals]: any = await pool.query(
      `SELECT SUM(CAST(amount AS DECIMAL(38,0))) as total FROM withdrawal_events WHERE event_type LIKE '%RWA%' AND timestamp >= ?`, [todayStartUnix]
    );
    const todayRwaWithdrawTotal = todayRwaWithdrawals[0].total ? (todayRwaWithdrawals[0].total / 1e18).toFixed(2) : '0.00';

    const netUsdtInflow = parseFloat(todayUsdtStakeTotal) - parseFloat(todayUsdtWithdrawTotal);
    const netRwaInflow = parseFloat(todayRwaStakeTotal) - parseFloat(todayRwaWithdrawTotal);
    
    const netUsdtInflowStatus = netUsdtInflow >= 0 ? `🟢 +${netUsdtInflow.toFixed(2)}` : `🔴 ${netUsdtInflow.toFixed(2)}`;
    const netRwaInflowStatus = netRwaInflow >= 0 ? `🟢 +${netRwaInflow.toFixed(2)}` : `🔴 ${netRwaInflow.toFixed(2)}`;

    report += `👥 *【今日数据增长 (DB流水)】*\n`;
    report += `- 历史总质押人数：\`${totalUsers}\` 人\n`;
    report += `- 今日新增质押 (USDT)：\`+${todayUsdtStakeTotal}\`\n`;
    report += `- 今日新增质押 (RWA)：\`+${todayRwaStakeTotal}\`\n`;
    report += `- 今日解押/提现 (USDT)：\`-${todayUsdtWithdrawTotal}\`\n`;
    report += `- 今日解押/提现 (RWA)：\`-${todayRwaWithdrawTotal}\`\n`;
    report += `- 今日 USDT 净流入：${netUsdtInflowStatus}\n`;
    report += `- 今日 RWA 净流入：${netRwaInflowStatus}\n\n`;

    console.log('发送到 Telegram...', report);
    const tgUrl = `https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`;
    await fetch(tgUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHAT_ID, text: report, parse_mode: 'Markdown' })
    });

  } catch (error) {
    console.error('获取日报数据出错:', error);
  } finally {
    await pool.end();
  }
}

getDailyReport();
