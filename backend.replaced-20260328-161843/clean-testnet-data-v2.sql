-- 清理测试网数据脚本（基于实际表结构）
-- 执行前请确保已备份数据库！

USE rwa_protocol;

-- 1. 清空用户数据
TRUNCATE TABLE users;
TRUNCATE TABLE user_stats;
TRUNCATE TABLE user_stake_orders;

-- 2. 清空质押数据
TRUNCATE TABLE stakes;
TRUNCATE TABLE rwa_stakes;
TRUNCATE TABLE locked_stakes;
TRUNCATE TABLE rwa_locked_principals;

-- 3. 清空奖励数据
TRUNCATE TABLE rewards;
TRUNCATE TABLE reward_updates;
TRUNCATE TABLE direct_referral_rewards;

-- 4. 清空推荐数据
TRUNCATE TABLE referral_bindings;
TRUNCATE TABLE referral_quality_score;
TRUNCATE TABLE referral_settlement_batches;
TRUNCATE TABLE node_level_history;
TRUNCATE TABLE node_level_updates;

-- 5. 清空快照和结算
TRUNCATE TABLE balance_snapshots;
TRUNCATE TABLE yield_settlements;
TRUNCATE TABLE daily_settlements;

-- 6. 清空事件记录
TRUNCATE TABLE stake_events;
TRUNCATE TABLE withdrawal_events;
TRUNCATE TABLE emergency_withdrawals;
TRUNCATE TABLE lock_maturity_events;
TRUNCATE TABLE approval_events;
TRUNCATE TABLE strwa_mints;
TRUNCATE TABLE token_burns;
TRUNCATE TABLE system_config_changes;

-- 7. 清空统计数据
TRUNCATE TABLE homepage_stats;

-- 8. 重置事件处理状态（保留表结构，清空数据）
DELETE FROM event_processing_state;
DELETE FROM sync_status;

SELECT '✅ 测试网数据已清理完成' AS status;
