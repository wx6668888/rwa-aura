'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useAccount, usePublicClient } from 'wagmi'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import { CONTRACT_ADDRESSES } from '@/lib/contracts/addresses'
import { stakingContractABI } from '@/lib/contracts/stakingContractABI'
import { decodeEventLog, formatUnits, parseAbiItem } from 'viem'
import { ExternalLink, X, ChevronDown, Filter, Inbox } from 'lucide-react'

export type SummaryType = 'stake' | 'withdraw' | 'mint'

/** 详情页分类下拉可选 typeKey，与 parseLogsToRows 中一致 */
const FUND_TYPE_KEYS = [
  'stakeUSDT',
  'stakeRWA',
  'withdrawReward',
  'flexibleUSDT',
  'flexibleRWA',
  'emergencyWithdraw',
  'rewardRWA',
  'rewardReferral',
  'mintStRWA',
  'burnStRWA',
] as const
type FundTypeKey = (typeof FUND_TYPE_KEYS)[number]

interface FundActivityRow {
  timestamp: number
  blockNumber: bigint
  logIndex: number
  time: string
  typeKey: string
  summaryType: SummaryType
  typeVariant: 'cyan' | 'purple' | 'amber' | 'green' | 'neutral' | 'orange' | 'rose' | 'blue' | 'sky' | 'indigo' | 'lime'
  amount: string
  amountColor: string
  txHash?: string
}

function sortFundRowsByRecent(a: FundActivityRow, b: FundActivityRow) {
  if (a.timestamp !== b.timestamp) return b.timestamp - a.timestamp
  if (a.blockNumber !== b.blockNumber) return Number(b.blockNumber - a.blockNumber)
  return b.logIndex - a.logIndex
}

function shortTxHash(txHash?: string) {
  if (!txHash) return ''
  if (txHash.length <= 14) return txHash
  return `${txHash.slice(0, 8)}...${txHash.slice(-6)}`
}

/** 每个 typeKey 对应的颜色 variant，用于下拉选项展示 */
const TYPE_KEY_VARIANT: Record<FundTypeKey, FundActivityRow['typeVariant']> = {
  stakeUSDT: 'cyan',
  stakeRWA: 'purple',
  withdrawReward: 'orange',
  flexibleUSDT: 'sky',
  flexibleRWA: 'indigo',
  emergencyWithdraw: 'amber',
  rewardRWA: 'green',
  rewardReferral: 'lime',
  mintStRWA: 'purple',
  burnStRWA: 'rose',
}

const EVENT_NAMES = [
  'StakeEvent',
  'RWAStakeEvent',
  'WithdrawalRequested',
  'RWARewardWithdrawn',
  'RWAPrincipalWithdrawn',
  'USDTPrincipalWithdrawn',
  'FlexibleUSDTPrincipalWithdrawn',
  'FlexibleRWAPrincipalWithdrawn',
  'EmergencyWithdrawal',
  'RewardsUpdated',
  'StRWAMinted',
] as const

const VARIANT_COLORS: Record<FundActivityRow['typeVariant'], { bg: string; color: string }> = {
  cyan: { bg: 'rgba(0,245,212,0.18)', color: '#00f5d4' },
  purple: { bg: 'rgba(139,92,246,0.18)', color: '#a78bfa' },
  amber: { bg: 'rgba(245,158,11,0.18)', color: '#f59e0b' },
  green: { bg: 'rgba(16,185,129,0.18)', color: '#10b981' },
  neutral: { bg: '#1a1a2e', color: '#64748b' },
  orange: { bg: 'rgba(249,115,22,0.18)', color: '#f97316' },
  rose: { bg: 'rgba(244,63,94,0.18)', color: '#f43f5e' },
  blue: { bg: 'rgba(59,130,246,0.18)', color: '#3b82f6' },
  sky: { bg: 'rgba(14,165,233,0.18)', color: '#0ea5e9' },
  indigo: { bg: 'rgba(99,102,241,0.18)', color: '#6366f1' },
  lime: { bg: 'rgba(132,204,22,0.18)', color: '#84cc16' },
}

function TypePill({
  label,
  variant,
}: {
  label: string
  variant: FundActivityRow['typeVariant']
}) {
  const s = VARIANT_COLORS[variant]
  return (
    <span
      className="rounded-full px-2.5 py-0.5 text-[11px] font-medium"
      style={{ background: s.bg, color: s.color }}
    >
      {label}
    </span>
  )
}

