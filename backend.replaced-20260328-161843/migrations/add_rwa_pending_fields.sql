-- 扩展 user_stats 表，添加 rwaPending 字段

ALTER TABLE user_stats
ADD COLUMN usdt_rwa_pending DECIMAL(38, 0) DEFAULT 0 COMMENT 'USDT质押产生的RWA待领取（wei）',
ADD COLUMN rwa_rwa_pending DECIMAL(38, 0) DEFAULT 0 COMMENT 'RWA质押产生的RWA待领取（wei）',
ADD COLUMN rwa_pending_updated_at TIMESTAMP NULL COMMENT 'RWA待领取最后更新时间';

-- 创建索引
CREATE INDEX idx_rwa_pending_updated ON user_stats(rwa_pending_updated_at);
