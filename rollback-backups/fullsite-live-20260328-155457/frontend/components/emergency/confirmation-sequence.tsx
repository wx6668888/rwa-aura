'use client'

import { CheckCircle } from 'lucide-react'

interface Props {
  t: (key: string) => string
  check1: boolean
  check2: boolean
  confirmValue: string
  onCheck1: () => void
  onCheck2: () => void
  onConfirmChange: (v: string) => void
}

export function ConfirmationSequence({
  t,
  check1,
  check2,
  confirmValue,
  onCheck1,
  onCheck2,
  onConfirmChange,
}: Props) {
  const confirmWord = t('emergency.confirmWord')
  const isConfirmed = confirmValue === confirmWord

  return (
    <div className="mt-6 flex flex-col gap-5">
      {/* Checkbox 1 */}
      <label className="flex cursor-pointer items-start gap-3">
        <button
          type="button"
          onClick={onCheck1}
          aria-checked={check1}
          role="checkbox"
          className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border-2 border-[#ffffff1a] transition-colors"
          style={{
            backgroundColor: check1 ? '#f43f5e' : 'transparent',
            borderColor: check1 ? '#f43f5e' : '#ffffff1a',
            minWidth: '20px',
            minHeight: '20px',
          }}
        >
          {check1 && (
            <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
              <path d="M1 5l3.5 3.5L11 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
        <span className="text-sm text-[#f1f5f9]">{t('emergency.check1')}</span>
      </label>

      {/* Checkbox 2 */}
      <label className="flex cursor-pointer items-start gap-3">
        <button
          type="button"
          onClick={onCheck2}
          aria-checked={check2}
          role="checkbox"
          className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border-2 transition-colors"
          style={{
            backgroundColor: check2 ? '#f43f5e' : 'transparent',
            borderColor: check2 ? '#f43f5e' : '#ffffff1a',
            minWidth: '20px',
            minHeight: '20px',
          }}
        >
          {check2 && (
            <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
              <path d="M1 5l3.5 3.5L11 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
        <span className="text-sm text-[#f1f5f9]">{t('emergency.check2')}</span>
      </label>

      {/* Text confirmation input */}
      <div className="flex flex-col gap-2">
        <span
          className="text-[11px] uppercase tracking-widest text-[#64748b]"
          style={{ fontVariant: 'small-caps' }}
        >
          {t('emergency.confirmLabel')}
        </span>
        <div className="relative">
          <input
            type="text"
            value={confirmValue}
            onChange={(e) => onConfirmChange(e.target.value)}
            placeholder={t('emergency.confirmPlaceholder')}
            className="h-12 w-full rounded-xl bg-[#0d0d14] px-5 pr-12 font-mono text-sm text-[#f1f5f9] placeholder:text-[#334155] outline-none transition-colors"
            style={{
              border: `1px solid ${isConfirmed ? '#10b981' : '#ffffff1a'}`,
            }}
          />
          {isConfirmed && (
            <CheckCircle
              className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#10b981]"
            />
          )}
        </div>
      </div>
    </div>
  )
}
