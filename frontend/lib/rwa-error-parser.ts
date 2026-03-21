export function parseRWAError(error: any, locale: string = 'en'): string {
  const lang = locale.startsWith('zh') ? 'zh' : 'en'
  const msg = error.message || error.reason || ''
  
  // 24小时卖出限制
  if (msg.includes('Only one sell per 24h')) {
    return lang === 'zh' 
      ? '24小时内只能卖出一次，请稍后再试'
      : 'Only one sell per 24 hours allowed'
  }
  
  // 税率过高警告
  if (msg.includes('tax') || msg.includes('Tax')) {
    return lang === 'zh'
      ? '卖出税率较高，建议延长持仓时间或减少卖出比例'
      : 'High sell tax rate. Consider holding longer or selling less'
  }
  
  // StRWA 锁定余额不足
  if (msg.includes('exceeds unlocked balance')) {
    return lang === 'zh'
      ? 'stRWA 余额被锁定，请等待解锁或释放到期锁仓'
      : 'stRWA balance is locked. Wait for unlock or release expired locks'
  }
  
  // StRWA 合约未就绪
  if (msg.includes('Only staking contract')) {
    return lang === 'zh'
      ? 'stRWA 合约未就绪，请联系管理员'
      : 'stRWA contract not ready. Contact admin'
  }
  
  return msg
}
