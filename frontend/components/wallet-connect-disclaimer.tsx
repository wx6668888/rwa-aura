'use client'

import type { DisclaimerComponent } from '@rainbow-me/rainbowkit'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'

function guideHref() {
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'https://rwa.lat'
  return `${base}/xxxxxxx`
}

/** 连接弹窗底部：优先 VPN + 教程链接，推荐币安 DApp / TP 钱包 */
export const WalletConnectDisclaimer: DisclaimerComponent = ({ Text, Link }) => {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const href = guideHref()
  return (
    <Text>
      {t('nav.walletDomesticDisclaimerBefore')}
      <Link href={href}>{t('nav.walletDomesticDisclaimerLink')}</Link>
      {t('nav.walletDomesticDisclaimerAfter')}
    </Text>
  )
}
