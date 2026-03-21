/**
 * 调试后端 API 数据
 * 检查 /api/user/:address/level-info 返回的数据
 */

const testAddress = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const apiUrl = 'http://localhost:3001';

async function main() {
  console.log('='.repeat(80));
  console.log('调试后端 API 数据');
  console.log('='.repeat(80));
  console.log(`测试地址: ${testAddress}`);
  console.log(`API URL: ${apiUrl}`);
  console.log('');

  try {
    // 测试 level-info 接口
    console.log('1. 测试 /api/user/:address/level-info');
    console.log('-'.repeat(80));
    
    const url = `${apiUrl}/api/user/${testAddress}/level-info?chainId=31337`;
    console.log(`请求 URL: ${url}`);
    console.log('');
    
    const response = await fetch(url);
    const data = await response.json();
    
    console.log('响应状态:', response.status);
    console.log('响应数据:');
    console.log(JSON.stringify(data, null, 2));
    console.log('');
    
    if (data.success && data.data) {
      const d = data.data;
      
      // 转换为人类可读的格式
      const toUsdt = (raw: string) => {
        if (!raw || raw === '0') return 0;
        return Number(BigInt(raw)) / 1e18;
      };
      
      console.log('2. 数据解析（转换为 USDT）');
      console.log('-'.repeat(80));
      console.log(`节点等级: ${d.nodeLevel}`);
      console.log(`个人累计质押: ${toUsdt(d.cumulativePersonalStake).toFixed(2)} USDT`);
      console.log(`团队下级质押: ${toUsdt(d.teamVolume).toFixed(2)} USDT`);
      console.log(`团队总充值: ${toUsdt(d.teamTotalDeposited).toFixed(2)} USDT`);
      console.log(`团队总提现: ${toUsdt(d.teamTotalWithdrawn).toFixed(2)} USDT`);
      console.log(`总留存: ${toUsdt(d.teamRetained).toFixed(2)} USDT`);
      console.log('');
      
      console.log('3. 计算团队总质押');
      console.log('-'.repeat(80));
      const personal = toUsdt(d.cumulativePersonalStake);
      const teamOnly = toUsdt(d.teamVolume);
      const teamTotal = personal + teamOnly;
      console.log(`个人累计质押: ${personal.toFixed(2)} USDT`);
      console.log(`团队下级质押: ${teamOnly.toFixed(2)} USDT`);
      console.log(`团队总质押 (个人+下级): ${teamTotal.toFixed(2)} USDT`);
      console.log('');
      
      // 检查是否是 7210
      if (Math.abs(personal - 7210) < 1) {
        console.log('⚠️  发现问题: 个人累计质押 = 7210 USDT');
        console.log('   这个值可能来自后端数据库的 cumulative_personal_stake 字段');
      }
      if (Math.abs(teamTotal - 7210) < 1) {
        console.log('⚠️  发现问题: 团队总质押 = 7210 USDT');
        console.log('   这个值可能来自后端数据库');
      }
    }
    
    // 测试链上数据
    console.log('');
    console.log('4. 对比链上数据');
    console.log('-'.repeat(80));
    console.log('运行以下命令查看链上数据:');
    console.log('npx hardhat run scripts/debug-dashboard-data.ts --network localhost');
    
  } catch (error) {
    console.error('错误:', error);
    console.log('');
    console.log('可能的原因:');
    console.log('1. 后端服务未启动 (运行: cd backend && npm run dev)');
    console.log('2. API URL 不正确');
    console.log('3. 数据库连接问题');
  }
  
  console.log('');
  console.log('='.repeat(80));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
