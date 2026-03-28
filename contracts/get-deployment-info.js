const { ethers } = require('ethers');

async function getContractCreation() {
  const provider = new ethers.providers.JsonRpcProvider('https://bsc-dataseed.binance.org/');
  const address = '0x1E297055ffAA3BDD2a2eD96bD86A1B89d9245f99';
  
  console.log('查询合约部署信息...');
  console.log('合约地址:', address);
  
  // 获取合约代码确认存在
  const code = await provider.getCode(address);
  if (code === '0x') {
    console.log('错误：合约不存在');
    return;
  }
  
  console.log('✅ 合约已部署');
  console.log('');
  console.log('请访问BSCScan查看详细部署信息：');
  console.log(`https://bscscan.com/address/${address}`);
}

getContractCreation()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
