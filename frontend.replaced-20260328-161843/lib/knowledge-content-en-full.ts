/**
 * Knowledge base full content – English (translated from 知识库完整文案-中文)
 */
export const contentEnFull: Record<string, { title: string; content: string }> = {
  'what-is-rwa': {
    title: 'What is RWA Protocol?',
    content: `RWA Protocol is a decentralized staking protocol on BNB Smart Chain (BSC).

**What you can do**: Stake USDT or RWA to earn daily RWA yield; if you meet node tier conditions, when **referred users stake (deposit)**, you also earn USDT referral rewards based on that stake amount (see "Nodes & Referrals"). The protocol uses a **50/50 fund model**: 50% of your staked funds go to the treasury, 50% to the community reward pool for daily yield and referral/node rewards.

**Example**: You stake 10,000 USDT → 5,000 to treasury, 5,000 to community pool; you earn daily RWA yield on your effective stake. If you have referrals, when they **stake**, you earn USDT rewards by tier.`,
  },
  'rwa-token-what': {
    title: 'What is RWA token? What is it for?',
    content: `**RWA** is the **protocol token** of RWA Protocol on BSC (ERC-20/BEP-20), used for yield, staking, and key features.

**Main uses**:

| Use | Description |
|-----|-------------|
| **Daily yield** | After staking USDT or RWA, yield is paid in **RWA** (e.g. base 0.8% daily × lock multiplier). Withdraw on the Withdraw page. |
| **RWA staking** | Stake **RWA** to receive stRWA and daily RWA yield; choose lock (Flexible/30/90/180/365 days). After lock, unlock to get RWA back. |
| **Lottery tickets** | On the Lottery page, use **RWA** to buy tickets for real-time/weekly/monthly/yearly pools. |
| **Swap** | On the Swap page, buy **RWA** with **USDT**; you can also trade RWA on supported DEXes. |

**How to get RWA**: ① Buy with USDT on the Swap page; ② Earn from staking (paid in RWA); ③ Lottery wins; ④ Buy from other users or DEX (if available). RWA price fluctuates; only invest what you can afford to lose.`,
  },
  'how-to-start': {
    title: 'How do I get started? Steps?',
    content: `**Four steps** for beginners:

**① Get a wallet**  
Install OKX, Binance app, or MetaMask, create/import a Web3 wallet, and back up your seed phrase.

**② Fund USDT**  
Send USDT to the wallet as **BEP-20 (BSC)**. On Binance withdraw, choose "BSC (BEP-20)" and your wallet’s BSC address. Try a small amount first (e.g. 100–200 USDT).

**③ Connect**  
Open the RWA Protocol site, click "Connect wallet", choose your wallet and approve. Your shortened address (e.g. 0x1234…5678) will show.

**④ First stake**  
Go to Stake, enter amount (**min 100 USDT equivalent**), choose lock period; if you have a referrer, enter their wallet address (only once, binding is permanent). Approve, then stake and confirm. Wait for confirmation.

**Example**: Alice stakes 500 USDT with 30-day lock and referrer A; after confirm she earns daily RWA and A gets one-time USDT referral reward on that 500 USDT stake.`,
  },
  'supported-wallets': {
    title: 'Which wallets are supported?',
    content: `All **BSC-compatible** wallets, e.g.:

- **OKX Wallet** (app or extension)
- **Binance Web3 Wallet** (in Binance app)
- **MetaMask** (extension or app)
- **TokenPocket**, **Trust Wallet**, etc.
- Any WalletConnect-supported wallet

**Tip**: On mobile, open the site in **OKX or Binance in-app browser** for more stable connection.`,
  },
  'how-to-connect': {
    title: 'How do I connect my wallet?',
    content: `**Steps**: Open site → click "Connect wallet" (top right) → choose your wallet (MetaMask, OKX, Binance, etc.) → in the wallet popup click "Authorize" or "Connect" → your address (e.g. 0x1234…5678) will appear.

**Important**: Ensure the wallet is on **BSC mainnet** (Chain ID: 56). If you’re on Ethereum or another network, the site will show "Unsupported network"; add or switch to BSC in the wallet, then connect.`,
  },
  'what-is-gas': {
    title: 'What is Gas? Why do I need BNB?',
    content: `**Gas** is the fee to execute a transaction on-chain. On BSC you pay in **BNB**, not USDT or RWA.

**Typical cost**: One stake, one withdraw, or one approve is about **0.001–0.003 BNB** (a few cents). If you only have USDT and no BNB, the transaction will fail with "Insufficient gas".

**Tip**: Keep at least **0.01–0.05 BNB** in the wallet for multiple actions (e.g. first time: approve + stake ≈ 0.004 BNB; each withdraw ≈ 0.001–0.003 BNB).`,
  },
  'how-to-get-usdt': {
    title: 'How do I get USDT?',
    content: `Buy USDT on a **centralized exchange** (e.g. Binance, OKX, Huobi) with fiat or other coins, then **withdraw** to your on-chain wallet.

**Critical**: Withdraw on **BEP-20 (BSC)** and use your wallet’s **BSC receive address**. If you use ERC-20 (Ethereum) or another network, funds won’t work on this site and cross-chain recovery is complex and risky. **Example**: You have 1000 USDT on Binance; withdraw with network "BSC (BEP-20)", address = your MetaMask BSC address, amount 500; after arrival you can stake on RWA Protocol.`,
  },
  'withdraw-from-exchange': {
    title: 'How do I withdraw from an exchange to my wallet?',
    content: `**Steps** (typical exchange):

1. Log in, find "Withdraw" or "Withdraw crypto".
2. Select **USDT**.
3. Network: **BSC (BEP-20)** or "BNB Smart Chain" (must be BSC).
4. Recipient: paste your wallet’s **BSC address** (0x, 42 chars) from e.g. MetaMask.
5. Enter amount, check fee and net amount, complete 2FA/email verification.

**Arrival**: Usually a few to tens of minutes. **Example**: Withdraw 500 USDT, fee ~0.8–1 USDT, you receive ~499 USDT. Try 100–200 USDT first to confirm.`,
  },
  'choose-bsc-network': {
    title: 'How do I select the BSC network?',
    content: `In your wallet, add or switch to **BSC mainnet**. Common settings:

- **Network name**: BNB Smart Chain or BSC
- **Chain ID**: **56**
- **RPC URL**: From BSC docs or wallet’s default list
- **Block explorer**: https://bscscan.com

This site only supports BSC mainnet (and any configured testnet). If you’re on Ethereum (Chain ID 1) or another chain, the page will ask you to switch to BSC. In MetaMask: top network name → Add network → enter the above; in OKX/Binance app choose "BSC mainnet".`,
  },
  'min-deposit': {
    title: 'What is the minimum deposit/stake?',
    content: `Minimum per stake is **100 USDT equivalent**. Whether you stake USDT or RWA, the system converts to USDT equivalent at current price.

**Example**:  
- USDT: minimum 100 USDT.  
- RWA: if RWA = $0.50, you need at least 100 ÷ 0.5 = **200 RWA** to pass the check.  
Below 100 USDT equivalent cannot be submitted.`,
  },
  'what-is-staking': {
    title: 'What is staking?',
    content: `**Staking** means sending USDT or RWA to the protocol contract to earn "daily RWA yield" and (when eligible) "referral/node USDT rewards".

**Where funds go**: Your amount is split **50% treasury, 50% community pool**. You don’t "get back" the treasury share; you receive RWA yield over time via your stake. After **cooldown, minimum withdraw, fee** rules, you can withdraw on the Withdraw page.

**Example**: You stake 2,000 USDT → 1,000 to treasury, 1,000 to community pool; you earn ~2,000×0.8% = 16 USDT equivalent in RWA per day (at that day’s RWA price), and can later withdraw RWA or claim USDT rewards.`,
  },
  'usdt-vs-rwa-stake': {
    title: 'What’s the difference between USDT and RWA staking?',
    content: `**USDT staking**: You send **USDT**; the contract pays **RWA** as daily yield (e.g. 0.8% × lock multiplier). If you have a referrer and meet node rules, they get **USDT** referral reward on **each of your stakes** (not a cut of your daily yield). Same 50/50 split.

**RWA staking**: You send **RWA**; you get **stRWA** and daily **RWA** yield. You can choose **lock** (30/90/180/365 days); after lock, "Unlock stRWA" returns RWA principal. Same 50/50.

**Example**: 1,000 USDT flexible → ~8 USDT equivalent RWA per day, no locked principal. 1,000 USDT equivalent in RWA with 90-day lock → higher daily yield (e.g. +60%) but principal locked 90 days, then unlock to RWA.`,
  },
  'lock-period-and-yield': {
    title: 'What lock periods exist? How is yield multiplied?',
    content: `Lock options and bonus (current protocol):

| Lock | Bonus vs flexible | Note |
|------|-------------------|------|
| Flexible | None | Unlocked principal can be withdrawn anytime |
| 30 days | +30% | Principal locked 30 days |
| 90 days | +60% | Principal locked 90 days |
| 180 days | +100% | Principal locked 180 days |
| 365 days | +150% | Principal locked 365 days |

**Formula**: Daily yield ≈ stake (USDT equivalent) × **0.8%** × (1 + lock bonus), paid in RWA at that day’s price.

**Example**: 10,000 USDT flexible → 80 USDT equivalent RWA/day. 10,000 USDT, 180-day lock (+100%) → 160 USDT equivalent RWA/day; that 10,000 stRWA cannot be unlocked until 180 days. See Stake page and contract for exact terms.`,
  },
  'daily-yield-calc': {
    title: 'How is daily yield calculated?',
    content: `**Daily RWA yield ≈ your stake (USDT equivalent) × 0.8% × lock multiplier**

Paid in RWA at **that day’s price**. Lock multiplier: flexible=1, 30d≈1.3, 90d≈1.6, 180d=2, 365d=2.5 (check UI).

**Example**: Stake **5,000 USDT**, **90-day lock** (+60%), RWA = **$1**.  
  Daily: 5,000 × 0.8% × 1.6 = 64 USDT equivalent → **64 RWA/day**.  
  If RWA = **$0.50**, then 64 ÷ 0.5 = **128 RWA/day**.

Referral/node rewards are in **USDT** and claimed separately on the Withdraw page. See contract and UI for exact numbers.`,
  },
  'when-rewards-arrive': {
    title: 'When do rewards arrive? How do I check?',
    content: `**Settlement**: Once per day at **UTC 0:00** (e.g. 8:00 Beijing); on-chain delay can be a few minutes up to **~2 hours**.

**Where to see**:  
- **Dashboard** → "Recent activity": daily yield.  
- **Withdraw page**: "Withdrawable RWA" and "Claimable USDT".

**Example**: You stake on Mar 5; after Mar 6 UTC 0:00 settlement, you’ll usually see Mar 6 yield around 8:00–10:00 Beijing time. If nothing after 24h, confirm you didn’t trigger emergency withdraw, then contact support with your wallet address.`,
  },
  'how-to-withdraw-rwa': {
    title: 'How do I withdraw RWA yield?',
    content: `On the **Withdraw** page, the **RWA withdraw** card shows:  
- **Settled RWA yield** (from USDT and RWA staking);  
- Any **unlocked RWA principal** from flexible RWA staking.

Click "Withdraw" → confirm in wallet and pay Gas (small BNB).

**Current withdraw flow**: All **immediate withdrawals** now use a flat **8% exit fee**. That 8% is split into **3% buyback/burn**, **3% treasury**, and **2% community pool**. If you choose **stRWA mode**, there is **no fee**; instead **120%** of the amount is minted as **30-day locked stRWA**.

**Important**: The Withdraw page now separates **reward withdrawal** from **principal withdrawal**.  
- The reward card is for settled **RWA rewards** only.  
- The principal actions section handles **flexible USDT principal**, **matured locked USDT principal**, **flexible RWA principal**, and **matured locked RWA principal**.  
- **Matured locked RWA principal** can choose **immediate exit** or **stRWA mode**; **USDT principal** exits immediately with the standard fee split.  

**Example**: If you have 300 RWA rewards and 200 RWA flexible principal, the reward card handles the 300 RWA rewards, while the principal section handles the 200 RWA principal. If a matured locked RWA position is withdrawn in **stRWA mode**, the principal amount mints at **120%** as locked stRWA for 30 days.`,
  },
  'withdraw-cooldown-fee': {
    title: 'What are the withdraw cooldown and fee?',
    content: `Rules (current protocol):

| Item | Rule |
|------|------|
| Min withdraw | At least **100** (RWA or USDT principal equivalent, depending on the path) |
| Cooldown | **24 hours** between two RWA withdraws; button shows countdown |
| Immediate exit fee | **8%** total: **3% buyback/burn + 3% treasury + 2% community pool** |
| stRWA mode | **0% fee**, mint **120% stRWA**, locked **30 days** |
| Gas | Small BNB for BSC (≈ 0.001–0.003 BNB) |

**Example**: Withdraw **100 RWA** immediately → user receives **92 RWA**, while **3 RWA** goes to buyback/burn, **3 RWA** to treasury, and **2 RWA** stays in the community pool. If you choose **stRWA mode**, you receive **120 stRWA** with a **30-day lock** and no immediate fee. If the available amount is below **100**, wait until it reaches the unified minimum.`,
  },
  'what-is-strwa-unlock': {
    title: 'What is stRWA unlock? How do I do it?',
    content: `**stRWA** is the staking receipt token used by the protocol. Under the new mechanism, if you choose **stRWA mode** during withdrawal, the protocol mints **120%** as **30-day locked stRWA** instead of paying out immediately.

**Steps**: Withdraw page → choose **stRWA mode** or open the **stRWA unlock** area → check your locked amount and unlock time → when the lock is over, follow the page instructions to convert/unlock according to the live contract flow.

**Example**: You withdraw **100 RWA** in stRWA mode → you receive **120 stRWA**, but it remains locked for **30 days** before it can move through the normal unlock/conversion path shown on the Withdraw page.`,
  },
  'claim-usdt-rewards': {
    title: 'How do I claim USDT referral rewards?',
    content: `Referral/node **rewards are in USDT** on-chain. On the Withdraw page, the **USDT rewards** card shows the claimable amount. Click "Claim" → confirm in wallet and pay Gas; USDT is sent to your wallet.

**Note**: Rewards are paid when **referred users stake** (each stake), by your tier rate on that stake amount, not on their daily yield. **Example**: Your direct referral stakes 1,000 USDT, you’re L3 (8%) → you get 1,000×8% = **80 USDT**; it adds to your claimable balance; each claim costs a little BNB Gas.`,
  },
  'what-is-emergency-withdraw': {
    title: 'What is emergency withdraw? What are the consequences?',
    content: `**Emergency withdraw** is now a special exit path only for **locked USDT positions** that have **not matured yet**. It is still **irreversible** for that selected locked position.

**Logic**: Refundable principal is based on **completed full lock days**. Formula:  
gross refund = contract-side principal × completedDays / totalLockDays  
Then the standard **8% immediate-exit fee** applies to that gross refund. The fee split is still **3% buyback/burn + 3% treasury + 2% community pool**.

**Important note**: The new emergency flow returns **USDT**, not RWA. It also does **not** clear your pending **RWA rewards**; it only closes the chosen locked USDT principal position.

**Example**: You stake with a **30-day lock** and trigger emergency withdraw after **3 completed days**. Refund progress is **3 / 30 = 10%**. So only **10% of the contract-side principal** is eligible before the 8% fee is deducted. If you need normal exit and the lock has already ended, use the regular principal-withdraw flow instead.`,
  },
  'what-are-node-levels': {
    title: 'What are node levels? What are L1–L9?',
    content: `Node levels (**L1–L9**) are your tier in the referral system. Higher tier → higher **referral reward %** when **referred users stake**; L4+ can join **protocol revenue share**.

**Important**: "Reward %" in the table is on **that user’s stake amount**, not on their daily 0.8% RWA yield. Referral rewards are **paid once per stake**, not daily.

Table (check Nodes & Referrals page):

| Level | Name | Team stake (USDT) | Personal stake (USDT) | Reward % | Revenue share |
|-------|------|-------------------|------------------------|----------|---------------|
| L1 | Quantum | 0 | 0 | 3% | No |
| L2 | Particle | 5,000 | 500 | 5% | No |
| L3 | Photon | 20,000 | 1,000 | 8% | No |
| L4 | Starship | 50,000 | 3,000 | 12% | Yes (1.0×) |
| L5 | Comet | 150,000 | 8,000 | 17% | Yes (1.0×) |
| L6 | Planet | 400,000 | 20,000 | 23% | Yes (1.5×) |
| L7 | Star | 1,000,000 | 50,000 | 30% | Yes (1.5×) |
| L8 | Nebula | 2,500,000 | 100,000 | 35% | Yes (2.0×) |
| L9 | Supernova | 5,000,000 | 200,000 | 40% | Yes (3.0×) |

**Example**: You’re L3 (8%); direct referral A stakes 1,000 USDT → you get 80 USDT once. If you become L4 (12%), same A stakes 1,000 again → you get 120 USDT.`,
  },
  'what-is-referrer': {
    title: 'What is a referrer? How is it bound?',
    content: `Your **referrer** is the wallet address you enter in "Referrer address" on your **first stake**. That link is **permanent** after the first stake is confirmed on-chain and **cannot be changed**.

After that, on **each of your stakes** your referrer and their uplines get USDT referral rewards from **that stake amount** by tier and "compression" rules. On the Nodes & Referrals page you can see your referral link and structure; when inviting, have them **paste your wallet address** in "Referrer address" on the Stake page.

**Example**: Bob’s first stake used Alice’s address; after confirm Bob and Alice are bound forever. Bob’s later stakes all give Alice USDT by her tier; Bob cannot change referrer.

**Wrong referrer address?** Once the first stake is confirmed, the referrer is bound and the contract does not support changing it. If you haven’t staked yet, double-check before the first stake. If already bound, it cannot be fixed on-chain; confirm the address with your referrer (e.g. use their referral link); for large mistaken bindings, contact official support.`,
  },
  'referral-reward-calc': {
    title: 'How are referral rewards calculated?',
    content: `**When**: Only when a **referred user stakes**; the system uses **that stake amount** and pays USDT to their referrer and uplines. It does **not** pay you a share of their daily 0.8% yield.

**How**:  
- Base: **that user’s stake** (USDT or RWA equivalent).  
- Rate: From direct referrer up the chain by **node tier %**; with multiple levels, **compression** (tier difference): each level gets only "my % minus already taken by below"; total to all uplines ≤ **50%** of that stake.  
- **Per-stake cap**: Each referrer’s reward from one stake ≤ **50% of that referrer’s own total stake**; excess is not paid.

**Example**: Direct referral B stakes 2,000 USDT, you’re L2 (5%), no upline → you get 100 USDT. Direct C stakes 10,000 USDT, you’re L3 (8%) → 800 USDT; if your total stake is only 1,000 USDT, cap = 500, you get **500 USDT**. Multi-level: C’s referrer is you (L3, 8%), your referrer is Alice (L5, 17%); C stakes 10,000 → you 8%, Alice 17%−8%=9%. **Why less than expected?** Common reasons: reward is on stake amount only, not daily yield; 50% per-stake cap; compression (you only get the tier difference); wrong or missing referrer.`,
  },
  'how-to-upgrade-node': {
    title: 'How do I upgrade my node level?',
    content: `Level is **automatically** set by the system from **team total stake, structure, and your personal stake**; no manual application. The system updates after referral activity.

**Example (check Nodes page)**:  
- L1→L2: personal stake ≥ 500 USDT, team ≥ 5,000 USDT.  
- L2→L3: personal ≥ 1,000 USDT, team ≥ 20,000 USDT.  
- L4–L9: see table. Check **current level** and **next level requirements** on the Nodes & Referrals page.`,
  },
  'lottery-rules': {
    title: 'What are the lottery rules?',
    content: `Users buy **lottery tickets** with **RWA**. Draws use on-chain randomness (e.g. **Chainlink VRF**); results are public.

**Funds**: When a pool is drawn, **5%** of the pool goes to the **treasury**; the remaining **95%** is split by prize tier (e.g. 1st 48%, 2nd 24%, 3rd 14%, 4th 9%). If a tier has no winner, that share **rolls to the next draw** of the same pool.

**Example**: A weekly pool of 10,000 USDT → 500 to treasury; 4,800 to 1st, 2,400 to 2nd, etc.; if no 1st winner, 4,800 rolls to next week.`,
  },
  'four-pools-diff': {
    title: 'What’s the difference between the four pools (real-time/weekly/monthly/yearly)?',
    content: `| Pool | Draw time | Note |
|------|------------|------|
| **Real-time** | Every **5 minutes** (0:00, 0:05, 0:10 UTC) | Fast, small stakes |
| **Weekly** | **Monday** **0:00 UTC** | Once per week |
| **Monthly** | **1st** of month **0:00 UTC** | Once per month |
| **Yearly** | **1 Jan** **0:00 UTC** | Once per year, usually larger pool |

All times in **UTC**. Page countdown may use chain or device time. E.g. Beijing = UTC+8, so Monday 0:00 UTC = Monday 8:00 Beijing.`,
  },
  'draw-time-utc': {
    title: 'How is draw time set? (UTC)',
    content: `All pools draw at fixed **UTC** times from the contract:

- **Real-time**: Every 5 minutes (0:00, 0:05, 0:10 … UTC).
- **Weekly**: Monday 00:00 UTC.
- **Monthly**: 1st of month 00:00 UTC.
- **Yearly**: 1 Jan 00:00 UTC.

**Example**: If it’s 10 Mar 2026 14:35 UTC, next real-time is 14:40 UTC; next weekly is 17 Mar 00:00 UTC. See the Lottery page for exact times.`,
  },
  'buy-tickets-and-claim': {
    title: 'How do I buy tickets and claim prizes?',
    content: `**Buy**: On the Lottery page choose a pool (real-time/weekly/monthly/yearly), enter **number of tickets**, pay in RWA and confirm. Ticket price may vary by pool (e.g. 10 RWA/weekly, 50 RWA/monthly); there may be a max per draw (e.g. 100).

**Claim**: After the draw, if you win, find "Claim" for that pool, submit the tx and pay Gas; prizes are sent to your wallet. Unwon tickets are not refunded; you can join the next draw.

**Example**: You buy 5 weekly tickets for 50 RWA; if you win 4th tier you get that pool’s 9% in RWA/USDT and claim on the page.`,
  },
  'how-to-buy-rwa-with-usdt': {
    title: 'How do I buy RWA with USDT?',
    content: `On the **Swap** page choose **USDT → RWA**, enter USDT amount; the UI shows estimated RWA (including slippage/fees). **First time** you must **Approve** USDT for the contract, then click "Swap" and confirm; pay Gas and RWA is sent to your wallet.

**Example**: RWA ≈ $0.85; you enter 850 USDT → ~1,000 RWA (maybe slightly less with slippage); after approve + swap you have ~1,000 RWA and 850 USDT less.`,
  },
  'where-to-see-price': {
    title: 'Where can I see RWA price?',
    content: `On the **Market** page you can see RWA **price, chart, 24h change, volume**. Data is aggregated from chain or third parties and **for reference**; actual execution is on-chain and on the Swap page. E.g. if 24h low is 0.80 and high 0.90, your swap may land in that range; see Swap for exact quote.`,
  },
  'protocol-fund-model': {
    title: 'What is the protocol’s fund model? (50/50)',
    content: `When you **stake**, funds go **50% to treasury, 50% to community reward pool**.

- **Treasury**: Reserve, security, long-term; you cannot get the treasury share back on withdraw or emergency withdraw.  
- **Community pool**: Pays **daily RWA yield** and **USDT referral/node rewards**.

**Example**: 100 users each stake 10,000 USDT → 1,000,000 total; 500,000 to treasury, 500,000 to community pool. Daily RWA and USDT rewards are paid from the community pool and rules; treasury is not returned to users.`,
  },
  'treasury-and-community-pool': {
    title: 'What are treasury and community pool?',
    content: `**Treasury**: Receives **50%** of staked funds; used for reserve, operations, security, ecosystem. Also **5%** of each lottery pool.

**Community pool**: Receives the other **50%** of staked funds; used to pay RWA yield and USDT rewards.

**Example**: 2,000 USDT stake → 1,000 to treasury, 1,000 to community pool. A 20,000 USDT lottery pool → 1,000 (5%) to treasury, 19,000 to winners or next draw.`,
  },
  'lottery-5-percent-treasury': {
    title: 'What does “5% of lottery pool to treasury” mean?',
    content: `When a lottery pool is **distributed**, **5%** of the pool is sent to the protocol **treasury**; the remaining **95%** goes to winners by tier (or rolls to next draw if a tier has no winner):

| Tier | Share | Example (10,000 USDT pool) |
|------|-------|-----------------------------|
| 1st | 48% | 4,800 USDT |
| 2nd | 24% | 2,400 USDT |
| 3rd | 14% | 1,400 USDT |
| 4th | 9% | 900 USDT |
| Treasury | 5% | 500 USDT |

**Example**: 50,000 USDT pool → 2,500 to treasury; if no 1st winner, 4,800 rolls to the next draw of that pool.`,
  },
  'avoid-phishing': {
    title: 'How do I avoid phishing sites?',
    content: `- Use **only official domain and links**; don’t click links from SMS, email, or unknown groups.  
- Before connecting, check the **address bar** for the correct domain.  
- **Never** enter seed phrase, private key, or password on non-official pages; this site **never asks** for them.  
- If unsure, confirm the **latest official URL** via announcements or community.`,
  },
  'protect-private-key': {
    title: 'How do I keep my private key and seed phrase safe?',
    content: `They are the **only** way to control your assets; anyone with them can move your funds.

**Tips**: Don’t screenshot, don’t send by email/chat, don’t store on connected devices or cloud. Prefer **writing on paper** and storing safely; consider a hardware wallet. This site and real support **never** ask for seed or key; anyone who does is a scammer.`,
  },
  'tx-pending': {
    title: 'What if my transaction is stuck pending?',
    content: `Often due to **network congestion**. Try:

1. **Wait 10–30 minutes**; many txs confirm on their own.  
2. In the wallet, find the tx and use "**Speed Up**" to resubmit with higher Gas.  
3. If still pending after 1h, check status on **BSCScan.com** with the **TX hash**.  
4. When contacting support, provide **TX hash**.

**Example**: A withdraw is stuck in MetaMask; copy the TX hash (0x…), search on BSCScan to see Pending or Failed; if Pending, speed up in the wallet.`,
  },
  'rewards-not-arrived': {
    title: 'What if my rewards didn’t arrive?',
    content: `Yield settles daily at **UTC 0:00**; arrival can be delayed up to **~2 hours**. First:

1. Check **Dashboard** → **Recent activity** for that day’s yield.  
2. Confirm you didn’t do **emergency withdraw** or other state-changing actions.  
3. If **over 24h** with no record, contact support (Telegram, Discord, email) with **wallet address**, **description**, **rough time** (e.g. "Staked Mar 5, expected Mar 6 yield, not shown").

**Example**: You staked Mar 5, still no yield at 10:00 Mar 6; check Recent activity for Mar 6; if it’s there, the Withdraw page may just be slow; if not, contact support with address and time.`,
  },
  'contact-support': {
    title: 'How do I contact support?',
    content: `Use **official Telegram, Discord, or email** (e.g. rwacoin001@gmail.com). Support **never** asks for seed phrase, private key, or password.

When reporting an issue, include **wallet address** (e.g. 0x1234…5678), **what happened**, and **TX hash** if any. E.g. "Wallet 0x1234…5678, withdrew 100 RWA on Mar 6, not received, TX: 0xabcd…".`,
  },
  'compare-pancake': {
    title: 'How does RWA differ from PancakeSwap liquidity farming?',
    content: `**PancakeSwap**: You provide **liquidity** (e.g. USDT–BNB pair), earn **trading fees + farm rewards**; you can **remove liquidity** and get principal back (with impermanent loss risk).

**RWA Protocol staking**: You deposit **USDT or RWA** into the protocol; you earn **daily RWA yield** (e.g. 0.8% × lock) and possible **referral/node USDT**. Principal is split **50% treasury / 50% contract-side principal**. Flexible principal and matured locked principal now have dedicated withdrawal paths; for locked USDT before maturity, **emergency withdraw** is proportional to completed lock days and remains irreversible for that selected position.

**Summary**: Farming = liquidity + rewards, removable; RWA staking = fixed yield + referral with structured principal exits by position type. Understand the exit path for your position before participating.`,
  },
  'compare-other-platforms': {
    title: 'How does RWA differ from other high-yield staking platforms?',
    content: `**Yield source**: RWA offers **daily RWA yield + referral/node USDT** by lock and tier; others may be pure APY farming or dual-asset products with different structure and risk.

**Principal and exit**: RWA uses **50/50**. The treasury-side share is not redeemable, while the contract-side principal can be withdrawn through the protocol’s principal paths. Flexible principal can be withdrawn when available; locked principal can be withdrawn after maturity; locked USDT before maturity uses proportional emergency exit. Platforms that promise full principal back anytime can be rug pulls; always verify the actual contract rules.

**Transparency**: RWA has **multisig treasury, TimeLock, third-party audits, on-chain TVL/treasury**. Compare whether other platforms have open contracts, public audits, and on-chain verifiable funds.

**Tip**: Don’t chase "high yield" blindly; check whether principal is recoverable, where yield comes from, and whether there are audits and on-chain transparency.`,
  },
  'referral-link-where': {
    title: 'Where do I get my referral link?',
    content: `On the **Nodes & Referrals** page (in nav: "Nodes" / "Referrals"): the page shows your **referral link** (site URL + your address or code). Copy and share; when someone opens it, the Stake page may **pre-fill your address** in "Referrer address" (if not, they paste it). If you can’t find it, check top or bottom nav for "Nodes", "Referrals", or "My referral"; some products also have "Get referral link" on the Stake page.`,
  },
  'calculator-where': {
    title: 'Where is the yield calculator? How do I use it?',
    content: `In the nav, open **"Yield calculator"** or **"Calculator"** (often under "Analytics"). **Use**: Enter **stake amount**, **lock** (Flexible/30/90/180/365 days), **node level** (if you want referral estimate); the page shows estimated **daily/monthly/yearly** RWA yield and possible USDT rewards. **For reference only**; not an on-chain promise. Actual yield is from chain and contract. Use it to compare different amounts and lock periods.`,
  },
  'principal-withdraw-guide': {
    title: 'How do I withdraw principal? Flexible vs locked?',
    content: `The Withdraw page separates **yield withdrawal** and **principal withdrawal**. Principal is handled in the **"Principal withdrawal"** section, not in the RWA yield card.

**Four principal types**:

| Type | Where & rules |
|------|----------------|
| **USDT flexible** | Principal section → USDT flexible → instant, **8%** fee (3% buyback/burn, 3% Treasury, 2% community). Min **100** per withdrawal. |
| **USDT matured locked** | After lock ends, in Principal section select the USDT locked position → instant, **8%** fee. Before maturity, only **emergency withdraw** (locked USDT only, proportional to completed days + 8%). |
| **RWA flexible** | Principal section → RWA flexible → instant **8%** fee; min **100**. |
| **RWA matured locked** | After maturity, in Principal section: choose **instant** (8% fee) or **stRWA mode** (**0%** fee, **120%** minted as 30-day locked stRWA). |

Only **pre-maturity locked USDT** uses emergency withdraw; flexible and matured positions use normal principal withdrawal.`,
  },
  'withdraw-arrival-time': {
    title: 'How long until my withdrawal arrives?',
    content: `Withdrawals (RWA or USDT) and USDT reward claims are **on-chain transactions**. Arrival time depends on BSC confirmation and your wallet refresh.

**Normal case**:
- **On-chain confirmation**: BSC blocks are about **3 seconds** apart. Once your withdraw/claim tx is included, it usually confirms in **seconds to about one minute**. When the tx status is Success, the contract has already sent RWA or USDT to your address — **on-chain arrival is done**.
- **Wallet display**: Some wallets refresh balance **a few seconds to tens of seconds** after confirmation. Pull to refresh or wait a moment. If BSCScan shows the tx as successful and the Transfer recipient is your address, the assets are on your address; the delay is often just the wallet UI.

**When it can be slower**:
- **Network congestion**: When BSC is busy, inclusion can be delayed; confirmation may take several minutes. You can try "speed up" in the wallet (higher Gas) or wait.
- **Low Gas**: If Gas was set too low, the tx may stay Pending or fail; resubmit with sufficient Gas.

**Summary**: In normal conditions, your withdrawal/claim **arrives on-chain within about one minute** after you confirm; wallet balance may update a few to tens of seconds later. If there is no record after 2–3 minutes, check the tx on BSCScan by hash or your address; if it shows Success but your wallet balance is unchanged, see "What if RWA didn’t arrive after withdraw?".`,
  },
  'rewards-manual-claim': {
    title: 'Do rewards auto-credit or must I claim manually?',
    content: `**You must actively withdraw/claim; rewards do not auto-send to your wallet.**

- **RWA yield**: The protocol **settles** daily into your on-contract balance (rwaPending) but **does not send** it to your wallet. Open the **Withdraw** page, check the **RWA withdraw** card, enter amount, click Withdraw and confirm; then RWA moves from contract to wallet.
- **USDT referral/node rewards**: Likewise **recorded on-chain** and shown in the **USDT rewards** card on the Withdraw page; you must click **Claim** and confirm for USDT to be sent to your wallet.

**Summary**: Rewards settle on-chain first; you must **initiate withdraw or claim** for them to reach your wallet. Each action costs a small amount of BNB for Gas. Check the Withdraw page regularly and claim as needed.`,
  },
  'withdraw-amount-mismatch': {
    title: 'Why does my withdrawable RWA not match my calculation?',
    content: `Common reasons: **RWA price changes** and **different units** (amount vs quantity).

- **Chain stores quantity, you may think in value**: Withdrawable balance on-chain is **RWA quantity** (tokens). The UI may also show “≈ X USDT”. If you compute “daily 0.8% × staked USDT” you get **USDT equivalent**, then divide by your assumed RWA price to get RWA amount; if the current RWA price differs, your number won’t match the page.
- **RWA price moved**: Yield was converted to RWA at **then-current** price; later price moves mean your back-of-envelope “how many tokens” won’t match the locked on-chain quantity. **Use the withdrawable RWA quantity shown on the page or on-chain** as the source of truth; USDT value is indicative.
- **Fees and minimum**: Instant withdrawals use a flat **8%** fee and a **100** minimum; the page may show gross withdrawable or net-after-fee, so it will differ from a simple “principal × daily rate × days” estimate.

**Tip**: Rely on the **withdrawable RWA quantity** on the Withdraw page or dashboard; to verify, check rwaPending (or similar) for your address on BSCScan.`,
  },
  'withdraw-not-received': {
    title: 'Withdrawal succeeded but RWA not in wallet—how to check?',
    content: `If the **transaction shows success** in the app or wallet but your balance didn’t change:

1. **Chain and address**: Confirm the wallet is on **BSC mainnet** and the balance you’re checking is for the **same address** you used to withdraw (easy to mix up with multiple accounts).
2. **Token visibility**: If RWA isn’t “added” in the wallet, the balance may not show. Add the **RWA contract address** (from the site or BSCScan) and check again.
3. **On-chain**: Look up the withdrawal tx on **BSCScan** for your address. If status is Success and the Transfer event shows your address as receiver, funds are on-chain; the issue is likely display or token not added.
4. **Delay**: Some wallets refresh balances with a short delay; pull to refresh or wait a few seconds.
5. **Still wrong**: Save the **TX hash** and contact support with “wallet address + TX hash + approximate time”.`,
  },
  'rwa-usdt-separate-claim': {
    title: 'Do I need to claim RWA and USDT separately?',
    content: `**Yes.** They are **two separate actions**; each must be done for that asset to reach your wallet.

- **RWA yield**: Use the **RWA withdraw** card on the Withdraw page. That’s where you withdraw daily yield (and any RWA in that flow). Click Withdraw and confirm; RWA is sent to your wallet.
- **USDT rewards**: Use the **USDT rewards / Claim** card on the Withdraw page. That’s where you claim referral/node rewards in USDT. Click Claim and confirm; USDT is sent to your wallet.

Claiming one does not trigger the other. If you have both, you need to **do each action once**. Each action uses a small amount of BNB for Gas.`,
  },
  'no-referrals-still-earn': {
    title: 'Can I still earn without any referrals?',
    content: `**Yes.** Protocol yield has two parts: **static yield** (no referrals needed) and **referral rewards** (need referrals).

- **Static yield (no referrals)**: As long as **you** stake USDT or RWA, you earn **daily RWA** (e.g. base 0.8% × lock multiplier). This does **not** depend on having referrals or filling a referrer. You can earn RWA every day from your own stake and withdraw it on the Withdraw page.
- **Referral rewards**: You only get **USDT** referral/node rewards when **referred users** stake and used your address as referrer. No referrals means no USDT from that part, but your **RWA static yield is unchanged**.

**Summary**: No referrals or referrer link is fine—you still earn **daily RWA static yield** from your stake. Referrals are **extra** USDT income on top.`,
  },
  'wrong-referrer-address': {
    title: 'I entered the wrong referrer address—what can I do?',
    content: `**Once your first stake is confirmed on-chain, the referrer is permanently bound; the contract does not support changing or unbinding.**

- **If you haven’t staked yet**: Double-check “Referrer address” before the first stake (e.g. copy the full 0x from the referrer). Until the first stake is confirmed, no referrer is written on-chain; you can correct it and then stake.
- **If you already staked and the referrer is set**: It cannot be changed on-chain. The contract has no “change referrer” or “unbind” function. If you used someone else’s address, your future referral rewards will go to that address; if you left it empty or zero, you have no referrer and cannot add one later.
- **Tip**: Confirm the address with your referrer before the first stake (e.g. use their referral link). For large stakes, do a small test first and check the Nodes & Referrals page that the relationship looks correct. If bound by mistake and amounts are large, you can try contacting official support; the **contract itself cannot change the referrer**.`,
  },
  'node-level-downgrade': {
    title: 'Why did my node level go down?',
    content: `Node level is computed **dynamically** from your **current** team and personal stake (and structure), not fixed forever.

- **Why it can drop**: When team or your personal effective stake decreases (e.g. referrals withdraw, you withdraw principal), or you no longer meet the requirements for the current level, the system recalculates and may assign a lower level.
- **Effect**: After a downgrade, **new** referral stakes are rewarded at the new (lower) rate; already paid rewards are not clawed back. L4+ participate in protocol revenue share; if you drop below L4, you typically stop participating (per current rules).
- **How to restore**: When team/personal stake again meets the requirements for the higher level, the level is restored. The system updates with chain data; no separate application is needed. Check the Nodes & Referrals page for current level and next-level requirements.`,
  },
  'direct-vs-indirect-referral': {
    title: 'What’s the difference between direct and indirect referrals? How is reward split?',
    content: `**Direct referral**: Someone you invite who **directly** enters your address as referrer when they stake; you get USDT reward from **that stake amount** at your node tier rate (e.g. L3 = 8%).

**Indirect (multi-level)**: Your direct referral A invites B; B stakes with A’s address as referrer, so B is your **indirect** (second-level) referral. With multiple levels, **compression** applies: from the direct referrer upward, each tier gets only “my tier % minus what’s already taken by tiers below”; the total to all uppers is at most **50%** of that stake.

**Example**: C’s referrer is you (L3, 8%), your referrer is Alice (L5, 17%). When C stakes 10,000 USDT, you get 8% = 800 USDT, Alice gets the tier difference 17%−8% = 9% = 900 USDT, total 1,700 USDT. Rewards are triggered **once per stake** on that stake amount, not on referees’ daily yield.`,
  },
  'same-wallet-multiple-referrers': {
    title: 'Can one wallet be referred by more than one person?',
    content: `**No.** One wallet address can have only **one** referrer.

- Whoever is set in the “Referrer address” field when that address does its **first confirmed stake** becomes the permanent referrer.
- If someone else later shares a referral link with that user, it does **not** replace the existing referrer; the contract does not support changing or sharing referral relationship.
- So each address has a **single, permanent** referrer.`,
  },
  'what-is-approve': {
    title: 'What is Approve? Why two transactions?',
    content: `The first time you stake or swap, the wallet may ask for an **Approve** transaction. This is normal and required on-chain; it is not an extra charge.

**What is Approve?**  
Your **USDT, RWA**, etc. are normally only movable by you. A contract **cannot** take them without permission. **Approve** means you allow “this contract to spend up to X of this token.” It does **not** move your tokens yet; it only sets a spending allowance. The **second** transaction (Stake or Swap) is when the contract actually moves the tokens.

**Why two?**  
- **First: Approve** — You allow the contract to use your USDT (or RWA). This only writes the allowance; you pay a small Gas (BNB).  
- **Second: Stake / Swap** — You click Stake or Swap; the contract then moves the amount within the approved allowance.

You only need to approve **once** per token per contract (or again when the allowance runs out). After that, you often only need the Stake/Swap transaction.`,
  },
  'balance-insufficient-why': {
    title: 'It says "Insufficient balance" but I have USDT—why?',
    content: `Check these in order:

1. **Wrong network**: The protocol only uses USDT on **BSC**. If your USDT is on Ethereum (ERC-20) or another chain, the stake page reads BSC balance and may show 0. **Fix**: Withdraw to BSC (BEP-20) or use a bridge to BSC.
2. **Wallet not on BSC**: Switch the wallet to **BSC mainnet** (Chain ID: 56) and refresh.
3. **No BNB for Gas**: Staking and approve cost **BNB**. If you only have USDT, the tx can fail (e.g. “Insufficient gas”). **Fix**: Keep a little BNB (e.g. 0.01–0.05).
4. **Allowance too low**: If you previously approved less than the amount you’re staking now, **approve again** (higher amount or unlimited) then stake.
5. **Stale UI**: Right after depositing or switching network, the page may not have updated. **Fix**: Refresh or reconnect the wallet.

If all of the above are correct and it still fails, verify your BSC USDT balance on BSCScan and contact support with **address, network, and a screenshot**.`,
  },
  'can-cancel-stake': {
    title: 'Can I cancel my stake?',
    content: `**No.** The protocol does **not** support “cancel stake” or “undo stake”; once a stake is confirmed on-chain it is active and cannot be reverted like an order.

**To get funds out**, use the exit path that matches your **position type**:
- **RWA with lock**: Wait until **lock ends**, then use **stRWA unlock** on the Withdraw page to get RWA back.
- **RWA flexible**: Unlocked principal can be withdrawn in the **Principal withdrawal** section anytime.
- **USDT**: If **flexible**, withdraw USDT principal in the Principal section. If **locked**, wait until **maturity** to withdraw; before maturity you can use **emergency withdraw** only for that locked USDT position (proportional to completed days + 8% fee). See “What is emergency withdraw?”

**Summary**: There is no “Cancel stake” button; exit by **position type** (flexible vs locked, USDT vs RWA). Only **pre-maturity locked USDT** uses emergency withdraw.`,
  },
  'multiple-stakes': {
    title: 'Can I have more than one stake?',
    content: `**Yes.** The protocol allows **multiple stakes** from the same address, with different lock periods; they are aggregated for total stake and yield.

- **Multiple deposits**: e.g. stake 1,000 USDT today and 2,000 USDT next week; both count. Your **total stake** and **daily yield** are the sum of all active stakes (including different lock multipliers). See the Dashboard and Withdraw page for totals.
- **Different lock periods**: e.g. one 30-day and one 90-day; both exist. When each matures, its stRWA (if RWA stake) or locked principal is handled per that stake. USDT stakes also contribute to yield by their respective lock terms.
- **USDT and RWA together**: You can have both USDT stakes (earning RWA yield) and RWA stakes (earning stRWA and RWA yield); “Withdrawable RWA” combines yield from both.`,
  },
  'strwa-vs-rwa': {
    title: 'What’s the difference between stRWA and RWA?',
    content: `**RWA** is the **liquid protocol token**: you can hold it, transfer it, stake it, or swap it on DEX or the protocol Swap page.

**stRWA** is the **staking receipt** you get when you stake **RWA with a lock** (e.g. 30/90/180/365 days). It represents the locked RWA principal.  
- **During lock**: You hold **stRWA**; you cannot send it as RWA or withdraw principal. The contract pays you **daily RWA yield**.  
- **After lock**: On the Withdraw page use **stRWA unlock** to convert stRWA back to **RWA**, then you can send or use it.

**Short**: RWA = free-to-use token; stRWA = receipt for locked principal, becomes RWA after unlock. Unlocked RWA stakes don’t get stRWA (flexible principal is withdrawable as RWA directly).`,
  },
  'wrong-amount-sent-tx': {
    title: 'I sent a stake with the wrong amount—can I cancel?',
    content: `**Once a transaction is broadcast, you cannot “undo” it on-chain.**

- If it’s still **pending**, some wallets let you “speed up” or “cancel” by sending another tx (e.g. with higher gas). Success depends on the wallet and chain.
- If it’s **confirmed**, the stake is active. You can only exit according to the position type (flexible principal withdraw, matured locked withdraw, or emergency withdraw for pre-maturity locked USDT).
- **Tip**: Always double-check amount and lock period before confirming; consider a small test stake first.`,
  },
  'transfer-stake-to-other': {
    title: 'Can I transfer my stake to someone else?',
    content: `**No.** Stakes are tied to **your wallet address**; the protocol does not support “transfer stake to another address.”

- Your stake, withdrawable yield, and claimable USDT are stored under **your address** in the contract. There is no function to move that stake to another user.
- If you want to give assets to someone else, you must **withdraw** when eligible (flexible principal, matured locked, or emergency for pre-maturity locked USDT) to your wallet, then send funds or have them stake from their own address.
- The contract is designed so each stake is clearly tied to one address.`,
  },
  'swap-limits-slippage': {
    title: 'Are there swap limits or slippage?',
    content: `The Swap page shows an **estimated RWA amount** based on the contract and pool; it can be affected by:

- **Slippage**: Price can move between when you submit and when the tx is executed, so you may get slightly less (or more) RWA. The page may let you set a slippage tolerance; if price moves beyond that, the tx can fail or partially fill—see the contract behavior.
- **Per-tx or daily limits**: If the protocol or contract has caps, the Swap page will reflect them; check the current Swap page and contract for details.
- **Tip**: Use the **live quote** on the Swap page; for large size, consider splitting or watching slippage settings.`,
  },
  'sell-rwa-for-usdt': {
    title: 'Can I sell RWA for USDT?',
    content: `The protocol Swap page currently focuses on **USDT → RWA** (buy RWA with USDT). Whether **RWA → USDT** is offered on the same page depends on the site and announcements.

- **If RWA→USDT is available**: Choose RWA→USDT on the Swap page, enter amount, and confirm; note any slippage and fees.
- **If not on the protocol**: You can trade RWA for USDT on **DEXes or exchanges** that list RWA (if any). The protocol may also add an in-app RWA→USDT option later; check official updates.`,
  },
  'audit-where': {
    title: 'Is there an audit? Where can I see it?',
    content: `RWA Protocol contracts have been **audited by third parties**; reports are public.

- **Auditors**: Audits have been performed by **SlowMist** and **CertiK** (and possibly others); the project aims to re-audit before major contract changes.
- **Where**: Open the **Security** or **Audit** page on the official site (often in the top or footer nav). You’ll find auditor names, dates, and report links or summaries.
- **Content**: Reports usually cover scope (e.g. staking, withdraw, lottery), findings, and fixes. Full reports are as published on the Security page.
- **Note**: Audits reduce risk but **do not guarantee** zero bugs; only invest what you can afford to lose and follow official announcements.`,
  },
  'fund-safety': {
    title: 'Could the protocol “rug”? How is funds safety ensured?',
    content: `The protocol is designed to reduce “rug” and single-point risk:

**① Multisig treasury**  
The **treasury** (e.g. 50% of user stakes, 5% of lottery pools) is held in a **Gnosis Safe**-style **multisig** (e.g. 2-of-3). No single person can move funds alone.

**② TimeLock**  
Important parameter changes can go through a **TimeLock** (e.g. 48h), so the community can see what will change before it takes effect.

**③ Audits**  
Contracts have been audited by **SlowMist** and **CertiK**; reports are on the official Security page.

**④ On-chain transparency**  
Treasury and contract addresses are published; anyone can check balances and large flows on a BSC block explorer.

**⑤ Contract execution**  
Your staked USDT/RWA goes **directly** into the contract or treasury by contract logic; withdrawals and yield are executed by the **contract**, not by a central key. As long as the contract is not exploited or maliciously upgraded, you can withdraw according to the rules.

**Risk**: These measures reduce but do not eliminate risk (bugs, extreme events, or attacks). DeFi has smart contract and market risk; only invest what you can afford to lose.`,
  },
  'site-or-wallet-stuck': {
    title: 'Site won’t load or wallet keeps connecting—what to do?',
    content: `Try in this order:

1. **Network**: Try another connection (e.g. switch Wi‑Fi or mobile data).
2. **In-app browser**: On mobile, open the site inside **OKX** or **Binance** in-app browser; often more stable than system browser + external wallet.
3. **BSC**: Ensure the wallet is on **BSC mainnet** (Chain ID: 56). If you’re on Ethereum or another chain, the page may hang on “Unsupported network.”
4. **Cache**: Clear browser cache and cookies, then reload.
5. **Browser**: Chrome/Brave usually work best; Safari can be flaky with Web3.
6. **URL**: Use only the **official** domain from announcements; copycat sites may not connect properly.

If it still fails, contact support with **wallet type, browser, and a screenshot**.`,
  },
  'change-wallet-history': {
    title: 'I changed wallet/phone—is my old stake still there?',
    content: `**Yes.** Stakes, yield, and referrer link are **on-chain** and tied to your **address**, not to a device or browser. As long as you use the **same address** (same seed phrase / private key), you’ll see everything.

- **New phone or browser**: Install the wallet app/extension, **restore** with your **original seed phrase or private key**, then connect to the site. You’ll see the same stakes, withdrawable RWA, claimable USDT, node level, and referrals. No “migration” needed.
- **New wallet (new address)**: If you created a **new** wallet instead of restoring, that’s a **different address**. The old address’s stakes and rewards stay on the old address; only that address (or a wallet restored from its seed) can withdraw and claim. You can’t “move” old stakes to the new address.

**Summary**: Data is on-chain and tied to the address. New device is fine if you use the same address; new address means old assets are still on the old address.`,
  },
  'wallet-hacked-stake': {
    title: 'My wallet was hacked—what about my staked funds?',
    content: `**Staked funds don’t auto-move when your wallet is hacked; but whoever controls your address (seed/phrase or private key) can withdraw and claim.**

- **Where funds are**: Your staked USDT/RWA are in the **contract** (or treasury); withdrawable RWA and claimable USDT are stored under **your address**. If the thief only took coins from your wallet balance, they **cannot** touch the contract balance tied to your address.
- **The risk**: If the thief has your **seed phrase or private key**, they can connect as you and **withdraw RWA, claim USDT, or emergency withdraw**, sending your withdrawable assets to an address they control. The contract only checks the signature, not “who you are.”
- **Can the protocol move or freeze?** Typically the contract **cannot** “transfer user X’s stake to user Y” or “freeze an address.” Once the thief signs with your key, the contract treats it as valid. **If your seed/key is leaked, treat the assets as exposed**; use a new wallet and avoid sending more to the old address.
- **Tip**: Keep seed phrase and private key offline and never share; if leaked or suspected, switch to a new wallet and stop using the old one. To “move” contract assets to safety, you must still sign with that address (withdraw/claim to a new wallet); the protocol cannot do it for you.`,
  },
  'protocol-shutdown': {
    title: 'If the protocol shuts down, can I get my funds back?',
    content: `**The contract doesn’t disappear**: Your stake and withdrawable yield are **on BSC**. If the website or app goes down, the **contract keeps running**; in theory you can still **call the contract** (e.g. via BSCScan “Write Contract” + your wallet) to withdraw and claim, without the official frontend.

**Conditions**: The contract must not be permanently paused or upgraded to be unusable, and you must still control **your private key**. If it’s paused with no recovery path, you may not be able to interact; that depends on deployment design.

**How much you can get**: Depends on **position type**. Flexible principal and matured locked principal use normal withdrawal; only **pre-maturity locked USDT** uses proportional emergency exit. If the frontend is gone but the contract is still callable, you’d use these same on-chain paths.

**Tip**: If the team announces shutdown, they’ll usually state whether the contract remains callable. Save **contract address and ABI** so you can interact via BSCScan if needed.`,
  },
  'bsc-down-affect': {
    title: 'If BSC has issues, does it affect my yield?',
    content: `**Yes.** Settlement, distribution, and withdrawals depend on **BSC** producing blocks and the contract executing. If the chain has long downtime, a fork, heavy congestion, or a security incident:

- **Settlement delay**: Daily yield is triggered at a fixed time; if BSC is unhealthy then, settlement may be delayed or skipped and handled after recovery (per protocol design).
- **Can’t withdraw/claim**: Withdraw and claim require sending a transaction; if the chain stops or RPC is down, you can’t submit txs and funds stay in the contract until the chain is back.
- **Extreme case**: If BSC had an irreversible chain-level failure or was abandoned, contract and asset state would depend on BSC and community decisions (e.g. migration, snapshot). No single protocol can fully control that.

**Summary**: BSC is the base layer; chain risk affects yield and withdrawals. This is **systemic risk**; participate with that in mind.`,
  },
  'where-history-stake': {
    title: 'Where can I see my stake history?',
    content: `- **Dashboard**: After connecting, the **Dashboard** or “My assets” page shows total stake and recent activity; some products show a stake list or timeline.
- **BSCScan**: All stakes and withdrawals leave **transactions** on BSC. Open **bscscan.com**, search for your **wallet address**, and filter by the staking contract to see Stake/Withdraw calls and when you staked how much.
- **Contract read**: If you’re comfortable with contracts, open the staking contract on BSCScan and use “Read Contract” for view functions related to your address (e.g. stake list) to double-check.

**Tip**: For disputes or large amounts, treat **on-chain records on BSCScan** as the source of truth; the frontend may lag or aggregate differently.`,
  },
  'tvl-data-verify': {
    title: 'Where can I verify TVL and protocol data?',
    content: `If you don’t trust the frontend numbers, you can **verify on-chain**:

- **TVL / total staked**: On BSCScan, open the **staking contract** and check its **USDT and RWA** token balances (or any internal TVL view). You can sum these or compare with the site’s TVL.
- **Events**: On the contract page, check **Events** (e.g. Stake, Withdraw) to count stakes and volumes; compare with the site’s “Protocol data” or stats.
- **Third-party**: If a DeFi data site (e.g. DeBank, DefiLlama) lists the protocol, compare its on-chain TVL and activity with the official site.

**Note**: On-chain data is the single source of truth; the site and third parties only aggregate it.`,
  },
  'treasury-address-public': {
    title: 'Is the treasury address public? How do I check its balance?',
    content: `**Yes.** The protocol **treasury address** is published (e.g. on Governance / Security / Transparency), often a Gnosis Safe or similar multisig, so the community can monitor.

- **How to check**: On **BSCScan.com**, search for the **treasury address**. You’ll see its token balances (USDT, RWA, BNB, etc.) and transfer history. No need to use the official site; anyone can query anytime.
- **Purpose**: The treasury receives 50% of user stakes and 5% of lottery pools; the public address and balance help verify that funds flow as described and spot unusual outflows.`,
  },
  'rwa-dynamic-sell-tax': {
    title: 'RWA dynamic sell tax',
    content: `When you **sell RWA on a DEX** (e.g. PancakeSwap), a **dynamic sell tax** applies. Buys and normal transfers are not taxed; whitelisted addresses are exempt.

---

**1. When is tax applied?**

- **Only on sells**: Tax applies when you transfer RWA to the DEX pair address (i.e. selling via the DEX).
- **Buys**: No tax.
- **Normal transfers** (to other wallets or contracts, not the DEX pair): No tax.
- **Whitelisted addresses** (e.g. treasury, liquidity fund, deployer): No tax on sells and no 24h limit.

---

**2. At most 1 sell per 24 hours**

- Each **non-whitelisted address** may **only complete 1 sell in any 24-hour period**.
- A second sell within 24 hours will fail with "Only one sell per 24h".
- Whitelisted addresses are not limited.

---

**3. How is the tax rate calculated?**

**1) Base rate (by weighted average holding days, max 4%)**

The protocol uses your **weighted average USDT staking time** in the StakingContract to compute a base rate:

| Weighted avg holding (days) | Base rate |
|----------------------------|-----------|
| < 30                       | 4%        |
| 30–90                      | 3%        |
| 90–180                     | 2%        |
| ≥ 180                      | 1%        |

- **"Total"** in the current contract means your **total USDT staked** (totalStaked) in the staking contract—**not** your wallet RWA balance and **not** your RWA staked amount. If you have never staked USDT or it cannot be read, total is treated as 0: you only pay the default base rate (4%) and the "above 30% penalty" does not apply.

**2) Sell-ratio penalty (above 30%, add 1% tax per 1%, no cap)**

- **Sell ratio** = (this sell amount ÷ total staked) × 100 (the percentage of this sell relative to your "total").
- **Rule**: Only when **sell ratio > 30%**, an extra tax is added: **for each 1% above 30%, add 1% to the rate**, with no upper cap.
  - Formula: extra rate = sell ratio − 30 (if > 0).
- **Final rate** = base rate + extra rate (capped at 100% in the contract to avoid overflow).

**Examples** (base rate 4%): Sell 20% → 4%; sell 35% → 9%; sell 60% → 34%; sell 100% → 74% (capped at 100% in contract if higher).

---

**4. Where does the tax go?**

| Destination      | Share of tax |
|------------------|--------------|
| Treasury         | 50%          |
| Burn             | 25%          |
| Liquidity fund   | 25%          |

---

**5. Summary**

- **1 sell per 24h** per non-whitelisted address.
- **Base rate** from holding days, **max 4%**.
- **Above 30%** of total: each 1% adds 1% tax, no cap (only 100% technical cap).
- **Tax split**: 50% treasury, 25% burn, 25% liquidity fund.

---

**6. What "total" means – concrete example (e.g. you hold 1000 RWA, staked 2000 RWA, 30-day lock, 20 days passed)**

**What is "total"?**

**Total = your total USDT staked** (totalStaked in the contract), in 18 decimals. So only your **USDT staking principal** is counted—not your wallet RWA balance and not your RWA staking amount.

- If you **only staked RWA and never USDT**: your total in the contract = 0. When you sell, you only pay the **default 4%** base rate; the "above 30%" penalty does not apply.
- If you **have USDT staked**: total = that USDT staked amount; sell ratio = (this sell amount in RWA ÷ total) × 100 (same decimals in the contract), then the rules above apply.

**Your case: hold 1000 RWA, staked 2000 RWA, 30-day lock, 20 days passed, now you want to sell**

- **Case A: You only have RWA staking, no USDT staking**  
  The contract only uses USDT staking for "total", so your total = 0.  
  - Base rate: default **4%** (no USDT stake history).  
  - Selling 1000 RWA: no "above 30%" penalty. **Final rate = 4%**.  
  - You receive: 1000 × (1 − 4%) = **960 RWA**.

- **Case B: You also have 2000 USDT staked (30-day lock, 20 days passed)**  
  Then total = 2000 USDT (18 decimals).  
  - Holding 20 days &lt; 30 days → base rate **4%**.  
  - Selling 1000 RWA: in the contract, sell ratio = 1000 ÷ 2000 × 100 = **50%**.  
  - 50% &gt; 30% → extra = 50 − 30 = **20%**.  
  - Final rate = 4% + 20% = **24%**.  
  - You receive: 1000 × (1 − 24%) = **760 RWA**.

**Another example (USDT only, to fix the idea of "total")**

- Bob staked **10,000 USDT** (30-day lock), held 20 days.  
- He sells **3,000 RWA** on the DEX. Total = 10,000, sell ratio = 3,000 ÷ 10,000 × 100 = **30%**.  
- 30% is not above 30%, so no penalty; only base **4%** → he receives 3,000 × 96% = 2,880 RWA.  
- If he sells **6,000 RWA**: sell ratio = 60%, extra = 60 − 30 = 30%, rate = 4% + 30% = **34%**, he receives 6,000 × 66% = 3,960 RWA.`,
  },
  'beginner-full-tutorial': {
    title: 'RWA Protocol · Complete Beginner Investment Guide',
    content: `Step-by-step for users with no experience: from downloading an exchange app to completing your first stake and cashing out.

---
## Table of contents

1. What you need
2. Step 1: Download and register on an exchange
3. Step 2: KYC verification
4. Step 3: Buy USDT
5. Step 4: Use a wallet (exchange in-app recommended)
6. Step 5: Withdraw USDT from exchange to wallet
7. Step 6: Open RWA protocol site and connect wallet
8. Step 7: Complete staking on the protocol
9. Step 8: Withdraw and sell to get fiat
10. FAQ and safety

---
## 1. What you need

- **Phone**: Smartphone with internet (Android or iOS).
- **ID**: For exchange and wallet verification.
- **Bank card**: To buy USDT with fiat (or other payment methods supported by the exchange).
- **Network**: Prefer stable Wi‑Fi or 4G/5G; avoid public Wi‑Fi for large operations.

**Concepts to know:**

- **USDT**: A stablecoin pegged 1:1 to the US dollar; used to invest in this protocol on-chain.
- **Wallet**: Where you hold crypto. The protocol supports **OKX and Binance in-app Web3 wallets**; you do not need to install MetaMask. You can use MetaMask if you prefer.
- **BSC**: BNB Smart Chain. The protocol runs on BSC; always use **BSC (BEP20)** for withdraw and operations. Wrong network can lead to loss of funds.

---
## 2. Step 1: Download and register on an exchange

This guide uses **OKX** and **Binance**; either is fine (flow is similar).

### 2.1 Download the app

- **OKX**: Official site https://www.okx.com — tap “Download App” or search “OKX” in your app store. Use only the official site or store.
- **Binance**: Official site https://www.binance.com — tap “Download App” or search “Binance” in your app store. Same: use only official sources.

### 2.2 Register

1. Open the app and tap “**Register**”.
2. Choose “**Phone**” and enter your number.
3. Enter the **SMS code** you receive.
4. Set a **password** (mix of letters and numbers; remember it).
5. Read and accept the terms and privacy policy if prompted.
6. After signup, enable **2FA** (e.g. Google Authenticator or SMS) under Security.

---
## 3. Step 2: KYC verification

You usually need to complete identity verification before buying or withdrawing.

1. In the app, open “**Identity verification**” or “**KYC**” (often under Profile).
2. Choose document type (e.g. **ID card**).
3. Take photos of **ID front and back** and complete **face verification**.
4. Enter your real name and ID number (must match the document).
5. Submit and wait for review (often minutes to a few hours). Once approved, you can buy and withdraw.

---
## 4. Step 3: Buy USDT

Goal: Buy USDT with fiat and ensure you can later withdraw it on **BSC**.

### 4.1 OKX – Buy USDT

1. In OKX, tap “**Trade**” or “**Buy**”.
2. Choose “**Quick buy**” or “**C2C**” (quick buy is simpler for beginners).
3. Select “**USDT**” as the asset.
4. Choose payment method (card, etc.) and amount (try a small amount first, e.g. 100–500).
5. Pay the seller as instructed and tap “Paid” in the app; once the seller confirms, USDT will appear in your account. If it lands in “Funding”, use “Transfer” to move it to “Spot” if needed for withdraw.

### 4.2 Binance – Buy USDT

1. In Binance, tap “**Buy**” or “**One-click buy**”.
2. Choose card or **C2C**.
3. Select **USDT**, enter amount, and complete payment.
4. USDT will show in your Spot wallet; transfer from other wallets if your app uses separate sections.

### 4.3 After buying

- Try a small amount first.
- Keep payment proof in case of C2C disputes.
- This protocol needs **USDT on BSC (BEP20)**. When you withdraw from the exchange, you must select **BSC (BEP20)** — not ERC20, TRC20, etc.

---
## 5. Step 4: Use a wallet (exchange in-app Web3 wallet recommended)

You need a **BSC-compatible wallet**. You can use the **Web3 wallet inside OKX or Binance**; no need to install MetaMask.

### Recommended: OKX or Binance in-app Web3 wallet

- **OKX**: In the app, open “**Web3 wallet**” or “**DeFi wallet**” (under Assets or Discover). After creating/importing, you get a BSC address you can use for the protocol.
- **Binance**: In the app, open “**Web3 wallet**” or the chain wallet in “Wallet”. Same: create or import, then you have a BSC address.

**Why**: One app for buying, withdrawing to chain, and opening DApps; simpler for beginners.

**What to do:**

1. In the OKX/Binance app, open “**Web3 wallet**” (or similar).
2. If first time, **create** or **import** a wallet and **back up the seed phrase**.
3. Switch the wallet to **BSC** (or BNB Smart Chain).
4. Copy your **BSC receive address** (0x…). You will paste this when withdrawing USDT from the exchange; network must be **BSC (BEP20)**.

You do **not** need MetaMask; the exchange app is enough from buying to connecting to the protocol.

### Optional: MetaMask

If you prefer **MetaMask** or need to use a desktop browser:

- **Mobile**: Install MetaMask from the app store. **Desktop**: Install the MetaMask browser extension from https://metamask.io.
- After creating a wallet, **back up the 12-word seed phrase** and **add BSC** in MetaMask (network name BSC Mainnet, chain ID 56, RPC e.g. https://bsc-dataseed1.binance.org).
- On the protocol site, choose “**MetaMask**” when connecting.

**Summary**: Prefer the exchange in-app Web3 wallet; use MetaMask only if you need desktop or multiple wallets.

---
## 6. Step 5: Withdraw USDT from exchange to wallet

Goal: Send USDT from the exchange to your **on-chain wallet** (OKX/Binance Web3 wallet or MetaMask) on **BSC (BEP20)**.

**Where to find your receive address:**

- **Exchange Web3 wallet**: In the app, open Web3 wallet → select BSC → tap “Receive” or “Copy address” to get your BSC address (0x…).
- **MetaMask**: Open MetaMask, switch to BSC, then copy your account address.

### 6.1 OKX – Withdraw USDT to BSC

1. In OKX: **Assets** → **Withdraw**.
2. Coin: **USDT**.
3. **Network**: Must select **BSC (BEP20)** or “BNB Smart Chain (BEP20)”. Do **not** choose ERC20, TRC20, or others.
4. Paste your **BSC wallet address** (from Web3 wallet or MetaMask).
5. Enter amount (try 10–20 USDT first). Note: You need a little **BNB** in the wallet for gas (see below).
6. Gas: On BSC, transactions cost a small amount of **BNB**. If your wallet has no BNB, buy a little on the exchange and withdraw it to the **same wallet address** on **BSC (BEP20)**. Some exchanges also offer “deduct from amount” for fees.
7. Confirm network, address, and amount; complete SMS/email/2FA.
8. Wait a few minutes; USDT will show in your wallet on BSC.

### 6.2 Binance – Withdraw USDT to BSC

1. In Binance: **Assets** → **Withdraw**.
2. Select **USDT**.
3. **Network**: **BSC (BEP20)** or “BNB Smart Chain (BEP20)”.
4. Paste your **BSC wallet address**.
5. Enter amount, check fee and receive amount.
6. Complete security verification and submit.

### 6.3 Check after withdraw

- In your **OKX/Binance Web3 wallet** or **MetaMask**, switch to **BSC**; you should see USDT.
- If USDT does not show: In the wallet on BSC, use “Add token” or “Import token” and add USDT (contract on BSC; you can look it up on BSCScan).

---
## 7. Step 6: Open the RWA protocol site and connect wallet

### Option A: In a browser

1. In your browser, go to the RWA protocol **official URL** (only use links from official channels).
2. Follow the “Connect wallet” steps below.

### Option B: Open link inside the exchange app (recommended for beginners)

Many users open the site inside the **Binance or OKX app** to avoid typing the URL.

#### Binance app

1. Open **Binance app** → **Discover**.
2. Open “**DApp browser**” or “**Browser**” (or “More” → “Open link”).
3. **Paste** the official RWA protocol URL in the address bar (or use “Paste and go”).
4. Once the site loads, you can connect with “**Binance wallet**” in one tap if you are in the app.
5. **Important**: Only use the link from official announcements or the real website.

#### OKX app

1. Open **OKX app** → **Discover** or **DApp**.
2. Open “**DApp browser**” or “**Built-in browser**”.
3. **Paste** the official RWA protocol URL in the address bar.
4. Connect with “**OKX wallet**” or “**OKX Wallet**” in one tap.
5. Same: use only official links.

#### Copying the link

- **Where to get it**: Official announcements, official website, or official community/support.
- **Copy**: Long-press the link → Copy; or in the browser bar, long-press → Select all → Copy.
- **Paste in app**: In the DApp browser bar, long-press → Paste → Go.

### Connect wallet (same for Option A and B)

1. On the protocol site, tap “**Connect wallet**” or “**Connect Wallet**”.
2. In the popup, choose your wallet:
   - **OKX or Binance in-app Web3 wallet** (recommended): Choose “**OKX wallet**” or “**Binance wallet**”; often auto-detected when opened from the app.
   - **MetaMask**: Choose “**MetaMask**”; on mobile browser you may use “**WalletConnect**” and confirm in MetaMask.
3. In the wallet app or extension, confirm “**Connect**” / “**Authorize**”.
4. After connecting, the site will show your address (short form, e.g. 0x1234…5678) and BSC balances.
5. **Confirm** the site URL is official and the wallet is on **BSC mainnet** (or the network the protocol supports). If the site asks to switch network, approve.

---
## 8. Step 7: Complete staking on the protocol

1. On the site, go to “**Stake**” (or “Stake” in the menu).
2. Choose stake type (**USDT** or **RWA**, as shown).
3. Enter amount (try a small amount first). Check lock period (e.g. Flexible, 30, 90 days) and any rate/fee info.
4. Tap “**Confirm**” or “**Stake**”. In the wallet, **check** contract address, amount, and any Approve + Stake steps; confirm both if there are two tx.
5. Wait for on-chain confirmation. You should then see your position and yield on the Stake or Dashboard page.
6. If you have a referrer, enter their address or code when prompted (usually only once; binding is permanent).

**Yield and withdraw:**

- Static yield is released daily/periodically per the protocol rules.
- To withdraw yield or principal, use the “**Withdraw**” page (see next section).

---
## 9. Step 8: Withdraw and sell to get fiat

When you have yield or want to take out principal: **Withdraw RWA/USDT on the protocol** → **Swap RWA to USDT if needed** → **Send USDT from wallet to exchange** → **Sell USDT for fiat on the exchange**.

### 9.1 Withdraw on the protocol (rewards or principal)

1. Open the RWA protocol site (browser or via link in the exchange app).
2. Connect your wallet and ensure you are on **BSC**.
3. Go to “**Withdraw**” (or “Withdraw” in the menu).
4. Use the cards as needed:
   - **RWA rewards**: If you have pending RWA, enter amount in the “RWA withdraw” card; ensure **cooldown** has passed (e.g. 24h since last claim). Confirm and sign in the wallet.
   - **Principal**: For flexible stakes, use the principal withdraw section; for locked stakes, after unlock use the same page to withdraw principal. Sign in the wallet.
   - **stRWA unlock**: If you have locked stRWA, after the lock period use the “stRWA unlock” card.
5. Each on-chain action costs a little **BNB** (gas); keep some BNB in the wallet.
6. After success, RWA or USDT will be in your **wallet** (visible in MetaMask or the exchange Web3 wallet on BSC).

### 9.2 Swap RWA to USDT (sell)

If you withdrew **RWA** and want **USDT** (then fiat):

**Option A: On the protocol (recommended)**

1. On the site, go to “**Swap**” (or “Swap”).
2. Choose “**RWA → USDT**”.
3. Enter the RWA amount and check estimated USDT and fees.
4. Tap “Confirm” and sign in the wallet; USDT will arrive in your wallet.

**Option B: On a DEX**

If the protocol does not offer RWA/USDT, use a BSC DEX (e.g. PancakeSwap) to swap RWA for USDT; follow that DEX’s UI and mind liquidity and slippage.

### 9.3 Send USDT from wallet back to the exchange

Once you have USDT in your wallet (from protocol withdraw or RWA swap):

1. Open **Binance or OKX app** → **Assets** → **Deposit** (or “Deposit”).
2. Coin: **USDT**.
3. **Network**: **BSC (BEP20)** or “BNB Smart Chain (BEP20)”.
4. Copy the **deposit address** (0x…) shown by the exchange.
5. In your wallet (MetaMask or exchange Web3 wallet), choose “**Send**” or “**Transfer**”: coin **USDT**, network **BSC**, paste the exchange deposit address, enter amount (you can leave a little USDT for future gas). Confirm and send.
6. Wait a few minutes; USDT will show in your exchange spot/funding account.

### 9.4 Sell USDT for fiat on the exchange

1. In the exchange app, go to “**Sell**”, “**C2C Sell**”, or “Quick sell”.
2. Sell **USDT**; choose payout method (e.g. **Bank card**, PayPal, or your region’s option).
3. Enter amount or fiat equivalent; check rate and fees.
4. Submit the order and complete the trade with the buyer (they send fiat to your linked account; you release USDT in the app after you receive payment).
5. Funds arrive in your bank or e-wallet; you have completed “**getting your profit in fiat**”.

### 9.5 Withdraw and sell – summary

| Step | Where | Result |
|------|--------|--------|
| 1. Withdraw RWA/principal | Protocol “Withdraw” page | RWA or USDT in wallet |
| 2. RWA → USDT | Protocol “Swap” or DEX | More USDT in wallet |
| 3. USDT to exchange | Wallet → Exchange (BSC deposit) | USDT in exchange account |
| 4. USDT → fiat | Exchange C2C/Sell | Fiat in bank/e-wallet |

**Note**: Withdraw may have **cooldown** (e.g. 24h) and **fees** (e.g. 8%); check current protocol rules. For C2C, use verified merchants and avoid scams.

---
## 10. FAQ and safety

### 10.1 FAQ

- **Q: I withdrew USDT on the wrong network (e.g. ERC20). What do I do?**  
  A: The funds are on that network at the same address. This protocol is on BSC, so you cannot use them here. Contact the exchange or use a wallet/tool that supports that network; do not use “recovery” services from the internet — they are often scams.

- **Q: I have no BNB for gas.**  
  A: Buy a little BNB on the exchange and withdraw it to the same wallet address on **BSC (BEP20)**.

- **Q: Do I have to use MetaMask? Can I use OKX/Binance wallet?**  
  A: **No, MetaMask is not required.** The protocol supports OKX and Binance in-app Web3 wallets. Connect “OKX wallet” or “Binance wallet” on the protocol site; no need to install MetaMask. The in-app wallet is simpler: buy, withdraw to chain, and open DApp in one app.

- **Q: I connected my wallet but don’t see my balance.**  
  A: Make sure the wallet is on **BSC**. If USDT still does not show, add the USDT token on BSC manually (contract address from BSCScan).

- **Q: I can’t find “paste link” / DApp browser in Binance/OKX app.**  
  A: It may be under “Discover”, “DApp”, “More”, or “Browser” depending on app version. If there is no in-app browser, copy the official link and open it in your phone’s browser (Safari, Chrome), then connect the wallet there.

- **Q: My transaction is stuck “pending”.**  
  A: On BSC it can be slow when busy. Wait a bit or try increasing gas in the wallet. Do not submit the same tx again.

- **Q: How do I turn my rewards or principal into fiat?**  
  A: Withdraw RWA or principal to your wallet on the protocol “Withdraw” page. If you have RWA, swap to USDT on the protocol “Swap” or a DEX. Then send USDT from your wallet to the exchange (BSC BEP20 deposit). Finally sell USDT for fiat on the exchange (C2C/Sell). See “Step 8: Withdraw and sell” above.

### 10.2 Safety

1. **Seed phrase / private key**: Never share with anyone; no screenshots, no cloud. Anyone asking for them is a scam.
2. **Official links only**: Get the protocol link from the official site, official social channels, or support. Do not click links from strangers or fake “support”.
3. **Try small first**: Use small amounts for your first buy, withdraw, and stake.
4. **Check address and network**: Always double-check the receive address and that you selected **BSC (BEP20)** before confirming.
5. **Invest responsibly**: Understand the protocol and risks; only use funds you can afford to lose.

---
## Appendix: Checklist

**Getting started**

| Step | Task | Done |
|------|------|------|
| 1 | Download exchange app (OKX/Binance) and register | ☐ |
| 2 | Complete KYC | ☐ |
| 3 | Buy USDT with fiat on the exchange | ☐ |
| 4 | Use OKX/Binance Web3 wallet (or install MetaMask); back up seed | ☐ |
| 5 | Ensure BSC network and copy BSC receive address | ☐ |
| 6 | Withdraw USDT to that address; network BSC (BEP20) | ☐ |
| 7 | Open RWA protocol site (browser or paste link in app) and connect wallet | ☐ |
| 8 | Complete first stake (small amount recommended) | ☐ |

**Withdraw and cash out**

| Step | Task | Done |
|------|------|------|
| 9 | On protocol “Withdraw” page, claim RWA or withdraw principal | ☐ |
| 10 | On protocol “Swap” or DEX, swap RWA to USDT if needed | ☐ |
| 11 | Send USDT from wallet to exchange (BSC BEP20 deposit) | ☐ |
| 12 | Sell USDT for fiat on exchange (C2C/Sell) | ☐ |

---

Doc version 1.1 | Follow the current UI of the protocol and your exchange; refer to latest announcements for changes.`,
  },
}
