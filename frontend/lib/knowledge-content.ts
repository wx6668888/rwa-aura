/**
 * 知识库文章标题与正文（多语言）
 * 与 knowledge-data 中的 article id 对应
 * 各语言优先使用完整文案（*-full），缺失时回退到简短版
 */
import { contentZhFull } from './knowledge-content-zh-full'
import { contentEnFull } from './knowledge-content-en-full'
import { contentKoFull } from './knowledge-content-ko-full'
import { contentJaFull } from './knowledge-content-ja-full'
import { contentEsFull } from './knowledge-content-es-full'
import { contentFrFull } from './knowledge-content-fr-full'
import { contentPtFull } from './knowledge-content-pt-full'
import { contentRuFull } from './knowledge-content-ru-full'
import { contentArFull } from './knowledge-content-ar-full'
import { contentHiFull } from './knowledge-content-hi-full'

export type KnowledgeLocale = 'zh' | 'en' | 'ko' | 'ja' | 'es' | 'fr' | 'pt' | 'ru' | 'ar' | 'hi'

export interface ArticleContent {
  title: string
  content: string
}

const contentZh: Record<string, ArticleContent> = {
  'what-is-rwa': {
    title: '什么是 RWA 协议？',
    content:
      'RWA Protocol 是运行在币安智能链（BSC）上的去中心化质押协议。\n\n用户能做什么：通过质押 USDT 或 RWA 代币，获得每日 RWA 静态收益；若满足节点等级条件，当下级用户充值（质押）时，您还可按本次质押金额的比例获得 USDT 推荐奖励。协议采用 50/50 资金模型：您质押的资金中，50% 进入国库储备，50% 进入社区奖励池。\n\n举例：您质押 10,000 USDT，则 5,000 USDT 进入国库、5,000 USDT 进入社区池；您按「有效质押」份额每日领取 RWA 收益。',
  },
  'how-to-start': {
    title: '如何开始使用？分几步？',
    content:
      '共四步：① 准备钱包 ② 充值 USDT（BEP-20）③ 连接本站 ④ 首次质押（最低 100 USDT 等值）。若有推荐人，在质押页「推荐人地址」栏填写其钱包地址（仅首次可填，填后永久绑定）。',
  },
  'supported-wallets': {
    title: '支持哪些钱包？',
    content:
      '支持所有兼容 BSC 的钱包：OKX Wallet、币安 Web3 钱包、MetaMask、TokenPocket、Trust Wallet 等。手机端建议用 OKX 或币安 App 内置浏览器打开本站，连接更稳定。',
  },
  'how-to-connect': {
    title: '如何连接钱包？',
    content:
      '打开网站 → 点击右上角「连接钱包」→ 选择您使用的钱包并授权。连接前请确认钱包已切换到 BSC 主网（Chain ID: 56），否则会提示不支持的链。',
  },
  'what-is-gas': {
    title: '什么是 Gas？为什么需要 BNB？',
    content:
      'Gas 是链上执行交易时消耗的矿工费。在 BSC 上用 BNB 支付。一次质押或提现通常约 0.001～0.003 BNB。建议钱包内保留至少 0.01～0.05 BNB。',
  },
  'rwa-token-what': {
    title: 'RWA 代币是什么？用来做什么？',
    content:
      'RWA 是协议代币，用于每日静态收益发放、RWA 质押、购买抽奖券、兑换等。可通过兑换页购买、质押收益、抽奖或 DEX 获得。',
  },
  'how-to-get-usdt': {
    title: '如何获得 USDT？',
    content: '从中心化交易所（如币安、OKX）用法币或其它币种购买 USDT，再通过「提币」提到自己的链上钱包。提币时必须选择 BEP-20（BSC 链）并填写钱包的 BSC 收款地址。',
  },
  'withdraw-from-exchange': {
    title: '如何从交易所提币到钱包？',
    content:
      '登录交易所 → 提币/提现 → 币种选 USDT → 网络选 BSC (BEP-20) → 收款地址填钱包 BSC 地址 → 输入数量并完成安全验证。到账通常几分钟到十几分钟。',
  },
  'choose-bsc-network': {
    title: '如何选择 BSC 网络？',
    content: '在钱包中添加或切换到 BSC 主网，Chain ID: 56。提币时选择 BSC (BEP-20)，不要选以太坊或其它链。',
  },
  'min-deposit': {
    title: '最低充值/质押金额是多少？',
    content: '最低 100 USDT 等值。建议先小额测试再大额操作。',
  },
  'what-is-staking': {
    title: '什么是质押？',
    content:
      '质押是将 USDT 或 RWA 存入协议合约，获得每日 RWA 收益的行为。您可选择锁仓期限（灵活/30/90/180/365 天），锁仓越长收益倍数越高。',
  },
  'usdt-vs-rwa-stake': {
    title: 'USDT 质押和 RWA 质押有什么区别？',
    content:
      'USDT 质押：存入 USDT，按日获得 RWA 收益。RWA 质押：存入 RWA 代币，同样按日获得 RWA 收益，并可选择锁仓期。两者都计入有效质押与节点等级。',
  },
  'lock-period-and-yield': {
    title: '锁仓期限有哪些？收益倍数怎么算？',
    content: '灵活 / 30 / 90 / 180 / 365 天。锁仓期越长，日息倍数越高（如 30 天约 1.04%，365 天约 2%）。具体以页面为准。',
  },
  'daily-yield-calc': {
    title: '每日收益如何计算？',
    content: '每日收益 = 有效质押金额 × 日息率（如 0.8%）× 锁仓倍数，以 RWA 代币形式发放。在收益计算器页可模拟计算。',
  },
  'when-rewards-arrive': {
    title: '收益什么时候到账？如何查看？',
    content: '每日 UTC 00:00 结算，到账可能有延迟。在仪表板「最近活动」和「提现」页可查看待提 RWA 与 USDT 奖励。',
  },
  'how-to-withdraw-rwa': {
    title: '如何提现 RWA 收益？',
    content: '进入「提现」页，在 RWA 提现卡片中输入金额或点 MAX，确认手续费与冷却期后提交交易。需支付少量 BNB 作为 Gas。',
  },
  'withdraw-cooldown-fee': {
    title: '提现冷却期和手续费是多少？',
    content: '当前立即到账型提现统一收取 8% 手续费，其中 3% 回购/销毁、3% 进入 Treasury、2% 留在社区池；stRWA 模式为 0% 手续费，但按 120% 铸造成锁仓 30 天的 stRWA。最低提现门槛统一为 100。',
  },
  'what-is-strwa-unlock': {
    title: '什么是 stRWA 解锁？如何操作？',
    content: 'stRWA 是质押凭证代币。在当前机制下，若提现时选择 stRWA 模式，会按 120% 铸造成锁仓 30 天的 stRWA；锁仓结束后再按页面提示进入解锁/转换流程。',
  },
  'claim-usdt-rewards': {
    title: '如何领取 USDT 推荐奖励？',
    content: '在「提现」页的 USDT 奖励卡片中点击「领取」，确认交易即可。推荐奖励在下级质押时自动计算并记入您的可领余额。',
  },
  'what-is-emergency-withdraw': {
    title: '什么是紧急提取？有什么后果？',
    content: '紧急提取现在只适用于未到期的锁仓 USDT 仓位。可退金额按已完成锁仓天数比例计算，再扣除统一 8% 手续费；返回的是 USDT，不会清空您的 RWA 待提收益，且对该仓位不可逆。',
  },
  'what-are-node-levels': {
    title: '什么是节点等级？L1～L9 分别是什么？',
    content:
      '节点等级代表您在推荐体系中的层级。等级越高，下级用户质押时您获得的 USDT 推荐奖励比例越高；L4 及以上还可参与项目分红。奖励比例按下级「本次质押金额」计算，不是按下级每日收益。',
  },
  'what-is-referrer': {
    title: '推荐人是什么？如何绑定？',
    content: '推荐人是您首次质押时在「推荐人地址」栏填写的上级钱包地址。该关系在第一笔质押上链后永久绑定，无法修改。',
  },
  'referral-reward-calc': {
    title: '推荐奖励如何计算？',
    content:
      '仅在下级用户质押时触发，按该用户本次质押金额的比例发放 USDT。多级采用压级（等级差）分配，总比例不超过 50%。单笔奖励不超过您自身总质押的 50%。',
  },
  'how-to-upgrade-node': {
    title: '如何升级节点等级？',
    content: '等级由系统根据团队总质押量、个人质押量等条件自动判定，无需手动申请。满足条件后自动升级，请在「节点与推荐」页查看当前等级与下一级条件。',
  },
  'lottery-rules': {
    title: '抽奖规则是什么？',
    content: '使用 RWA 购买抽奖券参与奖池。开奖采用链上随机数（如 Chainlink VRF），结果公开。每个奖池开奖时 5% 进国库，95% 按奖级分给中奖用户。',
  },
  'four-pools-diff': {
    title: '四种奖池（实时/周/月/年）有什么区别？',
    content: '实时奖：约 5 分钟一期；周奖：每周一 UTC 00:00；月奖：每月 1 日；年奖：每年 1 月 1 日。奖级与比例见幸运抽奖页。',
  },
  'draw-time-utc': {
    title: '开奖时间是怎么定的？（UTC）',
    content: '所有开奖时间按 UTC。实时奖每 5 分钟整点；周奖每周一 00:00 UTC；月奖每月 1 日 00:00 UTC；年奖每年 1 月 1 日 00:00 UTC。',
  },
  'buy-tickets-and-claim': {
    title: '如何购买彩票与领取奖金？',
    content: '在「幸运抽奖」页选择奖池与数量，使用 RWA 购票。中奖后在同一页面或指定入口领取奖金，具体以页面为准。',
  },
  'how-to-buy-rwa-with-usdt': {
    title: '如何用 USDT 购买 RWA？',
    content:
      '在「兑换」页：可用 BSC 上 USDT→RWA 协议兑换（先授权再换）；若只有波场 TRC20-USDT，可切到「TRON 充值」标签按订单地址转账，RWA 发到已连接的 BSC 钱包。',
  },
  'tron-usdt-buy-rwa-and-stake': {
    title: '如何用 TRON USDT 购买 RWA 并质押？',
    content:
      '兑换页「TRON 充值」：连接 BSC 钱包（收 RWA 的 0x 地址）→ 填金额生成 Tron 收款地址 → 在有效期内转 TRC20-USDT → 到账后 RWA 到 BSC 钱包；再到「质押」页自行做 RWA 质押（非自动质押）。预估约 1 RWA≈0.85 USDT，以实际清算为准。',
  },
  'where-to-see-price': {
    title: '在哪里查看 RWA 行情？',
    content: '在「兑换」页与仪表板可查看 RWA 价格。也可在 BSC 上的 DEX（如 PancakeSwap）查看实时行情。',
  },
  'protocol-fund-model': {
    title: '协议的资金模型是什么？（50/50）',
    content: '50% 进入国库储备，50% 进入社区奖励池。您质押的 USDT 按此比例分配，收益与推荐奖励从社区池发放。',
  },
  'treasury-and-community-pool': {
    title: '国库和社区池是什么？',
    content: '国库用于协议储备与投资；社区池用于每日 RWA 收益、推荐奖励等。两者在链上可查，保证透明。',
  },
  'lottery-5-percent-treasury': {
    title: '抽奖奖池中 5% 进国库是什么意思？',
    content: '每个奖池开奖时，奖池的 5% 转入协议国库，其余 95% 按奖级分给中奖用户。无人中奖的奖级奖金滚入下一期。',
  },
  'rwa-dynamic-sell-tax': {
    title: 'RWA 动态卖出税说明',
    content: '仅在 DEX 卖出 RWA 时收税：24 小时最多卖出 1 次；基础税率按加权平均持有天数（最高 4%）；卖出量超过总额 30% 时，每多 1% 加 1% 税，不封顶。税分配：国库 50%、销毁 25%、流动性 25%。',
  },
  'avoid-phishing': {
    title: '如何防范钓鱼网站？',
    content: '仅通过官方公布的域名访问，不要点击来历不明的链接。务必核对浏览器地址栏域名，不要在不信任的页面连接钱包或授权。',
  },
  'protect-private-key': {
    title: '私钥和助记词如何保管？',
    content: '切勿泄露给任何人或输入到任何网站。建议抄写在纸上并妥善保存，不要截图或存于联网设备。',
  },
  'tx-pending': {
    title: '交易一直待确认怎么办？',
    content: '可等待一段时间或 in 钱包中加速（提高 Gas）。若长时间未确认，可在 BSCScan 上查询交易状态。',
  },
  'rewards-not-arrived': {
    title: '奖励没到账怎么办？',
    content: '确认是否在冷却期、是否满足最低提现额。查看仪表板活动记录与链上交易。若超过 24 小时仍未到账，可联系客服并提供钱包地址。',
  },
  'contact-support': {
    title: '如何联系客服？',
    content: '通过官方 Telegram、Discord 或邮件联系。提供钱包地址与问题描述便于排查。',
  },
  'compare-pancake': {
    title: 'RWA 和 PancakeSwap 流动性挖矿有什么区别？',
    content: 'RWA 协议是质押 USDT/RWA 获得固定日息与推荐奖励；PancakeSwap LP 是提供流动性获得交易手续费分成与挖矿奖励。收益来源与风险不同。',
  },
  'compare-other-platforms': {
    title: 'RWA 和其他高收益质押平台有什么不同？',
    content: 'RWA 采用 50/50 资金模型、链上审计、多签与 TimeLock 等机制，注重透明与安全。具体差异请以官方说明为准。',
  },
  'referral-link-where': {
    title: '节点推荐链接在哪里生成？',
    content: '在「节点与推荐」页可查看您的推荐地址与推荐链接，分享给好友即可。好友首次质押时在推荐人地址栏填写您的地址。',
  },
  'calculator-where': {
    title: '收益计算器在哪里？怎么用？',
    content: '在导航栏「数据分析」或「计算器」进入收益计算器页，输入质押金额与锁仓期即可查看预估日收益与到期收益。',
  },
}

