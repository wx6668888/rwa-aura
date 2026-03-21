'use client'

import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseUnits } from 'viem'
import { CONTRACT_ADDRESSES } from '@/lib/contracts/addresses'
import { useState } from 'react'

export function useReferralWithdraw() {
  const { chainId } = useAccount()
  const { writeContractAsync } = useWriteContract()
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  })

  async function withdraw(amount: string) {
    const poolAddress = chainId ? CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES]?.ReferralRewardPool : undefined
    if (!poolAddress) throw new Error('ReferralRewardPool not found')

    const amountInUsdt = parseUnits(amount, 6)

    const hash = await writeContractAsync({
      address: poolAddress as `0x${string}`,
      abi: [{
        name: 'withdraw',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [{ name: 'amount', type: 'uint256' }],
        outputs: [],
      }],
      functionName: 'withdraw',
      args: [amountInUsdt],
    })

    setTxHash(hash)
    return hash
  }

  return {
    withdraw,
    isConfirming,
    isSuccess,
    txHash,
  }
}
