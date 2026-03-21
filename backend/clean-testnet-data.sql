-- 清理测试网数据脚本
-- 执行前请确保已备份数据库！

USE rwa_protocol;

-- 1. 清空用户相关数据
TRUNCATE TABLE users;
TRUNCATE TABLE user_stats;

-- 2. 清空质押相关数据
TRUNCATE TABLE stakes;
TRUNCATE TABLE rwa_stakes;

-- 3. 清空奖励相关数据
TRUNCATE TABLE rewards;
TRUNCATE TABLE referral_rewards;

-- 4. 清空推荐相关数据
TRUNCATE TABLE referrals;

-- 5. 清空交易记录
TRUNCATE TABLE transactions;

-- 6. 清空余额快照
TRUNCATE TABLE balance_snapshots;

-- 7. 清空收益结算
TRUNCATE TABLE yield_settlements;

-- 8. 清空提现数据
TRUNCATE TABLE withdrawals;

-- 9. 清空事件日志
TRUNCATE TABLE event_logs;

-- 10. 清空待处理数据
TRUNCATE TABLE pending_stakes;
TRUNCATE TABLE pending_withdrawals;

SELECT '✅ 测试网数据已清理完成' AS status;
