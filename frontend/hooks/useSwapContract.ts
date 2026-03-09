import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseUnits, formatUnits, type Address } from 'viem'
import { createPublicClient, http } from 'viem'
import { bsc, bscTestnet } from 'viem/chains'
import { CONTRACT_ADDRESSES } from '@/lib/contracts/addresses'

// SwapContract ABI（简化版，实际需要根据合约实现）
const swapContractABI = [
  {
    name: 'getSwapRate',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getSwapOutput',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'inputAmount', type: 'uint256' },
      { name: 'isStRWAToRWA', type: 'bool' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'swapStRWAToRWA',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'stRwaAmount', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'swapRWAToStRWA',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'rwaAmount', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'rwaPoolBalance',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'stRwaPoolBalance',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const

export function useSwapContract() {
  const { address, chainId } = useAccount()
  const { writeContractAsync } = useWriteContract()

  const contractAddresses = chainId ? CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES] : undefined
  const swapContractAddress = contractAddresses?.swapContract as `0x${string}` | undefined

  // 读取当前互换比例
  const { data: swapRate, refetch: refetchSwapRate } = useReadContract({
    address: swapContractAddress,
    abi: swapContractABI,
    functionName: 'getSwapRate',
    query: {
      enabled: !!swapContractAddress,
    },
  })

  // 读取RWA池余额
  const { data: rwaPoolBalance, refetch: refetchRwaPool } = useReadContract({
    address: swapContractAddress,
    abi: swapContractABI,
    functionName: 'rwaPoolBalance',
    query: {
      enabled: !!swapContractAddress,
    },
  })

  // 读取stRWA池余额
  const { data: stRwaPoolBalance, refetch: refetchStRwaPool } = useReadContract({
    address: swapContractAddress,
    abi: swapContractABI,
    functionName: 'stRwaPoolBalance',
    query: {
      enabled: !!swapContractAddress,
    },
  })

  // 获取互换报价（使用 public client）
  async function getSwapQuote(inputAmount: string, isStRWAToRWA: boolean) {
    if (!swapContractAddress || !chainId || !inputAmount || parseFloat(inputAmount) <= 0) {
      return null
    }

    try {
      const chain = chainId === 56 ? bsc : chainId === 97 ? bscTestnet : null
      if (!chain) return null

      const publicClient = createPublicClient({
        chain,
        transport: http(),
      })

      const amountInWei = parseUnits(inputAmount, 18)
      const output = await publicClient.readContract({
        address: swapContractAddress,
        abi: swapContractABI,
        functionName: 'getSwapOutput',
        args: [amountInWei, isStRWAToRWA],
      })

      return output ? formatUnits(output as bigint, 18) : null
    } catch (error) {
      console.error('Get swap quote error:', error)
      // 如果合约方法不存在，使用简单的比例计算（fallback）
      const swapRateNum = swapRate ? Number(swapRate) / 100 : 1.0
      const inputNum = parseFloat(inputAmount)
      return isStRWAToRWA 
        ? (inputNum * swapRateNum).toFixed(6)
        : (inputNum / swapRateNum).toFixed(6)
    }
  }

  // stRWA → RWA 互换
  async function swapStRWAToRWA(amount: string) {
    if (!swapContractAddress) throw new Error('Swap contract not found')

    const amountInWei = parseUnits(amount, 18)

    const hash = await writeContractAsync({
      address: swapContractAddress,
      abi: swapContractABI,
      functionName: 'swapStRWAToRWA',
      args: [amountInWei],
    })

    return hash
  }

  // RWA → stRWA 互换
  async function swapRWAToStRWA(amount: string) {
    if (!swapContractAddress) throw new Error('Swap contract not found')

    const amountInWei = parseUnits(amount, 18)

    const hash = await writeContractAsync({
      address: swapContractAddress,
      abi: swapContractABI,
      functionName: 'swapRWAToStRWA',
      args: [amountInWei],
    })

    return hash
  }

  // 格式化数据
  const formattedSwapRate = swapRate ? Number(swapRate) / 100 : 1.0 // 例如 100 = 1.0, 110 = 1.1
  const formattedRwaPool = rwaPoolBalance ? formatUnits(rwaPoolBalance, 18) : '0'
  const formattedStRwaPool = stRwaPoolBalance ? formatUnits(stRwaPoolBalance, 18) : '0'

  return {
    swapContractAddress,
    swapRate: formattedSwapRate,
    rwaPoolBalance: formattedRwaPool,
    stRwaPoolBalance: formattedStRwaPool,
    getSwapQuote,
    swapStRWAToRWA,
    swapRWAToStRWA,
    refetchSwapRate,
    refetchRwaPool,
    refetchStRwaPool,
  }
}
