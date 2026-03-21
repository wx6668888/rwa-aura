'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useLocale } from '@/components/locale-provider';
import { useTranslation } from '@/lib/i18n';
import { Loader2, AlertTriangle } from 'lucide-react';
import { useUSDT } from '@/hooks/useUSDT';
import { useRWAToken } from '@/hooks/useRWAToken';
import { useSwap } from '@/hooks/useSwap';
import { useStRWA } from '@/hooks/useStRWA';
import { CONTRACT_ADDRESSES } from '@/lib/contracts/addresses';
import { type Address } from 'viem';
import { parseUnits } from 'viem';

interface SwapButtonProps {
  fromToken: string;
  toToken: string;
  fromAmount: string;
}

export default function SwapButton({ fromToken, toToken, fromAmount }: SwapButtonProps) {
  const { locale } = useLocale();
  const { t } = useTranslation(locale);
  const { address, isConnected, chainId } = useAccount();
  const { approve: approveUSDT, isApproved: isUSDTApproved } = useUSDT();
  const { approve: approveRWA, isApproved: isRWAApproved } = useRWAToken();
  
  const addresses = chainId ? CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES] : undefined;
  const fromTokenAddress = fromToken === 'USDT' ? addresses?.usdtToken : addresses?.rwaToken;
  const toTokenAddress = toToken === 'USDT' ? addresses?.usdtToken : addresses?.rwaToken;
  const swapContractAddress = addresses?.swapContract;
  
  // 使用 useSwap hook（通过 PancakeSwap Router）用于 USDT ↔ RWA
  const { executeSwap, approveToken, checkAllowance, isLoading, error } = useSwap(
    fromTokenAddress as Address,
    toTokenAddress as Address,
    fromToken === 'USDT' ? 6 : 18,
    toToken === 'USDT' ? 6 : 18
  );

  const [isApproving, setIsApproving] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [swapError, setSwapError] = useState<string | null>(null);
  const [needsApproval, setNeedsApproval] = useState(false);

  const amount = parseFloat(fromAmount || '0');
  const hasAmount = amount > 0;
  const priceImpact = 0.1;
  const isHighImpact = priceImpact > 3;

  // 检查是否需要授权（USDT ↔ RWA 通过 PancakeSwap）
  useEffect(() => {
    if (!isConnected || !hasAmount || !fromTokenAddress) {
      setNeedsApproval(false);
      return;
    }

    const checkApproval = async () => {
      try {
        if (fromToken === 'USDT') {
          const approved = isUSDTApproved(fromAmount);
          setNeedsApproval(!approved);
        } else if (fromToken === 'RWA') {
          // 对于 RWA，需要检查授权给 PancakeSwap Router
          const approved = await checkAllowance(fromAmount);
          setNeedsApproval(!approved);
        }
      } catch (error) {
        console.error('Check approval error:', error);
        setNeedsApproval(true); // 默认需要授权
      }
    };

    checkApproval();
  }, [isConnected, hasAmount, fromToken, fromAmount, fromTokenAddress, isUSDTApproved, checkAllowance]);

  const handleApprove = useCallback(async () => {
    if (!fromTokenAddress) {
      setSwapError('合约地址未配置');
      return;
    }

    try {
      setIsApproving(true);
      setSwapError(null);

      if (fromToken === 'USDT') {
        await approveUSDT(fromAmount);
      } else if (fromToken === 'RWA') {
        // 对于 RWA，授权给 PancakeSwap Router
        await approveToken();
      }
      
      setNeedsApproval(false);
    } catch (error: any) {
      console.error('Approve error:', error);
      setSwapError(error?.message || '授权失败');
    } finally {
      setIsApproving(false);
    }
  }, [fromToken, fromAmount, fromTokenAddress, approveUSDT, approveToken]);

  const handleSwap = useCallback(async () => {
    if (!fromAmount || parseFloat(fromAmount) <= 0) {
      setSwapError('请输入兑换金额');
      return;
    }

    try {
      setIsSwapping(true);
      setSwapError(null);

      // 计算最小输出（应用滑点保护，例如 0.5%）
      const slippage = 0.005; // 0.5%
      const outputAmount = fromToken === 'USDT' 
        ? (parseFloat(fromAmount) * 1.173 * (1 - slippage)).toFixed(4) // USDT -> RWA
        : (parseFloat(fromAmount) * 0.8524 * (1 - slippage)).toFixed(4); // RWA -> USDT

      const hash = await executeSwap(fromAmount, outputAmount, 20); // 20分钟截止时间
      
      if (hash) {
        // 成功，可以显示成功消息或刷新余额
        console.log('Swap successful:', hash);
        setSwapError(null);
      }
    } catch (error: any) {
      console.error('Swap error:', error);
      setSwapError(error?.message || '兑换失败');
    } finally {
      setIsSwapping(false);
    }
  }, [fromToken, fromAmount, executeSwap]);

  // State 1: No wallet
  if (!isConnected) {
    return (
      <button className="w-full h-[60px] bg-surface-2 text-text-secondary rounded-full font-bold mt-4">
        {t('swap.connectFirst')}
      </button>
    );
  }

  // State 2: No amount
  if (!hasAmount) {
    return (
      <button 
        disabled
        className="w-full h-[60px] bg-surface-2 text-text-disabled rounded-full font-bold mt-4 cursor-not-allowed"
      >
        {t('swap.enterAmount')}
      </button>
    );
  }

  // State 3: Need approval
  if (needsApproval) {
    return (
      <div className="mt-4 space-y-2">
        {swapError && (
          <div className="flex items-center gap-2 rounded-lg border border-[#f43f5e40] bg-[#f43f5e10] p-2">
            <AlertTriangle className="h-4 w-4 text-[#f43f5e]" />
            <p className="text-xs text-[#f43f5e]">{swapError}</p>
          </div>
        )}
        <button
          onClick={handleApprove}
          disabled={isApproving || isLoading}
          className="w-full h-[60px] bg-surface-2 border border-border-active text-text-primary rounded-full font-bold hover:bg-surface-3 transition-colors disabled:opacity-50"
        >
          {isApproving || isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              {t('swap.approving')}
            </span>
          ) : (
            t('swap.approveToken')
          )}
        </button>
      </div>
    );
  }

  // State 4/5: Ready to swap
  return (
    <div className="mt-4 space-y-2">
      {swapError && (
        <div className="flex items-center gap-2 rounded-lg border border-[#f43f5e40] bg-[#f43f5e10] p-2">
          <AlertTriangle className="h-4 w-4 text-[#f43f5e]" />
          <p className="text-xs text-[#f43f5e]">{swapError}</p>
        </div>
      )}
      <button
        onClick={handleSwap}
        disabled={isSwapping || isLoading}
        className={`w-full h-[60px] rounded-full font-bold transition-all disabled:opacity-50 ${
          isHighImpact
            ? 'bg-warning text-void-black hover:brightness-110'
            : 'bg-plasma-cyan text-void-black hover:brightness-110 hover:scale-[1.02]'
        }`}
      >
        {isSwapping || isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            {t('swap.swapping')}
          </span>
        ) : isHighImpact ? (
          t('swap.swapAnyway')
        ) : (
          t('swap.swapNow')
        )}
      </button>
    </div>
  );
}
