const { ethers } = require('ethers');
require('dotenv').config();

const STAKING_ABI = [
  "function getUserStakeInfo(address user) view returns (uint256 totalStaked, uint256 rwaPending, uint256 lastWithdrawTime, address referrer, uint256 firstStakeTime)",
  "function rwaStakes(address user) view returns (uint256 totalStakedRWA, uint256 rwaPending, uint256 lastWithdrawTime, address referrer, uint256 firstStakeTime)",
  "function usdtFlexibleTotalStaked(address user) view returns (uint256)",
  "function rwaFlexibleTotalStaked(address user) view returns (uint256)",
  "function getUSDTLockedPrincipals(address user) view returns (tuple(uint256 amount, uint256 lockPeriod, uint256 lockEndTime, bool withdrawn)[])",
  "function getRWALockedPrincipals(address user) view returns (tuple(uint256 amount, uint256 lockPeriod, uint256 lockEndTime, bool withdrawn)[])"
];

(async () => {
  const provider = new ethers.JsonRpcProvider(process.env.BSC_TESTNET_RPC_URL);
  const contract = new ethers.Contract(process.env.STAKING_CONTRACT, STAKING_ABI, provider);
  
  const userAddr = '0xCD5b97505499B1575e481446384430bb159851b6';
  
  console.log('=== 从合约读取用户订单详情 ===');
  console.log('用户地址:', userAddr);
  console.log('');
  
  // USDT灵活质押
  const usdtFlex = await contract.usdtFlexibleTotalStaked(userAddr);
  console.log('USDT灵活质押总额:', Number(ethers.formatUnits(usdtFlex, 18)).toFixed(2), 'USDT');
  console.log('');
  
  // USDT锁仓订单
  const usdtLocked = await contract.getUSDTLockedPrincipals(userAddr);
  console.log('USDT锁仓订单（共', usdtLocked.length, '笔）:');
  let usdtLockedTotal = 0;
  usdtLocked.forEach((order, i) => {
    const amt = Number(ethers.formatUnits(order.amount, 18));
    const lockDays = Number(order.lockPeriod) / 86400;
    const endTime = new Date(Number(order.lockEndTime) * 1000).toLocaleString('zh-CN');
    const status = order.withdrawn ? '已提现' : '未提现';
    if (!order.withdrawn) usdtLockedTotal += amt;
    console.log(`  ${i+1}. ${amt.toFixed(2)} USDT, ${lockDays}天锁仓, 到期: ${endTime}, ${status}`);
  });
  console.log('未提现锁仓总额:', usdtLockedTotal.toFixed(2), 'USDT');
  console.log('');
  
  // 计算灵活本金
  const flexAmount = Number(ethers.formatUnits(usdtFlex, 18));
  console.log('=== 计算 ===');
  console.log('灵活本金:', flexAmount.toFixed(2), 'USDT');
  console.log('锁仓本金:', usdtLockedTotal.toFixed(2), 'USDT');
  console.log('总本金:', (flexAmount + usdtLockedTotal).toFixed(2), 'USDT');
})();
