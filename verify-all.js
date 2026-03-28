const { ethers } = require("hardhat");
const mysql = require('mysql2/promise');

async function main() {
  const stakingAddr = "0xED24C652266674beF1514a671263b78628ec766e";
  const staking = await ethers.getContractAt("StakingContract", stakingAddr);
  
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'rwa_protocol_v2',
    password: 'wuxi3211',
    database: 'rwa_protocol_v2'
  });
  
  const [users] = await connection.execute(`
    SELECT user_address, SUM(amount) as total 
    FROM locked_stakes 
    WHERE is_withdrawn = 0 
    GROUP BY user_address
  `);
  
  console.log("=== 验证所有用户数据 ===\n");
  
  let matchCount = 0;
  
  for (const { user_address, total } of users) {
    const rwaStake = await staking.rwaStakes(user_address);
    const onchain = ethers.formatEther(rwaStake.totalStakedRWA);
    const db = ethers.formatEther(total);
    const match = onchain === db ? "✅" : "❌";
    
    console.log(`${match} ${user_address.substring(0, 10)}... DB:${db} 链上:${onchain}`);
    
    if (onchain === db) matchCount++;
  }
  
  console.log(`\n总计: ${matchCount}/${users.length} 匹配`);
  
  await connection.end();
}

main().catch(console.error);
