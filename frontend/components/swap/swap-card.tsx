'use client';

import { useState } from 'react';
import { Settings, RefreshCw } from 'lucide-react';
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
  
  // 仅支持：USDT → RWA
  const fromToken = 'USDT'
  const toToken = 'RWA'
  const [fromAmount, setFromAmount] = useState('');
  const [slippage, setSlippage] = useState(0.5);

  // 获取合约地址
  const addresses = CONTRACT_ADDRESSES[chain?.id || 56] || CONTRACT_ADDRESSES[56];
  const fromTokenAddress = addresses.usdtToken as Address;
  const toTokenAddress = addresses.rwaToken as Address;

  const { quote, isLoading, refresh } = useSwapQuote(
    fromTokenAddress,
    toTokenAddress,
    fromAmount,
    slippage,
    15000, // 15秒刷新
    18,
    18
  );

  // 生成报价数据
  const mockQuote = fromAmount && parseFloat(fromAmount) > 0 ? {
    outputAmount: (parseFloat(fromAmount) / 0.85).toFixed(4),
    executionPrice: (1 / 0.85).toFixed(4),
    priceImpact: 0,
    minOutputAmount: (parseFloat(fromAmount) / 0.85).toFixed(4),
    gasEstimate: '0',
    route: [fromToken, toToken]
  } : null;

  const displayQuote = quote || mockQuote;

  // 自动更新输出金额
  const toAmount = displayQuote?.outputAmount || '';

  // 根据当前选择的代币获取对应余额
  const fromBalance = parseFloat(usdtBalance || '0').toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  
  const toBalance = parseFloat(rwaBalance || '0').toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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
        onTokenChange={() => {}}
        balance={isConnected ? fromBalance : '0.00'}
        showMax
      />

      {/* Swap Direction Button */}
      <div className="my-2 flex justify-center">
        <div className="text-[11px] text-text-secondary">
          当前仅支持 <span className="text-text-primary font-semibold">USDT</span> 购买 <span className="text-text-primary font-semibold">RWA</span>
        </div>
      </div>

      {/* To Token Input - 显示自动计算的金额 */}
      <TokenInput
        label={t('swap.to')}
        token={toToken}
        amount={toAmount}
        onAmountChange={() => {}} // 输出金额不可编辑
        onTokenChange={() => {}}
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
