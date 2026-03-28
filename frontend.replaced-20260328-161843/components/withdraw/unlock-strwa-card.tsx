'use client'

import { useLocale } from '@/components/locale-provider'
import { useAccount } from 'wagmi'
import { Lock, Clock } from 'lucide-react'

export function UnlockStRWACard() {
  const { locale } = useLocale()
  const isZh = locale === 'zh'
  const { isConnected } = useAccount()

  // TODO: 读取提现转化来的stRWA记录
  const records = []

  if (!isConnected) {
    return (
      <div className="rounded-2xl border border-[#00f5d420] bg-gradient-to-br from-[#0d0d14] to-[#13131e] p-6">
        <div className="flex items-center gap-3 mb-4">
          <Lock className="h-5 w-5 text-[#00f5d4]" />
          <h3 className="font-semibold text-[#f1f5f9]">{isZh ? '解锁stRWA' : 'Unlock stRWA'}</h3>
        </div>
        <p className="text-sm text-[#64748b]">{isZh ? '连接钱包后操作' : 'Connect wallet'}</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-[#00f5d420] bg-gradient-to-br from-[#0d0d14] to-[#13131e] p-6 shadow-[0_0_20px_rgba(0,245,212,0.1)]">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#00f5d420] to-[#00f5d408]">
          <Lock className="h-5 w-5 text-[#00f5d4]" />
        </div>
        <div>
          <h3 className="font-semibold text-[#f1f5f9]">{isZh ? '解锁stRWA' : 'Unlock stRWA'}</h3>
          <p className="text-xs text-[#64748b]">{isZh ? '30天后自动转为RWA' : '30d auto convert'}</p>
        </div>
      </div>

      {records.length === 0 ? (
        <div className="rounded-xl border border-[#00f5d420] bg-[#00f5d408] p-6 text-center">
          <Lock className="h-8 w-8 text-[#00f5d4] mx-auto mb-2 opacity-50" />
          <p className="text-sm text-[#64748b]">
            {isZh ? '暂无锁仓记录' : 'No locked records'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map((record: any, index: number) => (
            <div key={index} className="rounded-xl border border-[#00f5d420] bg-[#00f5d408] p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-sm font-semibold text-[#f1f5f9]">{record.amount} stRWA</p>
                  <p className="text-xs text-[#64748b] mt-1">
                    {isZh ? '解锁后获得' : 'Unlock to get'} {record.amount} RWA
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs text-[#00f5d4]">
                  <Clock className="h-3 w-3" />
                  <span>{record.countdown}</span>
                </div>
              </div>
              <div className="mt-3">
                <div className="h-1.5 bg-[#0d0d14] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-[#00f5d4] to-[#10b981] transition-all"
                    style={{ width: `${record.progress}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
