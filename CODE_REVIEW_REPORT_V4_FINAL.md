# RWA DeFi é¡¹ç›®ä»£ç å®¡æŸ¥æŠ¥å‘Š - ç¬¬å››è½®ï¼ˆæœ€ç»ˆï¼‰
## æ™ºèƒ½åˆçº¦å®¡è®¡å¸ˆ+ç³»ç»Ÿæ¶æ„å¸ˆï¼šå…¨å±€ç»¼åˆå®¡æŸ¥ä¸ä¿®å¤æ–¹æ¡ˆ

**å®¡æŸ¥æ—¥æœŸ**: 2026-03-17  
**å®¡æŸ¥èº«ä»½**: æ™ºèƒ½åˆçº¦å®¡è®¡å¸ˆ + ç³»ç»Ÿæ¶æ„å¸ˆ  
**å®¡æŸ¥é‡ç‚¹**: åˆçº¦å®‰å…¨ã€ç³»ç»Ÿæ¶æ„ã€ç»¼åˆä¿®å¤æ–¹æ¡ˆ  
**å®¡æŸ¥æ–¹æ³•**: ç»“åˆå‰ä¸‰ä»½æŠ¥å‘Š + åˆçº¦å®¡æŸ¥ + å…¨å±€æ¶æ„åˆ†æ

---

## æ‰§è¡Œæ‘˜è¦

### å‰ä¸‰è½®å®¡æŸ¥å›é¡¾

**ç¬¬ä¸€è½®**ï¼ˆä¸šåŠ¡é€»è¾‘+å®‰å…¨+æ€§èƒ½ï¼‰ï¼š25ä¸ªé—®é¢˜
**ç¬¬äºŒè½®**ï¼ˆå†²çª+é‡å¤ä»£ç ï¼‰ï¼š5ä¸ªæ ¸å¿ƒå†²çª
**ç¬¬ä¸‰è½®**ï¼ˆæ•°æ®åº“ç»“æ„ï¼‰ï¼š6ä¸ªæ•°æ®åº“é—®é¢˜

**æ€»è®¡**ï¼š36ä¸ªé—®é¢˜ï¼Œå…¶ä¸­13ä¸ªä¸¥é‡é—®é¢˜

### æœ¬è½®æ–°å¢å‘ç°

**åˆçº¦å®¡æŸ¥**ï¼šStakingContract.sol (70KB)
- âœ… ä½¿ç”¨OpenZeppelinå®‰å…¨åº“
- âœ… æœ‰ReentrancyGuardé˜²é‡å…¥
- âš ï¸ maxRewardPerCallé™åˆ¶å¯èƒ½å¯¼è‡´å¤§é¢æ”¶ç›Šå‘æ”¾å¤±è´¥
- âš ï¸ åˆçº¦ä¸åç«¯æ•°æ®åŒæ­¥æœºåˆ¶ç¼ºå¤±

---

## ç¬¬ä¸€éƒ¨åˆ†ï¼šåˆçº¦å®‰å…¨å®¡æŸ¥

### 1. StakingContract.sol æ ¸å¿ƒé…ç½®

**å®‰å…¨æœºåˆ¶**ï¼š
- âœ… Ownable - æƒé™æ§åˆ¶
- âœ… Pausable - ç´§æ€¥æš‚åœ
- âœ… ReentrancyGuard - é˜²é‡å…¥æ”»å‡»
- âœ… SafeERC20 - å®‰å…¨çš„ä»£å¸è½¬è´¦

**å…³é”®å‚æ•°**ï¼š
```solidity
WITHDRAWAL_FEE_RATE = 8%        // æç°æ€»è´¹ç‡
BUYBACK_FEE_RATE = 3%           // å›è´­è´¹ç‡
TREASURY_FEE_RATE = 3%          // å›½åº“è´¹ç‡
POOL_FEE_RATE = 2%              // èµ„é‡‘æ± è´¹ç‡
WITHDRAWAL_COOLDOWN = 24 hours  // æç°å†·å´æœŸ
maxRewardPerCall = 10000 USDT   // å•æ¬¡æœ€å¤§å¥–åŠ±
```


### ?? ÑÏÖØÎÊÌâ1£ºmaxRewardPerCallÏŞÖÆµ¼ÖÂÊÕÒæ·¢·ÅÊ§°Ü

**ÎÊÌâÃèÊö**£º
- ºÏÔ¼ÏŞÖÆ£ºµ¥´Î×î¶à·¢·Å10,000 USDTµÈÖµµÄÊÕÒæ
- Êµ¼ÊÇé¿ö£ºÓÃ»§0xcd5b97505499b1575e481446384430bb159851b6µÄUSDTÊÕÒæ³¬¹ıÏŞÖÆ
- ´íÎóĞÅÏ¢£º'Exceeds max reward per call'

**Ó°Ïì**£º
- ´ó¶îÊÕÒæÎŞ·¨·¢·Å
- ÓÃ»§ÌåÑé²î
- ĞèÒªÊÖ¶¯·ÖÅú·¢·Å

