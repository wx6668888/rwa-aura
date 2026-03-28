'use client'

import { useState } from 'react'
import { useAccount, usePublicClient } from 'wagmi'
import { formatEther } from 'viem'
import { Search, User, Wallet, Award, Network, ExternalLink, Copy, Check } from 'lucide-react'
import { CONTRACT_ADDRESSES } from '@/lib/contracts/addresses'
import { stakingContractABI } from '@/lib/contracts/stakingContractABI'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface UserInfo {
  address: string
  totalStakedUSDT: string
  totalStakedRWA: string
  rwaPending: string
  referrer: string
  nodeLevel: number
  firstStakeTime: number
  isActive: boolean
  stakeCount: number
  rwaStakeCount: number
}

/** 从后端 API 拉取用户信息（不依赖本地链） */
async function fetchUserFromApi(address: string): Promise<UserInfo | null> {
  try {
    const [userRes, stakesRes] = await Promise.all([
      fetch(`${API_BASE}/api/user/${address}`),
      fetch(`${API_BASE}/api/stakes/${address}?limit=1`),
    ])
    if (!userRes.ok) return null
    const userJson = await userRes.json()
    if (!userJson?.success || !userJson?.data) return null
    const u = userJson.data
    let stakeCount = 0
    if (stakesRes.ok) {
      const stakesJson = await stakesRes.json()
      stakeCount = stakesJson?.data?.pagination?.total ?? 0
    }
    const firstStakeTime = u.createdAt ? Math.floor(new Date(u.createdAt).getTime() / 1000) : 0
    return {
      address: u.address ?? address,
      totalStakedUSDT: u.totalStaked ?? '0',
      totalStakedRWA: '0',
      rwaPending: u.rwaPending ?? '0',
      referrer: u.referrer ?? '0x0000000000000000000000000000000000000000',
      nodeLevel: Number(u.nodeLevel) ?? 0,
      firstStakeTime,
      isActive: Boolean(u.isActive),
      stakeCount,
      rwaStakeCount: 0,
    }
  } catch {
    return null
  }
}

