// 在 stake-action-panel.tsx 中添加以下导入和使用

import { TransactionStore } from '@/lib/transaction-store'
import { parseError } from '@/lib/error-parser'

// 在 handleStake 函数中添加持久化
async function handleStake() {
  if (status !== 'approved') return
  
  try {
    setStatus('staking')
    setErrorMessage('')

    const referrerAddress = hasReferrer ? '0x0000000000000000000000000000000000000000' : referral.trim()
    const lockPeriodNum = lockPeriod === 'flexible' ? 0 : parseInt(lockPeriod)

    const hash = stakeMode === 'USDT'
      ? await stake(amount, referrerAddress, lockPeriodNum)
      : await stakeRWA(amount, referrerAddress, lockPeriodNum)
    
    setTxHash(hash)
    
    // 💾 保存交易状态
    TransactionStore.save({
      hash,
      type: 'stake',
      status: 'pending',
      amount,
      token: stakeMode,
      timestamp: Date.now(),
      lockPeriod
    })
    
    if (publicClient && hash) {
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: hash as `0x${string}`,
        timeout: 60000,
        confirmations: 1,
      })
      
      if (receipt.status === 'success') {
        // ✅ 更新为成功
        TransactionStore.update(hash, { status: 'success' })
        
        await refetchBalance()
        await refetchStakeInfo()
        await refetchStakes()
        setStatus('success')
        
        setTimeout(() => router.push('/dashboard'), 2000)
      } else {
        throw new Error('Transaction failed')
      }
    }
  } catch (error: any) {
    console.error('Stake error:', error)
    
    // ❌ 更新为失败
    if (txHash) {
      TransactionStore.update(txHash, { status: 'failed' })
    }
    
    // 🔍 解析错误信息
    const friendlyError = parseError(error, locale)
    setErrorMessage(friendlyError)
    setStatus('error')
  }
}

// 在组件加载时恢复未完成的交易
useEffect(() => {
  const pending = TransactionStore.getPending()
  if (pending.length > 0 && publicClient) {
    pending.forEach(async (tx) => {
      try {
        const receipt = await publicClient.getTransactionReceipt({
          hash: tx.hash as `0x${string}`
        })
        if (receipt) {
          TransactionStore.update(tx.hash, {
            status: receipt.status === 'success' ? 'success' : 'failed'
          })
        }
      } catch (e) {
        // 交易可能还在pending
      }
    })
  }
}, [publicClient])