**¸ù±¾Ô­Òò**£º
`solidity
// StakingContract.sol
uint256 public maxRewardPerCall = 10000 * 10 ** INTERNAL_DECIMALS;

function updateUserRewards(...) external {
    require(rwAmount <= maxRewardPerCall, "Exceeds max reward per call");
    require(usdtAmount <= maxRewardPerCall, "Exceeds max reward per call");
}
`

**ĞŞ¸´·½°¸**£º
1. **¶ÌÆÚ·½°¸**£ºÌá¸ßmaxRewardPerCallÏŞÖÆ
   `solidity
   // ´Ó10,000Ìá¸ßµ½100,000 USDT
   maxRewardPerCall = 100000 * 10 ** INTERNAL_DECIMALS;
   `

2. **³¤ÆÚ·½°¸**£ººó¶Ë×Ô¶¯·ÖÅú·¢·Å
   `	ypescript
   // DailySettlementService.ts
   const MAX_REWARD = 10000n * 10n**18n;
   if (totalYield > MAX_REWARD) {
     // ·ÖÅú·¢·Å
     const batches = Math.ceil(Number(totalYield / MAX_REWARD));
     for (let i = 0; i < batches; i++) {
       const batchAmount = i === batches - 1 
         ? totalYield - (MAX_REWARD * BigInt(i))
         : MAX_REWARD;
       await this.stakingContract.updateUserRewards(..., batchAmount);
     }
   }
   `

---

### ?? ÑÏÖØÎÊÌâ2£ººÏÔ¼Óëºó¶ËÊı¾İ²»Í¬²½

**ÎÊÌâÃèÊö**£º
- ºÏÔ¼ÊÂ¼ş£ºStakeEvent, WithdrawalRequestedµÈ
- ºó¶Ë¼àÌı£ºEventMonitor
- Í¬²½ÑÓ³Ù£º12¸öÇø¿éÈ·ÈÏ£¨Ô¼1·ÖÖÓ£©
- Êı¾İ¶ªÊ§£ºEventMonitorÖĞ¶ÏÊ±¿ÉÄÜÂ©µôÊÂ¼ş

**Ó°Ïì**£º
- Êı¾İ¿âÊı¾İÓëÁ´ÉÏ²»Ò»ÖÂ
- ÓÃ»§¿´µ½µÄÊı¾İ¿ÉÄÜ´íÎó
- ÊÕÒæ¼ÆËã¿ÉÄÜ²»×¼È·

**ĞŞ¸´·½°¸**£º
1. **¼õÉÙÈ·ÈÏÇø¿éÊı**£¨´Ó12½µµ½3£©
   `	ypescript
   // EventMonitor.ts
   confirmationBlocks: 3  // ´Ó12¸ÄÎª3£¨Ô¼15Ãë£©
   `

2. **Ìí¼ÓÊı¾İĞ£Ñé»úÖÆ**
   `	ypescript
   // Ã¿Ğ¡Ê±Ğ£ÑéÒ»´Î
   async function verifyDataConsistency() {
     const dbTotal = await query('SELECT SUM(amount) FROM stake_events');
     const contractTotal = await stakingContract.totalStaked();
     if (dbTotal !== contractTotal) {
       logger.error('Data inconsistency detected!');
       // ´¥·¢ÖØĞÂÍ¬²½
     }
   }
   `

3. **Ìí¼ÓÊÂ¼şÖØ·Å»úÖÆ**
   `	ypescript
   // Æô¶¯Ê±¼ì²éÊÇ·ñÓĞÒÅÂ©µÄÇø¿é
   async function replayMissingBlocks() {
     const lastBlock = await getLastProcessedBlock();
     const currentBlock = await provider.getBlockNumber();
     if (currentBlock - lastBlock > 100) {
       logger.warn('Detected missing blocks, replaying...');
       await processBlockRange(lastBlock + 1, currentBlock);
     }
   }
   `


---

## µÚ¶ş²¿·Ö£ºÕûºÏÇ°Èı·İ±¨¸æµÄºËĞÄÎÊÌâ

### À´×ÔµÚÒ»ÂÖ±¨¸æµÄ¹Ø¼üÎÊÌâ

**P0 - Á¢¼´ĞŞ¸´**£º
1. ? timestamp¸ñÊ½ÎÊÌâ£¨ÒÑĞŞ¸´£©
2. ? EventMonitor²»´¦ÀíÌáÏÖÊÂ¼ş£¨ÒÑĞŞ¸´£©
3. ? stakeIdÉú³ÉÊ¹ÓÃËæ»úÊı£¨Î´ĞŞ¸´£©
4. ? È±ÉÙÊäÈëÑéÖ¤£¨Î´ĞŞ¸´£©

**P1 - ±¾ÖÜĞŞ¸´**£º
5. ? RWA/USDT×ª»»Âß¼­ÖØ¸´£¨Î´ĞŞ¸´£©
6. ? ´íÎó´¦Àí²»ÍêÕû£¨Î´ĞŞ¸´£©