async function parseLogsToRows(
  logs: { data: `0x${string}`; topics: (`0x${string}` | `0x${string}`[])[]; blockNumber: bigint; logIndex?: bigint; transactionHash?: `0x${string}` }[],
  normalizedUser: string,
  publicClient: { getBlock: (p: { blockNumber: bigint }) => Promise<{ timestamp: bigint }> },
  locale: string
): Promise<FundActivityRow[]> {
  const activities: FundActivityRow[] = []
  const localeKey = locale === 'zh' ? 'zh-CN' : locale === 'ko' ? 'ko-KR' : 'en-US'

  for (const log of logs) {
    try {
      const decoded = decodeEventLog({
        abi: stakingContractABI,
        data: log.data,
        topics: log.topics,
      }) as { eventName: string; args: Record<string, unknown> }

      if (!EVENT_NAMES.includes(decoded.eventName as (typeof EVENT_NAMES)[number])) continue

      const args = decoded.args as Record<string, unknown>
      const eventUser = args.user ? String(args.user).toLowerCase() : null
      if (eventUser && eventUser !== normalizedUser) continue

      const block = await publicClient.getBlock({ blockNumber: log.blockNumber })
      const timestampMs = Number(block.timestamp) * 1000
      const timeStr = new Date(timestampMs).toLocaleString(localeKey, {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })

      let typeKey = decoded.eventName
      let typeVariant: FundActivityRow['typeVariant'] = 'neutral'
      let amount = ''
      let amountColor = '#94a3b8'

      switch (decoded.eventName) {
        case 'StakeEvent': {
          const amt = args.amount != null ? formatUnits(BigInt(String(args.amount)), 18) : '0'
          amount = `+${parseFloat(amt).toFixed(2)} USDT`
          amountColor = '#00f5d4'
          typeKey = 'stakeUSDT'
          typeVariant = 'cyan'
          break
        }
        case 'RWAStakeEvent': {
          const amt = args.amount != null ? formatUnits(BigInt(String(args.amount)), 18) : '0'
          amount = `+${parseFloat(amt).toFixed(2)} RWA`
          amountColor = '#8b5cf6'
          typeKey = 'stakeRWA'
          typeVariant = 'purple'
          break
        }
        case 'WithdrawalRequested':
        case 'RWARewardWithdrawn': {
          const amt = args.amount != null ? formatUnits(BigInt(String(args.amount)), 18) : '0'
          amount = `-${parseFloat(amt).toFixed(2)} RWA`
          amountColor = '#f97316'
          typeKey = 'withdrawReward'
          typeVariant = 'orange'
          break
        }
        case 'RWAPrincipalWithdrawn': {
          const amt = args.amount != null ? formatUnits(BigInt(String(args.amount)), 18) : '0'
          amount = `-${parseFloat(amt).toFixed(2)} RWA`
          amountColor = '#6366f1'
          typeKey = 'flexibleRWA'
          typeVariant = 'indigo'
          break
        }
        case 'USDTPrincipalWithdrawn': {
          const net = args.netAmount != null ? formatUnits(BigInt(String(args.netAmount)), 18) : '0'
          amount = `-${parseFloat(net).toFixed(2)} USDT`
          amountColor = '#3b82f6'
          typeKey = 'flexibleUSDT'
          typeVariant = 'blue'
          break
        }
        case 'FlexibleUSDTPrincipalWithdrawn': {
          const net = args.netAmount != null ? formatUnits(BigInt(String(args.netAmount)), 18) : '0'
          amount = `-${parseFloat(net).toFixed(2)} USDT`
          amountColor = '#0ea5e9'
          typeKey = 'flexibleUSDT'
          typeVariant = 'sky'
          break
        }
        case 'FlexibleRWAPrincipalWithdrawn': {
          const amt = args.amount != null ? formatUnits(BigInt(String(args.amount)), 18) : '0'
          amount = `-${parseFloat(amt).toFixed(2)} RWA`
          amountColor = '#6366f1'
          typeKey = 'flexibleRWA'
          typeVariant = 'indigo'
          break
        }
        case 'EmergencyWithdrawal': {
          const ref = args.refundAmount != null ? formatUnits(BigInt(String(args.refundAmount)), 18) : '0'
          amount = `-${parseFloat(ref).toFixed(2)} USDT`
          amountColor = '#f59e0b'
          typeKey = 'emergencyWithdraw'
          typeVariant = 'amber'
          break
        }
        case 'RewardsUpdated': {
          const rw = args.rwAmount != null ? BigInt(String(args.rwAmount)) : 0n
          const usdt = args.usdtAmount != null ? BigInt(String(args.usdtAmount)) : 0n
          if (rw > 0n && usdt > 0n) {
            amount = `+${parseFloat(formatUnits(rw, 18)).toFixed(2)} RWA / +${parseFloat(formatUnits(usdt, 18)).toFixed(2)} USDT`
            typeKey = 'rewardRWA'
            typeVariant = 'green'
            amountColor = '#10b981'
          } else if (rw > 0n) {
            amount = `+${parseFloat(formatUnits(rw, 18)).toFixed(2)} RWA`
            typeKey = 'rewardRWA'
            typeVariant = 'green'
            amountColor = '#10b981'
          } else if (usdt > 0n) {
            amount = `+${parseFloat(formatUnits(usdt, 18)).toFixed(2)} USDT`
            typeKey = 'rewardReferral'
            typeVariant = 'lime'
            amountColor = '#84cc16'
          } else {
            continue
          }
          break
        }
        case 'StRWAMinted': {
          const amt = args.amount != null ? formatUnits(BigInt(String(args.amount)), 18) : '0'
          amount = `+${parseFloat(amt).toFixed(2)} stRWA`
          amountColor = '#a78bfa'
          typeKey = 'mintStRWA'
          typeVariant = 'purple'
          break
        }
        default:
          continue
      }

      const summaryType: SummaryType =
        typeKey === 'stakeUSDT' || typeKey === 'stakeRWA'
          ? 'stake'
          : typeKey === 'mintStRWA'
            ? 'mint'
            : 'withdraw'

      activities.push({
        timestamp: timestampMs,
        blockNumber: log.blockNumber,
        logIndex: Number(log.logIndex ?? 0),
        time: timeStr,
        typeKey,
        summaryType,
        typeVariant,
        amount,
        amountColor,
        txHash: log.transactionHash,
      })
    } catch {
      // skip unparseable logs
    }
  }

  activities.sort(sortFundRowsByRecent)
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development' && logs.length > 0 && activities.length === 0) {
    console.warn('[FundActivity] parseLogsToRows: 收到', logs.length, '条日志但解析后 0 条，可能被事件名或 user 过滤掉，或 decode 失败')
  }
  return activities
}

