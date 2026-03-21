'use client';

import { useEffect, useState } from 'react';
import { useLocale } from '@/components/locale-provider';
import { useTranslation } from '@/lib/i18n';
import { useLottery } from '@/hooks/useLottery';
import { useRwaPrice } from '@/hooks/useRwaPrice';

import type { LuckyPoolType } from './pool-switcher';

const FIVE_MIN_SEC = 5 * 60;
const ONE_DAY_SEC = 86400;

/** Format Unix timestamp (seconds) as UTC string for display (server time) */
function formatUTCTime(unixSeconds: number): string {
  if (!unixSeconds || unixSeconds <= 0) return '';
  const d = new Date(unixSeconds * 1000);
  return d.toLocaleString(undefined, {
    timeZone: 'UTC',
    dateStyle: 'medium',
    timeStyle: 'short',
    hour12: false,
  });
}

/** Next 5-min boundary in UTC (same as contract). Returns Unix seconds. */
function nextFiveMinUTCFromNow(): number {
  const ts = Math.floor(Date.now() / 1000);
  return (Math.floor(ts / FIVE_MIN_SEC) + 1) * FIVE_MIN_SEC;
}

/** Days from epoch (Thu Jan 1 1970) to Jan 1 of year y (approx, no leap in formula for simplicity). */
function jan1Days(y: number): number {
  const yy = y - 1970;
  return yy * 365 + Math.floor((yy + 1) / 4) - Math.floor((yy + 1) / 100) + Math.floor((yy + 1) / 400);
}

/** Next Monday 00:00 UTC. Epoch day 0 = Thu, so (day+4)%7: 4=Mon. */
function nextMondayUTCFromNow(): number {
  const ts = Math.floor(Date.now() / 1000);
  const day = Math.floor(ts / ONE_DAY_SEC);
  const wday = (day + 4) % 7;
  const daysToMon = wday === 4 ? 0 : (4 - wday + 7) % 7;
  const nextMonDay = daysToMon === 0
    ? (ts > day * ONE_DAY_SEC ? day + 7 : day)
    : day + daysToMon;
  return nextMonDay * ONE_DAY_SEC;
}

/** Next 1st of month 00:00 UTC. */
function nextMonthFirstUTCFromNow(): number {
  const ts = Math.floor(Date.now() / 1000);
  const day = Math.floor(ts / ONE_DAY_SEC);
  let y = 1970 + Math.floor(day / 365);
  while (jan1Days(y + 1) <= day) y++;
  const dJan1 = jan1Days(y);
  const dayInYear = day - dJan1;
  const limits = [31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334, 365];
  let nextMonth1Day = dJan1 + 31;
  for (let i = 0; i < limits.length; i++) {
    if (dayInYear < limits[i]) {
      nextMonth1Day = i < 11 ? dJan1 + limits[i] : jan1Days(y + 1);
      break;
    }
  }
  if (dayInYear >= 334) nextMonth1Day = jan1Days(y + 1);
  return nextMonth1Day * ONE_DAY_SEC;
}

/** Next Jan 1 00:00 UTC. */
function nextJan1UTCFromNow(): number {
  const ts = Math.floor(Date.now() / 1000);
  const day = Math.floor(ts / ONE_DAY_SEC);
  let y = 1970 + Math.floor(day / 365);
  while (jan1Days(y) <= day) y++;
  return jan1Days(y) * ONE_DAY_SEC;
}

/** Get next draw timestamp (UTC seconds) by pool type. Used when contract data is missing. */
function getFallbackNextDrawTime(poolType: string): number {
  switch (poolType) {
    case 'realtime': return nextFiveMinUTCFromNow();
    case 'weekly': return nextMondayUTCFromNow();
    case 'monthly': return nextMonthFirstUTCFromNow();
    case 'annual': return nextJan1UTCFromNow();
    default: return nextFiveMinUTCFromNow();
  }
}

interface PrizePoolCardProps {
  poolType: LuckyPoolType;
}

