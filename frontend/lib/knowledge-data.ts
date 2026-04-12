/**
 * 知识库分类与文章（面向小白用户）
 * 所有标题与正文通过 i18n 的 knowledge.* 读取
 * drawerIcon: lucide-react 图标名，用于左侧抽屉导航
 */
export type KnowledgeCategoryId =
  | 'getStarted'
  | 'deposit'
  | 'staking'
  | 'withdraw'
  | 'nodes'
  | 'lottery'
  | 'swap'
  | 'tokenomics'
  | 'security'
  | 'compare'
  | 'tutorial'

export interface KnowledgeArticle {
  id: string
  categoryId: KnowledgeCategoryId
  /** i18n key: knowledge.article.{id}.title */
  titleKey: string
  /** i18n key: knowledge.article.{id}.content */
  contentKey: string
}

export type KnowledgeDrawerIcon =
  | 'LayoutGrid'
  | 'Wallet'
  | 'ArrowDownToLine'
  | 'TrendingUp'
  | 'Unlock'
  | 'Users'
  | 'Star'
  | 'ArrowLeftRight'
  | 'PieChart'
  | 'Shield'
  | 'HelpCircle'
  | 'BookOpen'

export interface KnowledgeCategory {
  id: KnowledgeCategoryId
  /** i18n key: knowledge.cat.{id} */
  nameKey: string
  /** lucide-react 图标名 */
  drawerIcon: KnowledgeDrawerIcon
  articles: KnowledgeArticle[]
}

