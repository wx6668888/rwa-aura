'use client'

import { Loader2, CheckCircle, XCircle, ExternalLink } from 'lucide-react'

interface Props {
  show: boolean
  status: 'waiting' | 'pending' | 'success' | 'error'
  txHash?: string | null
  amount?: string
  withdrawType?: 'rwa' | 'usdt'
  error?: string | null
  onClose: () => void
}

export function TransactionOverlay({ show, status, txHash, amount, withdrawType = 'rwa', error, onClose }: Props) {
  if (!show) return null

  const fee = amount ? parseFloat(amount) * 0.08 : 0
  const netAmount = amount ? parseFloat(amount) - fee : 0
  const token = withdrawType === 'rwa' ? 'RWA' : 'USDT'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(7,9,14,0.9)] backdrop-blur-[30px] animate-in fade-in duration-300">
      <div className="relative w-[380px] bg-gradient-to-br from-[#13131e] to-[#0d0d14] border border-[rgba(0,255,200,0.2)] rounded-3xl p-8 shadow-[0_0_60px_rgba(0,255,200,0.15)] animate-in zoom-in-95 duration-300">
        {/* 背景光晕 */}
        <div className="absolute inset-0 bg-gradient-to-br from-[rgba(0,255,200,0.05)] to-transparent rounded-3xl opacity-50" />
        
        <div className="relative z-10">
          {status === 'waiting' && (
            <div className="text-center">
              <div className="relative w-20 h-20 mx-auto mb-6">
                <div className="absolute inset-0 bg-gradient-to-br from-[#00ffc8] to-[#00d4aa] rounded-full opacity-20 animate-pulse" />
                <div className="absolute inset-2 bg-[#0d0d14] rounded-full flex items-center justify-center">
                  <Loader2 className="w-10 h-10 text-[#00ffc8] animate-spin" />
                </div>
              </div>
              <h3 className="text-[18px] font-[700] text-[#f1f5f9] mb-2">等待钱包确认</h3>
              <p className="text-[13px] text-[rgba(238,242,255,0.6)] mb-4">请在钱包中确认此交易</p>
              {amount && (
                <div className="rounded-xl bg-[rgba(0,255,200,0.05)] border border-[rgba(0,255,200,0.1)] px-4 py-3 text-left space-y-2">
                  <div className="flex justify-between text-[12px]">
                    <span className="text-[rgba(238,242,255,0.6)]">提取金额</span>
                    <span className="font-[600] text-[#f1f5f9]" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                      {amount} {token}
                    </span>
                  </div>
                  <div className="flex justify-between text-[12px]">
                    <span className="text-[rgba(238,242,255,0.6)]">手续费 (8%)</span>
                    <span className="font-[600] text-[#fbbf24]" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                      -{fee.toFixed(2)} {token}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-[rgba(0,255,200,0.1)] flex justify-between text-[13px]">
                    <span className="text-[rgba(238,242,255,0.7)]">实际到账</span>
                    <span className="font-[700] text-[#00ffc8]" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                      {netAmount.toFixed(2)} {token}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {status === 'pending' && (
            <div className="text-center">
              <div className="relative w-20 h-20 mx-auto mb-6">
                <div className="absolute inset-0 bg-gradient-to-br from-[#00ffc8] to-[#00d4aa] rounded-full opacity-20 animate-ping" />
                <div className="absolute inset-2 bg-[#0d0d14] rounded-full flex items-center justify-center">
                  <div className="w-10 h-10 border-4 border-[rgba(0,255,200,0.2)] border-t-[#00ffc8] rounded-full animate-spin" />
                </div>
              </div>
              <h3 className="text-[18px] font-[700] text-[#f1f5f9] mb-2">交易确认中</h3>
              <p className="text-[13px] text-[rgba(238,242,255,0.6)] mb-4">请稍候，正在处理您的提取请求</p>
              {txHash && (
                <a 
                  href={`https://testnet.bscscan.com/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[rgba(0,255,200,0.08)] border border-[rgba(0,255,200,0.15)] text-[11px] font-[600] text-[#00ffc8] hover:bg-[rgba(0,255,200,0.15)] transition"
                  style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
                >
                  <span>{txHash.slice(0, 8)}...{txHash.slice(-6)}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          )}

          {status === 'success' && (
            <div className="text-center">
              <div className="relative w-20 h-20 mx-auto mb-6">
                <div className="absolute inset-0 bg-gradient-to-br from-[#22c55e] to-[#16a34a] rounded-full opacity-20 animate-pulse" />
                <div className="absolute inset-2 bg-[#0d0d14] rounded-full flex items-center justify-center">
                  <CheckCircle className="w-10 h-10 text-[#22c55e]" />
                </div>
              </div>
              <h3 className="text-[22px] font-[700] text-[#f1f5f9] mb-4">提取成功！</h3>
              {amount && (
                <div className="rounded-xl bg-[rgba(0,255,200,0.05)] border border-[rgba(0,255,200,0.1)] px-4 py-3 text-left space-y-2 mb-4">
                  <div className="flex justify-between text-[12px]">
                    <span className="text-[rgba(238,242,255,0.6)]">提取金额</span>
                    <span className="font-[600] text-[#f1f5f9]" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                      {amount} {token}
                    </span>
                  </div>
                  <div className="flex justify-between text-[12px]">
                    <span className="text-[rgba(238,242,255,0.6)]">手续费 (8%)</span>
                    <span className="font-[600] text-[#fbbf24]" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                      -{fee.toFixed(2)} {token}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-[rgba(0,255,200,0.1)] flex justify-between text-[13px]">
                    <span className="text-[rgba(238,242,255,0.7)]">实际到账</span>
                    <span className="font-[700] text-[#00ffc8]" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                      {netAmount.toFixed(2)} {token}
                    </span>
                  </div>
                </div>
              )}
              {txHash && (
                <a 
                  href={`https://testnet.bscscan.com/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[rgba(0,255,200,0.08)] border border-[rgba(0,255,200,0.15)] text-[11px] font-[600] text-[#00ffc8] hover:bg-[rgba(0,255,200,0.15)] transition mb-4"
                  style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
                >
                  <span>查看交易</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
              <button
                onClick={onClose}
                className="w-full h-[48px] rounded-xl bg-gradient-to-r from-[#00ffc8] to-[#00d4aa] text-[#0a0a0f] text-[14px] font-[700] hover:shadow-[0_0_20px_rgba(0,255,200,0.4)] transition"
              >
                完成
              </button>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center">
              <div className="relative w-20 h-20 mx-auto mb-6">
                <div className="absolute inset-0 bg-gradient-to-br from-[#ef4444] to-[#dc2626] rounded-full opacity-20" />
                <div className="absolute inset-2 bg-[#0d0d14] rounded-full flex items-center justify-center">
                  <XCircle className="w-10 h-10 text-[#ef4444]" />
                </div>
              </div>
              <h3 className="text-[18px] font-[700] text-[#f1f5f9] mb-2">提取失败</h3>
              {error && (
                <p className="text-[12px] text-[rgba(238,242,255,0.6)] mb-4 px-4 py-3 rounded-xl bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.15)]">
                  {error}
                </p>
              )}
              <button
                onClick={onClose}
                className="w-full h-[48px] rounded-xl bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.1)] text-[#f1f5f9] text-[14px] font-[600] hover:bg-[rgba(255,255,255,0.12)] transition"
              >
                关闭
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
