'use client';

import { Calculator } from 'lucide-react';
import { useLocale } from '@/components/locale-provider';
import { useTranslation } from '@/lib/i18n';

export default function CalculatorHeader() {
  const { locale } = useLocale();
  const { t } = useTranslation(locale);

  return (
    <div className="pt-10 pb-2 text-center">
      {/* Calculator Icon */}
      <div className="inline-block animate-float">
        <Calculator className="w-11 h-11 text-plasma-cyan mx-auto" />
      </div>

      {/* Overline */}
      <div className="text-[11px] uppercase tracking-widest text-text-secondary mt-4">
        {t('calc.overline')}
      </div>

      {/* Title */}
      <h1 className="text-4xl font-[800] text-text-primary mt-3 max-w-2xl mx-auto font-space-grotesk">
        {t('calc.title')}
      </h1>
    </div>
  );
}
