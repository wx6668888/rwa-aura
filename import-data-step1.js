const { ethers } = require("hardhat");
const mysql = require('mysql2/promise');

async function main() {
  console.log("=== 启用迁移模式并导入数据 ===\n");
  
  const stakingAddr = "0xED24C652266674beF1514a671263b78628ec766e";
  const staking = await ethers.getContractAt("StakingContract", stakingAddr);
  
  // 1. 启用迁移模式
  console.log("1. 启用迁移模式...");
  let tx = await staking.setMigrationEnabled(true);
  await tx.wait();
  console.log("✅ 迁移模式已启用\n");
  
  // 2. 从数据库读取数据
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'rwa_protocol_v2',
    password: 'wuxi3211',
    database: 'rwa_protocol_v2'
  });
  
  console.log("2. 读取质押数据...");
  const [stakes] = await connection.execute(`
    SELECT user_address, stake_id, amount, lock_period, lock_end_time 
    FROM locked_stakes 
    WHERE is_withdrawn = 0 
    ORDER BY id
  `);
  
  console.log(`找到 ${stakes.length} 条锁定质押记录\n`);
  
  await connection.end();
  
  console.log("准备导入数据...");
  console.log("(脚本已准备好，等待确认)");
}

main().catch(console.error);
