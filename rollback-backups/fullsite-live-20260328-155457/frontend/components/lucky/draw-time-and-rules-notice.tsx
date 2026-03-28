'use client';

import { useEffect, useState } from 'react';
import { useLocale } from '@/components/locale-provider';
import { useTranslation } from '@/lib/i18n';
import { Clock, Info } from 'lucide-react';

function getCurrentUTCString(): string {
  return new Date().toLocaleString(undefined, {
    timeZone: 'UTC',
    dateStyle: 'medium',
    timeStyle: 'medium',
    hour12: false,
  });
}

export default function DrawTimeAndRulesNotice() {
  const { locale } = useLocale();
  const { t } = useTranslation(locale);
  const [utcNow, setUtcNow] = useState(getCurrentUTCString);

  useEffect(() => {
    const timer = setInterval(() => setUtcNow(getCurrentUTCString()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="mt-8">
      <h2 className="text-[18px] font-700 text-text-primary mb-4">
        {t('lucky.drawTimeAndRules')}
      </h2>

      <div className="border border-border-subtle rounded-2xl p-6 md:p-8 backdrop-blur-xl bg-surface-1">
        {/* 当前服务器时间 - 突出显示 */}
        <div className="flex items-center gap-3 p-4 rounded-xl bg-surface-2 border border-border-subtle mb-6">
          <div className="w-10 h-10 rounded-full bg-plasma-cyan/15 border-2 border-plasma-cyan flex items-center justify-center flex-shrink-0">
            <Clock className="w-5 h-5 text-plasma-cyan" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-wider text-text-tertiary mb-0.5">
              {t('lucky.currentServerTime')}
            </div>
            <div className="font-mono text-[15px] font-600 text-text-primary tabular-nums">
              {utcNow} <span className="text-[12px] font-400 text-text-tertiary">(UTC)</span>
            </div>
          </div>
        </div>

        {/* 说明 */}
        <div className="flex items-start gap-3 p-4 rounded-xl bg-surface-2/50 mb-6">
          <Info className="w-5 h-5 text-plasma-cyan flex-shrink-0 mt-0.5" />
          <p className="text-[14px] text-text-secondary leading-relaxed">
            {t('lucky.utcTimeNotice')}
          </p>
        </div>

        {/* 各奖池开奖时间 */}
        <div className="mb-6">
          <ul className="space-y-3">
            {[
              { key: 'lucky.utcRealtime', icon: '⚡' },
              { key: 'lucky.utcWeekly', icon: '📅' },
              { key: 'lucky.utcMonthly', icon: '📆' },
              { key: 'lucky.utcAnnual', icon: '🎆' },
            ].map(({ key, icon }) => (
              <li
                key={key}
                className="flex items-start gap-3 p-3 rounded-xl bg-surface-2 hover:bg-surface-3 transition-colors"
              >
                <span className="text-[18px] flex-shrink-0">{icon}</span>
                <span className="text-[14px] text-text-secondary leading-relaxed">{t(key)}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* 滚存规则 */}
        <div className="flex items-start gap-3 p-4 rounded-xl bg-surface-2 border-l-4 border-gold-node">
          <Info className="w-5 h-5 text-gold-node flex-shrink-0 mt-0.5" />
          <p className="text-[14px] text-text-secondary leading-relaxed">
            {t('lucky.rolloverNotice')}
          </p>
        </div>
      </div>
    </div>
  );
}