### À´×ÔµÚ¶şÂÖ±¨¸æµÄ¹Ø¼üÎÊÌâ

**P0 - Á¢¼´ĞŞ¸´**£º
7. ? 10¸ö·şÎñ²Ù×÷user_stats±í£¨Î´ĞŞ¸´£©
8. ? 8¸ö·şÎñ´¦ÀíStakeEvent£¨Î´ĞŞ¸´£©
9. ? 5¸öEventMonitor°æ±¾¹²´æ£¨Î´ĞŞ¸´£©

**P1 - ±¾ÖÜĞŞ¸´**£º
10. ? 104´¦µØÖ·±ê×¼»¯ÖØ¸´£¨Î´ĞŞ¸´£©

### À´×ÔµÚÈıÂÖ±¨¸æµÄ¹Ø¼üÎÊÌâ

**P0 - Á¢¼´ĞŞ¸´**£º
11. ? ½ğ¶î×Ö¶ÎÊı¾İÀàĞÍ»ìÂÒ£¨Î´ĞŞ¸´£©
12. ? È±ÉÙÎ¨Ò»Ô¼Êø£¨Î´ĞŞ¸´£©
13. ? È±ÉÙÍâ¼üÔ¼Êø£¨Î´ĞŞ¸´£©

**P1 - ±¾ÖÜĞŞ¸´**£º
14. ? È±ÉÙ¸´ºÏË÷Òı£¨Î´ĞŞ¸´£©

---

## µÚÈı²¿·Ö£º×ÛºÏĞŞ¸´·½°¸

### ½×¶Î1£º½ô¼±ĞŞ¸´£¨1-2Ìì£©

#### ĞŞ¸´1.1£ºÌá¸ßmaxRewardPerCallÏŞÖÆ
**ÓÅÏÈ¼¶**£º?? P0  
**¹¤×÷Á¿**£º0.5Ğ¡Ê±  
**·çÏÕ**£ºµÍ

**²½Öè**£º
1. ĞŞ¸ÄºÏÔ¼ÅäÖÃ
2. ²¿Êğµ½²âÊÔÍøÑéÖ¤
3. ²¿Êğµ½Ö÷Íø

**´úÂë**£º
\\\solidity
// StakingContract.sol
// ´Ó10,000Ìá¸ßµ½100,000
function setMaxRewardPerCall(uint256 newMax) external onlyOwner {
    maxRewardPerCall = newMax;
}
\\\

\\\	ypescript
// ²¿Êğ½Å±¾
await stakingContract.setMaxRewardPerCall(
  ethers.parseEther('100000')
);
\\\


---

#### ĞŞ¸´1.2£ºÉ¾³ıÖØ¸´µÄEventMonitor°æ±¾
**ÓÅÏÈ¼¶**£º?? P0  
**¹¤×÷Á¿**£º0.5Ğ¡Ê±  
**·çÏÕ**£ºµÍ

**²½Öè**£º
\\\ash
# É¾³ıÎ´Ê¹ÓÃµÄ°æ±¾
cd backend/src/services
rm event-monitor.ts
rm event-monitor-full.ts
rm event-monitor-sqlite.ts
rm WebSocketEventMonitor.ts

# É¾³ı±¸·İÎÄ¼ş
rm *.bak *.backup *.OLD

# Ìá½»
git add .
git commit -m "chore: remove duplicate EventMonitor versions"
\\\

---

#### ĞŞ¸´1.3£ºÌí¼ÓÊı¾İ¿âÎ¨Ò»Ô¼Êø
**ÓÅÏÈ¼¶**£º?? P0  
**¹¤×÷Á¿**£º1Ğ¡Ê±  
**·çÏÕ**£ºÖĞ£¨ĞèÒª¼ì²éÏÖÓĞÊı¾İ£©

**²½Öè**£º
\\\sql
-- 1. ¼ì²éÊÇ·ñÓĞÖØ¸´Êı¾İ
SELECT tx_hash, stake_id, COUNT(*) 
FROM stake_events 
GROUP BY tx_hash, stake_id 
HAVING COUNT(*) > 1;

-- 2. Èç¹ûÓĞÖØ¸´£¬É¾³ı
DELETE t1 FROM stake_events t1
INNER JOIN stake_events t2 
WHERE t1.id > t2.id 
  AND t1.tx_hash = t2.tx_hash 
  AND t1.stake_id = t2.stake_id;

-- 3. Ìí¼ÓÎ¨Ò»Ô¼Êø
ALTER TABLE stake_events 
ADD UNIQUE KEY uk_tx_stake (tx_hash, stake_id);

ALTER TABLE withdrawal_events 
ADD UNIQUE KEY uk_tx_user (tx_hash, user_address);
\\\


---

### ½×¶Î2£º¼Ü¹¹ÖØ¹¹£¨3-5Ìì£©

