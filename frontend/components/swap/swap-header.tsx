'use client';

import { LottieAnimation } from '@/components/lottie-animation';
import { useLocale } from '@/components/locale-provider';
import { useTranslation } from '@/lib/i18n';

export default function SwapHeader() {
  const { locale } = useLocale();
  const { t } = useTranslation(locale);

  return (
    <div className="pt-2 pb-1 text-center">
      {/* Icon: 兑换动画（主题绿），尺寸不变 */}
      <div className="inline-block w-32 h-32 mx-auto">
        <LottieAnimation
          src="/动画/兑换.json"
          loop
          autoplay
          width={128}
          height={128}
          className="w-full h-full"
        />
      </div>

      {/* 页头标题：代币兑换（白色标题字体） */}
      <h1 className="mt-2 font-[family-name:var(--font-space-grotesk)] text-3xl sm:text-4xl font-bold text-[#f1f5f9]">
        {t('swap.overline')}
      </h1>
    </div>
  );
}
