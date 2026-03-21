/**
 * 合约分析脚本
 * 通过 BSCScan API 获取合约信息
 * 
 * 使用方法：
 * 1. 安装依赖：npm install axios
 * 2. 设置 BSCScan API Key（在 .env 文件中）
 * 3. 运行：node scripts/analyze-contracts.js
 */

const axios = require('axios');

// 合约地址列表
const CONTRACTS = {
  // 核心资金管理
  withdrawBurn: '0xeeeabf5304a7ed876e7a28ec016bb57ae6e89f26',
  treasury: '0x7B9B7d4F870A38e92c9a181B00f9b33cc8Ef5321',
  feeBurn: '0x91F1D2c2165B17a1eD2dC3B73Ae77224E6e1410E',
  stakingPool: '0x1964Ca90474b11FFD08af387b110ba6C96251Bfc',
  exchangePool: '0x882df4b0fb50a229c3b4124eb18c759911485bfb',
  daoReward: '0x0309Ca717d6989676194b88fD06029a88CEEfee6',
  turboWithdraw: '0x07Ff4e06865de4934409Aa6eCea503b08Cc1C78d',
  
  // 代币合约
  lgns: '0xeb51d9a39ad5eef215dc0bf39a8821ff804a0f01',
  slgns: '0x99a57e6c8558bc6689f894e068733adf83c19725',
  
  // 匿名稳定币系统
  stablecoinA: '0x6631eE651DA438Db2BE611B5A44dFE2Ca04590C5',
  airdropA: '0x7DC3d391dD1303894eB359b483C8894A0C1Cf681',
  burnMintA: '0xA6036c7ae9F7dAE757E9BeE5BF02860A8D5F457e',
  withdrawPool: '0x1D6A7F2cB262aFbb1204bbFCBb3db642662b15c3',
  burnA: '0x9dA64DF74565861708781B9Ad2e559b7328b97c4',
};

// BSCScan API 配置
const BSCSCAN_API_KEY = process.env.BSCSCAN_API_KEY || 'YourApiKeyToken';
const BSCSCAN_API_URL = 'https://api.bscscan.com/api';

/**
 * 获取合约ABI
 */
async function getContractABI(address) {
  try {
    const response = await axios.get(BSCSCAN_API_URL, {
      params: {
        module: 'contract',
        action: 'getabi',
        address: address,
        apikey: BSCSCAN_API_KEY,
      },
    });
    
    if (response.data.status === '1') {
      return JSON.parse(response.data.result);
    } else {
      console.error(`获取ABI失败: ${response.data.message}`);
      return null;
    }
  } catch (error) {
    console.error(`获取ABI错误: ${error.message}`);
    return null;
  }
}

/**
 * 获取合约源代码
 */
async function getContractSourceCode(address) {
  try {
    const response = await axios.get(BSCSCAN_API_URL, {
      params: {
        module: 'contract',
        action: 'getsourcecode',
        address: address,
        apikey: BSCSCAN_API_KEY,
      },
    });
    
    if (response.data.status === '1' && response.data.result[0]) {
      return response.data.result[0];
    } else {
      console.error(`获取源代码失败: ${response.data.message}`);
      return null;
    }
  } catch (error) {
    console.error(`获取源代码错误: ${error.message}`);
    return null;
  }
}

/**
 * 获取合约信息
 */
async function getContractInfo(name, address) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`分析合约: ${name}`);
  console.log(`地址: ${address}`);
  console.log(`${'='.repeat(60)}`);
  
  // 获取源代码
  const sourceCode = await getContractSourceCode(address);
  
  if (sourceCode) {
    console.log(`合约名称: ${sourceCode.ContractName || 'N/A'}`);
    console.log(`编译器版本: ${sourceCode.CompilerVersion || 'N/A'}`);
    console.log(`优化: ${sourceCode.OptimizationUsed || 'N/A'}`);
    console.log(`源代码验证: ${sourceCode.SourceCode ? '是' : '否'}`);
    
    if (sourceCode.SourceCode) {
      // 保存源代码到文件
      const fs = require('fs');
      const path = require('path');
      const outputDir = path.join(__dirname, '../contract-analysis');
      
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      const fileName = `${name.replace(/\s+/g, '-')}-${address.slice(0, 10)}.sol`;
      const filePath = path.join(outputDir, fileName);
      
      // 如果SourceCode是JSON字符串，需要解析
      let code = sourceCode.SourceCode;
      try {
        const parsed = JSON.parse(code);
        if (parsed.sources) {
          // 多个文件的情况
          code = Object.values(parsed.sources).map(s => s.content).join('\n\n');
        }
      } catch (e) {
        // 不是JSON，直接使用
      }
      
      fs.writeFileSync(filePath, code);
      console.log(`源代码已保存到: ${filePath}`);
    }
  }
  
  // 获取ABI
  const abi = await getContractABI(address);
  if (abi) {
    console.log(`\n主要函数:`);
    abi
      .filter(item => item.type === 'function')
      .forEach(func => {
        const params = func.inputs.map(i => `${i.type} ${i.name}`).join(', ');
        console.log(`  - ${func.name}(${params})`);
      });
  }
  
  // 等待一下，避免API限制
  await new Promise(resolve => setTimeout(resolve, 200));
}

/**
 * 主函数
 */
async function main() {
  console.log('开始分析合约...\n');
  console.log('注意：需要设置 BSCScan API Key');
  console.log('在 .env 文件中设置: BSCSCAN_API_KEY=your_api_key\n');
  
  // 分析所有合约
  for (const [name, address] of Object.entries(CONTRACTS)) {
    await getContractInfo(name, address);
  }
  
  console.log('\n分析完成！');
  console.log('源代码已保存到 contract-analysis 目录');
}

// 运行
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { getContractInfo, getContractABI, getContractSourceCode };
