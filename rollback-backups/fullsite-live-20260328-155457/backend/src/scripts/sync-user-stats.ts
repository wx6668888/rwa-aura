// backend/src/scripts/sync-user-stats.ts
// [Logic Memory] 将现有链上数据同步到 user_stats 表
// 一次性同步脚本，用于初始化或修复 user_stats 数据

import { ethers } from 'ethers';
import { query } from '../config/database.config';
import logger from '../utils/logger';
import { getBscRpcUrl } from '../config/rpc-url';
import { BSC_MAINNET_ADDRESSES } from '../config/bsc-mainnet-addresses';

const RPC_URL = getBscRpcUrl();
const STAKING_CONTRACT =
  process.env.STAKING_CONTRACT_ADDRESS ||
  process.env.STAKING_CONTRACT ||
  BSC_MAINNET_ADDRESSES.stakingContract;

const STAKING_ABI = [
  'function users(address) view returns (uint256 totalStaked, uint256 rwaPending, uint256 usdtRewards, uint256 lastWithdrawTime, address referrer, uint256 firstStakeTime, uint8 nodeLevel, bool isActive)',
  'function rwaStakes(address) view returns (uint256 totalStakedRWA, uint256 rwaPending, uint256 lastWithdrawTime, address referrer, uint256 firstStakeTime, uint8 nodeLevel, bool isActive)'
];

async function syncUserStats() {
  console.log('🔄 开始同步 user_stats 数据...\n');

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const contract = new ethers.Contract(STAKING_CONTRACT, STAKING_ABI, provider);
  
  try {
    // 1. 获取所有用户地址
    const users = await query<any[]>('SELECT DISTINCT address FROM users');
    console.log(`📊 找到 ${users.length} 个用户\n`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const user of users) {
      const address = user.address;
      
      try {
        console.log(`处理用户: ${address}`);
        
        // 2. 从链上读取数据
        const [userInfo, rwaInfo] = await Promise.all([
          contract.users(address),
          contract.rwaStakes(address)
        ]);
        
        const usdtStaked = userInfo.totalStaked.toString();
        const rwaStaked = rwaInfo.totalStakedRWA.toString();
        
        // 3. 计算 USDT 等值
        const usdtStakedNum = Number(usdtStaked) / 1e18;
        const rwaStakedNum = Number(rwaStaked) / 1e18;
        const rwaPrice = 0.85;
        const totalUsdt = usdtStakedNum + (rwaStakedNum * rwaPrice);
        
        // 4. 查询团队数据
        const [teamData] = await query<any[]>(
          `SELECT 
            COALESCE(u.team_volume, '0') as team_volume,
            COALESCE(u.team_total_deposited, '0') as team_deposited,
            COALESCE(u.team_total_withdrawn, '0') as team_withdrawn,
            COALESCE(u.direct_referral_count, 0) as direct_count
           FROM users u
           WHERE LOWER(u.address) = LOWER(?)`,
          [address]
        );
        
        const teamVolume = teamData ? parseFloat(teamData.team_volume || '0') : 0;
        const teamRetained = teamData 
          ? parseFloat(teamData.team_deposited || '0') - parseFloat(teamData.team_withdrawn || '0')
          : 0;
        const directCount = teamData ? teamData.direct_count : 0;
        
        // 5. 计算等级
        const level = calculateLevel(totalUsdt, teamVolume, teamRetained);
        
        // 6. 更新或插入 user_stats
        await query(
          `INSERT INTO user_stats (
            user_address,
            personal_usdt_staked,
            personal_rwa_staked,
            personal_total_usdt,
            direct_referrals,
            team_volume_usdt,
            team_retained_usdt,
            current_level,
            effective_level,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
          ON DUPLICATE KEY UPDATE
            personal_usdt_staked = VALUES(personal_usdt_staked),
            personal_rwa_staked = VALUES(personal_rwa_staked),
            personal_total_usdt = VALUES(personal_total_usdt),
            direct_referrals = VALUES(direct_referrals),
            team_volume_usdt = VALUES(team_volume_usdt),
            team_retained_usdt = VALUES(team_retained_usdt),
            current_level = VALUES(current_level),
            effective_level = VALUES(effective_level),
            updated_at = NOW()`,
          [
            address.toLowerCase(),
            usdtStaked,
            rwaStaked,
            totalUsdt.toFixed(6),
            directCount,
            teamVolume.toFixed(6),
            teamRetained.toFixed(6),
            level,
            level
          ]
        );
        
        console.log(`  ✅ 成功: USDT=${usdtStakedNum.toFixed(2)}, RWA=${rwaStakedNum.toFixed(2)}, 等级=${level}`);
        successCount++;
        
        // 避免 RPC 限流
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error: any) {
        console.error(`  ❌ 失败: ${error.message}`);
        errorCount++;
      }
    }
    
    console.log(`\n📊 同步完成:`);
    console.log(`  ✅ 成功: ${successCount}`);
    console.log(`  ❌ 失败: ${errorCount}`);
    console.log(`  📈 总计: ${users.length}`);
    
  } catch (error: any) {
    console.error('❌ 同步失败:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

function calculateLevel(personalUsdt: number, teamVolume: number, teamRetained: number): number {
  let level = 1;
  const levels = [
    { level: 2, personal: 1000, team: 5000, retained: 0 },
    { level: 3, personal: 3000, team: 20000, retained: 0 },
    { level: 4, personal: 5000, team: 50000, retained: 0 },
    { level: 5, personal: 10000, team: 100000, retained: 0 },
    { level: 6, personal: 20000, team: 300000, retained: 0 },
    { level: 7, personal: 50000, team: 1000000, retained: 0 },
    { level: 8, personal: 100000, team: 3000000, retained: 0 },
    { level: 9, personal: 200000, team: 10000000, retained: 0 },
  ];
  
  for (const config of levels) {
    if (
      personalUsdt >= config.personal &&
      teamVolume >= config.team &&
      teamRetained >= config.retained
    ) {
      level = config.level;
    } else {
      break;
    }
  }
  
  return level;
}

syncUserStats();
