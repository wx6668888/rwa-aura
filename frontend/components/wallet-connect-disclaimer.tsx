'use client'

import type { DisclaimerComponent } from '@rainbow-me/rainbowkit'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'

/** 与 RainbowKit / 自定义连接弹层共用的「连接教程」页（站内） */
export function rwaConnectGuideHref(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'https://rwa.lat'
  return `${base}/xxxxxxx`
}

/** 连接弹窗底部：极简一行 + 教程链接（正文区由全局 CSS 收紧） */
export const WalletConnectDisclaimer: DisclaimerComponent = ({ Text, Link }) => {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const href = rwaConnectGuideHref()
  return (
    <Text>
      {t('nav.walletConnectDisclaimerLine')}{' '}
      <Link href={href}>{t('nav.walletConnectDisclaimerCta')}</Link>
    </Text>
  )
}
