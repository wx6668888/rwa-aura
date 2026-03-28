import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { CONTRACT_ADDRESSES } from '@/lib/contracts/addresses';
import { usdtRwaSwapABI } from '@/lib/contracts/usdtRwaSwapABI';
import { parseUnits } from 'viem';

export function useUSDTRWASwap() {
  const { chain } = useAccount();
  const swapAddress = (CONTRACT_ADDRESSES[chain?.id || 56] as any)?.usdtRwaSwap as `0x${string}` | undefined;

  const { writeContractAsync } = useWriteContract();

  // Swap USDT to RWA
  const swapUSDTToRWA = async (usdtAmount: string) => {
    if (!swapAddress) throw new Error('USDT↔RWA 互换暂未开放');
    const amount = parseUnits(usdtAmount, 6); // USDT 6 decimals
    const hash = await writeContractAsync({
      address: swapAddress,
      abi: usdtRwaSwapABI,
      functionName: 'swapUSDTToRWA',
      args: [amount],
    });
    return hash;
  };

  // Swap RWA to USDT
  const swapRWAToUSDT = async (rwaAmount: string) => {
    if (!swapAddress) throw new Error('USDT↔RWA 互换暂未开放');
    const amount = parseUnits(rwaAmount, 18); // RWA 18 decimals
    const hash = await writeContractAsync({
      address: swapAddress,
      abi: usdtRwaSwapABI,
      functionName: 'swapRWAToUSDT',
      args: [amount],
    });
    return hash;
  };

  // Get quote USDT to RWA
  const { data: quoteUSDTToRWA } = useReadContract({
    address: swapAddress,
    abi: usdtRwaSwapABI,
    functionName: 'getQuoteUSDTToRWA',
    args: [parseUnits('1', 6)], // 1 USDT
    query: { enabled: !!swapAddress },
  });

  // Get liquidity
  const { data: liquidity } = useReadContract({
    address: swapAddress,
    abi: usdtRwaSwapABI,
    functionName: 'getLiquidity',
    query: { enabled: !!swapAddress },
  });

  return {
    swapUSDTToRWA,
    swapRWAToUSDT,
    quoteUSDTToRWA,
    liquidity,
    swapAddress,
  };
}