/** 解析 StRWA Burned 事件为资金活动行 */
async function parseStRWABurnLogs(
  logs: { data: `0x${string}`; topics: (`0x${string}` | `0x${string}`[])[]; blockNumber: bigint; logIndex?: bigint; transactionHash?: `0x${string}` }[],
  _normalizedUser: string,
  publicClient: { getBlock: (p: { blockNumber: bigint }) => Promise<{ timestamp: bigint }> },
  locale: string
): Promise<FundActivityRow[]> {
  const rows: FundActivityRow[] = []
  const localeKey = locale === 'zh' ? 'zh-CN' : locale === 'ko' ? 'ko-KR' : 'en-US'
  for (const log of logs) {
    try {
      const decoded = decodeEventLog({
        abi: [{ type: 'event', name: 'Burned', inputs: [{ name: 'from', type: 'address', indexed: true }, { name: 'amount', type: 'uint256', indexed: false }] }],
        data: log.data,
        topics: log.topics,
      }) as { eventName: string; args: { from?: string; amount?: bigint } }
      if (decoded.eventName !== 'Burned') continue
      const amount = decoded.args.amount != null ? formatUnits(decoded.args.amount, 18) : '0'
      const block = await publicClient.getBlock({ blockNumber: log.blockNumber })
      const timestampMs = Number(block.timestamp) * 1000
      const timeStr = new Date(timestampMs).toLocaleString(localeKey, {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
      rows.push({
        timestamp: timestampMs,
        blockNumber: log.blockNumber,
        logIndex: Number(log.logIndex ?? 0),
        time: timeStr,
        typeKey: 'burnStRWA',
        summaryType: 'withdraw',
        typeVariant: 'rose',
        amount: `-${parseFloat(amount).toFixed(2)} stRWA`,
        amountColor: '#f43f5e',
        txHash: log.transactionHash,
      })
    } catch {
      // skip
    }
  }
  rows.sort(sortFundRowsByRecent)
  return rows
}

/** 从后端 /api/history 拉取并转为资金活动行（链上无数据时的回退） */
async function fetchStakesFromApi(
  userAddress: string,
  locale: string,
  limit: number
): Promise<FundActivityRow[]> {
  try {
    const res = await fetch(`/api/history/${userAddress}?limit=${limit}`)
    if (!res.ok) return []
    const json = await res.json()
    const stakes = json?.data?.history ?? []
    const localeKey = locale === 'zh' ? 'zh-CN' : locale === 'ko' ? 'ko-KR' : 'en-US'
    const rows: FundActivityRow[] = stakes.map((s: any) => {
      const forcedTypeKey = typeof s.type_key === 'string' ? s.type_key : ''
      const isWithdraw = s.type === 'withdrawal'
      const isReferralReward = forcedTypeKey === 'rewardReferral' || s.type === 'referral_reward' || s.event_type === 'REFERRAL_REWARD'
      const isRwa = s.event_type?.includes('RWA')
      const amt = (Number(s.amount) / 1e18).toFixed(2)
      const timeStr = new Date(s.timestamp * 1000).toLocaleString(localeKey, {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
      
      // 根据 type 和 event_type 确定类型
      let typeKey: string
      let summaryType: SummaryType
      let typeVariant: FundActivityRow['typeVariant']
      
      if (forcedTypeKey && (FUND_TYPE_KEYS as readonly string[]).includes(forcedTypeKey)) {
        typeKey = forcedTypeKey
        summaryType =
          typeKey === 'stakeUSDT' || typeKey === 'stakeRWA'
            ? 'stake'
            : typeKey === 'mintStRWA'
              ? 'mint'
              : 'withdraw'
        typeVariant = TYPE_KEY_VARIANT[typeKey as FundTypeKey] ?? 'neutral'
      } else if (isReferralReward) {
        typeKey = 'rewardReferral'
        summaryType = 'mint'
        typeVariant = 'lime'
      } else if (isWithdraw) {
        typeKey = isRwa ? 'flexibleRWA' : 'flexibleUSDT'
        summaryType = 'withdraw'
        typeVariant = 'orange'
      } else {
        typeKey = isRwa ? 'stakeRWA' : 'stakeUSDT'
        summaryType = 'stake'
        typeVariant = isRwa ? 'purple' : 'cyan'
      }

      const amountForRow = (): { amount: string; amountColor: string } => {
        if (typeKey === 'rewardRWA') {
          return { amount: `+${amt} RWA`, amountColor: '#10b981' }
        }
        if (isReferralReward || typeKey === 'rewardReferral') {
          return { amount: `+${amt} USDT`, amountColor: '#84cc16' }
        }
        if (isWithdraw) {
          return {
            amount: isRwa ? `-${amt} RWA` : `-${amt} USDT`,
            amountColor: '#f97316',
          }
        }
        return {
          amount: isRwa ? `+${amt} RWA` : `+${amt} USDT`,
          amountColor: isRwa ? '#8b5cf6' : '#00f5d4',
        }
      }
      const { amount, amountColor } = amountForRow()

      return {
        timestamp: Number(s.timestamp ?? 0) * 1000,
        blockNumber: BigInt(s.block_number ?? 0),
        logIndex: 0,
        time: timeStr,
        typeKey,
        summaryType,
        typeVariant,
        amount,
        amountColor,
        txHash: s.tx_hash as `0x${string}` | undefined,
      }
    })
    rows.sort(sortFundRowsByRecent)
    return rows
  } catch {
    return []
  }
}

export function FundActivityCard() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const { address, chainId } = useAccount()
  const publicClient = usePublicClient()
  const [rows, setRows] = useState<FundActivityRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [modalRows, setModalRows] = useState<FundActivityRow[]>([])
  const [modalLoading, setModalLoading] = useState(false)
  const [modalCategory, setModalCategory] = useState<FundTypeKey | ''>('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!dropdownOpen) return
    const close = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false)
    }
    document.addEventListener('click', close, true)
    return () => document.removeEventListener('click', close, true)
  }, [dropdownOpen])

  const stakingAddress = chainId
    ? CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES]?.stakingContract
    : undefined
  const stRwaAddress = chainId
    ? (CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES] as { stRWA?: string } | undefined)?.stRWA
    : undefined

  const fetchActivities = useCallback(
    async (fromBlock: bigint, limit: number | null) => {
      if (!address || !stakingAddress || !publicClient) return []
      const normalizedUser = address.toLowerCase()
      const userArg = address as `0x${string}`
      const stakeEvent = parseAbiItem('event StakeEvent(address indexed user, uint256 amount, address indexed referrer, uint256 indexed stakeId, uint256 timestamp, uint256 lockPeriod)')
      const rwaStakeEvent = parseAbiItem('event RWAStakeEvent(address indexed user, uint256 amount, address indexed referrer, uint256 indexed stakeId, uint256 timestamp, uint256 lockPeriod)')
      let stakingLogs: { data: `0x${string}`; topics: (`0x${string}` | `0x${string}`[])[]; blockNumber: bigint; logIndex?: bigint; transactionHash?: `0x${string}` }[] = []
      try {
        const [usdtLogs, rwaLogs] = await Promise.all([
          publicClient.getLogs({
            address: stakingAddress as `0x${string}`,
            event: stakeEvent,
            args: { user: userArg },
            fromBlock,
            toBlock: 'latest',
          }),
          publicClient.getLogs({
            address: stakingAddress as `0x${string}`,
            event: rwaStakeEvent,
            args: { user: userArg },
            fromBlock,
            toBlock: 'latest',
          }),
        ])
        stakingLogs = [...usdtLogs, ...rwaLogs]
        console.log('📊 [FundActivity] USDT事件:', usdtLogs.length, '条, RWA事件:', rwaLogs.length, '条')
      } catch {
        try {
          stakingLogs = await publicClient.getLogs({
            address: stakingAddress as `0x${string}`,
            fromBlock,
            toBlock: 'latest',
          })
        } catch {
          stakingLogs = []
        }
      }
      const [burnLogs] = await Promise.all([
        stRwaAddress
          ? publicClient.getLogs({
              address: stRwaAddress as `0x${string}`,
              event: parseAbiItem('event Burned(address indexed from, uint256 amount)'),
              args: { from: userArg },
              fromBlock,
              toBlock: 'latest',
            })
          : Promise.resolve([]),
      ])
      const [stakingRows, burnRows] = await Promise.all([
        parseLogsToRows(stakingLogs, normalizedUser, publicClient, locale),
        parseStRWABurnLogs(burnLogs, normalizedUser, publicClient, locale),
      ])
      const merged = [...stakingRows, ...burnRows].sort(sortFundRowsByRecent)
      const out = limit != null ? merged.slice(0, limit) : merged
      if (process.env.NODE_ENV === 'development') {
        console.log('[FundActivity] 解析后 stakingRows:', stakingRows.length, 'burnRows:', burnRows.length, 'merged:', out.length, 'user:', normalizedUser.slice(0, 10) + '...')
      }
      return out
    },
    [address, stakingAddress, stRwaAddress, publicClient, locale, chainId]
  )

  useEffect(() => {
    if (!address || !stakingAddress || !publicClient) {
      if (process.env.NODE_ENV === 'development' && address) {
        console.warn('[FundActivity] 未请求：', !address ? '无 address' : '', !stakingAddress ? '无 stakingAddress(chainId=' + chainId + ')' : '', !publicClient ? '无 publicClient' : '')
      }
      setLoading(false)
      return
    }
    setLoading(true)
    const currentBlockPromise = publicClient.getBlockNumber()
    currentBlockPromise.then((currentBlock) => {
      // 优先使用后端 API（速度快，无区块限制）
      fetchStakesFromApi(address, locale, 5)
        .then((apiRows) => {
          if (apiRows.length > 0) {
            console.log('[FundActivity] 使用后端 API，条数:', apiRows.length)
            setRows(apiRows.slice(0, 3))
            setLoading(false)
            return
          }
          
          // API 无数据时，回退到链上查询
          console.log('[FundActivity] 后端 API 无数据，使用链上查询')
          const fromBlock = currentBlock > 20000n ? currentBlock - 20000n : 0n
          console.log('[FundActivity] 查询区块范围:', { currentBlock: currentBlock.toString(), fromBlock: fromBlock.toString(), chainId })
          return fetchActivities(fromBlock, 50)
        })
        .then((list) => {
          if (list && list.length > 0) {
            setRows(list.slice(0, 3))
            setLoading(false)
            return
          }
          if (process.env.NODE_ENV === 'development') console.log('[FundActivity] 链上 0 条，尝试后端 API 回退')
          // 链上无记录时回退到后端 /api/stakes（后端若已同步 EventMonitor 则有数据）
          return fetchStakesFromApi(address!, locale, 50).then((apiRows) => {
            if (process.env.NODE_ENV === 'development') console.log('[FundActivity] API 回退条数:', apiRows.length)
            setRows(apiRows.slice(0, 3))
            setLoading(false)
          })
        })
        .catch((err) => {
          if (process.env.NODE_ENV === 'development') console.warn('[FundActivity] fetchActivities 报错:', err)
          setLoading(false)
          fetchStakesFromApi(address!, locale, 50).then((apiRows) => setRows(apiRows.slice(0, 3)))
        })
    }).catch(() => {
      setLoading(false)
    })
  }, [address, stakingAddress, publicClient, chainId, locale])

  useEffect(() => {
    if (!showModal || !address) return
    setModalLoading(true)
    
    // 直接使用后端 API（无区块限制，查询所有历史）
    fetchStakesFromApi(address, locale, 200)
      .then((apiRows) => {
        setModalRows(apiRows)
        setModalLoading(false)
      })
      .catch(() => {
        setModalLoading(false)
      })
  }, [showModal, address, locale])

  const explorerUrl =
    chainId === 56
      ? 'https://bscscan.com'
      : chainId === 97
        ? 'https://testnet.bscscan.com'
        : 'https://etherscan.io'

  return (
    <div
      className="rounded-2xl bg-gradient-to-br from-[#0d0d14] to-[#13131e] p-6 backdrop-blur-xl"
      style={{ border: '1px solid #00f5d420', boxShadow: '0 0 20px rgba(0,245,212,0.05)' }}
    >
      <div className="mb-4 flex items-center justify-between">
        <span
          className="text-[13px] font-medium uppercase tracking-widest text-[#64748b]"
          style={{ fontVariant: 'small-caps' }}
        >
          {t('fundActivity.title')}
        </span>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="text-[13px] font-medium text-[#00f5d4] transition-opacity hover:opacity-80"
        >
          {t('fundActivity.viewAll')}
        </button>
      </div>

      <div>
        {loading ? (
          <div className="py-8 text-center text-sm text-[#64748b]">{t('fundActivity.loading')}</div>
        ) : rows.length === 0 ? (
          <div className="py-8 text-center text-sm text-[#64748b]">{t('fundActivity.noRecords')}</div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 border-b border-[#00f5d420]/20 bg-[#0d0d14]">
                  <tr>
                    <th className="px-4 py-3 font-medium text-[#64748b]">
                      {t('fundActivity.colTime')}
                    </th>
                    <th className="px-4 py-3 font-medium text-[#64748b]">
                      {t('fundActivity.colType')}
                    </th>
                    <th className="px-4 py-3 font-medium text-[#64748b]">
                      {t('fundActivity.colAmount')}
                    </th>
                    <th className="px-4 py-3 font-medium text-[#64748b]">
                      {t('fundActivity.colBlock')}
                    </th>
                    <th className="px-4 py-3 font-medium text-[#64748b]">Tx</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 3).map((row, i) => (
                    <tr
                      key={`${row.blockNumber}-${row.logIndex}-${i}`}
                      className="border-b border-[#00f5d420]/10"
                    >
                      <td className="px-4 py-3 font-mono text-[#64748b]">
                        {row.time}
                      </td>
                      <td className="px-4 py-3 text-[#f1f5f9]">
                        <TypePill label={t(`fundActivity.${row.typeKey}`)} variant={row.typeVariant} />
                      </td>
                      <td className="px-4 py-3 font-mono" style={{ color: row.amountColor }}>
                        <span className="text-[13px]">
                          {row.amount}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {row.blockNumber > 0n ? (
                          <a
                            href={`${explorerUrl}/block/${row.blockNumber.toString()}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-mono text-[12px] text-[#00f5d4] hover:underline"
                          >
                            #{row.blockNumber.toString()}
                            <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                          </a>
                        ) : (
                          <span className="text-[#64748b]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {row.txHash && (
                          <a
                            href={`${explorerUrl}/tx/${row.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-mono text-[12px] text-[#00f5d4] hover:underline"
                            aria-label="View transaction"
                          >
                            {shortTxHash(row.txHash)}
                            <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-70" />
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile stacked rows */}
            <div className="md:hidden space-y-2 px-1 pb-2">
              {rows.slice(0, 3).map((row, i) => {
                return (
                  <div
                    key={`m-${row.blockNumber}-${row.logIndex}-${i}`}
                    className="rounded-xl border border-[#00f5d420]/15 bg-[#0d0d14] p-3"
                  >
                    <div className="font-mono text-[12px] text-[#64748b]">{row.time}</div>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <div className="text-[#f1f5f9] text-[13px] font-medium">
                        <TypePill label={t(`fundActivity.${row.typeKey}`)} variant={row.typeVariant} />
                      </div>
                      <div className="font-mono text-[13px] font-semibold" style={{ color: row.amountColor }}>
                        {row.amount}
                      </div>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[12px]">
                      <span className="text-[#64748b]">{t('fundActivity.colBlock')}: </span>
                      {row.blockNumber > 0n ? (
                        <a
                          href={`${explorerUrl}/block/${row.blockNumber.toString()}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-mono text-[#00f5d4]"
                        >
                          #{row.blockNumber.toString()}
                          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                        </a>
                      ) : (
                        <span className="text-[#64748b]">—</span>
                      )}
                    </div>
                    {row.txHash ? (
                      <div className="mt-1 text-[11px] text-[#64748b] font-mono truncate">
                        <a
                          href={`${explorerUrl}/tx/${row.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 hover:text-[#00f5d4]"
                        >
                          {shortTxHash(row.txHash)}
                          <ExternalLink className="h-3 w-3" aria-hidden />
                        </a>
                      </div>
                    ) : null}
                    </div>
                )
              })}
            </div>
          </>
        )}
      </div>
      {!loading && rows.length > 0 && (
        <div className="mt-3 text-[11px] text-[#64748b]">
          {locale?.startsWith('zh') ? '默认显示最近 3 条，点击“查看全部”可查看完整记录。' : 'Showing latest 3 records. Click "View All" for full history.'}
        </div>
      )}

      {/* 查看全部 - 弹窗：改为钱包总览同款尺寸与圆角风格 */}
      {showModal && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center p-0 sm:p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="relative z-[10000] flex w-full max-w-[420px] flex-col self-end overflow-hidden rounded-t-3xl border border-[#00f5d420] bg-gradient-to-b from-[#0d0d14] via-[#0a0a10] to-[#0d0d14] shadow-[0_-12px_60px_rgba(0,0,0,0.55),0_0_0_1px_rgba(0,245,212,0.06)_inset] transition-[height,max-height] duration-300 ease-out sm:self-auto sm:rounded-3xl sm:h-[min(75dvh,75vh)] sm:max-h-[min(75dvh,75vh)]"
            style={{ height: 'min(75dvh,75vh)', maxHeight: 'min(75dvh,75vh)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 顶栏：与钱包总览一致 */}
            <div className="relative shrink-0 border-b border-[#00f5d420]/15 px-5 py-4">
              <div
                className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#00f5d4]/35 to-transparent"
                aria-hidden
              />
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="mt-0.5 h-8 w-0.5 shrink-0 rounded-full bg-gradient-to-b from-plasma-cyan to-plasma-cyan/20" aria-hidden />
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-plasma-cyan/75">Activity</div>
                    <h2 className="mt-0.5 text-[17px] font-bold tracking-tight text-text-primary">{t('fundActivity.title')}</h2>
                    <p className="mt-1 max-w-xl text-[12px] leading-relaxed text-text-secondary">{t('fundActivity.modalSubtitle')}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="shrink-0 rounded-full p-2 text-text-secondary transition-colors hover:bg-white/[0.06] hover:text-text-primary"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* 分类筛选 */}
            <div className="shrink-0 border-b border-[#00f5d420]/10 px-5 py-3.5">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 text-text-secondary">
                  <Filter className="h-4 w-4 text-plasma-cyan/50" aria-hidden />
                  <span className="text-[12px] font-medium uppercase tracking-wider">
                    {t('fundActivity.filterByType')}
                  </span>
                </div>
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setDropdownOpen((o) => !o)}
                    className="flex min-w-[200px] items-center justify-between gap-2 rounded-full border border-[#00f5d420]/20 bg-[#0a0a10]/80 py-2.5 pl-4 pr-3 text-[13px] text-text-primary transition-all duration-200 hover:border-plasma-cyan/35 focus:border-plasma-cyan/50 focus:outline-none focus:ring-2 focus:ring-plasma-cyan/20"
                    aria-haspopup="listbox"
                    aria-expanded={dropdownOpen}
                    aria-label={t('fundActivity.filterByType') || '按类型筛选'}
                  >
                    <span className="truncate">
                      {modalCategory === '' ? (t('fundActivity.filterAll') || '全部') : t(`fundActivity.${modalCategory}`)}
                    </span>
                    <ChevronDown className={`h-4 w-4 shrink-0 text-[#64748b] transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} aria-hidden />
                  </button>
                  {dropdownOpen && (
                    <div
                      className="absolute left-0 top-full z-50 mt-2 max-h-[min(320px,60vh)] min-w-[240px] overflow-auto rounded-2xl border border-[#00f5d420]/20 bg-[#0d0d14] py-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.5)]"
                      role="listbox"
                    >
                      <button
                        type="button"
                        role="option"
                        aria-selected={modalCategory === ''}
                        onClick={() => { setModalCategory(''); setDropdownOpen(false) }}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-[13px] transition-colors hover:bg-white/[0.06] aria-selected:bg-[#00f5d4]/10"
                      >
                        <span className="h-2 w-2 shrink-0 rounded-full bg-[#64748b]" aria-hidden />
                        <span className={modalCategory === '' ? 'text-plasma-cyan font-medium' : 'text-[#94a3b8]'}>
                          {t('fundActivity.filterAll') || '全部'}
                        </span>
                      </button>
                      {FUND_TYPE_KEYS.map((key) => {
                        const variant = TYPE_KEY_VARIANT[key]
                        const isSelected = modalCategory === key
                        const { color: dotColor } = VARIANT_COLORS[variant]
                        return (
                          <button
                            key={key}
                            type="button"
                            role="option"
                            aria-selected={isSelected}
                            onClick={() => { setModalCategory(key); setDropdownOpen(false) }}
                            className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-[13px] transition-colors hover:bg-white/[0.06] aria-selected:bg-[#00f5d4]/10"
                          >
                            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: dotColor }} aria-hidden />
                            <span className={isSelected ? 'text-plasma-cyan font-medium' : 'text-[#e2e8f0]'}>
                              {t(`fundActivity.${key}`)}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
                {(() => {
                  const filteredCount = modalCategory === '' ? modalRows.length : modalRows.filter((r) => r.typeKey === modalCategory).length
                  return modalRows.length > 0 ? (
                    <span className="text-[12px] text-text-secondary tabular-nums">
                      {filteredCount} {locale?.startsWith('zh') ? '条' : 'records'}
                    </span>
                  ) : null
                })()}
              </div>
            </div>

            {/* 内容区域：圆角卡片列表 */}
            <div className="flex-1 min-h-0 overflow-auto overscroll-contain bg-[#05050a]/35 p-4">
              {modalLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#00f5d4]/30 border-t-[#00f5d4]" />
                  <p className="text-[13px] text-text-secondary">{t('fundActivity.loading')}</p>
                </div>
              ) : modalRows.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 px-6">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#00f5d420]/15 bg-[#0d0d14]/80 text-text-secondary">
                    <Inbox className="h-7 w-7" strokeWidth={1.25} aria-hidden />
                  </div>
                  <p className="text-center text-[14px] text-text-secondary">{t('fundActivity.noRecords')}</p>
                </div>
              ) : (() => {
                const filteredRows = (modalCategory === '' ? modalRows : modalRows.filter((r) => r.typeKey === modalCategory))
                  .slice()
                  .sort(sortFundRowsByRecent)
                return filteredRows.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3 px-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#00f5d420]/15 bg-[#0d0d14]/80 text-text-secondary">
                      <Filter className="h-5 w-5" strokeWidth={1.5} aria-hidden />
                    </div>
                    <p className="text-center text-[14px] text-text-secondary">{t('fundActivity.noRecordsForType')}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredRows.map((row, i) => (
                      <div
                        key={`modal-card-${row.blockNumber}-${row.logIndex}-${i}`}
                        className="rounded-2xl border border-[#00f5d420]/12 bg-gradient-to-r from-[#0d0d14]/90 to-[#13131e]/60 px-4 py-3 transition-colors hover:border-[#00f5d420]/25 hover:bg-[#13131e]/80"
                      >
                        <div className="font-mono text-[12px] text-text-secondary">{row.time}</div>
                        <div className="mt-2 flex items-center justify-between gap-3">
                          <div className="text-text-primary text-[13px] font-medium">
                            <TypePill label={t(`fundActivity.${row.typeKey}`)} variant={row.typeVariant} />
                          </div>
                          <div className="font-mono text-[13px] font-semibold" style={{ color: row.amountColor }}>
                            {row.amount}
                          </div>
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[12px]">
                          <span className="text-text-secondary">{t('fundActivity.colBlock')}: </span>
                          {row.blockNumber > 0n ? (
                            <a
                              href={`${explorerUrl}/block/${row.blockNumber.toString()}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 font-mono text-plasma-cyan"
                            >
                              #{row.blockNumber.toString()}
                              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                            </a>
                          ) : (
                            <span className="text-text-secondary">—</span>
                          )}
                        </div>
                        {row.txHash ? (
                          <div className="mt-1 truncate font-mono text-[11px] text-text-secondary">
                            <a
                              href={`${explorerUrl}/tx/${row.txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 hover:text-plasma-cyan"
                            >
                              {shortTxHash(row.txHash)}
                              <ExternalLink className="h-3 w-3" aria-hidden />
                            </a>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )
              })()}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
