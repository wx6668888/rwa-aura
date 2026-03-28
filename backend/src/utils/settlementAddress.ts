import { ethers } from 'ethers';

/** 日结相关库表统一小写地址，避免 0xAa / 0xaa 被当成两笔结算 */
export function normalizeSettlementUserAddress(userAddress: string): string {
  try {
    return ethers.getAddress(userAddress).toLowerCase();
  } catch {
    return userAddress.trim().toLowerCase();
  }
}