const contentEn: Record<string, ArticleContent> = {
  'what-is-rwa': {
    title: 'What is RWA Protocol?',
    content:
      'RWA Protocol is a decentralized staking protocol on Binance Smart Chain (BSC).\n\nYou can stake USDT or RWA to earn daily RWA rewards; if you meet node level requirements, you also earn USDT referral rewards when your referred users stake. The protocol uses a 50/50 model: 50% of your stake goes to Treasury, 50% to the community rewards pool.\n\nExample: Stake 10,000 USDT → 5,000 to Treasury, 5,000 to community pool; you earn daily RWA based on your effective stake.',
  },
  'how-to-start': {
    title: 'How do I get started?',
    content:
      'Four steps: ① Get a wallet ② Deposit USDT (BEP-20) ③ Connect on this site ④ First stake (min 100 USDT). If you have a referrer, enter their wallet address in the referral field on the stake page (one-time, permanent binding).',
  },
  'supported-wallets': {
    title: 'Which wallets are supported?',
    content:
      'All BSC-compatible wallets: OKX Wallet, Binance Web3, MetaMask, TokenPocket, Trust Wallet, etc. On mobile, use the in-app browser in OKX or Binance for a more stable connection.',
  },
  'how-to-connect': {
    title: 'How do I connect my wallet?',
    content:
      'Open the site → click "Connect Wallet" in the top right → choose your wallet and approve. Make sure your wallet is on BSC Mainnet (Chain ID: 56) before connecting.',
  },
  'what-is-gas': {
    title: 'What is Gas? Why do I need BNB?',
    content:
      'Gas is the fee for executing transactions on-chain. On BSC you pay in BNB. A typical stake or withdrawal uses about 0.001–0.003 BNB. Keep at least 0.01–0.05 BNB in your wallet.',
  },
  'rwa-token-what': {
    title: 'What is RWA token? What is it for?',
    content:
      'RWA is the protocol token used for daily yield, staking, lottery tickets, and swap. You can get it via the Swap page, staking rewards, lottery, or DEX.',
  },
  'how-to-get-usdt': {
    title: 'How do I get USDT?',
    content:
      'Buy USDT on a centralized exchange (e.g. Binance, OKX) with fiat or other coins, then withdraw to your on-chain wallet. Always select BEP-20 (BSC) and use your BSC receive address.',
  },
  'withdraw-from-exchange': {
    title: 'How do I withdraw from an exchange to my wallet?',
    content:
      'Log in to the exchange → Withdraw → Select USDT → Network: BSC (BEP-20) → Paste your wallet BSC address → Enter amount and complete verification. Arrival usually within minutes.',
  },
  'choose-bsc-network': {
    title: 'How do I select the BSC network?',
    content: 'Add or switch to BSC Mainnet in your wallet (Chain ID: 56). When withdrawing, choose BSC (BEP-20), not Ethereum or other networks.',
  },
  'min-deposit': {
    title: 'What is the minimum deposit/stake?',
    content: 'Minimum 100 USDT equivalent. Test with a small amount first.',
  },
  'what-is-staking': {
    title: 'What is staking?',
    content:
      'Staking means depositing USDT or RWA into the protocol contract to earn daily RWA rewards. You can choose lock periods (flexible / 30 / 90 / 180 / 365 days); longer locks give higher yield multipliers.',
  },
  'usdt-vs-rwa-stake': {
    title: 'What is the difference between USDT and RWA staking?',
    content:
      'USDT staking: deposit USDT, earn daily RWA. RWA staking: deposit RWA tokens, same daily RWA rewards, with optional lock period. Both count toward effective stake and node level.',
  },
  'lock-period-and-yield': {
    title: 'What lock periods exist? How is the yield multiplier set?',
    content: 'Flexible / 30 / 90 / 180 / 365 days. Longer lock = higher daily rate (e.g. 30d ~1.04%, 365d ~2%). See the stake page for current values.',
  },
  'daily-yield-calc': {
    title: 'How is daily yield calculated?',
    content: 'Daily yield = effective stake × daily rate (e.g. 0.8%) × lock multiplier, paid in RWA. Use the yield calculator page to simulate.',
  },
  'when-rewards-arrive': {
    title: 'When do rewards arrive? How can I check?',
    content: 'Settled daily at UTC 00:00; there may be a short delay. Check Dashboard "Recent Activity" and the Withdraw page for pending RWA and USDT rewards.',
  },
  'how-to-withdraw-rwa': {
    title: 'How do I withdraw RWA rewards?',
    content: 'Go to the Withdraw page, enter amount or MAX in the RWA card, confirm fee and cooldown, then submit. You need a small amount of BNB for gas.',
  },
  'withdraw-cooldown-fee': {
    title: 'What are the withdrawal cooldown and fee?',
    content: 'Immediate withdrawals now use a flat 8% exit fee split into 3% buyback/burn, 3% treasury, and 2% community pool. stRWA mode charges 0% fee but mints 120% as 30-day locked stRWA. The unified minimum withdrawal threshold is 100.',
  },
  'what-is-strwa-unlock': {
    title: 'What is stRWA unlock? How do I do it?',
    content: 'stRWA is the protocol staking receipt token. Under the current mechanism, choosing stRWA mode mints 120% as 30-day locked stRWA; after the lock ends, follow the Withdraw page to unlock or convert it.',
  },
  'claim-usdt-rewards': {
    title: 'How do I claim USDT referral rewards?',
    content: 'On the Withdraw page, in the USDT rewards card, click Claim and confirm the transaction. Referral rewards are credited when referred users stake.',
  },
  'what-is-emergency-withdraw': {
    title: 'What is emergency withdrawal? What are the consequences?',
    content: 'Emergency withdrawal now only applies to pre-maturity locked USDT positions. The refundable amount is proportional to completed lock days, then the standard 8% immediate-exit fee is applied. It returns USDT, does not clear your pending RWA rewards, and is irreversible for that selected position.',
  },
  'what-are-node-levels': {
    title: 'What are node levels? What are L1–L9?',
    content:
      'Node levels represent your tier in the referral system. Higher levels earn a larger share of USDT referral rewards when referred users stake; L4+ can also share in project dividends. Rewards are based on the referred user’s stake amount, not their daily yield.',
  },
  'what-is-referrer': {
    title: 'What is a referrer? How is it bound?',
    content: 'The referrer is the wallet address you enter in the "Referrer address" field when you stake for the first time. This is permanently bound after the first stake is confirmed on-chain.',
  },
  'referral-reward-calc': {
    title: 'How are referral rewards calculated?',
    content:
      'Triggered only when a referred user stakes; USDT is paid as a percentage of that stake. Multiple levels use a differential (level difference) share; total share is capped (e.g. 50%). Single reward is capped at 50% of your own total stake.',
  },
  'how-to-upgrade-node': {
    title: 'How do I upgrade my node level?',
    content: 'Levels are updated automatically based on team total stake, personal stake, etc. No manual application. Check the Nodes & Referral page for current level and next-tier requirements.',
  },
  'lottery-rules': {
    title: 'What are the lottery rules?',
    content: 'Use RWA to buy lottery tickets for the pools. Draws use on-chain randomness (e.g. Chainlink VRF). 5% of each pool goes to Treasury at draw; 95% is distributed to winners by prize tier.',
  },
  'four-pools-diff': {
    title: 'What is the difference between the four pools (real-time / weekly / monthly / annual)?',
    content: 'Real-time: about every 5 minutes; Weekly: Monday 00:00 UTC; Monthly: 1st of the month; Annual: 1 January. See the Lucky Draw page for prize tiers and ratios.',
  },
  'draw-time-utc': {
    title: 'When are the draw times? (UTC)',
    content: 'All draw times are in UTC. Real-time every 5 minutes; Weekly Monday 00:00 UTC; Monthly 1st 00:00 UTC; Annual 1 January 00:00 UTC.',
  },
  'buy-tickets-and-claim': {
    title: 'How do I buy tickets and claim prizes?',
    content: 'On the Lucky Draw page, choose pool and quantity, pay with RWA. Claim prizes in the same section when you win. See the page for exact flow.',
  },
  'how-to-buy-rwa-with-usdt': {
    title: 'How do I buy RWA with USDT?',
    content:
      'On Swap: use **USDT → RWA** on BSC (approve + swap), or open the **TRON Top-up** tab, send TRC20-USDT to the order address, and receive RWA on your connected BSC wallet.',
  },
  'tron-usdt-buy-rwa-and-stake': {
    title: 'How do I buy RWA with TRON USDT and stake?',
    content:
      'Swap → **TRON Top-up**: connect a BSC wallet (0x receives RWA) → enter amount → get a temporary Tron T… address → send TRC20-USDT within the countdown → RWA is issued on BSC; then go to **Stake** for RWA staking (not auto-staked). ~1 RWA ≈ 0.85 USDT estimate; actual settlement applies.',
  },
  'where-to-see-price': {
    title: 'Where can I see RWA price?',
    content: 'On the Swap page and Dashboard. You can also check DEXes on BSC (e.g. PancakeSwap) for live price.',
  },
  'protocol-fund-model': {
    title: 'What is the protocol fund model? (50/50)',
    content: '50% goes to Treasury reserve, 50% to the community rewards pool. Your staked USDT is split this way; yields and referral rewards are paid from the community pool.',
  },
  'treasury-and-community-pool': {
    title: 'What are Treasury and the community pool?',
    content: 'Treasury is used for protocol reserve and investment; the community pool pays daily RWA yields, referral rewards, etc. Both are on-chain and transparent.',
  },
  'lottery-5-percent-treasury': {
    title: 'What does "5% of the lottery pool to Treasury" mean?',
    content: 'When a pool is drawn, 5% of that pool is sent to the protocol Treasury; the remaining 95% is distributed to winners by prize tier. Unwon tiers roll over to the next round.',
  },
  'rwa-dynamic-sell-tax': {
    title: 'RWA dynamic sell tax',
    content: 'Tax applies only when selling RWA on DEX: at most 1 sell per 24h per address; base rate by weighted average holding days (max 4%); if sell amount exceeds 30% of total, each extra 1% adds 1% tax, no cap. Tax split: Treasury 50%, burn 25%, liquidity 25%.',
  },
  'avoid-phishing': {
    title: 'How do I avoid phishing sites?',
    content: 'Only use the official published domain. Do not follow unknown links. Always check the browser address bar; do not connect or approve on untrusted sites.',
  },
  'protect-private-key': {
    title: 'How should I store my private key and seed phrase?',
    content: 'Never share them or enter them on any website. Prefer writing them on paper and storing safely; avoid screenshots or storing on connected devices.',
  },
  'tx-pending': {
    title: 'What if my transaction is stuck pending?',
    content: 'Wait a bit or try speeding up (increase gas) in your wallet. For long delays, check the transaction status on BSCScan.',
  },
  'rewards-not-arrived': {
    title: 'What if my rewards did not arrive?',
    content: 'Check cooldown and minimum withdrawal. Look at Dashboard activity and on-chain transactions. If still missing after 24 hours, contact support with your wallet address.',
  },
  'contact-support': {
    title: 'How do I contact support?',
    content: 'Use official Telegram, Discord, or email. Provide your wallet address and a clear description of the issue.',
  },
  'binance-builtin-browser-issues': {
    title: 'Common issues in Binance/OKX in-app browser',
    content: 'If you see wallet connect failure, layout shift after typing, or no auto-return after authorization, it is usually caused by in-app WebView compatibility and multiple wallet provider injection conflicts. Reopen the page, ensure BSC mainnet, reconnect wallet, and compare with a system browser.',
  },
  'app-vs-system-browser-diff': {
    title: 'Why app browser and system browser may show different data',
    content: 'Short-term differences are usually caused by cache version, request timing, and indexing delay. On-chain status is the source of truth. Verify same address + same network and check TX hash on BSCScan.',
  },
  'compare-pancake': {
    title: 'How does RWA differ from PancakeSwap LP farming?',
    content: 'RWA is staking USDT/RWA for fixed daily yield and referral rewards; PancakeSwap LP is providing liquidity for trading fees and farm rewards. Different sources of yield and risk.',
  },
  'compare-other-platforms': {
    title: 'How does RWA differ from other high-yield staking platforms?',
    content: 'RWA uses a 50/50 model, on-chain audits, multi-sig and TimeLock, and aims for transparency and security. See official docs for full comparison.',
  },
  'referral-link-where': {
    title: 'Where do I get my referral link?',
    content: 'On the Nodes & Referral page you can see your referral address and link. Share it with friends; they enter your address in the referrer field when they first stake.',
  },
  'calculator-where': {
    title: 'Where is the yield calculator? How do I use it?',
    content: 'Open Analytics or Calculator from the nav. Enter stake amount and lock period to see estimated daily and total yield.',
  },
}

