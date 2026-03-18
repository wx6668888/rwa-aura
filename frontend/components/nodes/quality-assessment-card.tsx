'use client';

import { useLocale } from '@/components/locale-provider';
import { useTranslation } from '@/lib/i18n';
import { TrendingUp, Users, Award, Target, AlertTriangle } from 'lucide-react';
import { useAccount } from 'wagmi'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

interface QualityAssessmentCardProps {
  effectiveRefRate?: number;
  avgStake?: number;
  qualityScore?: number;
  directRefs?: number;
  effectiveRefs?: number;
}

type TierDistribution = { S: number; A: number; B: number; C: number; D: number }

interface QualityApiData {
  address: string
  score: number
  grade: 'S' | 'A' | 'B' | 'C' | 'D'
  directCount: number
  effectiveCount: number
  effectiveRatePercent: number
  tierDistribution: TierDistribution
  avgStakeUsdtEq: number
  retainedRatePercent: number
  penalties: string[]
  updatedAt: number
}

export function QualityAssessmentCard({
  effectiveRefRate = 0,
  avgStake = 0,
  qualityScore = 0,
  directRefs = 0,
  effectiveRefs = 0,
}: QualityAssessmentCardProps) {
  const { locale } = useLocale();
  const { t } = useTranslation(locale);
  const { address } = useAccount()

  const API_BASE =
    (typeof window !== 'undefined' && (process.env.NEXT_PUBLIC_API_URL || '').trim()) ||
    (process.env.NEXT_PUBLIC_API_URL || '').trim() ||
    'http://localhost:3001'

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<QualityApiData | null>(null)

  useEffect(() => {
    let cancelled = false
    async function run() {
      if (!address) {
        setData(null)
        setError(null)
        return
      }
      setLoading(true)
      setError(null)
      try {
        const r = await fetch(`${API_BASE}/api/quality/${address}`, { cache: 'no-store' })
        const j = await r.json()
        if (!r.ok || !j?.success) throw new Error(j?.error || `HTTP ${r.status}`)
        if (!cancelled) setData(j.data as QualityApiData)
      } catch (e: any) {
        if (!cancelled) setError(e?.message || String(e || '加载失败'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [address, API_BASE])

  const assessmentData = useMemo(() => {
    if (data) {
      return {
        effectiveRefRate: Number.isFinite(data.effectiveRatePercent) ? data.effectiveRatePercent : 0,
        avgStake: Number.isFinite(data.avgStakeUsdtEq) ? data.avgStakeUsdtEq : 0,
        qualityScore: Number.isFinite(data.score) ? data.score : 0,
        directRefs: data.directCount || 0,
        effectiveRefs: data.effectiveCount || 0,
        retainedRate: Number.isFinite(data.retainedRatePercent) ? data.retainedRatePercent : 0,
        tierDistribution: data.tierDistribution || { S: 0, A: 0, B: 0, C: 0, D: 0 },
        grade: data.grade,
        penalties: Array.isArray(data.penalties) ? data.penalties : [],
        minStake: 100,
      }
    }
    // fallback：允许外部传 props（例如未来做 SSR 或从其它聚合接口传入）
    return {
      effectiveRefRate: effectiveRefRate || 0,
      avgStake: avgStake || 0,
      qualityScore: qualityScore || 0,
      directRefs: directRefs || 0,
      effectiveRefs: effectiveRefs || 0,
      retainedRate: 0,
      tierDistribution: { S: 0, A: 0, B: 0, C: 0, D: 0 } as TierDistribution,
      grade: 'D' as const,
      penalties: [],
      minStake: 100,
    }
  }, [data, effectiveRefRate, avgStake, qualityScore, directRefs, effectiveRefs])

  const tierTotal =
    assessmentData.tierDistribution.S +
    assessmentData.tierDistribution.A +
    assessmentData.tierDistribution.B +
    assessmentData.tierDistribution.C +
    assessmentData.tierDistribution.D

  const tierBars = [
    { k: 'S', v: assessmentData.tierDistribution.S, c: 'bg-[#00f5d4]' },
    { k: 'A', v: assessmentData.tierDistribution.A, c: 'bg-green-400' },
    { k: 'B', v: assessmentData.tierDistribution.B, c: 'bg-yellow-400' },
    { k: 'C', v: assessmentData.tierDistribution.C, c: 'bg-orange-400' },
    { k: 'D', v: assessmentData.tierDistribution.D, c: 'bg-red-400' },
  ] as const

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-400/20 border-green-400/30';
    if (score >= 60) return 'bg-yellow-400/20 border-yellow-400/30';
    if (score >= 40) return 'bg-orange-400/20 border-orange-400/30';
    return 'bg-red-400/20 border-red-400/30';
  };

  return (
    <div className="rounded-2xl border border-[#00f5d420] bg-gradient-to-br from-[#0d0d14] to-[#13131e] p-6 backdrop-blur-xl shadow-[0_0_30px_rgba(0,245,212,0.08)] animate-in fade-in-up delay-300">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-plasma-cyan/20 border border-plasma-cyan/30 flex items-center justify-center">
          <Award className="w-5 h-5 text-plasma-cyan" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-[16px] font-bold text-text-primary">
              {t('nodes.qualityAssessment')}
            </h3>
            <Link
              href="/knowledge?article=referral-quality-score"
              className="text-[11px] text-plasma-cyan/90 hover:text-plasma-cyan transition-colors border border-plasma-cyan/20 hover:border-plasma-cyan/40 bg-plasma-cyan/10 hover:bg-plasma-cyan/15 rounded-full px-3 py-1"
            >
              查看说明
            </Link>
          </div>
          <p className="text-[11px] text-text-secondary mt-0.5">
            {t('nodes.qualityAssessmentDesc')}
          </p>
        </div>
      </div>

      {/* Status */}
      {!address && (
        <div className="mb-6 rounded-xl p-4 border border-white/10 bg-white/[0.03]">
          <div className="text-[12px] text-text-secondary">连接钱包后展示推荐质量</div>
        </div>
      )}
      {address && loading && (
        <div className="mb-6 rounded-xl p-4 border border-white/10 bg-white/[0.03]">
          <div className="text-[12px] text-text-secondary">正在加载推荐质量…</div>
        </div>
      )}
      {address && !loading && error && (
        <div className="mb-6 rounded-xl p-4 border border-red-400/30 bg-red-400/10">
          <div className="flex items-center gap-2 text-[12px] text-red-200">
            <AlertTriangle className="w-4 h-4" />
            <span>推荐质量加载失败：{error}</span>
          </div>
          <div className="text-[10px] text-red-200/70 mt-1">请确认后端已启动且 `NEXT_PUBLIC_API_URL` 指向正确。</div>
        </div>
      )}

      {/* Quality Score */}
      <div className={`mb-6 rounded-xl p-4 border ${getScoreBgColor(assessmentData.qualityScore)}`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[12px] text-text-secondary">
            {t('nodes.qualityScore')}
          </span>
          <div className="flex items-center gap-2">
            {data?.grade && (
              <span className="text-[11px] px-2 py-0.5 rounded-full border border-white/10 bg-white/[0.03] text-white/80">
                等级 {data.grade}
              </span>
            )}
            <span className={`font-jetbrains text-[24px] font-bold ${getScoreColor(assessmentData.qualityScore)}`}>
              {Math.round(assessmentData.qualityScore)}
            </span>
          </div>
        </div>
        <div className="h-2 bg-surface-3 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              assessmentData.qualityScore >= 80 ? 'bg-green-400' :
              assessmentData.qualityScore >= 60 ? 'bg-yellow-400' :
              assessmentData.qualityScore >= 40 ? 'bg-orange-400' : 'bg-red-400'
            }`}
            style={{ width: `${assessmentData.qualityScore}%` }}
          />
        </div>
        {!!tierTotal && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-[10px] text-white/40 mb-2">
              <span>成员分层（S/A/B/C/D）</span>
              <span>{tierTotal} 人</span>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden flex">
              {tierBars.map((b) => {
                const w = tierTotal > 0 ? (b.v / tierTotal) * 100 : 0
                return (
                  <div
                    key={b.k}
                    className={`${b.c} h-full`}
                    style={{ width: `${w}%` }}
                    title={`${b.k}: ${b.v}`}
                  />
                )
              })}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {tierBars.map((b) => (
                <div key={b.k} className="text-[10px] text-white/60 border border-white/10 bg-white/[0.03] rounded-full px-2 py-0.5">
                  {b.k} {b.v}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Effective Referral Rate */}
        <div className="bg-surface-2 rounded-xl p-4 border border-border-subtle">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-plasma-cyan" />
            <span className="text-[11px] text-text-secondary">
              {t('nodes.effectiveRefRate')}
            </span>
          </div>
          <div className="font-jetbrains text-[18px] font-bold text-plasma-cyan">
            {assessmentData.effectiveRefRate.toFixed(1)}%
          </div>
          <div className="text-[10px] text-text-disabled mt-1">
            {assessmentData.effectiveRefs} / {assessmentData.directRefs} {t('nodes.effective')}
          </div>
        </div>

        {/* Average Stake */}
        <div className="bg-surface-2 rounded-xl p-4 border border-border-subtle">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <span className="text-[11px] text-text-secondary">
              {t('nodes.avgStake')}
            </span>
          </div>
          <div className="font-jetbrains text-[18px] font-bold text-green-400">
            ${assessmentData.avgStake.toLocaleString()}
          </div>
          <div className="text-[10px] text-text-disabled mt-1">
            {t('nodes.teamAvg')}
          </div>
        </div>
      </div>

      {/* Retained + reasons */}
      {data && (
        <div className="mt-4 bg-surface-2 rounded-xl p-4 border border-border-subtle">
          <div className="flex items-center justify-between">
            <div className="text-[11px] text-text-secondary">团队留存率（估算）</div>
            <div className="font-jetbrains text-[14px] font-bold text-[#fbbf24]">{assessmentData.retainedRate.toFixed(1)}%</div>
          </div>
          {!!assessmentData.penalties?.length && (
            <div className="mt-3 space-y-2">
              <div className="text-[11px] text-white/70">当前命中原因</div>
              {assessmentData.penalties.slice(0, 4).map((p, idx) => (
                <div key={`${idx}-${p.slice(0, 12)}`} className="text-[11px] text-white/60 leading-relaxed flex gap-2">
                  <span className="mt-1 w-1.5 h-1.5 rounded-full bg-white/30 flex-shrink-0" />
                  <span>{p}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Requirements */}
      <div className="mt-6 pt-6 border-t border-border-subtle">
        <div className="flex items-center gap-2 mb-3">
          <Target className="w-4 h-4 text-text-secondary" />
          <span className="text-[12px] font-semibold text-text-secondary">
            {t('nodes.effectiveUserCriteria')}
          </span>
        </div>
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-plasma-cyan mt-1.5 flex-shrink-0" />
            <p className="text-[11px] text-text-disabled leading-relaxed">
              {t('nodes.effectiveUserRule1', { amount: assessmentData.minStake })}
            </p>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-plasma-cyan mt-1.5 flex-shrink-0" />
            <p className="text-[11px] text-text-disabled leading-relaxed">
              {t('nodes.effectiveUserRule3')}
            </p>
          </div>
        </div>
      </div>

      {/* Tips */}
      <div className="mt-4 p-3 bg-plasma-cyan/10 border border-plasma-cyan/20 rounded-xl">
        <p className="text-[11px] text-plasma-cyan leading-relaxed">
          {t('nodes.qualityTip')}
        </p>
      </div>
    </div>
  );
}
