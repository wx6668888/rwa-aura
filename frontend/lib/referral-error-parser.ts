export function parseReferralError(error: any, locale: string = 'en'): string {
  const lang = locale.startsWith('zh') ? 'zh' : 'en'
  const msg = error.message || ''
  
  if (msg.includes('Below minimum')) {
    return lang === 'zh' ? '低于最低提现额度 100 USDT' : 'Below minimum withdrawal (100 USDT)'
  }
  
  if (msg.includes('Insufficient balance')) {
    return lang === 'zh' ? '可提现余额不足' : 'Insufficient withdrawable balance'
  }
  
  return msg
}