export const knowledgeCategories: KnowledgeCategory[] = [
  {
    id: 'getStarted',
    nameKey: 'knowledge.cat.getStarted',
    drawerIcon: 'Wallet',
    articles: [
      { id: 'what-is-rwa', categoryId: 'getStarted', titleKey: 'knowledge.article.what-is-rwa.title', contentKey: 'knowledge.article.what-is-rwa.content' },
      { id: 'rwa-token-what', categoryId: 'getStarted', titleKey: 'knowledge.article.rwa-token-what.title', contentKey: 'knowledge.article.rwa-token-what.content' },
      { id: 'how-to-start', categoryId: 'getStarted', titleKey: 'knowledge.article.how-to-start.title', contentKey: 'knowledge.article.how-to-start.content' },
      { id: 'supported-wallets', categoryId: 'getStarted', titleKey: 'knowledge.article.supported-wallets.title', contentKey: 'knowledge.article.supported-wallets.content' },
      { id: 'how-to-connect', categoryId: 'getStarted', titleKey: 'knowledge.article.how-to-connect.title', contentKey: 'knowledge.article.how-to-connect.content' },
      { id: 'what-is-gas', categoryId: 'getStarted', titleKey: 'knowledge.article.what-is-gas.title', contentKey: 'knowledge.article.what-is-gas.content' },
    ],
  },
  {
    id: 'deposit',
    nameKey: 'knowledge.cat.deposit',
    drawerIcon: 'ArrowDownToLine',
    articles: [
      { id: 'how-to-get-usdt', categoryId: 'deposit', titleKey: 'knowledge.article.how-to-get-usdt.title', contentKey: 'knowledge.article.how-to-get-usdt.content' },
      { id: 'withdraw-from-exchange', categoryId: 'deposit', titleKey: 'knowledge.article.withdraw-from-exchange.title', contentKey: 'knowledge.article.withdraw-from-exchange.content' },
      { id: 'choose-bsc-network', categoryId: 'deposit', titleKey: 'knowledge.article.choose-bsc-network.title', contentKey: 'knowledge.article.choose-bsc-network.content' },
      { id: 'min-deposit', categoryId: 'deposit', titleKey: 'knowledge.article.min-deposit.title', contentKey: 'knowledge.article.min-deposit.content' },
    ],
  },
  {
    id: 'staking',
    nameKey: 'knowledge.cat.staking',
    drawerIcon: 'TrendingUp',
    articles: [
      { id: 'what-is-staking', categoryId: 'staking', titleKey: 'knowledge.article.what-is-staking.title', contentKey: 'knowledge.article.what-is-staking.content' },
      { id: 'usdt-vs-rwa-stake', categoryId: 'staking', titleKey: 'knowledge.article.usdt-vs-rwa-stake.title', contentKey: 'knowledge.article.usdt-vs-rwa-stake.content' },
      { id: 'lock-period-and-yield', categoryId: 'staking', titleKey: 'knowledge.article.lock-period-and-yield.title', contentKey: 'knowledge.article.lock-period-and-yield.content' },
      { id: 'daily-yield-calc', categoryId: 'staking', titleKey: 'knowledge.article.daily-yield-calc.title', contentKey: 'knowledge.article.daily-yield-calc.content' },
      { id: 'yield-calculation', categoryId: 'staking', titleKey: 'knowledge.article.yield-calculation.title', contentKey: 'knowledge.article.yield-calculation.content' },
      { id: 'when-rewards-arrive', categoryId: 'staking', titleKey: 'knowledge.article.when-rewards-arrive.title', contentKey: 'knowledge.article.when-rewards-arrive.content' },
      { id: 'what-is-approve', categoryId: 'staking', titleKey: 'knowledge.article.what-is-approve.title', contentKey: 'knowledge.article.what-is-approve.content' },
      { id: 'balance-insufficient-why', categoryId: 'staking', titleKey: 'knowledge.article.balance-insufficient-why.title', contentKey: 'knowledge.article.balance-insufficient-why.content' },
      { id: 'can-cancel-stake', categoryId: 'staking', titleKey: 'knowledge.article.can-cancel-stake.title', contentKey: 'knowledge.article.can-cancel-stake.content' },
      { id: 'multiple-stakes', categoryId: 'staking', titleKey: 'knowledge.article.multiple-stakes.title', contentKey: 'knowledge.article.multiple-stakes.content' },
      { id: 'strwa-vs-rwa', categoryId: 'staking', titleKey: 'knowledge.article.strwa-vs-rwa.title', contentKey: 'knowledge.article.strwa-vs-rwa.content' },
      { id: 'wrong-amount-sent-tx', categoryId: 'staking', titleKey: 'knowledge.article.wrong-amount-sent-tx.title', contentKey: 'knowledge.article.wrong-amount-sent-tx.content' },
      { id: 'transfer-stake-to-other', categoryId: 'staking', titleKey: 'knowledge.article.transfer-stake-to-other.title', contentKey: 'knowledge.article.transfer-stake-to-other.content' },
    ],
  },
  {
    id: 'withdraw',
    nameKey: 'knowledge.cat.withdraw',
    drawerIcon: 'Unlock',
    articles: [
      { id: 'how-to-withdraw-rwa', categoryId: 'withdraw', titleKey: 'knowledge.article.how-to-withdraw-rwa.title', contentKey: 'knowledge.article.how-to-withdraw-rwa.content' },
      { id: 'principal-withdraw-guide', categoryId: 'withdraw', titleKey: 'knowledge.article.principal-withdraw-guide.title', contentKey: 'knowledge.article.principal-withdraw-guide.content' },
      { id: 'withdraw-arrival-time', categoryId: 'withdraw', titleKey: 'knowledge.article.withdraw-arrival-time.title', contentKey: 'knowledge.article.withdraw-arrival-time.content' },
      { id: 'withdraw-cooldown-fee', categoryId: 'withdraw', titleKey: 'knowledge.article.withdraw-cooldown-fee.title', contentKey: 'knowledge.article.withdraw-cooldown-fee.content' },
      { id: 'rewards-manual-claim', categoryId: 'withdraw', titleKey: 'knowledge.article.rewards-manual-claim.title', contentKey: 'knowledge.article.rewards-manual-claim.content' },
      { id: 'withdraw-amount-mismatch', categoryId: 'withdraw', titleKey: 'knowledge.article.withdraw-amount-mismatch.title', contentKey: 'knowledge.article.withdraw-amount-mismatch.content' },
      { id: 'withdraw-not-received', categoryId: 'withdraw', titleKey: 'knowledge.article.withdraw-not-received.title', contentKey: 'knowledge.article.withdraw-not-received.content' },
      { id: 'rwa-usdt-separate-claim', categoryId: 'withdraw', titleKey: 'knowledge.article.rwa-usdt-separate-claim.title', contentKey: 'knowledge.article.rwa-usdt-separate-claim.content' },
      { id: 'what-is-strwa-unlock', categoryId: 'withdraw', titleKey: 'knowledge.article.what-is-strwa-unlock.title', contentKey: 'knowledge.article.what-is-strwa-unlock.content' },
      { id: 'claim-usdt-rewards', categoryId: 'withdraw', titleKey: 'knowledge.article.claim-usdt-rewards.title', contentKey: 'knowledge.article.claim-usdt-rewards.content' },
      { id: 'what-is-emergency-withdraw', categoryId: 'withdraw', titleKey: 'knowledge.article.what-is-emergency-withdraw.title', contentKey: 'knowledge.article.what-is-emergency-withdraw.content' },
    ],
  },
  {
    id: 'nodes',
    nameKey: 'knowledge.cat.nodes',
    drawerIcon: 'Users',
    articles: [
      { id: 'what-are-node-levels', categoryId: 'nodes', titleKey: 'knowledge.article.what-are-node-levels.title', contentKey: 'knowledge.article.what-are-node-levels.content' },
      { id: 'no-referrals-still-earn', categoryId: 'nodes', titleKey: 'knowledge.article.no-referrals-still-earn.title', contentKey: 'knowledge.article.no-referrals-still-earn.content' },
      { id: 'what-is-referrer', categoryId: 'nodes', titleKey: 'knowledge.article.what-is-referrer.title', contentKey: 'knowledge.article.what-is-referrer.content' },
      { id: 'wrong-referrer-address', categoryId: 'nodes', titleKey: 'knowledge.article.wrong-referrer-address.title', contentKey: 'knowledge.article.wrong-referrer-address.content' },
      { id: 'referral-reward-calc', categoryId: 'nodes', titleKey: 'knowledge.article.referral-reward-calc.title', contentKey: 'knowledge.article.referral-reward-calc.content' },
      { id: 'referral-quality-score', categoryId: 'nodes', titleKey: 'knowledge.article.referral-quality-score.title', contentKey: 'knowledge.article.referral-quality-score.content' },
      { id: 'project-dividend-mechanism', categoryId: 'nodes', titleKey: 'knowledge.article.project-dividend-mechanism.title', contentKey: 'knowledge.article.project-dividend-mechanism.content' },
      { id: 'node-level-downgrade', categoryId: 'nodes', titleKey: 'knowledge.article.node-level-downgrade.title', contentKey: 'knowledge.article.node-level-downgrade.content' },
      { id: 'direct-vs-indirect-referral', categoryId: 'nodes', titleKey: 'knowledge.article.direct-vs-indirect-referral.title', contentKey: 'knowledge.article.direct-vs-indirect-referral.content' },
      { id: 'same-wallet-multiple-referrers', categoryId: 'nodes', titleKey: 'knowledge.article.same-wallet-multiple-referrers.title', contentKey: 'knowledge.article.same-wallet-multiple-referrers.content' },
      { id: 'how-to-upgrade-node', categoryId: 'nodes', titleKey: 'knowledge.article.how-to-upgrade-node.title', contentKey: 'knowledge.article.how-to-upgrade-node.content' },
    ],
  },
  {
    id: 'lottery',
    nameKey: 'knowledge.cat.lottery',
    drawerIcon: 'Star',
    articles: [
      { id: 'lottery-rules', categoryId: 'lottery', titleKey: 'knowledge.article.lottery-rules.title', contentKey: 'knowledge.article.lottery-rules.content' },
      { id: 'four-pools-diff', categoryId: 'lottery', titleKey: 'knowledge.article.four-pools-diff.title', contentKey: 'knowledge.article.four-pools-diff.content' },
      { id: 'draw-time-utc', categoryId: 'lottery', titleKey: 'knowledge.article.draw-time-utc.title', contentKey: 'knowledge.article.draw-time-utc.content' },
      { id: 'buy-tickets-and-claim', categoryId: 'lottery', titleKey: 'knowledge.article.buy-tickets-and-claim.title', contentKey: 'knowledge.article.buy-tickets-and-claim.content' },
    ],
  },
  {
    id: 'swap',
    nameKey: 'knowledge.cat.swap',
    drawerIcon: 'ArrowLeftRight',
    articles: [
      { id: 'how-to-buy-rwa-with-usdt', categoryId: 'swap', titleKey: 'knowledge.article.how-to-buy-rwa-with-usdt.title', contentKey: 'knowledge.article.how-to-buy-rwa-with-usdt.content' },
      { id: 'tron-usdt-buy-rwa-and-stake', categoryId: 'swap', titleKey: 'knowledge.article.tron-usdt-buy-rwa-and-stake.title', contentKey: 'knowledge.article.tron-usdt-buy-rwa-and-stake.content' },
      { id: 'where-to-see-price', categoryId: 'swap', titleKey: 'knowledge.article.where-to-see-price.title', contentKey: 'knowledge.article.where-to-see-price.content' },
      { id: 'swap-limits-slippage', categoryId: 'swap', titleKey: 'knowledge.article.swap-limits-slippage.title', contentKey: 'knowledge.article.swap-limits-slippage.content' },
      { id: 'sell-rwa-for-usdt', categoryId: 'swap', titleKey: 'knowledge.article.sell-rwa-for-usdt.title', contentKey: 'knowledge.article.sell-rwa-for-usdt.content' },
    ],
  },
  {
    id: 'tokenomics',
    nameKey: 'knowledge.cat.economicModel',
    drawerIcon: 'PieChart',
    articles: [
      { id: 'protocol-fund-model', categoryId: 'tokenomics', titleKey: 'knowledge.article.protocol-fund-model.title', contentKey: 'knowledge.article.protocol-fund-model.content' },
      { id: 'treasury-and-community-pool', categoryId: 'tokenomics', titleKey: 'knowledge.article.treasury-and-community-pool.title', contentKey: 'knowledge.article.treasury-and-community-pool.content' },
      { id: 'lottery-5-percent-treasury', categoryId: 'tokenomics', titleKey: 'knowledge.article.lottery-5-percent-treasury.title', contentKey: 'knowledge.article.lottery-5-percent-treasury.content' },
      { id: 'tvl-data-verify', categoryId: 'tokenomics', titleKey: 'knowledge.article.tvl-data-verify.title', contentKey: 'knowledge.article.tvl-data-verify.content' },
      { id: 'treasury-address-public', categoryId: 'tokenomics', titleKey: 'knowledge.article.treasury-address-public.title', contentKey: 'knowledge.article.treasury-address-public.content' },
      { id: 'rwa-dynamic-sell-tax', categoryId: 'tokenomics', titleKey: 'knowledge.article.rwa-dynamic-sell-tax.title', contentKey: 'knowledge.article.rwa-dynamic-sell-tax.content' },
    ],
  },
  {
    id: 'security',
    nameKey: 'knowledge.cat.security',
    drawerIcon: 'Shield',
    articles: [
      { id: 'avoid-phishing', categoryId: 'security', titleKey: 'knowledge.article.avoid-phishing.title', contentKey: 'knowledge.article.avoid-phishing.content' },
      { id: 'protect-private-key', categoryId: 'security', titleKey: 'knowledge.article.protect-private-key.title', contentKey: 'knowledge.article.protect-private-key.content' },
      { id: 'audit-where', categoryId: 'security', titleKey: 'knowledge.article.audit-where.title', contentKey: 'knowledge.article.audit-where.content' },
      { id: 'fund-safety', categoryId: 'security', titleKey: 'knowledge.article.fund-safety.title', contentKey: 'knowledge.article.fund-safety.content' },
      { id: 'site-or-wallet-stuck', categoryId: 'security', titleKey: 'knowledge.article.site-or-wallet-stuck.title', contentKey: 'knowledge.article.site-or-wallet-stuck.content' },
      { id: 'tx-pending', categoryId: 'security', titleKey: 'knowledge.article.tx-pending.title', contentKey: 'knowledge.article.tx-pending.content' },
      { id: 'rewards-not-arrived', categoryId: 'security', titleKey: 'knowledge.article.rewards-not-arrived.title', contentKey: 'knowledge.article.rewards-not-arrived.content' },
      { id: 'change-wallet-history', categoryId: 'security', titleKey: 'knowledge.article.change-wallet-history.title', contentKey: 'knowledge.article.change-wallet-history.content' },
      { id: 'wallet-hacked-stake', categoryId: 'security', titleKey: 'knowledge.article.wallet-hacked-stake.title', contentKey: 'knowledge.article.wallet-hacked-stake.content' },
      { id: 'protocol-shutdown', categoryId: 'security', titleKey: 'knowledge.article.protocol-shutdown.title', contentKey: 'knowledge.article.protocol-shutdown.content' },
      { id: 'bsc-down-affect', categoryId: 'security', titleKey: 'knowledge.article.bsc-down-affect.title', contentKey: 'knowledge.article.bsc-down-affect.content' },
      { id: 'where-history-stake', categoryId: 'security', titleKey: 'knowledge.article.where-history-stake.title', contentKey: 'knowledge.article.where-history-stake.content' },
      { id: 'contact-support', categoryId: 'security', titleKey: 'knowledge.article.contact-support.title', contentKey: 'knowledge.article.contact-support.content' },
      { id: 'binance-builtin-browser-issues', categoryId: 'security', titleKey: 'knowledge.article.binance-builtin-browser-issues.title', contentKey: 'knowledge.article.binance-builtin-browser-issues.content' },
      { id: 'app-vs-system-browser-diff', categoryId: 'security', titleKey: 'knowledge.article.app-vs-system-browser-diff.title', contentKey: 'knowledge.article.app-vs-system-browser-diff.content' },
    ],
  },
  {
    id: 'compare',
    nameKey: 'knowledge.cat.compare',
    drawerIcon: 'HelpCircle',
    articles: [
      { id: 'compare-pancake', categoryId: 'compare', titleKey: 'knowledge.article.compare-pancake.title', contentKey: 'knowledge.article.compare-pancake.content' },
      { id: 'compare-other-platforms', categoryId: 'compare', titleKey: 'knowledge.article.compare-other-platforms.title', contentKey: 'knowledge.article.compare-other-platforms.content' },
      { id: 'referral-link-where', categoryId: 'compare', titleKey: 'knowledge.article.referral-link-where.title', contentKey: 'knowledge.article.referral-link-where.content' },
      { id: 'calculator-where', categoryId: 'compare', titleKey: 'knowledge.article.calculator-where.title', contentKey: 'knowledge.article.calculator-where.content' },
      { id: 'analytics-page-guide', categoryId: 'compare', titleKey: 'knowledge.article.analytics-page-guide.title', contentKey: 'knowledge.article.analytics-page-guide.content' },
      { id: 'market-page-guide', categoryId: 'compare', titleKey: 'knowledge.article.market-page-guide.title', contentKey: 'knowledge.article.market-page-guide.content' },
      { id: 'governance-page-readonly', categoryId: 'compare', titleKey: 'knowledge.article.governance-page-readonly.title', contentKey: 'knowledge.article.governance-page-readonly.content' },
    ],
  },
  {
    id: 'tutorial',
    nameKey: 'knowledge.cat.tutorial',
    drawerIcon: 'BookOpen',
    articles: [
      { id: 'beginner-full-tutorial', categoryId: 'tutorial', titleKey: 'knowledge.article.beginner-full-tutorial.title', contentKey: 'knowledge.article.beginner-full-tutorial.content' },
    ],
  },
]

export function getCategoryById(id: KnowledgeCategoryId): KnowledgeCategory | undefined {
  return knowledgeCategories.find((c) => c.id === id)
}

export function getArticleById(id: string): KnowledgeArticle | undefined {
  for (const cat of knowledgeCategories) {
    const art = cat.articles.find((a) => a.id === id)
    if (art) return art
  }
  return undefined
}

export function getAllArticles(): KnowledgeArticle[] {
  return knowledgeCategories.flatMap((c) => c.articles)
}
