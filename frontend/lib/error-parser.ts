export const ERROR_MESSAGES = {
  // 网络错误
  NETWORK_ERROR: {
    zh: '网络连接失败，请检查网络后重试',
    en: 'Network connection failed, please check and retry'
  },
  RPC_ERROR: {
    zh: 'RPC 节点响应超时，请稍后重试',
    en: 'RPC node timeout, please retry later'
  },
  
  // 合约错误
  INSUFFICIENT_BALANCE: {
    zh: '余额不足，请充值后重试',
    en: 'Insufficient balance'
  },
  BELOW_MIN_STAKE: {
    zh: 'USDT 质押最低 100 USDT',
    en: 'Minimum stake: 100 USDT'
  },
  INVALID_REFERRER: {
    zh: '推荐人地址无效或不能是自己',
    en: 'Invalid referrer address'
  },
  ALREADY_PROCESSED: {
    zh: '该质押已处理，请勿重复操作',
    en: 'Stake already processed'
  },
  EXCEEDS_CAP: {
    zh: '超出奖励上限，请联系客服',
    en: 'Exceeds reward cap'
  },
  COOLDOWN_ACTIVE: {
    zh: '提现冷却中，请 24 小时后重试',
    en: 'Withdrawal cooldown active (24h)'
  },
  STILL_LOCKED: {
    zh: '锁仓未到期，无法提现',
    en: 'Still locked, cannot withdraw'
  },
  
  // 用户操作错误
  USER_REJECTED: {
    zh: '用户取消了交易',
    en: 'User rejected transaction'
  },
  APPROVAL_FAILED: {
    zh: '授权失败，请重试',
    en: 'Approval failed'
  },
  
  // 通用错误
  UNKNOWN_ERROR: {
    zh: '未知错误，请联系客服',
    en: 'Unknown error, contact support'
  }
}

export function parseError(error: any, locale: string = 'en'): string {
  const lang = locale.startsWith('zh') ? 'zh' : 'en'
  
  // 用户拒绝
  if (error.code === 4001 || error.code === 'ACTION_REJECTED' || 
      error.message?.includes('user rejected')) {
    return ERROR_MESSAGES.USER_REJECTED[lang]
  }
  
  // 合约 revert 错误
  const revertMsg = error.message || error.reason || ''
  
  if (revertMsg.includes('Insufficient balance')) {
    return ERROR_MESSAGES.INSUFFICIENT_BALANCE[lang]
  }
  if (revertMsg.includes('Minimum stake')) {
    return ERROR_MESSAGES.BELOW_MIN_STAKE[lang]
  }
  if (revertMsg.includes('Invalid referrer') || revertMsg.includes('cannot be your own')) {
    return ERROR_MESSAGES.INVALID_REFERRER[lang]
  }
  if (revertMsg.includes('already processed')) {
    return ERROR_MESSAGES.ALREADY_PROCESSED[lang]
  }
  if (revertMsg.includes('exceed') && revertMsg.includes('cap')) {
    return ERROR_MESSAGES.EXCEEDS_CAP[lang]
  }
  if (revertMsg.includes('cooldown')) {
    return ERROR_MESSAGES.COOLDOWN_ACTIVE[lang]
  }
  if (revertMsg.includes('Still locked')) {
    return ERROR_MESSAGES.STILL_LOCKED[lang]
  }
  
  // 网络错误
  if (error.code === 'NETWORK_ERROR' || revertMsg.includes('network')) {
    return ERROR_MESSAGES.NETWORK_ERROR[lang]
  }
  if (revertMsg.includes('timeout')) {
    return ERROR_MESSAGES.RPC_ERROR[lang]
  }
  
  return ERROR_MESSAGES.UNKNOWN_ERROR[lang]
}
