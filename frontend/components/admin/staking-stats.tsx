'use client'

import { useState, useEffect } from 'react'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'

interface Stake {
  stakeId: string
  userAddress: string
  amount: string
  treasuryAmount: string
  communityAmount: string
  referrer: string
  txHash: string
  blockNumber: number
  createdAt: string
}

export function StakingStats() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const [searchAddress, setSearchAddress] = useState('')
  const [stakes, setStakes] = useState<Stake[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 })

  async function fetchStakes(page: number = 1) {
    if (!searchAddress.trim()) {
      setError(t('admin.staking.enterAddress') || '请输入用户地址')
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const response = await fetch(`${apiUrl}/api/stakes/${searchAddress}?page=${page}&limit=${pagination.limit}`)
      
      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to fetch stakes')
      }
      
      const result = await response.json()
      if (result.success) {
        setStakes(result.data.stakes)
        setPagination(result.data.pagination)
      } else {
        throw new Error(result.error || 'Unknown error')
      }
    } catch (err: any) {
      console.error('Error fetching stakes:', err)
      setError(err.message || 'Failed to load stakes')
      setStakes([])
    } finally {
      setLoading(false)
    }
  }

  const formatUSDT = (value: string) => {
    const num = parseFloat(value)
    if (num >= 1e18) {
      return (num / 1e18).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    }
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="rounded-2xl bg-gradient-to-br from-[#0d0d14] to-[#13131e] p-6" style={{ border: '1px solid #00f5d420' }}>
        <h2 className="mb-4 text-lg font-semibold text-[#f1f5f9]">
          {t('admin.staking.searchStakes') || '查询质押记录'}
        </h2>
        <div className="flex gap-4">
          <input
            type="text"
            value={searchAddress}
            onChange={(e) => setSearchAddress(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && fetchStakes(1)}
            placeholder={t('admin.staking.addressPlaceholder') || '输入用户地址（0x...）'}
            className="flex-1 rounded-lg border border-[#ffffff0d] bg-[#0a0a0f] px-4 py-2 font-mono text-sm text-[#f1f5f9] placeholder:text-[#64748b] focus:border-[#00f5d4] focus:outline-none"
          />
          <button
            onClick={() => fetchStakes(1)}
            disabled={loading}
            className="rounded-lg bg-[#00f5d4] px-6 py-2 text-sm font-semibold text-[#05050a] transition-all hover:brightness-110 disabled:opacity-50"
          >
            {loading ? (t('admin.loading') || '查询中...') : (t('admin.search') || '查询')}
          </button>
        </div>
        {error && (
          <p className="mt-2 text-sm text-red-400">{error}</p>
        )}
      </div>

      {/* Stakes Table */}
      {stakes.length > 0 && (
        <div className="rounded-2xl bg-gradient-to-br from-[#0d0d14] to-[#13131e] p-6" style={{ border: '1px solid #00f5d420' }}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#f1f5f9]">
              {t('admin.staking.stakeHistory') || '质押历史'}
            </h2>
            <p className="text-sm text-[#64748b]">
              {t('admin.staking.total') || '共'} {pagination.total} {t('admin.staking.records') || '条记录'}
            </p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#ffffff0d]">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#64748b]">
                    {t('admin.staking.stakeId') || '质押ID'}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#64748b]">
                    {t('admin.staking.amount') || '金额'}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#64748b]">
                    {t('admin.staking.referrer') || '推荐人'}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#64748b]">
                    {t('admin.staking.txHash') || '交易哈希'}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#64748b]">
                    {t('admin.staking.time') || '时间'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {stakes.map((stake) => (
                  <tr key={stake.stakeId} className="border-b border-[#ffffff05]">
                    <td className="px-4 py-3 font-mono text-sm text-[#f1f5f9]">
                      {stake.stakeId}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-[#f1f5f9]">
                        {formatUSDT(stake.amount)} USDT
                      </div>
                      <div className="text-xs text-[#64748b]">
                        Treasury: {formatUSDT(stake.treasuryAmount)} | Community: {formatUSDT(stake.communityAmount)}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-[#64748b]">
                      {stake.referrer && stake.referrer !== '0x0000000000000000000000000000000000000000' 
                        ? `${stake.referrer.slice(0, 6)}...${stake.referrer.slice(-4)}`
                        : '-'
                      }
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-[#00f5d4]">
                      <a
                        href={`https://testnet.bscscan.com/tx/${stake.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        {stake.txHash.slice(0, 10)}...{stake.txHash.slice(-8)}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#64748b]">
                      {new Date(stake.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <button
                onClick={() => fetchStakes(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="rounded-lg border border-[#ffffff0d] bg-[#0a0a0f] px-4 py-2 text-sm text-[#f1f5f9] transition-all hover:bg-[#13131e] disabled:opacity-50"
              >
                {t('admin.previous') || '上一页'}
              </button>
              <span className="text-sm text-[#64748b]">
                {t('admin.page') || '第'} {pagination.page} / {pagination.totalPages} {t('admin.page') || '页'}
              </span>
              <button
                onClick={() => fetchStakes(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="rounded-lg border border-[#ffffff0d] bg-[#0a0a0f] px-4 py-2 text-sm text-[#f1f5f9] transition-all hover:bg-[#13131e] disabled:opacity-50"
              >
                {t('admin.next') || '下一页'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
