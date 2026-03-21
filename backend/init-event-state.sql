-- 初始化event_processing_state表
USE rwa_protocol;

-- 插入StakingContract的事件监听状态
INSERT INTO event_processing_state (contract_address, event_name, last_processed_block) VALUES
('0x8FA4A4BE954a80c940623DDa1ed6e3D50FC25175', 'Staked', 46377016),
('0x8FA4A4BE954a80c940623DDa1ed6e3D50FC25175', 'Withdrawn', 46377016),
('0x8FA4A4BE954a80c940623DDa1ed6e3D50FC25175', 'RewardClaimed', 46377016);

-- 插入RWAToken的事件监听状态
INSERT INTO event_processing_state (contract_address, event_name, last_processed_block) VALUES
('0x0B4f2Ca412466fDBf7B0691Ca6F5b51A197f4812', 'Transfer', 46377016);

-- 插入ReferralRewardPool的事件监听状态
INSERT INTO event_processing_state (contract_address, event_name, last_processed_block) VALUES
('0x5DC995e0B3662F8071001F9454FDcAD47D4A4151', 'RewardDistributed', 46377016);

SELECT '✅ event_processing_state初始化完成' AS status;
