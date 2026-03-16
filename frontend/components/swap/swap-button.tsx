'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useLocale } from '@/components/locale-provider';
import { useTranslation } from '@/lib/i18n';
import { Loader2, AlertTriangle } from 'lucide-react';
import { SwapTransactionOverlay } from './swap-transaction-overlay';
import { useUSDT } from '@/hooks/useUSDT';
import { useRWAToken } from '@/hooks/useRWAToken';
import { useSwap } from '@/hooks/useSwap';
import { useStRWA } from '@/hooks/useStRWA';
import { useUSDTRWASwap } from '@/hooks/useUSDTRWASwap';
import { CONTRACT_ADDRESSES } from '@/lib/contracts/addresses';
import { type Address } from 'viem';
import { parseUnits, formatUnits } from 'viem';

interface SwapButtonProps {
  fromToken: string;
  toToken: string;
  fromAmount: string;
}

export default function SwapButton({ fromToken, toToken, fromAmount }: SwapButtonProps) {
  const { locale } = useLocale();
  const { t } = useTranslation(locale);
  const { address, isConnected, chainId } = useAccount();
  const { approve: approveUSDT, isApproved: isUSDTApproved, refetchBalance: refetchUSDT } = useUSDT();
  const { approve: approveRWA, isApproved: isRWAApproved, refetchBalance: refetchRWA } = useRWAToken();
  
  // 新增：USDT ↔ RWA 直接互换
  const { swapUSDTToRWA, swapRWAToUSDT } = useUSDTRWASwap();
  
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
  const [justApproved, setJustApproved] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [overlayStatus, setOverlayStatus] = useState<'waiting' | 'pending' | 'success' | 'error'>('waiting');
  const [txHash, setTxHash] = useState<string | null>(null);

  // 监听状态变化
  useEffect(() => {
    console.log('Overlay state changed:', { showOverlay, overlayStatus, txHash });
  }, [showOverlay, overlayStatus, txHash]);

  const amount = parseFloat(fromAmount || '0');
  const hasAmount = amount > 0;
  const priceImpact = 0.1;
  const isHighImpact = priceImpact > 3;

  // 计算预期获得的代币数量
  const toAmount = hasAmount 
    ? (fromToken === 'USDT' 
        ? (amount / 0.85).toFixed(4)  // USDT → RWA
        : (amount * 0.85).toFixed(4)) // RWA → USDT
    : '0';

  // 检查是否需要授权
  useEffect(() => {
    // 如果 overlay 正在显示，跳过授权检查
    if (showOverlay) {
      return;
    }
    
    // 如果刚完成授权，跳过检查，设置为不需要授权
    if (justApproved) {
      setNeedsApproval(false);
      return;
    }

    if (!isConnected || !hasAmount || !fromTokenAddress) {
      setNeedsApproval(false);
      return;
    }

    const checkApproval = async () => {
      try {
        // 检测是否是 USDT ↔ RWA 直接互换
        const isUSDTRWASwap = (fromToken === 'USDT' && toToken === 'RWA') || (fromToken === 'RWA' && toToken === 'USDT');
        
        if (fromToken === 'USDT') {
          if (isUSDTRWASwap) {
            // USDT ↔ RWA：默认需要授权（用户授权后 justApproved 会跳过检查）
            setNeedsApproval(true);
          } else {
            const approved = isUSDTApproved(fromAmount);
            setNeedsApproval(!approved);
          }
        } else if (fromToken === 'RWA') {
          const approved = await checkAllowance(fromAmount);
          setNeedsApproval(!approved);
        }
      } catch (error) {
        console.error('Check approval error:', error);
        // 如果检查失败，默认需要授权
        setNeedsApproval(true);
      }
    };

    checkApproval();
  }, [showOverlay, justApproved, isConnected, hasAmount, fromToken, toToken, fromAmount, fromTokenAddress, isUSDTApproved, checkAllowance]);

  const handleApprove = useCallback(async () => {
    if (!fromTokenAddress) {
      setSwapError('合约地址未配置');
      return;
    }

    try {
      setIsApproving(true);
      setSwapError(null);

      // 检测是否是 USDT ↔ RWA 直接互换
      const isUSDTRWASwap = (fromToken === 'USDT' && toToken === 'RWA') || (fromToken === 'RWA' && toToken === 'USDT');
      const spenderAddress = isUSDTRWASwap ? addresses?.usdtRwaSwap : swapContractAddress;

      if (!spenderAddress) {
        setSwapError('Swap合约地址未配置');
        return;
      }

      if (fromToken === 'USDT') {
        await approveUSDT(fromAmount, spenderAddress);
      } else if (fromToken === 'RWA') {
        const amount = parseUnits(fromAmount, 18);
        await approveRWA(spenderAddress, amount);
      }
      
      setNeedsApproval(false);
      setJustApproved(true);
      
      // 5秒后重置 justApproved 状态
      setTimeout(() => {
        setJustApproved(false);
      }, 5000);
    } catch (error: any) {
      console.error('Approve error:', error);
      
      // 识别用户取消操作
      const isCancelled = error?.code === 4001 || 
                         error?.code === 'ACTION_REJECTED' ||
                         error?.message?.toLowerCase().includes('user rejected') ||
                         error?.message?.toLowerCase().includes('user denied') ||
                         error?.message?.toLowerCase().includes('user cancelled');
      
      if (isCancelled) {
        setSwapError('您已取消授权');
      } else {
        setSwapError(error?.message || '授权失败');
      }
    } finally {
      setIsApproving(false);
    }
  }, [fromToken, fromAmount, fromTokenAddress, toToken, addresses, swapContractAddress, approveUSDT, approveRWA]);

  const handleSwap = useCallback(async () => {
    if (!fromAmount || parseFloat(fromAmount) <= 0) {
      setSwapError('请输入兑换金额');
      return;
    }

    setShowOverlay(true);
    setOverlayStatus('waiting');
    setSwapError(null);
    setTxHash(null);

    try {
      setIsSwapping(true);

      const isUSDTRWASwap = (fromToken === 'USDT' && toToken === 'RWA') || (fromToken === 'RWA' && toToken === 'USDT');
      
      let hash;
      try {
        if (isUSDTRWASwap) {
          console.log('Calling swap function...');
          if (fromToken === 'USDT') {
            hash = await swapUSDTToRWA(fromAmount);
          } else {
            hash = await swapRWAToUSDT(fromAmount);
          }
          console.log('Swap function returned:', hash);
        } else {
          const slippage = 0.005;
          const outputAmount = fromToken === 'USDT' 
            ? (parseFloat(fromAmount) * 1.173 * (1 - slippage)).toFixed(4)
            : (parseFloat(fromAmount) * 0.8524 * (1 - slippage)).toFixed(4);
          hash = await executeSwap(fromAmount, outputAmount, 20);
        }
      } catch (swapError: any) {
        console.error('Swap function error:', swapError);
        throw swapError; // 重新抛出错误
      }
      
      console.log('Swap hash:', hash);
      
      // 确保 waiting 状态至少显示 1 秒
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('Setting pending status...');
      // 显示 pending 状态
      setTxHash(hash || null);
      setOverlayStatus('pending');
      
      // 等待一小段时间
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('Setting success status...');
      // 显示成功状态
      setOverlayStatus('success');
      console.log('Success status set!');
      
      // 后台刷新余额
      Promise.all([refetchUSDT(), refetchRWA()]).catch(err => {
        console.error('Failed to refresh balance:', err);
      });
    } catch (error: any) {
      console.error('Swap error:', error);
      
      const isCancelled = error?.code === 4001 || 
                         error?.code === 'ACTION_REJECTED' ||
                         error?.message?.toLowerCase().includes('user rejected') ||
                         error?.message?.toLowerCase().includes('user denied') ||
                         error?.message?.toLowerCase().includes('user cancelled');
      
      if (isCancelled) {
        setSwapError('您已取消交易');
        setShowOverlay(false);
      } else {
        // 显示错误状态，不关闭 overlay
        setSwapError(error?.message || '兑换失败');
        setOverlayStatus('error');
        console.error('Error details:', error);
      }
    } finally {
      setIsSwapping(false);
    }
  }, [fromToken, fromAmount, toToken, executeSwap, swapUSDTToRWA, swapRWAToUSDT, refetchUSDT, refetchRWA]);

  const handleOverlayClose = () => {
    setShowOverlay(false);
    window.location.reload();
  };

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
    <>
      <SwapTransactionOverlay 
        show={showOverlay}
        status={overlayStatus}
        txHash={txHash}
        fromAmount={fromAmount}
        toAmount={toAmount}
        fromToken={fromToken}
        toToken={toToken}
        error={swapError}
        onClose={handleOverlayClose}
      />
      <div className="mt-4 space-y-2">
        {swapError && !showOverlay && (
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
    </>
  );
}
