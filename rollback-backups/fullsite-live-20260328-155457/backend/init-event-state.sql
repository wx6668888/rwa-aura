-- 初始化 event_processing_state 表（示例）
-- 部署后请按各合约真实部署块修改 last_processed_block，并与 STAKING_DEPLOY_BLOCK 等 .env 一致
USE rwa_protocol;

INSERT INTO event_processing_state (contract_address, event_name, last_processed_block) VALUES
('0x1E297055ffAA3BDD2a2eD96bD86A1B89d9245f99', 'Staked', 88000000),
('0x1E297055ffAA3BDD2a2eD96bD86A1B89d9245f99', 'Withdrawn', 88000000),
('0x1E297055ffAA3BDD2a2eD96bD86A1B89d9245f99', 'RewardClaimed', 88000000);

INSERT INTO event_processing_state (contract_address, event_name, last_processed_block) VALUES
('0x9EF16931f3628f48dE1A2FfCF6f7fdf34A5240A6', 'Transfer', 88000000);

INSERT INTO event_processing_state (contract_address, event_name, last_processed_block) VALUES
('0x80748B89042Ee30953E55856Cac473D1126720A6', 'RewardDistributed', 88000000);

SELECT '✅ event_processing_state 初始化完成（请核对区块号）' AS status;
