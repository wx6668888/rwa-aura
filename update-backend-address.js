const { ethers } = require("hardhat");

async function main() {
  const stakingAddr = "0x1E297055ffAA3BDD2a2eD96bD86A1B89d9245f99";
  const newBackendAddr = "0x8927e74e0fCaED1D4C87116C805464800651f222";
  
  console.log("=== 修改backendAddress ===\n");
  console.log("StakingContract:", stakingAddr);
  console.log("新backendAddress:", newBackendAddr);
  
  const staking = await ethers.getContractAt("StakingContract", stakingAddr);
  
  // 查询当前backendAddress
  const oldBackend = await staking.backendAddress();
  console.log("\n当前backendAddress:", oldBackend);
  
  // 修改backendAddress
  console.log("\n正在修改...");
  try {
    const tx = await staking.setBackendAddress(newBackendAddr, {
      gasLimit: 200000
    });
    console.log("交易哈希:", tx.hash);
    
    await tx.wait();
    console.log("✅ 交易确认！");
  } catch (error) {
    console.error("❌ 交易失败:", error.message);
    if (error.data) {
      console.error("错误数据:", error.data);
    }
    throw error;
  }
  
  // 验证修改
  const newBackend = await staking.backendAddress();
  console.log("\n新backendAddress:", newBackend);
  console.log("修改成功:", newBackend.toLowerCase() === newBackendAddr.toLowerCase());
}

main().catch(console.error);