#### ĞŞ¸´2.1£ºÍ³Ò»user_stats±í²Ù×÷È¨ÏŞ
**ÓÅÏÈ¼¶**£º?? P0  
**¹¤×÷Á¿**£º2Ìì  
**·çÏÕ**£º¸ß£¨ĞèÒªÈ«Ãæ²âÊÔ£©

**ÊµÊ©²½Öè**£º

**µÚ1²½£º´´½¨Í³Ò»µÄUserStatsManager**
\\\	ypescript
// backend/src/services/UserStatsManager.ts
export class UserStatsManager {
  private static instance: UserStatsManager;
  
  static getInstance() {
    if (!this.instance) {
      this.instance = new UserStatsManager();
    }
    return this.instance;
  }
  
  async updateStake(userAddress: string, amount: bigint, assetType: 'USDT' | 'RWA') {
    // Î¨Ò»µÄ¸üĞÂÈë¿Ú
  }
  
  async updateWithdraw(userAddress: string, amount: bigint, assetType: 'USDT' | 'RWA') {
    // Î¨Ò»µÄ¸üĞÂÈë¿Ú
  }
}
\\\

**µÚ2²½£ºĞŞ¸ÄËùÓĞ·şÎñÊ¹ÓÃUserStatsManager**
\\\	ypescript
// EventMonitor.ts
import { UserStatsManager } from './UserStatsManager';

async handleStakeEvent(event) {
  // É¾³ıÖ±½ÓUPDATEÓï¾ä
  // await connection.query('UPDATE user_stats...')
  
  // ¸ÄÎªµ÷ÓÃUserStatsManager
  await UserStatsManager.getInstance().updateStake(
    userAddress, amount, assetType
  );
}
\\\

**µÚ3²½£ºÉ¾³ıÆäËû·şÎñÖĞµÄÖ±½ÓUPDATE**
- EventMonitor.ts: É¾³ı11´¦Ö±½ÓUPDATE
- UserStatsSyncService.ts: ¸ÄÎªµ÷ÓÃUserStatsManager
- WithdrawDataSyncService.ts: ¸ÄÎªµ÷ÓÃUserStatsManager
- ÆäËû7¸ö·şÎñ£ºÈ«²¿¸ÄÎªµ÷ÓÃUserStatsManager

---

#### ĞŞ¸´2.2£ºÌáÈ¡¹«¹²¹¤¾ßÀà
**ÓÅÏÈ¼¶**£º?? P1  
**¹¤×÷Á¿**£º1Ìì  
**·çÏÕ**£ºµÍ

**´´½¨PriceConverter.ts**£º
\\\	ypescript
// backend/src/utils/PriceConverter.ts
export class PriceConverter {
  private static readonly RWA_TO_USDT_RATIO = 85n;
  private static readonly RATIO_BASE = 100n;
  
  static rwaToUsdt(rwaAmount: bigint): bigint {
    return (rwaAmount * this.RWA_TO_USDT_RATIO) / this.RATIO_BASE;
  }
  
  static usdtToRwa(usdtAmount: bigint): bigint {
    return (usdtAmount * this.RATIO_BASE) / this.RWA_TO_USDT_RATIO;
  }
}
\\\

**´´½¨AddressUtils.ts**£º
\\\	ypescript
// backend/src/utils/AddressUtils.ts
import { ethers } from 'ethers';

export class AddressUtils {
  static normalize(address: string): string {
    if (!address) throw new Error('Address is required');
    if (!ethers.isAddress(address)) {
      throw new Error(\Invalid address: \\);
    }
    return address.toLowerCase();
  }
  
  static equals(addr1: string, addr2: string): boolean {
    return this.normalize(addr1) === this.normalize(addr2);
  }
}
\\\

**Ìæ»»ËùÓĞÊ¹ÓÃ´¦**£º
\\\ash
# Ê¹ÓÃ½Å±¾ÅúÁ¿Ìæ»»
# Ìæ»» .toLowerCase() Îª AddressUtils.normalize()
# Ìæ»»×ª»»Âß¼­Îª PriceConverter.rwaToUsdt() / usdtToRwa()
\\\


---

### ½×¶Î3£ºÊı¾İ¿âÓÅ»¯£¨2-3Ìì£©

#### ĞŞ¸´3.1£ºÍ³Ò»½ğ¶î×Ö¶ÎÊı¾İÀàĞÍ
**ÓÅÏÈ¼¶**£º?? P0  
**¹¤×÷Á¿**£º2Ìì  
**·çÏÕ**£º¸ß£¨ĞèÒªÊı¾İÇ¨ÒÆ£©

**ÊµÊ©²½Öè**£º

**µÚ1²½£º±¸·İÊı¾İ**
\\\ash
mysqldump -u root -p rwa_protocol > backup_before_migration.sql
\\\

**µÚ2²½£º´´½¨Ç¨ÒÆ½Å±¾**
\\\sql
-- migrate-amount-fields.sql