export default function PrizePoolCard({ poolType }: PrizePoolCardProps) {
  const { locale } = useLocale();
  const { t } = useTranslation(locale);
  const { price: rwaPrice } = useRwaPrice()
  
  const { weeklyPool, monthlyPool, realtimePool, annualPool } = useLottery();
  const currentPool = poolType === 'weekly' ? weeklyPool : poolType === 'monthly' ? monthlyPool : poolType === 'realtime' ? realtimePool : annualPool;
  
  const [countdown, setCountdown] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  // Countdown: use contract nextDrawTime when valid; otherwise compute next draw from current UTC (no fake mock).
  const hasContractTime = currentPool?.nextDrawTime != null && Number(currentPool.nextDrawTime) > 0;
  const contractNextDraw = hasContractTime ? Number(currentPool!.nextDrawTime) : null;

  useEffect(() => {
    const updateCountdown = () => {
      const now = Math.floor(Date.now() / 1000);
      const nextDrawSeconds = contractNextDraw ?? getFallbackNextDrawTime(poolType);
      const diff = nextDrawSeconds - now;

      if (diff <= 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const days = Math.floor(diff / 86400);
      const hours = Math.floor((diff % 86400) / 3600);
      const minutes = Math.floor((diff % 3600) / 60);
      const seconds = diff % 60;

      setCountdown({ days, hours, minutes, seconds });
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);

    return () => clearInterval(timer);
  }, [poolType, contractNextDraw]);

  const defaultPrize = poolType === 'realtime' ? '0' : poolType === 'annual' ? '0' : poolType === 'weekly' ? '24500' : '125000';
  const defaultTickets = poolType === 'realtime' ? 0 : poolType === 'annual' ? 0 : poolType === 'weekly' ? 2450 : 2500;
  const prizePool = currentPool?.prizePool || defaultPrize;
  const ticketsSold = currentPool?.ticketsSold ?? defaultTickets;
  const participants = Math.floor(ticketsSold / 3);

  const poolAmount = parseFloat(prizePool).toFixed(2);
  const usdValue = (parseFloat(prizePool) * (rwaPrice || 0.85)).toFixed(2);
  const progress = currentPool?.nextDrawTime ? Math.min(95, (ticketsSold / Math.max(1, ticketsSold + 50)) * 100) : (poolType === 'weekly' ? 43 : poolType === 'monthly' ? 67 : 0);

  return (
    <div className="border-2 border-plasma-cyan rounded-2xl p-6 shadow-plasma-glow backdrop-blur-xl bg-surface-1">
      {/* Pool Amount */}
      <div className="text-center py-4">
        <div className="text-[11px] uppercase tracking-widest text-text-secondary">
          {t('lucky.currentPool')}
        </div>
        
        <div className="mt-2 flex items-baseline justify-center flex-wrap gap-2">
          <span className="text-[40px] sm:text-[56px] font-[900] text-gold-node font-jetbrains leading-none">
            {parseFloat(poolAmount).toLocaleString()}
          </span>
          <span className="text-[16px] sm:text-[20px] text-gold-node font-jetbrains">
            RWA
          </span>
        </div>
        
        <div className="mt-1 text-[13px] text-text-secondary">
          ≈ ${usdValue} USDT
        </div>
      </div>

      {/* Prize Distribution (95% to winners; 5% treasury) */}
      <div className="mt-3 flex justify-center gap-2 flex-wrap">
        <div className="bg-surface-2 rounded-full px-2 py-1 text-[11px] text-text-secondary">
          🏛 5% {t('lucky.projectShare')}
        </div>
        <div className="bg-surface-2 rounded-full px-2 py-1 text-[11px] text-text-secondary">
          🥇 48%
        </div>
        <div className="bg-surface-2 rounded-full px-2 py-1 text-[11px] text-text-secondary">
          🥈 24%
        </div>
        <div className="bg-surface-2 rounded-full px-2 py-1 text-[11px] text-text-secondary">
          🥉 14%
        </div>
        <div className="bg-surface-2 rounded-full px-2 py-1 text-[11px] text-text-secondary">
          🎁 9%
        </div>
      </div>

      <div className="h-px bg-border-subtle my-4" />

      {/* Countdown */}
      <div className="text-center">
        <div className="text-[12px] tracking-wider text-text-secondary mb-3">
          {t('lucky.nextDraw')}
        </div>
        <div className="text-[11px] text-text-secondary mb-2">
          {t('lucky.drawAtUTC')}: {formatUTCTime(contractNextDraw ?? getFallbackNextDrawTime(poolType))} (UTC)
          {!hasContractTime && (
            <span className="text-text-tertiary ml-1">({t('lucky.clientTime')})</span>
          )}
        </div>
        {/* 移动端：单行显示倒计时 */}
        <div className="flex justify-center items-center gap-1 flex-nowrap overflow-x-auto">
          {[
            { value: countdown.days, label: t('lucky.days') },
            { value: countdown.hours, label: t('lucky.hours') },
            { value: countdown.minutes, label: t('lucky.minutes') },
            { value: countdown.seconds, label: t('lucky.seconds') },
          ].map((item, index) => (
            <div key={index} className="flex items-center flex-shrink-0">
              <div className="bg-surface-2 rounded-xl p-2 min-w-[52px] text-center">
                <div className="text-[24px] sm:text-[32px] font-jetbrains text-plasma-cyan font-900 leading-none">
                  {String(item.value).padStart(2, '0')}
                </div>
                <div className="text-[8px] sm:text-[9px] text-text-secondary mt-0.5">
                  {item.label}
                </div>
              </div>
              {index < 3 && (
                <div className="text-[18px] sm:text-[24px] text-text-secondary mx-0.5">:</div>
              )}
            </div>
          ))}
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex justify-between text-[11px] text-text-secondary mb-1">
            <span>{t('lucky.weekProgress')}</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1 bg-surface-3 rounded-full overflow-hidden">
            <div 
              className="h-full bg-plasma-cyan transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      <div className="h-px bg-border-subtle my-4" />

      {/* Pool Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-surface-2 rounded-xl p-3 text-center">
          <div className="text-[18px] font-jetbrains text-plasma-cyan font-700">
            {ticketsSold.toLocaleString()}
          </div>
          <div className="text-[11px] text-text-secondary mt-1">
            {t('lucky.totalTickets')}
          </div>
        </div>
        
        <div className="bg-surface-2 rounded-xl p-3 text-center">
          <div className="text-[18px] font-jetbrains text-plasma-cyan font-700">
            {participants.toLocaleString()}
          </div>
          <div className="text-[11px] text-text-secondary mt-1">
            {t('lucky.participants')}
          </div>
        </div>
        
        <div className="bg-surface-2 rounded-xl p-3 text-center">
          <div className="text-[18px] font-jetbrains text-plasma-cyan font-700">
            {ticketsSold > 0 ? ((1 / ticketsSold) * 100).toFixed(2) : '0.00'}%
          </div>
          <div className="text-[11px] text-text-secondary mt-1">
            {t('lucky.winChance')}
          </div>
        </div>
      </div>
    </div>
  );
}
