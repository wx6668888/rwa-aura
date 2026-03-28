import { ethers } from "hardhat";
import type { StRWA } from "../../typechain-types";

/**
 * 当前质押流程不再在 stake 时铸造 stRWA，但领取 USDT 质押收益仍会 burn amount/2 的 stRWA。
 * 集成测试在接上 StRWA 后需为用户补足余额，否则 withdraw / emergencyWithdraw 会 revert Staking_R。
 */
export async function mintStRwaViaStakingContract(
  stRwaToken: StRWA,
  stakingContractAddress: string,
  to: string,
  amount: bigint
): Promise<void> {
  await ethers.provider.send("hardhat_impersonateAccount", [stakingContractAddress]);
  const code = await ethers.provider.getCode(stakingContractAddress);
  if (code === "0x") {
    throw new Error("mintStRwaViaStakingContract: invalid staking address");
  }
  // 质押合约无 receive：不能转 ETH；用 hardhat_setBalance 给 impersonate 账户付 gas
  await ethers.provider.send("hardhat_setBalance", [
    stakingContractAddress,
    "0x1000000000000000000",
  ]);
  const stakingSigner = await ethers.getSigner(stakingContractAddress);
  await stRwaToken.connect(stakingSigner).mint(to, amount);
  await ethers.provider.send("hardhat_stopImpersonatingAccount", [stakingContractAddress]);
}
