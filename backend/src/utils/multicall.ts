import { ethers } from 'ethers';

const MULTICALL3 = '0xcA11bde05977b3631167028862bE2a173976CA11';

/**
 * 使用 Multicall3 批量查询链上数据
 */
export async function multicall<T>(
  provider: ethers.Provider,
  calls: { target: string; calldata: string }[],
  decode: (data: string, index: number) => T
): Promise<T[]> {
  const multicallAbi = [
    'function aggregate3(tuple(address target, bool allowFailure, bytes callData)[] calls) returns (tuple(bool success, bytes returnData)[] returnData)',
  ];

  const contract = new ethers.Contract(MULTICALL3, multicallAbi, provider);
  const results = await contract.aggregate3(
    calls.map((c) => ({ target: c.target, allowFailure: true, callData: c.calldata }))
  );

  return results.map((r: { success: boolean; returnData: string }, i: number) => {
    if (!r.success) throw new Error(`Multicall failed at index ${i}`);
    return decode(r.returnData, i);
  });
}
