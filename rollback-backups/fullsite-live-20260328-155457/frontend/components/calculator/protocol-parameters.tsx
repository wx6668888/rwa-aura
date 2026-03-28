'use client';

import { useLocale } from '@/components/locale-provider';
import { useTranslation } from '@/lib/i18n';
import Link from 'next/link';

export default function ProtocolParameters() {
  const { locale } = useLocale();
  const { t } = useTranslation(locale);

  return (
    <div className="mt-8 bg-surface-1 border border-border-subtle rounded-2xl p-5 backdrop-blur-xl">
      <div className="text-[11px] uppercase tracking-widest text-text-secondary mb-3">
        {t('calc.paramsRef')}
      </div>
      
      <div className="flex gap-3 flex-wrap">
        <div className="bg-surface-2 rounded-xl px-4 py-2.5 flex items-center gap-2">
          <span className="font-jetbrains text-[14px] text-plasma-cyan font-bold">{t('calc.dailyRateValue')}</span>
          <span className="text-[12px] text-text-secondary">{t('calc.dailyRate')}</span>
        </div>
        
        <div className="bg-surface-2 rounded-xl px-4 py-2.5 flex items-center gap-2">
          <span className="font-jetbrains text-[14px] text-plasma-cyan font-bold">{t('calc.maxPeriodValue')}</span>
          <span className="text-[12px] text-text-secondary">{t('calc.maxPeriod')}</span>
        </div>
        
        <div className="bg-surface-2 rounded-xl px-4 py-2.5 flex items-center gap-2">
          <span className="font-jetbrains text-[14px] text-plasma-cyan font-bold">100 USDT</span>
          <span className="text-[12px] text-text-secondary">{t('calc.minStake')}</span>
        </div>
        
        <div className="bg-surface-2 rounded-xl px-4 py-2.5 flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse"></div>
            <span className="text-[10px] text-success">{t('calc.liveStatus')}</span>
          </div>
          <span className="text-[12px] text-text-secondary">{t('calc.liveParams')}</span>
        </div>
      </div>
      
      <p className="text-[11px] text-text-disabled mt-3">
        {t('calc.paramsNote')}
        <Link href="/governance" className="text-plasma-cyan hover:underline ml-1">
          {t('calc.governanceLink')}
        </Link>
      </p>
    </div>
  );
}
