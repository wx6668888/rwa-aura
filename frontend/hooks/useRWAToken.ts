import { useAccount, useReadContract, useWriteContract } from 'wagmi'
import { readContract } from 'wagmi/actions'
import { parseUnits, formatUnits } from 'viem'
import { erc20ABI } from '@/lib/contracts/erc20ABI'
import { CONTRACT_ADDRESSES } from '@/lib/contracts/addresses'
import { config } from '@/lib/wagmi'

export function useRWAToken() {
  const { address, chainId } = useAccount()
  const { writeContractAsync } = useWriteContract()

  const rwaAddress = chainId ? CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES]?.rwaToken : undefined

  // Read RWA balance
  const { data: balance, refetch: refetchBalance } = useReadContract({
    address: rwaAddress as `0x${string}`,
    abi: erc20ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!rwaAddress,
    },
  })

  // Read RWA allowance for a specific spender (使用readContract而不是hook)
  const getAllowance = async (spender: string) => {
    if (!address || !rwaAddress) return BigInt(0)
    
    try {
      const result = await readContract(config, {
        address: rwaAddress as `0x${string}`,
        abi: erc20ABI,
        functionName: 'allowance',
        args: [address, spender as `0x${string}`],
      })
      
      return result || BigInt(0)
    } catch (error) {
      console.error('Failed to get allowance:', error)
      return BigInt(0)
    }
  }

  // Approve RWA for a specific spender
  async function approve(spender: string, amount: bigint) {
    if (!rwaAddress) throw new Error('RWA token address not found')
    
    const hash = await writeContractAsync({
      address: rwaAddress as `0x${string}`,
      abi: erc20ABI,
      functionName: 'approve',
      args: [spender as `0x${string}`, amount],
    })

    return hash
  }

  // Approve max amount
  async function approveMax(spender: string) {
    if (!rwaAddress) throw new Error('RWA token address not found')
    
    const maxAmount = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')
    
    const hash = await writeContractAsync({
      address: rwaAddress as `0x${string}`,
      abi: erc20ABI,
      functionName: 'approve',
      args: [spender as `0x${string}`, maxAmount],
    })

    return hash
  }

  // Check if amount is approved for a specific spender
  async function isApproved(spender: string, amount: bigint): Promise<boolean> {
    const allowance = await getAllowance(spender)
    return allowance >= amount
  }

  return {
    // Token address
    rwaAddress,
    
    // Balance (18 decimals for RWA)
    balance: balance || BigInt(0),
    balanceFormatted: balance ? formatUnits(balance, 18) : '0',
    
    // Functions
    approve,
    approveMax,
    isApproved,
    getAllowance,
    
    // Refetch functions
    refetchBalance,
  }
}
