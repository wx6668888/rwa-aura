export function parseTeamDividendError(error: any, locale: string = 'en'): string {
  const lang = locale.startsWith('zh') ? 'zh' : 'en'
  const msg = error.message || ''
  
  if (msg.includes('Daily limit')) {
    return lang === 'zh' ? '今日提现次数已达上限（10次）' : 'Daily withdrawal limit reached (10 times)'
  }
  
  if (msg.includes('Invalid amount')) {
    return lang === 'zh' ? '提现金额无效或超出单笔限额（10万 USDT）' : 'Invalid amount or exceeds limit (100k USDT)'
  }
  
  if (msg.includes('Insufficient balance')) {
    return lang === 'zh' ? '分红余额不足' : 'Insufficient dividend balance'
  }
  
  return msg
}
