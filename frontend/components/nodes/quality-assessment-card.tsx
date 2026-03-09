'use client';

import { useLocale } from '@/components/locale-provider';
import { useTranslation } from '@/lib/i18n';
import { TrendingUp, Users, Award, Target } from 'lucide-react';

interface QualityAssessmentCardProps {
  effectiveRefRate?: number;
  avgStake?: number;
  qualityScore?: number;
  directRefs?: number;
  effectiveRefs?: number;
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

  // 模拟数据（实际应从合约或API获取）
  const assessmentData = {
    effectiveRefRate: effectiveRefRate || 75.5, // 有效直推率
    avgStake: avgStake || 1250, // 团队平均质押
    qualityScore: qualityScore || 82, // 质量分数
    directRefs: directRefs || 12, // 直推总数
    effectiveRefs: effectiveRefs || 9, // 有效直推数
    minStake: 100, // 有效用户最低质押
  };

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
        <div>
          <h3 className="text-[16px] font-bold text-text-primary">
            {t('nodes.qualityAssessment')}
          </h3>
          <p className="text-[11px] text-text-secondary mt-0.5">
            {t('nodes.qualityAssessmentDesc')}
          </p>
        </div>
      </div>

      {/* Quality Score */}
      <div className={`mb-6 rounded-xl p-4 border ${getScoreBgColor(assessmentData.qualityScore)}`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[12px] text-text-secondary">
            {t('nodes.qualityScore')}
          </span>
          <span className={`font-jetbrains text-[24px] font-bold ${getScoreColor(assessmentData.qualityScore)}`}>
            {assessmentData.qualityScore}
          </span>
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
