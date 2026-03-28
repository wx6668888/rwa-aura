'use client'

import { Lock, AlertTriangle, Loader2 } from 'lucide-react'

type BtnState = 'disabled' | 'enabled' | 'pending'

interface Props {
  state: BtnState
  t: (key: string) => string
  onClick: () => void
}

export function EmergencyButton({ state, t, onClick }: Props) {
  const isDisabled = state === 'disabled' || state === 'pending'

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      className="mt-6 flex h-[60px] w-full items-center justify-center gap-2 font-[family-name:var(--font-space-grotesk)] text-base font-bold transition-all"
      style={{
        borderRadius: 0,
        backgroundColor:
          state === 'disabled'
            ? '#13131e'
            : state === 'pending'
            ? 'rgba(244,63,94,0.8)'
            : '#f43f5e',
        color: state === 'disabled' ? '#334155' : '#ffffff',
        cursor: state === 'disabled' ? 'not-allowed' : 'pointer',
        boxShadow:
          state === 'enabled' ? '0 0 20px #f43f5e40' : 'none',
      }}
    >
      {state === 'disabled' && <Lock className="h-4 w-4 shrink-0" />}
      {state === 'enabled' && <AlertTriangle className="h-4 w-4 shrink-0" />}
      {state === 'pending' && (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
      )}
      <span>
        {state === 'disabled' && t('emergency.btnDisabled')}
        {state === 'enabled' && t('emergency.btnEnabled')}
        {state === 'pending' && t('emergency.btnPending')}
      </span>
    </button>
  )
}
