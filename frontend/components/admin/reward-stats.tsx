'use client'

import { useState, useEffect } from 'react'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'

interface Reward {
  id: number
  userAddress: string
  rewardType: 'static' | 'dynamic'
  amount: string
  fromAddress: string | null
  stakeId: string | null
  txHash: string | null
  createdAt: string
}

export function RewardStats() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const [searchAddress, setSearchAddress] = useState('')
  const [rewardType, setRewardType] = useState<'all' | 'static' | 'dynamic'>('all')
  const [rewards, setRewards] = useState<Reward[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 })

  async function fetchRewards(page: number = 1) {
    if (!searchAddress.trim()) {
      setError(t('admin.rewards.enterAddress') || '请输入用户地址')
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const typeParam = rewardType === 'all' ? '' : `&type=${rewardType}`
      const response = await fetch(`${apiUrl}/api/rewards/${searchAddress}?page=${page}&limit=${pagination.limit}${typeParam}`)
      
      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to fetch rewards')
      }
      
      const result = await response.json()
      if (result.success) {
        setRewards(result.data.rewards)
        setPagination(result.data.pagination)
      } else {
        throw new Error(result.error || 'Unknown error')
      }
    } catch (err: any) {
      console.error('Error fetching rewards:', err)
      setError(err.message || 'Failed to load rewards')
      setRewards([])
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
          {t('admin.rewards.searchRewards') || '查询收益记录'}
        </h2>
        <div className="flex flex-col gap-4 md:flex-row">
          <input
            type="text"
            value={searchAddress}
            onChange={(e) => setSearchAddress(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && fetchRewards(1)}
            placeholder={t('admin.rewards.addressPlaceholder') || '输入用户地址（0x...）'}
            className="flex-1 rounded-lg border border-[#ffffff0d] bg-[#0a0a0f] px-4 py-2 font-mono text-sm text-[#f1f5f9] placeholder:text-[#64748b] focus:border-[#00f5d4] focus:outline-none"
          />
          <select
            value={rewardType}
            onChange={(e) => setRewardType(e.target.value as 'all' | 'static' | 'dynamic')}
            className="rounded-lg border border-[#ffffff0d] bg-[#0a0a0f] px-4 py-2 text-sm text-[#f1f5f9] focus:border-[#00f5d4] focus:outline-none"
          >
            <option value="all">{t('admin.rewards.allTypes') || '全部类型'}</option>
            <option value="static">{t('admin.rewards.static') || '静态奖励'}</option>
            <option value="dynamic">{t('admin.rewards.dynamic') || '动态奖励'}</option>
          </select>
          <button
            onClick={() => fetchRewards(1)}
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

      {/* Rewards Table */}
      {rewards.length > 0 && (
        <div className="rounded-2xl bg-gradient-to-br from-[#0d0d14] to-[#13131e] p-6" style={{ border: '1px solid #00f5d420' }}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#f1f5f9]">
              {t('admin.rewards.rewardHistory') || '收益历史'}
            </h2>
            <p className="text-sm text-[#64748b]">
              {t('admin.rewards.total') || '共'} {pagination.total} {t('admin.rewards.records') || '条记录'}
            </p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#ffffff0d]">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#64748b]">
                    {t('admin.rewards.type') || '类型'}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#64748b]">
                    {t('admin.rewards.amount') || '金额'}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#64748b]">
                    {t('admin.rewards.from') || '来源'}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#64748b]">
                    {t('admin.rewards.txHash') || '交易哈希'}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#64748b]">
                    {t('admin.rewards.time') || '时间'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rewards.map((reward) => (
                  <tr key={reward.id} className="border-b border-[#ffffff05]">
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                        reward.rewardType === 'static'
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-purple-500/20 text-purple-400'
                      }`}>
                        {reward.rewardType === 'static' 
                          ? (t('admin.rewards.static') || '静态')
                          : (t('admin.rewards.dynamic') || '动态')
                        }
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-sm font-semibold text-[#f59e0b]">
                      {formatUSDT(reward.amount)} USDT
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-[#64748b]">
                      {reward.fromAddress 
                        ? `${reward.fromAddress.slice(0, 6)}...${reward.fromAddress.slice(-4)}`
                        : '-'
                      }
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-[#00f5d4]">
                      {reward.txHash ? (
                        <a
                          href={`https://testnet.bscscan.com/tx/${reward.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline"
                        >
                          {reward.txHash.slice(0, 10)}...{reward.txHash.slice(-8)}
                        </a>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#64748b]">
                      {new Date(reward.createdAt).toLocaleString()}
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
                onClick={() => fetchRewards(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="rounded-lg border border-[#ffffff0d] bg-[#0a0a0f] px-4 py-2 text-sm text-[#f1f5f9] transition-all hover:bg-[#13131e] disabled:opacity-50"
              >
                {t('admin.previous') || '上一页'}
              </button>
              <span className="text-sm text-[#64748b]">
                {t('admin.page') || '第'} {pagination.page} / {pagination.totalPages} {t('admin.page') || '页'}
              </span>
              <button
                onClick={() => fetchRewards(pagination.page + 1)}
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
