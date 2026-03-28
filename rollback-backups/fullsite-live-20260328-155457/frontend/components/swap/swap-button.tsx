'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { useLocale } from '@/components/locale-provider';
import { useTranslation } from '@/lib/i18n';
import { Loader2, AlertTriangle } from 'lucide-react';
import { SwapTransactionOverlay } from './swap-transaction-overlay';
import { useUSDT } from '@/hooks/useUSDT';
import { useUSDTRWASwap } from '@/hooks/useUSDTRWASwap';
import { CONTRACT_ADDRESSES } from '@/lib/contracts/addresses';
import { parseUnits } from 'viem';
import { erc20ABI } from '@/lib/contracts/erc20ABI';

interface SwapButtonProps {
  fromToken: string;
  toToken: string;
  fromAmount: string;
}

export default function SwapButton({ fromToken, toToken, fromAmount }: SwapButtonProps) {
  const { locale } = useLocale();
  const { t } = useTranslation(locale);
  const { address, isConnected, chainId } = useAccount();
  const publicClient = usePublicClient();
  const { approve: approveUSDT } = useUSDT();
  // 专用 USDT→RWA 互换（不依赖 PancakeSwap 流动性）
  const { swapUSDTToRWA, swapAddress: internalSwapAddress } = useUSDTRWASwap();
  
  const addresses = chainId ? CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES] : undefined;
  const fromTokenAddress = fromToken === 'USDT' ? addresses?.usdtToken : addresses?.rwaToken;
  const toTokenAddress = toToken === 'USDT' ? addresses?.usdtToken : addresses?.rwaToken;
  const swapSpender = internalSwapAddress as `0x${string}` | undefined;

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
  const isUSDTRWASwap = (fromToken === 'USDT' && toToken === 'RWA');
  const internalSwapAvailable =
    typeof internalSwapAddress === 'string' &&
    /^0x[a-fA-F0-9]{40}$/.test(internalSwapAddress) &&
    internalSwapAddress !== '0x0000000000000000000000000000000000000000';

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
        if (!internalSwapAvailable || !swapSpender || !publicClient || !address || fromToken !== 'USDT') {
          setNeedsApproval(false);
          return;
        }
        const amountWei = parseUnits(fromAmount, 6);
        const allowance = await publicClient.readContract({
          address: fromTokenAddress as `0x${string}`,
          abi: erc20ABI,
          functionName: 'allowance',
          args: [address as `0x${string}`, swapSpender],
        });
        setNeedsApproval(allowance < amountWei);
      } catch (error) {
        console.error('Check approval error:', error);
        // 如果检查失败，默认需要授权
        setNeedsApproval(true);
      }
    };

    checkApproval();
  }, [showOverlay, justApproved, isConnected, hasAmount, fromAmount, fromTokenAddress, internalSwapAvailable, swapSpender, publicClient, address, fromToken]);

  const handleApprove = useCallback(async () => {
    if (!fromTokenAddress) {
      setSwapError('合约地址未配置');
      return;
    }
    if (!internalSwapAvailable || !swapSpender) {
      setSwapError('USDT→RWA 互换暂未开放');
      return;
    }

    try {
      setIsApproving(true);
      setSwapError(null);
      // 授权给 USDTRWASwap 合约
      await approveUSDT(fromAmount, swapSpender);
      
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
  }, [fromTokenAddress, internalSwapAvailable, swapSpender, approveUSDT, fromAmount]);

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
      
      let hash;
      try {
        if (!internalSwapAvailable) throw new Error('USDT→RWA 互换暂未开放');
        hash = await swapUSDTToRWA(fromAmount);
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
      
      // 余额刷新由各自 hooks 的轮询/组件刷新承担
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
  }, [fromAmount, internalSwapAvailable, swapUSDTToRWA]);

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
        {isUSDTRWASwap && !internalSwapAvailable && (
          <div className="flex items-center gap-2 rounded-lg border border-[#fbbf2440] bg-[#fbbf2412] p-2">
            <AlertTriangle className="h-4 w-4 text-[#fbbf24]" />
            <p className="text-xs text-[#fbbf24]">USDT→RWA 互换暂未开放</p>
          </div>
        )}
        {swapError && (
          <div className="flex items-center gap-2 rounded-lg border border-[#f43f5e40] bg-[#f43f5e10] p-2">
            <AlertTriangle className="h-4 w-4 text-[#f43f5e]" />
            <p className="text-xs text-[#f43f5e]">{swapError}</p>
          </div>
        )}
        <button
          onClick={handleApprove}
          disabled={isApproving}
          className="w-full h-[60px] bg-surface-2 border border-border-active text-text-primary rounded-full font-bold hover:bg-surface-3 transition-colors disabled:opacity-50"
        >
          {isApproving ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              授权中
            </span>
          ) : (
            `授权${fromToken}`
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
        {isUSDTRWASwap && !internalSwapAvailable && (
          <div className="flex items-center gap-2 rounded-lg border border-[#fbbf2440] bg-[#fbbf2412] p-2">
            <AlertTriangle className="h-4 w-4 text-[#fbbf24]" />
            <p className="text-xs text-[#fbbf24]">USDT→RWA 互换暂未开放</p>
          </div>
        )}
        {swapError && !showOverlay && (
          <div className="flex items-center gap-2 rounded-lg border border-[#f43f5e40] bg-[#f43f5e10] p-2">
            <AlertTriangle className="h-4 w-4 text-[#f43f5e]" />
            <p className="text-xs text-[#f43f5e]">{swapError}</p>
          </div>
        )}
        <button
        onClick={handleSwap}
        disabled={isSwapping || !internalSwapAvailable}
        className={`w-full h-[60px] rounded-full font-bold transition-all disabled:opacity-50 ${
          isHighImpact
            ? 'bg-warning text-void-black hover:brightness-110'
            : 'bg-plasma-cyan text-void-black hover:brightness-110 hover:scale-[1.02]'
        }`}
      >
        {isSwapping ? (
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
