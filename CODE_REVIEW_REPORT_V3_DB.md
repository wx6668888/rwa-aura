# RWA DeFi é¡¹ç›®ä»£ç å®¡æŸ¥æŠ¥å‘Š - ç¬¬ä¸‰è½®
## æ•°æ®åº“æ¶æ„å¸ˆè§†è§’ï¼šæ•°æ®åº“ç»“æ„æ·±åº¦åˆ†æ

**å®¡æŸ¥æ—¥æœŸ**: 2026-03-17  
**å®¡æŸ¥é‡ç‚¹**: æ•°æ®åº“è¡¨ç»“æ„ã€ç´¢å¼•ã€çº¦æŸã€æ•°æ®ç±»å‹  
**å®¡æŸ¥æ–¹æ³•**: æ•°æ®åº“æ¶æ„å¸ˆä¸“ä¸šè§†è§’

---

## æ‰§è¡Œæ‘˜è¦

**æ•°æ®åº“ç±»å‹**: MySQL (ç”Ÿäº§ç¯å¢ƒ)  
**Schemaæ–‡ä»¶**: SQLiteæ ¼å¼ï¼ˆå­˜åœ¨ä¸ä¸€è‡´ï¼‰  
**è¡¨æ•°é‡**: 20+ å¼ è¡¨  

### ç«‹å³å‘ç°çš„ä¸¥é‡é—®é¢˜

ğŸ”´ **Schemaä¸å®é™…æ•°æ®åº“ä¸ä¸€è‡´**
- schema.sqlæ˜¯SQLiteæ ¼å¼
- å®é™…ä½¿ç”¨MySQLæ•°æ®åº“
- å¯èƒ½å¯¼è‡´éƒ¨ç½²é—®é¢˜

---

## è¯¦ç»†å®¡æŸ¥

### 1. æ•°æ®ç±»å‹è®¾è®¡é—®é¢˜

#### ğŸ”´ ä¸¥é‡é—®é¢˜ï¼šé‡‘é¢å­—æ®µä½¿ç”¨TEXT

**é—®é¢˜è¡¨**: stake_events, withdrawal_events, reward_updates

**å½“å‰è®¾è®¡**:
```sql
amount TEXT NOT NULL
```

**é—®é¢˜åˆ†æ**:
- âŒ é‡‘é¢åº”è¯¥ä½¿ç”¨DECIMALï¼Œä¸æ˜¯TEXT
- âŒ æ— æ³•è¿›è¡Œæ•°å€¼è®¡ç®—å’Œæ¯”è¾ƒ
- âŒ å¯èƒ½å­˜å‚¨æ— æ•ˆæ•°æ®
- âŒ æŸ¥è¯¢æ€§èƒ½å·®

**å½±å“**:
- æ•°æ®å®Œæ•´æ€§é£é™©
- æŸ¥è¯¢æ•ˆç‡ä½
- æ— æ³•ä½¿ç”¨SUM/AVGç­‰èšåˆå‡½æ•°

**å»ºè®®**:
```sql
-- MySQLæ­£ç¡®è®¾è®¡
amount DECIMAL(65,18) NOT NULL COMMENT 'é‡‘é¢ï¼ˆ18ä½ç²¾åº¦ï¼‰'
```


---

#### ?? ÑÏÖØÎÊÌâ£ºÊı¾İÀàĞÍ²»Ò»ÖÂ

**ÎÊÌâ**: Í¬ÀàÊı¾İÊ¹ÓÃ²»Í¬Êı¾İÀàĞÍ

**stake_events±í**:
- amount: varchar(78) ?

**user_stats±í**:
- personal_usdt_staked: varchar(78) ?
- personal_rwa_staked: varchar(78) ?
- personal_total_usdt: decimal(20,3) ?
- usdt_rwa_pending: decimal(38,0) ?? (¾«¶È²»×ã)
- rwa_rwa_pending: decimal(38,0) ?? (¾«¶È²»×ã)

**ÎÊÌâ·ÖÎö**:
- ? Í¬Ò»±íÖĞ½ğ¶î×Ö¶ÎÀàĞÍ²»Í³Ò»
- ? varcharÎŞ·¨½øĞĞÊıÖµÔËËã
- ? decimal(38,0)Ã»ÓĞĞ¡ÊıÎ»£¬²»ÊÊºÏ18Î»¾«¶È
- ? decimal(20,3)¾«¶ÈÌ«µÍ

**Ó°Ïì**:
- Êı¾İ²éÑ¯ĞèÒªÀàĞÍ×ª»»
- ¾ÛºÏ¼ÆËãÀ§ÄÑ
- Êı¾İÒ»ÖÂĞÔ·çÏÕ

