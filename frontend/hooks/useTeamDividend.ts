'use client'

import { useState } from 'react'
import { useAccount, usePublicClient, useWalletClient } from 'wagmi'
import { parseUnits } from 'viem'
import { CONTRACT_ADDRESSES } from '@/lib/contracts/addresses'

const TEAM_DIVIDEND_ABI = [
  {
    inputs: [{ name: 'amount', type: 'uint256' }],
    name: 'withdrawDividend',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'user', type: 'address' }],
    name: 'dividendBalances',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'user', type: 'address' }],
    name: 'dailyWithdrawalCount',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const

export function useTeamDividend() {
  const { address, chainId } = useAccount()
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()
  const [isConfirming, setIsConfirming] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [txHash, setTxHash] = useState<string | null>(null)

  const effectiveChainId = chainId || 31337
  const contractAddress = CONTRACT_ADDRESSES[effectiveChainId]?.TeamDividendPool

  const withdraw = async (amount: string) => {
    if (!address || !walletClient || !publicClient || !contractAddress) {
      throw new Error('Wallet not connected')
    }

    setIsConfirming(true)
    setIsSuccess(false)
    setTxHash(null)

    try {
      const amountWei = parseUnits(amount, 6) // USDT 6 decimals

      const hash = await walletClient.writeContract({
        address: contractAddress as `0x${string}`,
        abi: TEAM_DIVIDEND_ABI,
        functionName: 'withdrawDividend',
        args: [amountWei],
      })

      setTxHash(hash)
      await publicClient.waitForTransactionReceipt({ hash })
      setIsSuccess(true)
      return hash
    } catch (error: any) {
      console.error('Withdraw dividend failed:', error)
      throw error
    } finally {
      setIsConfirming(false)
    }
  }

  return {
    withdraw,
    isConfirming,
    isSuccess,
    txHash,
  }
}
