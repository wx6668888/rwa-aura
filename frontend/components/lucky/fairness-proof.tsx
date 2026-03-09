'use client';

import { ExternalLink, CheckCircle2 } from 'lucide-react';
import { useLocale } from '@/components/locale-provider';
import { useTranslation } from '@/lib/i18n';

export default function FairnessProof() {
  const { locale } = useLocale();
  const { t } = useTranslation(locale);
  
  const features = [
    {
      emoji: '🔐',
      title: t('lucky.feature1Title'),
      description: t('lucky.feature1Desc'),
    },
    {
      emoji: '⛓️',
      title: t('lucky.feature2Title'),
      description: t('lucky.feature2Desc'),
    },
    {
      emoji: '🔍',
      title: t('lucky.feature3Title'),
      description: t('lucky.feature3Desc'),
    },
  ];

  return (
    <div className="mt-8 mb-12">
      <h2 className="text-[18px] font-700 text-text-primary mb-4">
        {t('lucky.fairnessProof')}
      </h2>

      <div className="border border-border-subtle rounded-2xl p-6 md:p-8 backdrop-blur-xl bg-surface-1">
        {/* Header */}
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 rounded-full bg-plasma-cyan/15 border-2 border-plasma-cyan flex items-center justify-center flex-shrink-0">
            <span className="text-[24px]">🛡️</span>
          </div>
          <div>
            <h3 className="text-[16px] font-700 text-text-primary mb-2">
              {t('lucky.chainlinkVrf')}
            </h3>
            <p className="text-[13px] text-text-secondary leading-relaxed">
              {t('lucky.vrfDescription')}
            </p>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-surface-2 rounded-xl p-4 hover:bg-surface-3 transition-colors"
            >
              <div className="text-[32px] mb-2">{feature.emoji}</div>
              <h4 className="text-[13px] font-700 text-text-primary mb-1">
                {feature.title}
              </h4>
              <p className="text-[12px] text-text-secondary leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* VRF Proof Example */}
        <div className="bg-surface-2 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-success" />
            <span className="text-[12px] font-700 text-text-primary">
              {t('lucky.latestVrfProof')}
            </span>
          </div>
          
          <div className="space-y-2 text-[11px] font-jetbrains">
            <div className="flex justify-between">
              <span className="text-text-disabled">{t('lucky.requestId')}:</span>
              <span className="text-text-secondary">0x1234...5678</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-disabled">{t('lucky.randomness')}:</span>
              <span className="text-text-secondary">0xabcd...ef01</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-disabled">{t('lucky.blockNumber')}:</span>
              <span className="text-text-secondary">12,345,678</span>
            </div>
          </div>
          
          <a
            href="https://vrf.chain.link"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1 text-[12px] text-plasma-cyan hover:underline"
          >
            {t('lucky.verifyOnChainlink')}
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Documentation Links */}
        <div className="flex flex-wrap gap-3">
          <a
            href="https://docs.chain.link/vrf/v2/introduction"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-full border border-border-subtle text-[12px] text-text-secondary hover:border-plasma-cyan hover:text-plasma-cyan transition-colors"
          >
            <span>📚</span>
            {t('lucky.vrfDocs')}
            <ExternalLink className="w-3 h-3" />
          </a>
          
          <a
            href="https://github.com/smartcontractkit/chainlink"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-full border border-border-subtle text-[12px] text-text-secondary hover:border-plasma-cyan hover:text-plasma-cyan transition-colors"
          >
            <span>💻</span>
            {t('lucky.sourceCode')}
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