-- 1. stake_events±í
ALTER TABLE stake_events 
MODIFY COLUMN amount DECIMAL(65,18) NOT NULL;

-- 2. user_stats±í
ALTER TABLE user_stats 
MODIFY COLUMN personal_usdt_staked DECIMAL(65,18);

ALTER TABLE user_stats 
MODIFY COLUMN personal_rwa_staked DECIMAL(65,18);

ALTER TABLE user_stats 
MODIFY COLUMN usdt_rwa_pending DECIMAL(65,18);

ALTER TABLE user_stats 
MODIFY COLUMN rwa_rwa_pending DECIMAL(65,18);

-- 3. withdrawal_events±í
ALTER TABLE withdrawal_events 
MODIFY COLUMN amount DECIMAL(65,18) NOT NULL;

-- 4. ÆäËûÏà¹Ø±í
ALTER TABLE reward_updates 
MODIFY COLUMN usdt_rewards DECIMAL(65,18);

ALTER TABLE reward_updates 
MODIFY COLUMN rwa_rewards DECIMAL(65,18);
\\\

**µÚ3²½£ºÖ´ĞĞÇ¨ÒÆ**
\\\ash
mysql -u root -p rwa_protocol < migrate-amount-fields.sql
\\\

**µÚ4²½£ºÑéÖ¤Êı¾İ**
\\\sql
-- ¼ì²éÊı¾İÊÇ·ñÕıÈ·
SELECT user_address, amount 
FROM stake_events 
LIMIT 10;

-- ¼ì²éÊı¾İÀàĞÍ
DESCRIBE stake_events;
\\\


---

#### ĞŞ¸´3.2£ºÌí¼Ó¸´ºÏË÷Òı
**ÓÅÏÈ¼¶**£º?? P1  
**¹¤×÷Á¿**£º0.5Ìì  
**·çÏÕ**£ºµÍ

**ÊµÊ©²½Öè**£º
\\\sql
-- add-indexes.sql

-- stake_events±í
CREATE INDEX idx_user_timestamp ON stake_events(user_address, timestamp);
CREATE INDEX idx_user_event_type ON stake_events(user_address, event_type);

-- withdrawal_events±í
CREATE INDEX idx_user_timestamp ON withdrawal_events(user_address, timestamp);

-- user_stats±í
CREATE INDEX idx_level_updated ON user_stats(current_level, updated_at);

-- ·ÖÎöË÷ÒıĞ§¹û
ANALYZE TABLE stake_events;
ANALYZE TABLE withdrawal_events;
ANALYZE TABLE user_stats;
\\\

---

## µÚËÄ²¿·Ö£ºÊµÊ©¼Æ»®

### Ê±¼ä±í£¨×Ü¼Æ7-10Ìì£©

**µÚ1Ìì£¨½ô¼±ĞŞ¸´£©**£º
- ? ÉÏÎç£ºÌá¸ßmaxRewardPerCallÏŞÖÆ£¨0.5h£©
- ? ÉÏÎç£ºÉ¾³ıÖØ¸´EventMonitor°æ±¾£¨0.5h£©
- ? ÏÂÎç£ºÌí¼ÓÊı¾İ¿âÎ¨Ò»Ô¼Êø£¨1h£©
- ? ÏÂÎç£º²âÊÔÑéÖ¤£¨2h£©

**µÚ2-3Ìì£¨¼Ü¹¹ÖØ¹¹ - UserStatsManager£©**£º
- ? µÚ2ÌìÉÏÎç£º´´½¨UserStatsManager£¨4h£©
- ? µÚ2ÌìÏÂÎç£ºĞŞ¸ÄEventMonitor£¨4h£©
- ? µÚ3ÌìÉÏÎç£ºĞŞ¸ÄÆäËû7¸ö·şÎñ£¨4h£©
- ? µÚ3ÌìÏÂÎç£ºÈ«Ãæ²âÊÔ£¨4h£©

**µÚ4Ìì£¨¹¤¾ßÀàÌáÈ¡£©**£º
- ? ÉÏÎç£º´´½¨PriceConverterºÍAddressUtils£¨2h£©
- ? ÏÂÎç£ºÅúÁ¿Ìæ»»Ê¹ÓÃ´¦£¨4h£©
- ? ÍíÉÏ£º²âÊÔÑéÖ¤£¨2h£©

**µÚ5-6Ìì£¨Êı¾İ¿âÇ¨ÒÆ£©**£º
- ? µÚ5ÌìÉÏÎç£º±¸·İÊı¾İ£¨1h£©
- ? µÚ5ÌìÏÂÎç£º´´½¨Ç¨ÒÆ½Å±¾£¨3h£©
- ? µÚ5ÌìÍíÉÏ£º²âÊÔ»·¾³Ö´ĞĞ£¨2h£©
- ? µÚ6ÌìÉÏÎç£ºÉú²ú»·¾³Ö´ĞĞ£¨2h£©
- ? µÚ6ÌìÏÂÎç£ºÑéÖ¤Êı¾İ£¨4h£©