**½¨Òé**:
```sql
-- Í³Ò»Ê¹ÓÃDECIMAL(65,18)
ALTER TABLE stake_events MODIFY amount DECIMAL(65,18) NOT NULL;
ALTER TABLE user_stats MODIFY personal_usdt_staked DECIMAL(65,18);
ALTER TABLE user_stats MODIFY personal_rwa_staked DECIMAL(65,18);
ALTER TABLE user_stats MODIFY usdt_rwa_pending DECIMAL(65,18);
ALTER TABLE user_stats MODIFY rwa_rwa_pending DECIMAL(65,18);
```


---

### 2. Ë÷ÒıÉè¼ÆÎÊÌâ

#### ?? ÖĞµÈÎÊÌâ£ºÈ±ÉÙ¸´ºÏË÷Òı

**stake_events±íµ±Ç°Ë÷Òı**:
- PRIMARY (id)
- idx_user (user_address)
- idx_referrer (referrer_address)
- idx_timestamp (timestamp)
- idx_stake_id (stake_id)

**ÎÊÌâ·ÖÎö**:
- ? Ö»ÓĞµ¥ÁĞË÷Òı
- ? ³£¼û²éÑ¯Ä£Ê½Î´ÓÅ»¯£ºWHERE user_address = ? AND timestamp BETWEEN ? AND ?
- ? È±ÉÙ¸²¸ÇË÷Òı

**Ó°Ïì**:
- ²éÑ¯ĞÔÄÜ²î
- ÎŞ·¨ÀûÓÃË÷Òı¸²¸Ç

**½¨Òé**:
```sql
-- Ìí¼Ó¸´ºÏË÷Òı
CREATE INDEX idx_user_timestamp ON stake_events(user_address, timestamp);
CREATE INDEX idx_user_event_type ON stake_events(user_address, event_type);

-- ¸²¸ÇË÷Òı£¨³£ÓÃ²éÑ¯£©
CREATE INDEX idx_user_time_amount ON stake_events(user_address, timestamp, amount);
```

---

#### ?? ÑÏÖØÎÊÌâ£ºÈ±ÉÙÎ¨Ò»Ô¼Êø

**ÎÊÌâ**: tx_hashÓ¦¸ÃÓĞÎ¨Ò»Ô¼Êø·ÀÖ¹ÖØ¸´

**µ±Ç°Éè¼Æ**:
- Ã»ÓĞUNIQUEÔ¼Êø

**Ó°Ïì**:
- ¿ÉÄÜ²åÈëÖØ¸´µÄ½»Ò×
- ÃİµÈĞÔ¼ì²éÒÀÀµÓ¦ÓÃ²ã

**½¨Òé**:
```sql
-- Ìí¼ÓÎ¨Ò»Ô¼Êø
ALTER TABLE stake_events ADD UNIQUE KEY uk_tx_stake (tx_hash, stake_id);
ALTER TABLE withdrawal_events ADD UNIQUE KEY uk_tx_user (tx_hash, user_address);
```


---

### 3. Ô¼ÊøºÍÊı¾İÒ»ÖÂĞÔÎÊÌâ

#### ?? ÑÏÖØÎÊÌâ£ºÈ±ÉÙÍâ¼üÔ¼Êø

**ÎÊÌâ**: ¹Ø¼ü±íÖ®¼äÃ»ÓĞÍâ¼üÔ¼Êø

**µ±Ç°Éè¼Æ**:
- stake_events.user_address ¡ú ÎŞÍâ¼ü
- withdrawal_events.user_address ¡ú ÎŞÍâ¼ü
- referral_bindings.user_address ¡ú ÎŞÍâ¼ü
- user_stats.user_address ¡ú ÎŞÍâ¼ü

**Ó°Ïì**:
- ¿ÉÄÜ³öÏÖ¹ÂÁ¢Êı¾İ
- Êı¾İÍêÕûĞÔÎŞ·¨±£Ö¤
- É¾³ıÓÃ»§Ê±ÎŞ·¨¼¶Áª´¦Àí

**½¨Òé**:
```sql
-- Ìí¼ÓÍâ¼üÔ¼Êø£¨Èç¹ûĞÔÄÜÔÊĞí£©
ALTER TABLE stake_events 
  ADD CONSTRAINT fk_stake_user 
  FOREIGN KEY (user_address) REFERENCES users(address) 
  ON DELETE RESTRICT;

ALTER TABLE user_stats 
  ADD CONSTRAINT fk_stats_user 
  FOREIGN KEY (user_address) REFERENCES users(address) 
  ON DELETE CASCADE;
```

**×¢Òâ**: Íâ¼üÔ¼Êø»áÓ°ÏìĞÔÄÜ£¬ĞèÒªÈ¨ºâ