const contentKo: Record<string, ArticleContent> = {
  'what-is-rwa': {
    title: 'RWA 프로토콜이란?',
    content:
      'RWA Protocol은 바이낸스 스마트 체인(BSC) 기반 탈중앙 스테이킹 프로토콜입니다.\n\nUSDT 또는 RWA를 스테이킹하여 일일 RWA 보상을 받고, 노드 레벨 조건을 충족하면 추천인 스테이킹 시 USDT 추천 보상도 받습니다. 50/50 모델: 50%는 국고, 50%는 커뮤니티 보상 풀로 갑니다.\n\n예: 10,000 USDT 스테이킹 시 5,000 USDT는 국고, 5,000 USDT는 커뮤니티 풀; 유효 스테이킹 기준으로 일일 RWA를 받습니다.',
  },
  'how-to-start': {
    title: '어떻게 시작하나요?',
    content:
      '네 단계: ① 지갑 준비 ② USDT 입금(BEP-20) ③ 사이트 연결 ④ 첫 스테이킹(최소 100 USDT). 추천인이 있으면 스테이킹 페이지 추천인 주소란에 입력(최초 1회, 영구 바인딩).',
  },
  'supported-wallets': {
    title: '어떤 지갑을 지원하나요?',
    content:
      'BSC 호환 지갑 모두: OKX Wallet, 바이낸스 Web3, MetaMask, TokenPocket, Trust Wallet 등. 모바일에서는 OKX 또는 바이낸스 앱 내장 브라우저 사용을 권장합니다.',
  },
  'how-to-connect': {
    title: '지갑은 어떻게 연결하나요?',
    content:
      '사이트 열기 → 우측 상단 "지갑 연결" → 사용 중인 지갑 선택 후 승인. 연결 전 BSC 메인넷(Chain ID: 56)으로 설정되어 있는지 확인하세요.',
  },
  'what-is-gas': {
    title: 'Gas란? BNB가 왜 필요하나요?',
    content:
      '체인에서 트랜잭션을 실행할 때 쓰는 수수료입니다. BSC에서는 BNB로 지불합니다. 스테이킹/출금 1회당 약 0.001~0.003 BNB. 지갑에 최소 0.01~0.05 BNB를 유지하세요.',
  },
  'rwa-token-what': {
    title: 'RWA 토큰이란? 어디에 쓰나요?',
    content:
      'RWA는 프로토콜 토큰으로, 일일 수익 지급·스테이킹·추첨권 구매·스왑 등에 사용됩니다. 스왑 페이지, 스테이킹 수익, 추첨, DEX에서 획득할 수 있습니다.',
  },
  'how-to-get-usdt': {
    title: 'USDT는 어떻게 받나요?',
    content:
      '중앙화 거래소(바이낸스, OKX 등)에서 법정화폐나 다른 코인으로 USDT를 구매한 뒤, 출금 시 BEP-20(BSC)을 선택하고 BSC 수신 주소를 입력하세요.',
  },
  'withdraw-from-exchange': {
    title: '거래소에서 지갑으로 어떻게 출금하나요?',
    content:
      '거래소 로그인 → 출금 → USDT 선택 → 네트워크: BSC (BEP-20) → 지갑 BSC 주소 붙여넣기 → 금액 입력 및 인증 완료. 보통 몇 분 내 도착합니다.',
  },
  'choose-bsc-network': {
    title: 'BSC 네트워크는 어떻게 선택하나요?',
    content: '지갑에서 BSC 메인넷(Chain ID: 56)을 추가하거나 전환하세요. 출금 시 BSC (BEP-20)를 선택하고 이더리움 등 다른 네트워크를 선택하지 마세요.',
  },
  'min-deposit': {
    title: '최소 입금/스테이킹 금액은?',
    content: '최소 100 USDT 상당. 먼저 소액으로 테스트해 보세요.',
  },
  'what-is-staking': {
    title: '스테이킹이란?',
    content:
      'USDT 또는 RWA를 프로토콜 계약에 예치하여 일일 RWA 보상을 받는 것입니다. 락 기간(유연/30/90/180/365일)을 선택할 수 있으며, 기간이 길수록 수익 배율이 높아집니다.',
  },
  'usdt-vs-rwa-stake': {
    title: 'USDT 스테이킹과 RWA 스테이킹의 차이는?',
    content:
      'USDT 스테이킹: USDT 예치 후 일일 RWA 수령. RWA 스테이킹: RWA 토큰 예치, 동일한 일일 RWA 보상 및 락 기간 선택. 둘 다 유효 스테이킹 및 노드 레벨에 반영됩니다.',
  },
  'lock-period-and-yield': {
    title: '락 기간은 어떻게 되나요? 수익 배율은?',
    content: '유연 / 30 / 90 / 180 / 365일. 기간이 길수록 일일 수익률이 높음(예: 30일 약 1.04%, 365일 약 2%). 스테이킹 페이지에서 확인하세요.',
  },
  'daily-yield-calc': {
    title: '일일 수익은 어떻게 계산되나요?',
    content: '일일 수익 = 유효 스테이킹 × 일일 수익률(예: 0.8%) × 락 배율, RWA로 지급. 수익 계산기 페이지에서 시뮬레이션할 수 있습니다.',
  },
  'when-rewards-arrive': {
    title: '보상은 언제 도착하나요? 어떻게 확인하나요?',
    content: '매일 UTC 00:00에 정산되며 약간의 지연이 있을 수 있습니다. 대시보드 "최근 활동" 및 출금 페이지에서 대기 중인 RWA·USDT 보상을 확인하세요.',
  },
  'how-to-withdraw-rwa': {
    title: 'RWA 보상은 어떻게 출금하나요?',
    content: '출금 페이지로 이동 → RWA 카드에서 금액 또는 MAX 입력 → 수수료·쿨다운 확인 후 제출. Gas용 BNB가 소량 필요합니다.',
  },
  'withdraw-cooldown-fee': {
    title: '출금 쿨다운과 수수료는?',
    content: '즉시 출금 고정 8% 수수료(3% 소각/바이백, 3% Treasury, 2% 커뮤니티 풀). stRWA 모드는 0% 수수료·120% 30일 잠금. 최소 출금 100. RWA 보상 출금은 24시간 쿨다운.',
  },
  'what-is-strwa-unlock': {
    title: 'stRWA 언락이란? 어떻게 하나요?',
    content: 'stRWA는 스테이킹 증명입니다. 락 기간 후 언락을 요청해 stRWA를 RWA로 전환할 수 있습니다. 대기·쿨다운이 있으니 출금 페이지를 참고하세요.',
  },
  'claim-usdt-rewards': {
    title: 'USDT 추천 보상은 어떻게 받나요?',
    content: '출금 페이지의 USDT 보상 카드에서 "받기"를 클릭하고 트랜잭션을 승인하면 됩니다. 추천 보상은 추천인이 스테이킹할 때 자동으로 적립됩니다.',
  },
  'what-is-emergency-withdraw': {
    title: '비상 출금이란? 결과는?',
    content: '미만료 로킹 USDT에만 적용. 완료된 락 일수 비율만큼 환불 후 8% 수수료 차감, USDT로 반환. RWA 대기 보상은 삭제되지 않으며, 해당 포지션만 비가역 종료.',
  },
  'what-are-node-levels': {
    title: '노드 레벨이란? L1~L9는?',
    content:
      '노드 레벨은 추천 체계 내 등급입니다. 레벨이 높을수록 추천인이 스테이킹할 때 받는 USDT 추천 보상 비율이 높아지며, L4 이상은 프로젝트 배당에 참여할 수 있습니다. 보상은 추천인의 "해당 스테이킹 금액" 기준이며, 일일 수익 기준이 아닙니다.',
  },
  'what-is-referrer': {
    title: '추천인이란? 어떻게 바인딩되나요?',
    content: '추천인은 첫 스테이킹 시 "추천인 주소"란에 입력한 상위 지갑 주소입니다. 첫 스테이킹이 체인에 확인된 후 영구 바인딩됩니다.',
  },
  'referral-reward-calc': {
    title: '추천 보상은 어떻게 계산되나요?',
    content:
      '추천인이 스테이킹할 때만 발생하며, 해당 스테이킹 금액의 일정 비율로 USDT가 지급됩니다. 다단계는 등급차로 배분되며 총 비율에 상한이 있습니다(예: 50%). 단건 보상은 본인 총 스테이킹의 50%를 넘지 않습니다.',
  },
  'how-to-upgrade-node': {
    title: '노드 레벨은 어떻게 올리나요?',
    content: '팀 총 스테이킹, 개인 스테이킹 등 조건에 따라 시스템이 자동으로 레벨을 갱신합니다. 수동 신청 없음. 노드·추천 페이지에서 현재 레벨과 다음 단계 조건을 확인하세요.',
  },
  'lottery-rules': {
    title: '추첨 규칙은?',
    content: 'RWA로 추첨권을 구매해 풀에 참여합니다. 추첨은 온체인 난수(예: Chainlink VRF)로 진행됩니다. 각 풀 추첨 시 5%는 국고로, 95%는 당첨 등급별로 분배됩니다.',
  },
  'four-pools-diff': {
    title: '네 가지 풀(실시간/주/월/연)의 차이는?',
    content: '실시간: 약 5분마다; 주간: 매주 월요일 00:00 UTC; 월간: 매월 1일; 연간: 매년 1월 1일. 럭키 드로우 페이지에서 등급·비율을 확인하세요.',
  },
  'draw-time-utc': {
    title: '추첨 시각은 어떻게 정해지나요? (UTC)',
    content: '모든 추첨 시각은 UTC 기준입니다. 실시간은 5분마다; 주간 월요일 00:00 UTC; 월간 매월 1일 00:00 UTC; 연간 매년 1월 1일 00:00 UTC.',
  },
  'buy-tickets-and-claim': {
    title: '추첨권 구매와 당첨금 수령은?',
    content: '럭키 드로우 페이지에서 풀과 수량을 선택하고 RWA로 결제하세요. 당첨 시 같은 페이지에서 수령. 자세한 절차는 페이지를 참고하세요.',
  },
  'how-to-buy-rwa-with-usdt': {
    title: 'USDT로 RWA는 어떻게 사나요?',
    content: '스왑 페이지에서 지갑 연결 → USDT → RWA 선택 → 금액 입력 후 승인. USDT 승인을 먼저 해야 할 수 있습니다.',
  },
  'where-to-see-price': {
    title: 'RWA 시세는 어디서 보나요?',
    content: '스왑 페이지와 대시보드에서 확인할 수 있습니다. BSC DEX(예: PancakeSwap)에서도 실시간 시세를 볼 수 있습니다.',
  },
  'protocol-fund-model': {
    title: '프로토콜 자금 모델은? (50/50)',
    content: '50%는 국고 준비금, 50%는 커뮤니티 보상 풀로 갑니다. 스테이킹한 USDT가 이 비율로 배분되며, 수익과 추천 보상은 커뮤니티 풀에서 지급됩니다.',
  },
  'treasury-and-community-pool': {
    title: '국고와 커뮤니티 풀이란?',
    content: '국고는 프로토콜 준비금 및 투자에, 커뮤니티 풀은 일일 RWA 수익·추천 보상 등에 사용됩니다. 둘 다 온체인에서 확인 가능해 투명합니다.',
  },
  'lottery-5-percent-treasury': {
    title: '추첨 풀의 5%가 국고로 간다는 뜻은?',
    content: '각 풀 추첨 시 해당 풀의 5%가 프로토콜 국고로 이전되고, 나머지 95%는 당첨 등급별로 당첨자에게 분배됩니다. 당첨자 없는 등급은 다음 회차로 이월됩니다.',
  },
  'rwa-dynamic-sell-tax': {
    title: 'RWA 동적 매도세 설명',
    content: 'DEX에서 RWA 매도 시에만 세금: 24시간당 1회 매도 제한; 가중 평균 보유 일수에 따른 기본세율(최대 4%); 매도량이 총량의 30% 초과 시 1%당 1% 추가, 상한 없음. 세금 배분: 국고 50%, 소각 25%, 유동성 25%.',
  },
  'avoid-phishing': {
    title: '피싱 사이트를 어떻게 피하나요?',
    content: '공식으로 공개된 도메인만 사용하세요. 알 수 없는 링크를 클릭하지 마세요. 브라우저 주소창을 항상 확인하고, 신뢰할 수 없는 사이트에서는 지갑 연결·승인을 하지 마세요.',
  },
  'protect-private-key': {
    title: '개인키와 시드 구문은 어떻게 보관하나요?',
    content: '누구에게도 알려주거나 어떤 웹사이트에도 입력하지 마세요. 종이에 적어 안전하게 보관하고, 스크린샷이나 연동 기기에 저장하지 마세요.',
  },
  'tx-pending': {
    title: '트랜잭션이 계속 대기 중이에요.',
    content: '잠시 기다리거나 지갑에서 가스 상향(스피드 업)을 시도하세요. 오래 걸리면 BSCScan에서 트랜잭션 상태를 확인하세요.',
  },
  'rewards-not-arrived': {
    title: '보상이 안 들어왔어요.',
    content: '쿨다운과 최소 출금액을 확인하세요. 대시보드 활동 내역과 온체인 트랜잭션을 확인하세요. 24시간이 지나도 없으면 지갑 주소와 함께 고객 지원에 문의하세요.',
  },
  'contact-support': {
    title: '고객 지원은 어떻게 연락하나요?',
    content: '공식 텔레그램, 디스코드 또는 이메일을 이용하세요. 지갑 주소와 문제 설명을 함께 보내주세요.',
  },
  'compare-pancake': {
    title: 'RWA와 PancakeSwap LP 파밍의 차이는?',
    content: 'RWA는 USDT/RWA 스테이킹으로 고정 일일 수익과 추천 보상을 받는 것이고, PancakeSwap LP는 유동성 공급으로 거래 수수료와 파밍 보상을 받는 것입니다. 수익원과 위험이 다릅니다.',
  },
  'compare-other-platforms': {
    title: 'RWA와 다른 고수익 스테이킹 플랫폼의 차이는?',
    content: 'RWA는 50/50 모델, 온체인 감사, 멀티시그·타임락 등을 사용하며 투명성과 보안을 중시합니다. 자세한 차이는 공식 문서를 참고하세요.',
  },
  'referral-link-where': {
    title: '추천 링크는 어디서 만들나요?',
    content: '노드·추천 페이지에서 추천 주소와 링크를 확인할 수 있습니다. 친구에게 공유하고, 친구가 첫 스테이킹 시 추천인 주소란에 귀하의 주소를 입력하면 됩니다.',
  },
  'calculator-where': {
    title: '수익 계산기는 어디 있나요? 어떻게 쓰나요?',
    content: '네비의 "분석" 또는 "계산기"에서 수익 계산기 페이지로 이동해 스테이킹 금액과 락 기간을 입력하면 예상 일일·만기 수익을 볼 수 있습니다.',
  },
}