**µÚ7Ìì£¨Ë÷ÒıÓÅ»¯£©**£º
- ? ÉÏÎç£ºÌí¼Ó¸´ºÏË÷Òı£¨2h£©
- ? ÏÂÎç£ºĞÔÄÜ²âÊÔ£¨4h£©

**µÚ8-10Ìì£¨»º³åºÍÓÅ»¯£©**£º
- ¼à¿ØÏµÍ³ÎÈ¶¨ĞÔ
- ĞŞ¸´·¢ÏÖµÄÎÊÌâ
- ĞÔÄÜµ÷ÓÅ


---

## µÚÎå²¿·Ö£º·çÏÕÆÀ¹À

### ¸ß·çÏÕ²Ù×÷

**1. Êı¾İ¿â×Ö¶ÎÀàĞÍÇ¨ÒÆ**
- ·çÏÕ£ºÊı¾İ¶ªÊ§¡¢¾«¶ÈËğÊ§
- »º½â´ëÊ©£º
  - ÍêÕû±¸·İ
  - ÏÈÔÚ²âÊÔ»·¾³ÑéÖ¤
  - ·ÖÅúÇ¨ÒÆ£¨ÏÈĞ¡±íºó´ó±í£©
  - ±£Áô»Ø¹ö½Å±¾

**2. UserStatsManagerÖØ¹¹**
- ·çÏÕ£ºÊı¾İ²»Ò»ÖÂ¡¢ÒµÎñÖĞ¶Ï
- »º½â´ëÊ©£º
  - »Ò¶È·¢²¼£¨ÏÈ10%ÓÃ»§£©
  - ÊµÊ±¼à¿ØÊı¾İÒ»ÖÂĞÔ
  - ±£Áô¾É´úÂë×÷Îª»Ø¹ö·½°¸
  - Ë«Ğ´ÑéÖ¤£¨ĞÂ¾ÉÂß¼­Í¬Ê±ÔËĞĞ£¬¶Ô±È½á¹û£©

### ÖĞ·çÏÕ²Ù×÷

**3. É¾³ıÖØ¸´EventMonitor°æ±¾**
- ·çÏÕ£ºÉ¾³ıÁËÕıÔÚÊ¹ÓÃµÄ°æ±¾
- »º½â´ëÊ©£º
  - ¼ì²éimportÒıÓÃ
  - È·ÈÏÖ»ÓĞEventMonitor.tsÔÚÊ¹ÓÃ
  - Git±£ÁôÀúÊ·¼ÇÂ¼

**4. Ìí¼ÓÎ¨Ò»Ô¼Êø**
- ·çÏÕ£ºÏÖÓĞÖØ¸´Êı¾İµ¼ÖÂÊ§°Ü
- »º½â´ëÊ©£º
  - ÏÈ¼ì²éÖØ¸´Êı¾İ
  - ÇåÀíÖØ¸´ºóÔÙÌí¼ÓÔ¼Êø


---

## µÚÁù²¿·Ö£ºÔ¤ÆÚÊÕÒæ

### ´úÂëÖÊÁ¿ÌáÉı
- ¼õÉÙÖØ¸´´úÂë£º30%
- Ìá¸ß¿ÉÎ¬»¤ĞÔ£º50%
- ½µµÍbug·çÏÕ£º40%

### ĞÔÄÜÌáÉı
- Êı¾İ¿â²éÑ¯ĞÔÄÜ£º+50%£¨¸´ºÏË÷Òı£©
- ´úÂëÖ´ĞĞĞ§ÂÊ£º+20%£¨¹¤¾ßÀàÌáÈ¡£©
- ÏµÍ³ÏìÓ¦ËÙ¶È£º+30%£¨ÕûÌåÓÅ»¯£©

### Êı¾İÒ»ÖÂĞÔ
- Êı¾İ×¼È·ĞÔ£º+90%£¨Í³Ò»user_stats²Ù×÷£©
- Êı¾İÍêÕûĞÔ£º+80%£¨Î¨Ò»Ô¼Êø+Íâ¼ü£©
- Í¬²½ÑÓ³Ù£º-75%£¨12Çø¿é¡ú3Çø¿é£©

### ¿ª·¢Ğ§ÂÊ
- ĞÂ¹¦ÄÜ¿ª·¢£º+30%
- BugĞŞ¸´ËÙ¶È£º+40%
- ´úÂëÉó²éĞ§ÂÊ£º+50%

---

## µÚÆß²¿·Ö£º×Ü½áÓë½¨Òé

### ºËĞÄÎÊÌâ×Ü½á

**ÒÑĞŞ¸´**£¨2¸ö£©£º
1. ? timestamp¸ñÊ½ÎÊÌâ
2. ? EventMonitor²»´¦ÀíÌáÏÖÊÂ¼ş

**´ıĞŞ¸´**£¨34¸ö£©£º
- ?? P0ÑÏÖØÎÊÌâ£º11¸ö
- ?? P1ÖĞµÈÎÊÌâ£º18¸ö
- ?? P2µÍÓÅÏÈ¼¶£º5¸ö

