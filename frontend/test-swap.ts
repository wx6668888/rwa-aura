import { useSwapContractFixed } from './hooks/useSwapContractFixed'

// 测试 Swap 功能
async function testSwap() {
  const { poolStatus, swapEnabled, checkLimit, getQuote, swap } = useSwapContractFixed()
  
  console.log('=== Swap Contract 测试 ===')
  console.log('1. 互换开关:', swapEnabled)
  console.log('2. 池子状态:', poolStatus)
  
  // 测试限额检查
  const check = checkLimit('100')
  console.log('3. 限额检查 (100):', check)
  
  // 测试报价
  const quote = await getQuote('100', true)
  console.log('4. 报价 (100 stRWA → RWA):', quote)
  
  console.log('✅ 测试完成')
}

export { testSwap }
