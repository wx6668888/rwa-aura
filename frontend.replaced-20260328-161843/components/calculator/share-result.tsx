'use client';

import { useState } from 'react';
import { useLocale } from '@/components/locale-provider';
import { useTranslation } from '@/lib/i18n';
import { useCalculator } from './calculator-context';
import { Copy, Check } from 'lucide-react';

export default function ShareResult() {
  const { locale } = useLocale();
  const { t } = useTranslation(locale);
  const { state, results } = useCalculator();
  const [copied, setCopied] = useState(false);

  const shareText = t('calc.shareText')
    .replace('{amount}', state.amount.toLocaleString())
    .replace('{days}', state.days.toString())
    .replace('{return}', results.totalReturn.toFixed(2));

  const shareUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/calculator?amount=${state.amount}&days=${state.days}&level=${state.nodeLevel}`
    : '';

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleTwitterShare = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(twitterUrl, '_blank');
  };

  const handleTelegramShare = () => {
    const telegramUrl = `https://t.me/+nDdRxLhC6zkzNjhl`;
    window.open(telegramUrl, '_blank');
  };

  return (
    <div className="mt-6 text-center">
      <p className="text-[13px] text-text-secondary mb-3">
        {t('calc.shareTitle')}
      </p>
      
      <div className="flex justify-center gap-3 flex-wrap">
        <button
          onClick={handleCopyLink}
          className="bg-surface-2 border border-border-subtle text-text-primary px-4 py-2 rounded-full hover:border-plasma-cyan hover:text-plasma-cyan transition-all flex items-center gap-2"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          <span className="text-[13px]">{t('calc.copyLink')}</span>
        </button>
        
        <button
          onClick={handleTwitterShare}
          className="bg-surface-2 border border-border-subtle text-text-primary px-4 py-2 rounded-full hover:border-plasma-cyan hover:text-plasma-cyan transition-all flex items-center gap-2"
        >
          <span className="text-[13px]">🐦 Twitter/X</span>
        </button>
        
        <button
          onClick={handleTelegramShare}
          className="bg-surface-2 border border-border-subtle text-text-primary px-4 py-2 rounded-full hover:border-plasma-cyan hover:text-plasma-cyan transition-all flex items-center gap-2"
        >
          <span className="text-[13px]">💬 Telegram</span>
        </button>
      </div>
    </div>
  );
}