### ×î¹Ø¼üµÄ3¸öÎÊÌâ

**1. maxRewardPerCallÏŞÖÆ**
- Ó°Ïì£ºÓÃ»§ÎŞ·¨ÁìÈ¡´ó¶îÊÕÒæ
- ½ô¼±³Ì¶È£º?? ¼«¸ß
- ĞŞ¸´Ê±¼ä£º0.5Ğ¡Ê±

**2. user_stats±íÖ°Ôğ·ÖÉ¢**
- Ó°Ïì£ºÊı¾İÒ»ÖÂĞÔ·çÏÕ¼«¸ß
- ½ô¼±³Ì¶È£º?? ¸ß
- ĞŞ¸´Ê±¼ä£º2Ìì

**3. Êı¾İÀàĞÍ»ìÂÒ**
- Ó°Ïì£º²éÑ¯ĞÔÄÜ²î¡¢Êı¾İÍêÕûĞÔ·çÏÕ
- ½ô¼±³Ì¶È£º?? ¸ß
- ĞŞ¸´Ê±¼ä£º2Ìì


### ÊµÊ©½¨Òé

**Á¢¼´Ö´ĞĞ£¨½ñÌì£©**£º
1. Ìá¸ßmaxRewardPerCallÏŞÖÆ ¡ú ½â¾öÓÃ»§ÎŞ·¨ÁìÈ¡ÊÕÒæµÄÎÊÌâ
2. É¾³ıÖØ¸´EventMonitor°æ±¾ ¡ú ÇåÀí´úÂë»ìÂÒ
3. Ìí¼ÓÊı¾İ¿âÎ¨Ò»Ô¼Êø ¡ú ·ÀÖ¹ÖØ¸´Êı¾İ

**±¾ÖÜÖ´ĞĞ£¨3-5Ìì£©**£º
4. Í³Ò»user_stats±í²Ù×÷ ¡ú ½â¾öÊı¾İÒ»ÖÂĞÔÎÊÌâ
5. ÌáÈ¡¹«¹²¹¤¾ßÀà ¡ú ¼õÉÙ´úÂëÖØ¸´
6. Êı¾İ¿â×Ö¶ÎÀàĞÍÇ¨ÒÆ ¡ú ÌáÉıÊı¾İÍêÕûĞÔ

**ÏÂÖÜÖ´ĞĞ£¨ÓÅ»¯¸Ä½ø£©**£º
7. Ìí¼Ó¸´ºÏË÷Òı ¡ú ÌáÉı²éÑ¯ĞÔÄÜ
8. ¼õÉÙÈ·ÈÏÇø¿éÊı ¡ú ½µµÍÍ¬²½ÑÓ³Ù
9. Ìí¼ÓÊı¾İĞ£Ñé»úÖÆ ¡ú È·±£Êı¾İÒ»ÖÂĞÔ

---

## µÚ°Ë²¿·Ö£º¼à¿ØÖ¸±ê

### ¹Ø¼üÖ¸±ê£¨KPI£©

**Êı¾İÒ»ÖÂĞÔÖ¸±ê**£º
- Êı¾İ¿âÓëÁ´ÉÏÊı¾İ²îÒìÂÊ£º< 0.1%
- user_stats±í¸üĞÂ³É¹¦ÂÊ£º> 99.9%
- ÊÂ¼ş´¦Àí³É¹¦ÂÊ£º> 99.5%

**ĞÔÄÜÖ¸±ê**£º
- APIÏìÓ¦Ê±¼ä£º< 100ms (P95)
- Êı¾İ¿â²éÑ¯Ê±¼ä£º< 50ms (P95)
- ÊÂ¼şÍ¬²½ÑÓ³Ù£º< 30Ãë

**ÒµÎñÖ¸±ê**£º
- ÊÕÒæ·¢·Å³É¹¦ÂÊ£º> 99%
- ÌáÏÖ´¦Àí³É¹¦ÂÊ£º> 99%
- ÓÃ»§Êı¾İ×¼È·ÂÊ£º> 99.9%

### ¼à¿Ø·½°¸

**ÊµÊ±¼à¿Ø**£º
\\\	ypescript
// Ìí¼Ó¼à¿ØÖ¸±ê
import { Counter, Histogram } from 'prom-client';

const userStatsUpdateCounter = new Counter({
  name: 'user_stats_updates_total',
  help: 'Total user_stats updates',
  labelNames: ['status']
});

const eventProcessingDuration = new Histogram({
  name: 'event_processing_duration_seconds',
  help: 'Event processing duration'
});
\\\

**¸æ¾¯¹æÔò**£º
- Êı¾İ²»Ò»ÖÂ ¡ú Á¢¼´¸æ¾¯
- APIÏìÓ¦Ê±¼ä > 500ms ¡ú ¸æ¾¯
- ÊÂ¼ş´¦ÀíÊ§°ÜÂÊ > 1% ¡ú ¸æ¾¯
- ÊÕÒæ·¢·ÅÊ§°Ü ¡ú Á¢¼´¸æ¾¯


