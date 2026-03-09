'use client';

import { useState } from 'react';
import { Settings, RefreshCw, ArrowUpDown } from 'lucide-react';
import { useAccount } from 'wagmi';
import { type Address } from 'viem';
import { useLocale } from '@/components/locale-provider';
import { useTranslation } from '@/lib/i18n';
import { useSwapQuote } from '@/hooks/useSwapQuote';
import { useUSDT } from '@/hooks/useUSDT';
import { useRWAToken } from '@/hooks/useRWAToken';
import { useRwaPrice } from '@/hooks/useRwaPrice';
import { CONTRACT_ADDRESSES } from '@/lib/contracts/addresses';
import TokenInput from './token-input';
import SwapDetails from './swap-details';
import SwapButton from './swap-button';

export default function SwapCard() {
  const { locale } = useLocale();
  const { t } = useTranslation(locale);
  const { chain, isConnected } = useAccount();
  const { price: rwaPrice } = useRwaPrice()
  
  // 获取真实余额
  const { balance: usdtBalance } = useUSDT();
  const { balanceFormatted: rwaBalance } = useRWAToken();
  
  const [fromToken, setFromToken] = useState('USDT');
  const [toToken, setToToken] = useState('RWA');
  const [fromAmount, setFromAmount] = useState('');
  const [slippage, setSlippage] = useState(0.5);

  // 获取合约地址
  const addresses = CONTRACT_ADDRESSES[chain?.id || 56];
  const fromTokenAddress = fromToken === 'USDT' ? addresses.usdtToken : addresses.rwaToken;
  const toTokenAddress = toToken === 'USDT' ? addresses.usdtToken : addresses.rwaToken;

  // 使用自动刷新的报价 Hook（失败时自动使用模拟数据）
  const { quote, isLoading, refresh } = useSwapQuote(
    fromTokenAddress as Address,
    toTokenAddress as Address,
    fromAmount,
    slippage,
    15000, // 15秒刷新
    fromToken === 'USDT' ? 6 : 18,  // USDT 6位，RWA 18位
    toToken === 'USDT' ? 6 : 18
  );

  // 生成模拟报价数据（暂时使用；真实报价来自合约/路由，失败时由 useSwapQuote 内部自动回退）
  const mockQuote = fromAmount && parseFloat(fromAmount) > 0 ? {
    outputAmount: fromToken === 'USDT' 
      ? (parseFloat(fromAmount) / (rwaPrice || 0.85)).toFixed(4)  // USDT -> RWA
      : (parseFloat(fromAmount) * (rwaPrice || 0.85)).toFixed(4), // RWA -> USDT
    executionPrice: fromToken === 'USDT' ? (1 / (rwaPrice || 0.85)).toFixed(4) : (rwaPrice || 0.85).toFixed(4),
    priceImpact: 0.08,
    minOutputAmount: fromToken === 'USDT'
      ? (parseFloat(fromAmount) / (rwaPrice || 0.85) * 0.995).toFixed(4)  // 减去 0.5% 滑点
      : (parseFloat(fromAmount) * (rwaPrice || 0.85) * 0.995).toFixed(4),
    gasEstimate: '0',
    route: [fromToken, toToken]
  } : null;

  // 使用模拟报价
  const displayQuote = quote || mockQuote;

  // 自动更新输出金额
  const toAmount = displayQuote?.outputAmount || '';

  // 根据当前选择的代币获取对应余额
  const fromBalance = fromToken === 'USDT' 
    ? parseFloat(usdtBalance || '0').toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : parseFloat(rwaBalance || '0').toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  
  const toBalance = toToken === 'USDT'
    ? parseFloat(usdtBalance || '0').toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : parseFloat(rwaBalance || '0').toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const handleSwapDirection = () => {
    setFromToken(toToken);
    setToToken(fromToken);
    setFromAmount(toAmount);
  };

  const handleRefresh = () => {
    refresh();
  };

  return (
    <div className="space-y-4">
      <div className="bg-surface-1 border-2 border-plasma-cyan rounded-2xl p-4 sm:p-6 shadow-plasma-glow backdrop-blur-xl max-w-[480px] mx-auto w-full">
      {/* Top Row */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-[14px] font-bold text-text-primary">
          {t('swap.cardTitle')}
        </h2>
        
        <div className="flex items-center gap-2">
          {/* Settings Button */}
          <button className="w-8 h-8 flex items-center justify-center rounded-full border border-border-active text-text-secondary hover:bg-surface-2 transition-colors">
            <Settings className="w-4 h-4" />
          </button>
          
          {/* Refresh Button */}
          <button 
            onClick={handleRefresh}
            className="w-8 h-8 flex items-center justify-center rounded-full border border-border-active text-text-secondary hover:bg-surface-2 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          
          {/* Live Price */}
          <div className="flex items-center gap-1.5 bg-surface-2 border border-border-subtle rounded-full px-3 py-1">
            <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse"></div>
            <span className="text-[11px] font-jetbrains text-text-secondary">
              1 RWA = ${displayQuote?.executionPrice || (rwaPrice || 0.85).toFixed(4)}
            </span>
          </div>
        </div>
      </div>

      {/* From Token Input */}
      <TokenInput
        label={t('swap.from')}
        token={fromToken}
        amount={fromAmount}
        onAmountChange={setFromAmount}
        onTokenChange={setFromToken}
        balance={isConnected ? fromBalance : '0.00'}
        showMax
      />

      {/* Swap Direction Button */}
      <div className="my-2 flex justify-center">
        <button
          onClick={handleSwapDirection}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-surface-2 border border-border-active text-text-secondary hover:bg-surface-3 hover:text-plasma-cyan transition-all duration-300 hover:rotate-180"
        >
          <ArrowUpDown className="w-4 h-4" />
        </button>
      </div>

      {/* To Token Input - 显示自动计算的金额 */}
      <TokenInput
        label={t('swap.to')}
        token={toToken}
        amount={toAmount}
        onAmountChange={() => {}} // 输出金额不可编辑
        onTokenChange={setToToken}
        balance={isConnected ? toBalance : '0.00'}
        isOutput
      />

      {/* Swap Details - 传递报价数据（使用模拟数据） */}
      {fromAmount && parseFloat(fromAmount) > 0 && displayQuote && (
        <SwapDetails 
          fromToken={fromToken}
          toToken={toToken}
          fromAmount={fromAmount}
          quote={displayQuote}
          slippage={slippage}
          onSlippageChange={setSlippage}
        />
      )}

      {/* Swap Button */}
      <SwapButton 
        fromToken={fromToken}
        toToken={toToken}
        fromAmount={fromAmount}
      />

      {/* Powered By - 右下方灰色小字 */}
      <div className="mt-3 text-right">
        <p className="text-[10px] text-text-disabled">
          {t('swap.poweredBy')}
        </p>
      </div>
    </div>
    </div>
  );
}
