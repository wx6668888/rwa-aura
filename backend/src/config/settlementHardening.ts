/**
 * 收益结算加固策略（不易出错）——与实现位置对照：
 *
 * 1) 日结金额只来自链上仓位（OnChainYieldCalculator + 结算窗口起点区块），禁止再用
 *    balance_snapshots 积分作为发放依据（DailySettlementService 已固定为链上公式）。
 *
 * 2) 数据库防重：yield_settlements 唯一键 (user, asset, settlement_time)；
 *    balance_snapshots 逻辑唯一 bs_dedupe_key；EventMonitor 写入前 SELECT + ER_DUP_ENTRY。
 *
 * 3) RPC：生产应配置可稳定 eth_getLogs 的起始块 STAKING_DEPLOY_BLOCK；历史对账需 Archive 节点。
 *
 * 4) 链上多记修正：owner 使用 adminClawbackRwaStakePending / adminClawbackUsdtStakingRewards，
 *    无需重部署合约即可调账；重部署仅在新合约逻辑不可替代时考虑。
 *
 * 5) 前端展示待领取：以 RwaPendingSyncService → user_stats 与链上一致为准。
 */

export const SETTLEMENT_CHAIN_ONLY = true;
