'use client'

import { useState, useEffect } from 'react'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'

interface User {
  address: string
  referrer: string
  nodeLevel: number
  totalStaked: string
  rwaPending: string
  totalStaticRewards: string
  totalDynamicRewards: string
  isActive: boolean
  lastStakeTime: string | null
  createdAt: string
}

export function UserManagement() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const [searchAddress, setSearchAddress] = useState('')
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function fetchUser() {
    if (!searchAddress.trim()) {
      setError(t('admin.users.enterAddress') || '请输入用户地址')
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const response = await fetch(`${apiUrl}/api/user/${searchAddress}`)
      
      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'User not found')
      }
      
      const result = await response.json()
      if (result.success) {
        setUser(result.data)
      } else {
        throw new Error(result.error || 'Unknown error')
      }
    } catch (err: any) {
      console.error('Error fetching user:', err)
      setError(err.message || 'Failed to load user')
      setUser(null)
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

  const formatRWA = (value: string) => {
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
          {t('admin.users.searchUser') || '查询用户'}
        </h2>
        <div className="flex gap-4">
          <input
            type="text"
            value={searchAddress}
            onChange={(e) => setSearchAddress(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && fetchUser()}
            placeholder={t('admin.users.addressPlaceholder') || '输入用户地址（0x...）'}
            className="flex-1 rounded-lg border border-[#ffffff0d] bg-[#0a0a0f] px-4 py-2 font-mono text-sm text-[#f1f5f9] placeholder:text-[#64748b] focus:border-[#00f5d4] focus:outline-none"
          />
          <button
            onClick={fetchUser}
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

      {/* User Info */}
      {user && (
        <div className="rounded-2xl bg-gradient-to-br from-[#0d0d14] to-[#13131e] p-6" style={{ border: '1px solid #00f5d420' }}>
          <h2 className="mb-4 text-lg font-semibold text-[#f1f5f9]">
            {t('admin.users.userInfo') || '用户信息'}
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs text-[#64748b]">{t('admin.users.address') || '地址'}</p>
              <p className="mt-1 font-mono text-sm text-[#f1f5f9]">{user.address}</p>
            </div>
            <div>
              <p className="text-xs text-[#64748b]">{t('admin.users.referrer') || '推荐人'}</p>
              <p className="mt-1 font-mono text-sm text-[#f1f5f9]">
                {user.referrer && user.referrer !== '0x0000000000000000000000000000000000000000' ? user.referrer : '-'}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#64748b]">{t('admin.users.nodeLevel') || '节点等级'}</p>
              <p className="mt-1 font-mono text-lg font-bold text-[#f59e0b]">V{user.nodeLevel}</p>
            </div>
            <div>
              <p className="text-xs text-[#64748b]">{t('admin.users.status') || '状态'}</p>
              <p className="mt-1">
                <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                  user.isActive 
                    ? 'bg-green-500/20 text-green-400' 
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  {user.isActive ? (t('admin.users.active') || '活跃') : (t('admin.users.inactive') || '非活跃')}
                </span>
              </p>
            </div>
            <div>
              <p className="text-xs text-[#64748b]">{t('admin.users.totalStaked') || '总质押'}</p>
              <p className="mt-1 font-mono text-lg font-bold text-[#f1f5f9]">
                {formatUSDT(user.totalStaked)} USDT
              </p>
            </div>
            <div>
              <p className="text-xs text-[#64748b]">{t('admin.users.rwaPending') || '待提取 RWA'}</p>
              <p className="mt-1 font-mono text-lg font-bold text-[#00f5d4]">
                {formatRWA(user.rwaPending)} RWA
              </p>
            </div>
            <div>
              <p className="text-xs text-[#64748b]">{t('admin.users.totalStaticRewards') || '静态奖励'}</p>
              <p className="mt-1 font-mono text-lg font-bold text-[#f59e0b]">
                {formatUSDT(user.totalStaticRewards)} USDT
              </p>
            </div>
            <div>
              <p className="text-xs text-[#64748b]">{t('admin.users.totalDynamicRewards') || '动态奖励'}</p>
              <p className="mt-1 font-mono text-lg font-bold text-[#f59e0b]">
                {formatUSDT(user.totalDynamicRewards)} USDT
              </p>
            </div>
            <div>
              <p className="text-xs text-[#64748b]">{t('admin.users.lastStakeTime') || '最后质押时间'}</p>
              <p className="mt-1 text-sm text-[#f1f5f9]">
                {user.lastStakeTime ? new Date(user.lastStakeTime).toLocaleString() : '-'}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#64748b]">{t('admin.users.createdAt') || '注册时间'}</p>
              <p className="mt-1 text-sm text-[#f1f5f9]">
                {new Date(user.createdAt).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