export function UserManagementPage() {
  const { chainId } = useAccount()
  const publicClient = usePublicClient()
  const [searchAddress, setSearchAddress] = useState('')
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function fetchUserInfo() {
    if (!searchAddress.trim()) {
      setError('请输入用户地址')
      return
    }

    setLoading(true)
    setError(null)
    const address = searchAddress.trim().toLowerCase()

    const tryChain = publicClient && chainId && CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES]?.stakingContract

    if (tryChain) {
      try {
        const stakingAddress = CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES]!.stakingContract!
        const [userStakeInfo, rwaStakeInfo, stakeEvents, rwaStakeEvents] = await Promise.all([
          publicClient.readContract({
            address: stakingAddress as `0x${string}`,
            abi: stakingContractABI,
            functionName: 'getUserStakeInfo',
            args: [address as `0x${string}`],
          }).catch(() => null),
          publicClient.readContract({
            address: stakingAddress as `0x${string}`,
            abi: stakingContractABI,
            functionName: 'rwaStakes',
            args: [address as `0x${string}`],
          }).catch(() => null),
          publicClient.getLogs({
            address: stakingAddress as `0x${string}`,
            event: {
              type: 'event',
              name: 'StakeEvent',
              inputs: [
                { type: 'address', indexed: true, name: 'user' },
                { type: 'uint256', indexed: false, name: 'amount' },
                { type: 'address', indexed: true, name: 'referrer' },
                { type: 'uint256', indexed: true, name: 'stakeId' },
                { type: 'uint256', indexed: false, name: 'timestamp' },
                { type: 'uint256', indexed: false, name: 'lockPeriod' },
              ],
            },
            args: { user: address as `0x${string}` },
            fromBlock: 0n,
            toBlock: 'latest',
          }),
          publicClient.getLogs({
            address: stakingAddress as `0x${string}`,
            event: {
              type: 'event',
              name: 'RWAStakeEvent',
              inputs: [
                { type: 'address', indexed: true, name: 'user' },
                { type: 'uint256', indexed: false, name: 'amount' },
                { type: 'address', indexed: true, name: 'referrer' },
                { type: 'uint256', indexed: true, name: 'stakeId' },
                { type: 'uint256', indexed: false, name: 'timestamp' },
                { type: 'uint256', indexed: false, name: 'lockPeriod' },
              ],
            },
            args: { user: address as `0x${string}` },
            fromBlock: 0n,
            toBlock: 'latest',
          }),
        ])

        const userData: UserInfo = {
          address,
          totalStakedUSDT: userStakeInfo ? formatEther((userStakeInfo as any).totalStaked || 0n) : '0',
          totalStakedRWA: rwaStakeInfo ? formatEther((rwaStakeInfo as any).totalStakedRWA || 0n) : '0',
          rwaPending: rwaStakeInfo ? formatEther((rwaStakeInfo as any).rwaPending || 0n) : '0',
          referrer: rwaStakeInfo ? (rwaStakeInfo as any).referrer || '0x0000000000000000000000000000000000000000' : '0x0000000000000000000000000000000000000000',
          nodeLevel: rwaStakeInfo ? Number((rwaStakeInfo as any).nodeLevel || 0) : 0,
          firstStakeTime: rwaStakeInfo ? Number((rwaStakeInfo as any).firstStakeTime || 0) : 0,
          isActive: rwaStakeInfo ? (rwaStakeInfo as any).isActive || false : false,
          stakeCount: stakeEvents.length,
          rwaStakeCount: rwaStakeEvents.length,
        }
        setUserInfo(userData)
        setLoading(false)
        return
      } catch (err: any) {
        const msg = err?.message ?? ''
        if (!msg.includes('fetch') && !msg.includes('8545') && !msg.includes('HTTP request failed')) {
          setError(err.message || '查询用户信息失败')
          setUserInfo(null)
          setLoading(false)
          return
        }
      }
    }

    const apiUser = await fetchUserFromApi(address)
    if (apiUser) {
      setUserInfo(apiUser)
      setError(null)
    } else {
      setUserInfo(null)
      setError(tryChain ? '链上查询失败且后端未返回该用户。请确认后端已启动 (http://localhost:3001)。' : '未找到该用户。请确认地址正确且后端已启动 (http://localhost:3001)。')
    }
    setLoading(false)
  }

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#f1f5f9]">用户管理</h1>
        <p className="mt-2 text-sm text-[#64748b]">查询和管理用户信息</p>
      </div>

      {/* Search */}
      <div className="rounded-xl bg-[#13131e] border border-[#ffffff0d] p-6">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#64748b]" />
            <input
              type="text"
              value={searchAddress}
              onChange={(e) => setSearchAddress(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && fetchUserInfo()}
              placeholder="输入用户地址（0x...）"
              className="w-full pl-10 pr-4 py-3 bg-[#0d0d14] border border-[#ffffff0d] rounded-lg text-[#f1f5f9] placeholder-[#64748b] focus:outline-none focus:ring-2 focus:ring-[#00f5d4] focus:border-transparent"
            />
          </div>
          <button
            onClick={fetchUserInfo}
            disabled={loading}
            className="px-6 py-3 bg-[#00f5d4] text-[#05050a] font-semibold rounded-lg hover:brightness-110 transition-all disabled:opacity-50"
          >
            {loading ? '查询中...' : '查询'}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* User Info */}
      {userInfo && (
        <div className="space-y-4">
          {/* Basic Info */}
          <div className="rounded-xl bg-[#13131e] border border-[#ffffff0d] p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-[#f1f5f9] flex items-center gap-2">
                <User className="w-5 h-5 text-[#00f5d4]" />
                用户信息
              </h2>
              <button
                onClick={() => copyAddress(userInfo.address)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-[#64748b] hover:text-[#f1f5f9] transition-colors"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? '已复制' : '复制地址'}
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-[#64748b] mb-1">地址</p>
                <p className="font-mono text-sm text-[#f1f5f9] break-all">{userInfo.address}</p>
              </div>
              <div>
                <p className="text-xs text-[#64748b] mb-1">推荐人</p>
                <p className="font-mono text-sm text-[#f1f5f9]">
                  {userInfo.referrer === '0x0000000000000000000000000000000000000000' ? '无' : formatAddress(userInfo.referrer)}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#64748b] mb-1">节点等级</p>
                <p className="text-lg font-bold text-[#00f5d4]">L{userInfo.nodeLevel || 0}</p>
              </div>
              <div>
                <p className="text-xs text-[#64748b] mb-1">状态</p>
                <p className={`text-sm font-semibold ${userInfo.isActive ? 'text-[#10b981]' : 'text-[#64748b]'}`}>
                  {userInfo.isActive ? '活跃' : '非活跃'}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#64748b] mb-1">首次质押时间</p>
                <p className="text-sm text-[#f1f5f9]">
                  {userInfo.firstStakeTime > 0 
                    ? new Date(userInfo.firstStakeTime * 1000).toLocaleString('zh-CN')
                    : '未质押'
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Staking Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl bg-[#13131e] border border-[#ffffff0d] p-6">
              <div className="flex items-center gap-3 mb-4">
                <Wallet className="w-5 h-5 text-[#f59e0b]" />
                <h3 className="text-lg font-semibold text-[#f1f5f9]">USDT 质押</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-[#64748b] mb-1">总质押量</p>
                  <p className="text-xl font-bold text-[#f1f5f9]">
                    {parseFloat(userInfo.totalStakedUSDT).toLocaleString('en-US', { maximumFractionDigits: 2 })} USDT
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#64748b] mb-1">质押次数</p>
                  <p className="text-lg font-semibold text-[#00f5d4]">{userInfo.stakeCount} 次</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-[#13131e] border border-[#ffffff0d] p-6">
              <div className="flex items-center gap-3 mb-4">
                <Award className="w-5 h-5 text-[#8b5cf6]" />
                <h3 className="text-lg font-semibold text-[#f1f5f9]">RWA 质押</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-[#64748b] mb-1">总质押量</p>
                  <p className="text-xl font-bold text-[#f1f5f9]">
                    {parseFloat(userInfo.totalStakedRWA).toLocaleString('en-US', { maximumFractionDigits: 2 })} RWA
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#64748b] mb-1">待提取 RWA</p>
                  <p className="text-lg font-semibold text-[#10b981]">
                    {parseFloat(userInfo.rwaPending).toLocaleString('en-US', { maximumFractionDigits: 6 })} RWA
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#64748b] mb-1">质押次数</p>
                  <p className="text-lg font-semibold text-[#00f5d4]">{userInfo.rwaStakeCount} 次</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
