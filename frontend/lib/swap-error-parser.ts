export function parseSwapError(error: any, locale: string = 'en'): string {
  const lang = locale.startsWith('zh') ? 'zh' : 'en'
  const msg = error.message || error.reason || ''
  
  if (msg.includes('Swap is disabled')) {
    return lang === 'zh' ? '互换功能已暂停' : 'Swap is disabled'
  }
  
  if (msg.includes('Swap limit exceeded')) {
    return lang === 'zh' ? '超出每日互换限额' : 'Daily swap limit exceeded'
  }
  
  if (msg.includes('Pool not initialized')) {
    return lang === 'zh' ? '流动性池未初始化' : 'Pool not initialized'
  }
  
  if (msg.includes('Insufficient liquidity')) {
    return lang === 'zh' ? '流动性不足' : 'Insufficient liquidity'
  }
  
  return msg
}
