/**
 * useSwap Hook
 * 
 * 用于处理代币兑换的 Hook
 * 直接与 PancakeSwap V3 Router 交互，无需后端
 */

import { useState, useCallback } from 'react';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { parseUnits, formatUnits, type Address } from 'viem';
import { emitDataRefresh } from '@/lib/data-refresh'
import {
  PANCAKESWAP_V3_ADDRESSES,
  RECOMMENDED_FEE,
  QUOTER_ABI,
  ROUTER_ABI,
  ERC20_ABI,
  MAX_UINT256,
  DEFAULT_SLIPPAGE,
  DEFAULT_DEADLINE,
} from '@/lib/contracts/pancakeswap';

export interface SwapQuote {
  outputAmount: string;
  priceImpact: number;
  executionPrice: string;
  gasEstimate: string;
  minOutputAmount: string;
}

export function useSwap(
  fromToken: Address,
  toToken: Address,
  fromDecimals: number = 6,  // USDT 默认 6 位小数
  toDecimals: number = 18    // RWA 默认 18 位小数
) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 获取兑换报价
   * 
   * @param amount - 兑换数量（字符串格式）
   * @param slippage - 滑点容忍度（百分比，默认 0.5%）
   * @returns 报价信息
   */
  const getSwapQuote = useCallback(async (
    amount: string,
    slippage: number = DEFAULT_SLIPPAGE
  ): Promise<SwapQuote | null> => {
    if (!publicClient || !amount || parseFloat(amount) <= 0) {
      return null;
    }

    try {
      setIsLoading(true);
      setError(null);

      const amountInWei = parseUnits(amount, fromDecimals);

      // 调用 PancakeSwap Quoter 合约获取报价 - 使用 Promise.race 添加超时
      const contractCall = publicClient.readContract({
        address: PANCAKESWAP_V3_ADDRESSES.quoter as Address,
        abi: QUOTER_ABI,
        functionName: 'quoteExactInputSingle',
        args: [
          fromToken,
          toToken,
          amountInWei,
          RECOMMENDED_FEE,
          BigInt(0) // sqrtPriceLimitX96 = 0 表示无价格限制
        ],
      }).catch((err) => {
        // 捕获合约调用错误，防止冒泡
        console.warn('合约调用失败:', err.message);
        return null;
      });

      const result = await contractCall;
      
      if (!result) {
        return null;
      }

      const [amountOut, , , gasEstimate] = result;
      const outputAmount = formatUnits(amountOut, toDecimals);
      const executionPrice = (parseFloat(outputAmount) / parseFloat(amount)).toFixed(6);
      
      // 计算滑点保护后的最小输出
      const minOutputAmount = (parseFloat(outputAmount) * (1 - slippage / 100)).toFixed(6);
      
      // 计算价格影响（简化版）
      // 实际应该与池子当前价格对比
      const priceImpact = 0.1; // TODO: 实现真实的价格影响计算

      return {
        outputAmount,
        priceImpact,
        executionPrice,
        gasEstimate: gasEstimate.toString(),
        minOutputAmount,
      };
    } catch (err: any) {
      // 静默失败，不显示错误（因为有模拟数据作为 fallback）
      console.warn('获取报价失败，将使用模拟数据:', err?.message || err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [publicClient, fromToken, toToken, fromDecimals, toDecimals]);

  /**
   * 检查代币授权
   * 
   * @param amount - 需要授权的数量
   * @returns 是否已授权足够的额度
   */
  const checkAllowance = useCallback(async (amount: string): Promise<boolean> => {
    if (!publicClient || !address) return false;

    try {
      const amountWei = parseUnits(amount, fromDecimals);
      
      const allowance = await publicClient.readContract({
        address: fromToken,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [address, PANCAKESWAP_V3_ADDRESSES.router as Address],
      });

      return allowance >= amountWei;
    } catch (err) {
      console.warn('检查授权失败:', err);
      return false;
    }
  }, [publicClient, address, fromToken, fromDecimals]);

  /**
   * 授权代币
   * 
   * @returns 交易哈希
   */
  const approveToken = useCallback(async (): Promise<string | null> => {
    if (!walletClient || !address) {
      throw new Error('请先连接钱包');
    }

    try {
      setIsLoading(true);
      setError(null);

      // 授权最大额度
      const hash = await walletClient.writeContract({
        address: fromToken,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [PANCAKESWAP_V3_ADDRESSES.router as Address, MAX_UINT256],
      });

      // 等待交易确认
      await publicClient!.waitForTransactionReceipt({ hash });

      return hash;
    } catch (err: any) {
      console.error('Approve error:', err);
      
      if (err.message?.includes('user rejected')) {
        throw new Error('您已取消操作');
      }
      
      throw new Error('授权失败，请重试');
    } finally {
      setIsLoading(false);
    }
  }, [walletClient, publicClient, address, fromToken]);

  /**
   * 执行兑换
   * 
   * @param amount - 兑换数量
   * @param minAmountOut - 最小输出数量（已应用滑点保护）
   * @param deadline - 交易截止时间（分钟，默认 20 分钟）
   * @returns 交易哈希
   */
  const executeSwap = useCallback(async (
    amount: string,
    minAmountOut: string,
    deadline: number = DEFAULT_DEADLINE
  ): Promise<string | null> => {
    if (!walletClient || !address || !publicClient) {
      throw new Error('请先连接钱包');
    }

    try {
      setIsLoading(true);
      setError(null);

      const amountInWei = parseUnits(amount, fromDecimals);
      const minAmountOutWei = parseUnits(minAmountOut, toDecimals);
      
      // 计算截止时间戳
      const deadlineTimestamp = Math.floor(Date.now() / 1000) + deadline * 60;

      // 调用 Router 合约执行兑换
      const hash = await walletClient.writeContract({
        address: PANCAKESWAP_V3_ADDRESSES.router as Address,
        abi: ROUTER_ABI,
        functionName: 'exactInputSingle',
        args: [{
          tokenIn: fromToken,
          tokenOut: toToken,
          fee: RECOMMENDED_FEE,
          recipient: address,
          amountIn: amountInWei,
          amountOutMinimum: minAmountOutWei,
          sqrtPriceLimitX96: BigInt(0),
        }],
        value: BigInt(0), // 不需要发送 BNB
      });

      // 等待交易确认
      await publicClient.waitForTransactionReceipt({ hash });
      emitDataRefresh({ kind: 'swap', txHash: hash, address })
      
      return hash;
    } catch (err: any) {
      console.error('Swap error:', err);
      
      if (err.message?.includes('user rejected')) {
        throw new Error('您已取消操作');
      }
      
      if (err.message?.includes('insufficient')) {
        throw new Error('余额不足');
      }
      
      throw new Error('兑换失败，请重试');
    } finally {
      setIsLoading(false);
    }
  }, [walletClient, publicClient, address, fromToken, toToken, fromDecimals, toDecimals]);

  return {
    getSwapQuote,
    checkAllowance,
    approveToken,
    executeSwap,
    isLoading,
    error,
  };
}

/**
 * 使用说明：
 * 
 * 1. 在组件中使用：
 *    const { getSwapQuote, checkAllowance, approveToken, executeSwap, isLoading } = useSwap(
 *      USDT_ADDRESS,
 *      RWA_ADDRESS,
 *      6,  // USDT decimals
 *      18  // RWA decimals
 *    );
 * 
 * 2. 获取报价：
 *    const quote = await getSwapQuote('100', 0.5); // 100 USDT, 0.5% 滑点
 * 
 * 3. 检查授权：
 *    const isApproved = await checkAllowance('100');
 * 
 * 4. 授权代币（如需要）：
 *    if (!isApproved) {
 *      await approveToken();
 *    }
 * 
 * 5. 执行兑换：
 *    const txHash = await executeSwap('100', quote.minOutputAmount, 20);
 * 
 * 注意：
 * - 所有交易都在链上执行，不经过后端
 * - 用户需要在钱包中确认每笔交易
 * - Gas 费用由用户支付（BNB）
 * - 流动性来自 PancakeSwap 的 RWA/USDT 池
 * - 确保已在 PancakeSwap 上创建并添加流动性
 */
