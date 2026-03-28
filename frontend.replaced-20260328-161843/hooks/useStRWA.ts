import { useAccount, useReadContract, useWriteContract } from 'wagmi'
import { parseUnits, formatUnits } from 'viem'
import { CONTRACT_ADDRESSES } from '@/lib/contracts/addresses'
import { stakingContractABI } from '@/lib/contracts/stakingContractABI'

// StRWA合约ABI（简化版，实际需要根据合约实现）
// 注意：StRWA 合约没有 unlock 函数，解锁需要通过 SwapContract 的 swapStRWAToRWA 实现
const stRWA_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getLockedBalance',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: 'currentLocked', type: 'uint256' }],
  },
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const

export function useStRWA() {
  const { address, chainId } = useAccount()
  const { writeContractAsync } = useWriteContract()

  const contractAddresses = chainId ? CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES] : undefined
  const stakingContractAddress = contractAddresses?.stakingContract as `0x${string}` | undefined
  const fallbackStRWA = contractAddresses?.stRWA as `0x${string}` | undefined
  const swapContractAddress = contractAddresses?.swapContract as `0x${string}` | undefined

  // 从 StakingContract 链上读取 stRWA 地址（与铸造目标一致，/withdraw 才能正确显示 stRWA 余额）
  const { data: stRwaTokenFromChain } = useReadContract({
    address: stakingContractAddress,
    abi: stakingContractABI,
    functionName: 'stRwaToken',
    query: {
      enabled: !!stakingContractAddress,
    },
  })

  const zeroAddr = '0x0000000000000000000000000000000000000000'
  const chainAddrRaw = stRwaTokenFromChain != null ? String(stRwaTokenFromChain).toLowerCase() : ''
  const chainAddrValid = chainAddrRaw.startsWith('0x') && chainAddrRaw.length === 42 && chainAddrRaw !== zeroAddr
  const stRWAAddress = (chainAddrValid ? (chainAddrRaw as `0x${string}`) : fallbackStRWA) as `0x${string}` | undefined

  // 读取 stRWA 总余额
  const { data: stRWABalance, refetch: refetchBalance } = useReadContract({
    address: stRWAAddress,
    abi: stRWA_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!stRWAAddress,
    },
  })

  // 读取锁定余额（锁仓 30 天部分）
  const { data: lockedBalance } = useReadContract({
    address: stRWAAddress,
    abi: stRWA_ABI,
    functionName: 'getLockedBalance',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!stRWAAddress,
    },
  })

  // 读取授权额度（用于 SwapContract）
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: stRWAAddress,
    abi: stRWA_ABI,
    functionName: 'allowance',
    args: address && swapContractAddress ? [address, swapContractAddress] : undefined,
    query: {
      enabled: !!address && !!stRWAAddress && !!swapContractAddress,
    },
  })

  // 授权 stRWA 给 SwapContract
  async function approveStRWA(amount: string) {
    if (!stRWAAddress || !swapContractAddress) throw new Error('Contract addresses not found')
    
    const amountInWei = parseUnits(amount, 18)
    
    const hash = await writeContractAsync({
      address: stRWAAddress,
      abi: stRWA_ABI,
      functionName: 'approve',
      args: [swapContractAddress, amountInWei],
    })

    return hash
  }

  // 授权最大额度
  async function approveStRWAMax() {
    if (!stRWAAddress || !swapContractAddress) throw new Error('Contract addresses not found')
    
    const maxAmount = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')
    
    const hash = await writeContractAsync({
      address: stRWAAddress,
      abi: stRWA_ABI,
      functionName: 'approve',
      args: [swapContractAddress, maxAmount],
    })

    return hash
  }

  // 检查是否已授权
  function isApproved(amount: string): boolean {
    if (!allowance) return false
    const amountInWei = parseUnits(amount, 18)
    return allowance >= amountInWei
  }

  // 格式化数据
  const formattedBalance = stRWABalance ? formatUnits(stRWABalance, 18) : '0'
  const formattedLocked = lockedBalance != null ? formatUnits(lockedBalance, 18) : '0'
  const formattedAllowance = allowance ? formatUnits(allowance, 18) : '0'

  return {
    stRWAAddress,
    stRWABalance: formattedBalance,
    stRWALockedBalance: formattedLocked,
    allowance: formattedAllowance,
    approveStRWA,
    approveStRWAMax,
    isApproved,
    refetchBalance,
    refetchAllowance,
  }
}
