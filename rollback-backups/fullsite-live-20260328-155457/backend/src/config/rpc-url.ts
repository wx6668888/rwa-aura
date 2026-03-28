/**
 * BSC JSON-RPC 统一解析：生产环境必须在 .env 配置 BSC_RPC_URL（主网）。
 * 顺序：主网 → 显式测试网变量 → 通用 RPC_URL → 主网公共节点（避免误连测试网导致「合约地址无代码」）
 */
export function getBscRpcUrl(): string {
  const u =
    process.env.BSC_RPC_URL?.trim() ||
    process.env.BSC_TESTNET_RPC_URL?.trim() ||
    process.env.RPC_URL?.trim();
  if (u) return u;
  return 'https://bsc.publicnode.com';
}