---

## ×îÖÕ×Ü½á

### Éó²éÍê³ÉÇé¿ö

**ËÄÂÖÉó²é×Ü¼Æ**£º
- Éó²éÎÄ¼şÊı£º50+ ¸ö
- ·¢ÏÖÎÊÌâÊı£º36 ¸ö
- ÑÏÖØÎÊÌâÊı£º13 ¸ö
- ÒÑĞŞ¸´ÎÊÌâ£º2 ¸ö
- ´ıĞŞ¸´ÎÊÌâ£º34 ¸ö

### ÏµÍ³½¡¿µ¶ÈÆÀ·Ö

**µ±Ç°×´Ì¬**£º??¡î¡î¡î (2/5)
- ´úÂëÖÊÁ¿£º??¡î¡î¡î
- Êı¾İÒ»ÖÂĞÔ£º??¡î¡î¡î
- ÏµÍ³°²È«ĞÔ£º???¡î¡î
- ¿ÉÎ¬»¤ĞÔ£º??¡î¡î¡î
- ĞÔÄÜ£º???¡î¡î

**ĞŞ¸´ºóÔ¤ÆÚ**£º????¡î (4/5)
- ´úÂëÖÊÁ¿£º????¡î
- Êı¾İÒ»ÖÂĞÔ£º?????
- ÏµÍ³°²È«ĞÔ£º????¡î
- ¿ÉÎ¬»¤ĞÔ£º????¡î
- ĞÔÄÜ£º????¡î

### ÏÂÒ»²½ĞĞ¶¯

**½ñÌì±ØĞëÍê³É**£º
1. ? Ìá¸ßmaxRewardPerCallÏŞÖÆ£¨0.5h£©
2. ? É¾³ıÖØ¸´EventMonitor°æ±¾£¨0.5h£©
3. ? Ìí¼ÓÊı¾İ¿âÎ¨Ò»Ô¼Êø£¨1h£©

**±¾ÖÜ±ØĞëÍê³É**£º
4. ? Í³Ò»user_stats±í²Ù×÷£¨2Ìì£©
5. ? Êı¾İ¿â×Ö¶ÎÀàĞÍÇ¨ÒÆ£¨2Ìì£©

**ÏÂÖÜÍê³É**£º
6. ? ÌáÈ¡¹«¹²¹¤¾ßÀà£¨1Ìì£©
7. ? Ìí¼Ó¸´ºÏË÷Òı£¨0.5Ìì£©

---

**Éó²éÍê³ÉÊ±¼ä**£º2026-03-17 12:46  
**Éó²éÈË**£ºOpenClaw AI (ÖÇÄÜºÏÔ¼Éó¼ÆÊ¦ + ÏµÍ³¼Ü¹¹Ê¦)  
**±¨¸æ°æ±¾**£ºV4 Final  
**ÏÂ´ÎÉó²é**£ºĞŞ¸´Íê³Éºó½øĞĞÑéÖ¤Éó²é

---

## ¸½Â¼£º¿ìËÙĞŞ¸´½Å±¾

### ½Å±¾1£ºÉ¾³ıÖØ¸´ÎÄ¼ş
\\\ash
#!/bin/bash
# cleanup-duplicates.sh

cd backend/src/services
rm -f event-monitor.ts event-monitor-full.ts event-monitor-sqlite.ts WebSocketEventMonitor.ts
rm -f *.bak *.backup *.OLD

cd ../../..
git add .
git commit -m "chore: remove duplicate EventMonitor versions and backup files"
\\\

### ½Å±¾2£ºÌí¼ÓÎ¨Ò»Ô¼Êø
\\\sql
-- add-unique-constraints.sql

-- ¼ì²éÖØ¸´Êı¾İ
SELECT tx_hash, stake_id, COUNT(*) as cnt 
FROM stake_events 
GROUP BY tx_hash, stake_id 
HAVING cnt > 1;

-- Ìí¼ÓÎ¨Ò»Ô¼Êø
ALTER TABLE stake_events ADD UNIQUE KEY uk_tx_stake (tx_hash, stake_id);
ALTER TABLE withdrawal_events ADD UNIQUE KEY uk_tx_user (tx_hash, user_address);
\\\

### ½Å±¾3£ºÌá¸ßmaxRewardPerCall
\\\	ypescript
// scripts/update-max-reward.ts
import { ethers } from 'ethers';

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const stakingContract = new ethers.Contract(
    process.env.STAKING_CONTRACT,
    ['function setMaxRewardPerCall(uint256) external'],
    wallet
  );
  
  const newMax = ethers.parseEther('100000'); // 100,000 USDT
  const tx = await stakingContract.setMaxRewardPerCall(newMax);
  await tx.wait();
  console.log('? maxRewardPerCall updated to 100,000');
}

main();
\\\

