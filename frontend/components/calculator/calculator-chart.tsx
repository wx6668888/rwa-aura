'use client';

import { useMemo } from 'react';
import { useLocale } from '@/components/locale-provider';
import { useTranslation } from '@/lib/i18n';
import { useCalculator } from './calculator-context';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, ReferenceLine } from 'recharts';

const DAILY_RATE = 0.008;

export default function CalculatorChart() {
  const { locale } = useLocale();
  const { t } = useTranslation(locale);
  const { state, updateChartMode } = useCalculator();

  const chartData = useMemo(() => {
    const data = [];
    const { amount, days, chartMode } = state;
    
    for (let day = 0; day <= days; day++) {
      let rwaValue: number;
      
      if (chartMode === 'linear') {
        rwaValue = amount + (amount * DAILY_RATE * day);
      } else {
        rwaValue = amount * Math.pow(1 + DAILY_RATE, day);
      }
      
      const bankValue = amount + (amount * 0.03 / 365 * day);
      const stableValue = amount + (amount * 0.08 / 365 * day);
      const ethValue = amount + (amount * 0.04 / 365 * day);
      
      data.push({
        day,
        rwaValue,
        bankValue,
        stableValue,
        ethValue,
      });
    }
    
    return data;
  }, [state]);

  return (
    <div className="mt-8 bg-surface-1 border border-border-subtle rounded-2xl p-6 backdrop-blur-xl">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h3 className="text-[14px] font-bold text-text-primary">
          {t('calc.growthChart')}
        </h3>
        
        <div className="flex gap-2">
          <button
            onClick={() => updateChartMode('linear')}
            className={`px-4 py-2 rounded-full text-[13px] border transition-all ${
              state.chartMode === 'linear'
                ? 'border-plasma-cyan text-plasma-cyan bg-surface-2'
                : 'border-border-subtle text-text-secondary hover:border-border-active'
            }`}
          >
            {t('calc.linear')}
          </button>
          <button
            onClick={() => updateChartMode('compound')}
            className={`px-4 py-2 rounded-full text-[13px] border transition-all ${
              state.chartMode === 'compound'
                ? 'border-plasma-cyan text-plasma-cyan bg-surface-2'
                : 'border-border-subtle text-text-secondary hover:border-border-active'
            }`}
          >
            {t('calc.compound')}
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="mt-4 h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="rwaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00f5d4" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#00f5d4" stopOpacity={0} />
              </linearGradient>
            </defs>
            
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
            
            <XAxis
              dataKey="day"
              stroke="#64748b"
              tick={{ fill: '#64748b', fontSize: 12, fontFamily: 'JetBrains Mono' }}
              label={{ value: t('calc.days'), position: 'insideBottom', offset: -5, fill: '#64748b' }}
            />
            
            <YAxis
              stroke="#64748b"
              tick={{ fill: '#64748b', fontSize: 12, fontFamily: 'JetBrains Mono' }}
              tickFormatter={(value) => `$${value.toLocaleString()}`}
            />
            
            <Tooltip
              contentStyle={{
                backgroundColor: '#13131e',
                border: '1px solid #ffffff1a',
                borderRadius: '12px',
                padding: '12px',
                boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
              }}
              labelStyle={{ color: '#64748b', fontSize: '11px', marginBottom: '8px' }}
              formatter={(value: number, name: string) => [
                `$${value.toFixed(2)}`,
                name === 'rwaValue' ? 'RWA Protocol' :
                name === 'bankValue' ? 'Bank 3%' :
                name === 'stableValue' ? 'Stable Farm 8%' :
                'ETH Staking 4%'
              ]}
              labelFormatter={(label) => `Day ${label}`}
            />
            
            <ReferenceLine
              y={state.amount}
              stroke="#ffffff20"
              strokeDasharray="5 5"
              label={{ value: t('calc.principal'), fill: '#64748b', fontSize: 11 }}
            />
            
            {/* RWA Protocol Line */}
            <Area
              type="monotone"
              dataKey="rwaValue"
              stroke="#00f5d4"
              strokeWidth={2.5}
              fill="url(#rwaGradient)"
              dot={false}
            />
            
            {/* Comparison Lines */}
            {state.comparisons.bank && (
              <Line
                type="monotone"
                dataKey="bankValue"
                stroke="#334155"
                strokeWidth={1.5}
                strokeDasharray="5 5"
                dot={false}
              />
            )}
            
            {state.comparisons.stable && (
              <Line
                type="monotone"
                dataKey="stableValue"
                stroke="#475569"
                strokeWidth={1.5}
                strokeDasharray="5 5"
                dot={false}
              />
            )}
            
            {state.comparisons.eth && (
              <Line
                type="monotone"
                dataKey="ethValue"
                stroke="#3f4a5c"
                strokeWidth={1.5}
                strokeDasharray="5 5"
                dot={false}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
