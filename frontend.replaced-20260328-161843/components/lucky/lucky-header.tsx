'use client';

import { Trophy } from 'lucide-react';
import { useLocale } from '@/components/locale-provider';
import { useTranslation } from '@/lib/i18n';

export default function LuckyHeader() {
  const { locale } = useLocale();
  const { t } = useTranslation(locale);

  return (
    <div className="pt-10 pb-4 text-center">
      {/* Trophy Icon with bounce animation */}
      <div className="mx-auto w-[52px] h-[52px] flex items-center justify-center animate-bounce-slow">
        <Trophy className="w-full h-full text-gold-node" />
      </div>

      {/* Overline */}
      <div className="text-[11px] uppercase tracking-widest mt-4 text-text-secondary">
        {t('lucky.overline')}
      </div>

      {/* Title with gradient（移动端小字号一行显示） */}
      <h1 className="text-[28px] sm:text-[32px] md:text-[38px] lg:text-[44px] font-[900] mt-3 max-w-2xl mx-auto leading-tight">
        <span className="bg-gradient-to-r from-plasma-cyan to-gold-node bg-clip-text text-transparent">
          {t('lucky.title')}
        </span>
      </h1>

      {/* Subtitle */}
      <p className="text-[15px] text-text-secondary mt-3 max-w-xl mx-auto leading-relaxed">
        {t('lucky.subtitle')}
      </p>
    </div>
  );
}
