const { ethers } = require('ethers');
require('dotenv').config();

const STAKING_ABI = [
  "function getUserStakeInfo(address user) view returns (uint256 totalStaked, uint256 rwaPending, uint256 lastWithdrawTime, address referrer, uint256 firstStakeTime)",
  "function usdtFlexibleTotalStaked(address user) view returns (uint256)",
  "function getUSDTLockedPrincipals(address user) view returns (uint256[] stakeIds, uint256[] amounts, uint256[] lockStartTimes, uint256[] lockEndTimes, bool[] canWithdraw, bool[] isWithdrawn)"
];

(async () => {
  const provider = new ethers.JsonRpcProvider(process.env.BSC_TESTNET_RPC_URL);
  const contract = new ethers.Contract(process.env.STAKING_CONTRACT, STAKING_ABI, provider);
  
  const userAddr = '0xCD5b97505499B1575e481446384430bb159851b6';
  
  console.log('=== 用户合约数据（正确ABI）===');
  console.log('用户地址:', userAddr);
  console.log('');
  
  // 总质押
  const usdtInfo = await contract.getUserStakeInfo(userAddr);
  const totalStaked = Number(ethers.formatUnits(usdtInfo[0], 18));
  console.log('【合约totalStaked】:', totalStaked.toFixed(2), 'USDT');
  console.log('');
  
  // 灵活质押
  const flexStaked = await contract.usdtFlexibleTotalStaked(userAddr);
  const flexAmount = Number(ethers.formatUnits(flexStaked, 18));
  console.log('【灵活质押totalStaked】:', flexAmount.toFixed(2), 'USDT');
  console.log('');
  
  // 锁仓订单（正确的返回格式）
  const result = await contract.getUSDTLockedPrincipals(userAddr);
  const [stakeIds, amounts, lockStartTimes, lockEndTimes, canWithdraw, isWithdrawn] = result;
  
  console.log('【锁仓订单】共', stakeIds.length, '笔:');
  
  let lockedTotal = 0;
  let lockedPrincipalTotal = 0;
  
  for (let i = 0; i < stakeIds.length; i++) {
    const amt = Number(ethers.formatUnits(amounts[i], 18));
    const endTime = Number(lockEndTimes[i]);
    const withdrawn = isWithdrawn[i];
    
    if (!withdrawn) {
      lockedPrincipalTotal += amt;
      // principalAmount是50%，全额是2倍
      lockedTotal += amt * 2;
    }
    
    const timeStr = endTime > 0 && endTime < 2000000000 
      ? new Date(endTime * 1000).toLocaleString('zh-CN')
      : '无效';
    
    const status = withdrawn ? '✅已提现' : '🔒未提现';
    
    console.log(`  ${i+1}. stakeId:${stakeIds[i]} | principalAmount:${amt.toFixed(2)} | 到期:${timeStr} | ${status}`);
  }
  
  console.log('');
  console.log('未提现锁仓principalAmount(50%):', lockedPrincipalTotal.toFixed(2), 'USDT');
  console.log('未提现锁仓全额(100%):', lockedTotal.toFixed(2), 'USDT');
  console.log('');
  
  console.log('=== 验证 ===');
  console.log('灵活:', flexAmount.toFixed(2));
  console.log('锁仓全额:', lockedTotal.toFixed(2));
  console.log('合计:', (flexAmount + lockedTotal).toFixed(2));
  console.log('totalStaked:', totalStaked.toFixed(2));
  console.log('是否一致:', Math.abs((flexAmount + lockedTotal) - totalStaked) < 0.01 ? '✅' : '❌');
})();
