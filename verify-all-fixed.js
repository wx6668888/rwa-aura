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
    SELECT user_address, SUM(CAST(amount AS DECIMAL(65,0))) as total 
    FROM locked_stakes 
    WHERE is_withdrawn = 0 
    GROUP BY user_address
  `);
  
  console.log("=== 验证所有18个用户 ===\n");
  
  let matchCount = 0;
  
  for (const { user_address, total } of users) {
    const rwaStake = await staking.rwaStakes(user_address);
    const onchain = rwaStake.totalStakedRWA.toString();
    const match = onchain === total.toString() ? "✅" : "❌";
    
    console.log(`${match} ${user_address.substring(0, 10)}...`);
    
    if (match === "✅") matchCount++;
  }
  
  console.log(`\n✅ 匹配: ${matchCount}/${users.length}`);
  
  await connection.end();
}

main().catch(console.error);