---

### 4. ±í½á¹¹Éè¼ÆÎÊÌâ

#### ?? ÖĞµÈÎÊÌâ£ºtimestamp×Ö¶ÎÃüÃû²»Ò»ÖÂ

**ÎÊÌâ**: ²»Í¬±íÊ¹ÓÃ²»Í¬µÄÊ±¼ä×Ö¶ÎÃû

**·¢ÏÖ**:
- stake_events: timestamp (bigint)
- user_stats: updated_at (datetime)
- user_stats: rwa_pending_updated_at (timestamp)

**Ó°Ïì**:
- ´úÂë»ìÂÒ
- ²éÑ¯²»Ò»ÖÂ

**½¨Òé**:
- Í³Ò»Ê¹ÓÃ created_at (BIGINT) ´æ´¢UnixÊ±¼ä´Á
- Í³Ò»Ê¹ÓÃ updated_at (BIGINT) ´æ´¢¸üĞÂÊ±¼ä


---

### 5. ĞÔÄÜÓÅ»¯½¨Òé

#### ?? ÖĞµÈÎÊÌâ£º´ó±íÈ±ÉÙ·ÖÇø

**ÎÊÌâ**: stake_eventsºÍwithdrawal_events»á³ÖĞøÔö³¤

**½¨Òé**:
```sql
-- °´ÔÂ·ÖÇø
ALTER TABLE stake_events 
PARTITION BY RANGE (UNIX_TIMESTAMP(FROM_UNIXTIME(timestamp))) (
  PARTITION p202601 VALUES LESS THAN (UNIX_TIMESTAMP('2026-02-01')),
  PARTITION p202602 VALUES LESS THAN (UNIX_TIMESTAMP('2026-03-01')),
  PARTITION p202603 VALUES LESS THAN (UNIX_TIMESTAMP('2026-04-01')),
  PARTITION pmax VALUES LESS THAN MAXVALUE
);
```

---

## Êı¾İ¿âÉè¼ÆÎÊÌâÍ³¼Æ

| ÎÊÌâÀàĞÍ | ÑÏÖØ³Ì¶È | ÊıÁ¿ |
|---------|---------|------|
| Êı¾İÀàĞÍ²»Ò»ÖÂ | ?? ÑÏÖØ | 5+ |
| È±ÉÙÎ¨Ò»Ô¼Êø | ?? ÑÏÖØ | 2 |
| È±ÉÙÍâ¼üÔ¼Êø | ?? ÑÏÖØ | 4+ |
| È±ÉÙ¸´ºÏË÷Òı | ?? ÖĞµÈ | ¶à´¦ |
| ×Ö¶ÎÃüÃû²»Ò»ÖÂ | ?? ÖĞµÈ | ¶à´¦ |

---

## ¸Ä½øÓÅÏÈ¼¶

### ?? µÚÒ»ÓÅÏÈ¼¶£¨Êı¾İÍêÕûĞÔ£©

1. **Í³Ò»½ğ¶î×Ö¶ÎÊı¾İÀàĞÍ**
   - ¹¤×÷Á¿£º2Ìì
   - ·çÏÕ£º¸ß£¨ĞèÒªÊı¾İÇ¨ÒÆ£©
   - ÊÕÒæ£ºÊı¾İÒ»ÖÂĞÔ´ó·ùÌáÉı

2. **Ìí¼ÓÎ¨Ò»Ô¼Êø**
   - ¹¤×÷Á¿£º0.5Ìì
   - ·çÏÕ£ºµÍ
   - ÊÕÒæ£º·ÀÖ¹ÖØ¸´Êı¾İ

### ?? µÚ¶şÓÅÏÈ¼¶£¨ĞÔÄÜÓÅ»¯£©

3. **Ìí¼Ó¸´ºÏË÷Òı**
   - ¹¤×÷Á¿£º1Ìì
   - ·çÏÕ£ºµÍ
   - ÊÕÒæ£º²éÑ¯ĞÔÄÜÌáÉı50%+

4. **¿¼ÂÇÍâ¼üÔ¼Êø**
   - ¹¤×÷Á¿£º1Ìì
   - ·çÏÕ£ºÖĞ£¨ĞÔÄÜÓ°Ïì£©
   - ÊÕÒæ£ºÊı¾İÍêÕûĞÔ±£Ö¤

---

**Éó²éÍê³ÉÊ±¼ä**: 2026-03-17 12:36  
**Éó²éÈË**: OpenClaw AI (Êı¾İ¿â¼Ü¹¹Ê¦)  
**½¨Òé**: ÓÅÏÈĞŞ¸´Êı¾İÀàĞÍÎÊÌâ£¬È»ºóÓÅ»¯Ë÷Òı