/** 各语言：完整文案覆盖简短版；新语言缺条时回退英文 */
const contentZhMerged: Record<string, ArticleContent> = { ...contentZh, ...contentZhFull }
const contentEnMerged: Record<string, ArticleContent> = { ...contentEn, ...contentEnFull }
const contentKoMerged: Record<string, ArticleContent> = { ...contentKo, ...contentKoFull }

const fallbackEn = contentEnMerged

const criticalFallbackArticleIds = [
  'withdraw-cooldown-fee',
  'what-is-strwa-unlock',
  'what-is-emergency-withdraw',
  'referral-reward-calc',
] as const

function withCriticalEnglishFallback(
  localized: Record<string, ArticleContent>
): Record<string, ArticleContent> {
  const merged = { ...localized }

  for (const articleId of criticalFallbackArticleIds) {
    const current = merged[articleId]
    const fallback = fallbackEn[articleId]
    const missing =
      !current ||
      !current.title?.trim() ||
      !current.content?.trim()

    if (missing && fallback) {
      merged[articleId] = fallback
    }
  }

  return merged
}

function getKnowledgeLocale(locale: string): KnowledgeLocale {
  const map: Record<string, KnowledgeLocale> = {
    zh: 'zh', en: 'en', ko: 'ko', ja: 'ja', es: 'es', fr: 'fr', pt: 'pt', ru: 'ru', ar: 'ar', hi: 'hi',
  }
  return map[locale] ?? 'en'
}

const byLocale: Record<KnowledgeLocale, Record<string, ArticleContent>> = {
  zh: contentZhMerged,
  en: contentEnMerged,
  ko: withCriticalEnglishFallback(contentKoMerged),
  ja: withCriticalEnglishFallback({ ...fallbackEn, ...contentJaFull }),
  es: withCriticalEnglishFallback({ ...fallbackEn, ...contentEsFull }),
  fr: withCriticalEnglishFallback({ ...fallbackEn, ...contentFrFull }),
  pt: withCriticalEnglishFallback({ ...fallbackEn, ...contentPtFull }),
  ru: withCriticalEnglishFallback({ ...fallbackEn, ...contentRuFull }),
  ar: withCriticalEnglishFallback({ ...fallbackEn, ...contentArFull }),
  hi: withCriticalEnglishFallback({ ...fallbackEn, ...contentHiFull }),
}

export function getArticleContent(
  locale: string,
  articleId: string
): ArticleContent | undefined {
  const lang = getKnowledgeLocale(locale)
  const content = byLocale[lang][articleId]
  if (content) return content
  return byLocale.en[articleId] ?? byLocale.zh[articleId]
}
