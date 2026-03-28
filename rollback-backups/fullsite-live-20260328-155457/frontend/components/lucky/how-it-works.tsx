'use client';

import { useLocale } from '@/components/locale-provider';
import { useTranslation } from '@/lib/i18n';

export default function HowItWorks() {
  const { locale } = useLocale();
  const { t } = useTranslation(locale);
  
  const steps = [
    {
      emoji: '🎫',
      title: t('lucky.step1Title'),
      description: t('lucky.step1Desc'),
      bgColor: 'bg-plasma-cyan',
      borderColor: 'border-plasma-cyan',
    },
    {
      emoji: '🔀',
      title: t('lucky.step2Title'),
      description: t('lucky.step2Desc'),
      bgColor: 'bg-void-purple',
      borderColor: 'border-void-purple',
    },
    {
      emoji: '🏆',
      title: t('lucky.step3Title'),
      description: t('lucky.step3Desc'),
      bgColor: 'bg-gold-node',
      borderColor: 'border-gold-node',
    },
    {
      emoji: '💰',
      title: t('lucky.step4Title'),
      description: t('lucky.step4Desc'),
      bgColor: 'bg-plasma-cyan',
      borderColor: 'border-plasma-cyan',
    },
  ];

  return (
    <div className="mt-8">
      <h2 className="text-[18px] font-700 text-text-primary mb-4">
        {t('lucky.howItWorks')}
      </h2>
      
      <div className="border border-border-subtle rounded-2xl p-6 md:p-8 backdrop-blur-xl bg-surface-1">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              {/* Connector Line (desktop only) */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-8 left-[calc(50%+24px)] w-[calc(100%-48px)] h-[2px] bg-border-subtle" />
              )}
              
              <div className="relative z-10 text-center">
                {/* Icon Circle with Emoji */}
                <div className={`w-16 h-16 mx-auto rounded-full ${step.bgColor} bg-opacity-15 border-2 ${step.borderColor} flex items-center justify-center mb-4`}>
                  <span className="text-[32px]">{step.emoji}</span>
                </div>
                
                {/* Step Number */}
                <div className="text-[11px] text-text-disabled font-700 mb-2">
                  {t('lucky.step')} {index + 1}
                </div>
                
                {/* Title */}
                <h3 className="text-[14px] font-700 text-text-primary mb-2">
                  {step.title}
                </h3>
                
                {/* Description */}
                <p className="text-[12px] text-text-secondary leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
