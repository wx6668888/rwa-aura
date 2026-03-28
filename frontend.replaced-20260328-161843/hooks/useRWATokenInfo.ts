import { useAccount, useReadContract } from 'wagmi'
import { formatUnits, parseUnits } from 'viem'
import { CONTRACT_ADDRESSES } from '@/lib/contracts/addresses'

const RWA_TOKEN_ABI = [
  {
    name: 'getDynamicSellTaxRate',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'sellAmount', type: 'uint256' }
    ],
    outputs: [{ name: 'taxRate', type: 'uint256' }]
  },
  {
    name: 'getNextSellAllowedTime',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    name: 'isWhitelisted',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }]
  }
] as const

export function useRWATokenInfo() {
  const { address, chainId } = useAccount()
  const rwaTokenAddress = CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES]?.rwaToken

  // 查询白名单状态
  const { data: isWhitelisted } = useReadContract({
    address: rwaTokenAddress as `0x${string}`,
    abi: RWA_TOKEN_ABI,
    functionName: 'isWhitelisted',
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!rwaTokenAddress }
  })

  // 查询下次可卖出时间
  const { data: nextSellTime } = useReadContract({
    address: rwaTokenAddress as `0x${string}`,
    abi: RWA_TOKEN_ABI,
    functionName: 'getNextSellAllowedTime',
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!rwaTokenAddress }
  })

  // 计算卖出税率
  function getSellTaxRate(sellAmount: string) {
    const { data: taxRate } = useReadContract({
      address: rwaTokenAddress as `0x${string}`,
      abi: RWA_TOKEN_ABI,
      functionName: 'getDynamicSellTaxRate',
      args: address ? [address, parseUnits(sellAmount, 18)] : undefined,
      query: { enabled: !!address && !!rwaTokenAddress && sellAmount !== '' }
    })
    return taxRate ? Number(taxRate) : 0
  }

  const canSellNow = !nextSellTime || Number(nextSellTime) === 0 || Date.now() / 1000 >= Number(nextSellTime)
  const nextSellDate = nextSellTime && Number(nextSellTime) > 0 ? new Date(Number(nextSellTime) * 1000) : null

  return {
    isWhitelisted: !!isWhitelisted,
    canSellNow,
    nextSellDate,
    getSellTaxRate
  }
}
