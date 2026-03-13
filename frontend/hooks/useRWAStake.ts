import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits } from 'viem';
import { useState } from 'react';

export function useRWAStake() {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [isLoading, setIsLoading] = useState(false);

  const stakeRWA = async (
    rwaAddress: string,
    stakingAddress: string,
    amount: string,
    referrer: string,
    lockPeriod: number
  ) => {
    if (!address) throw new Error('Not connected');
    
    setIsLoading(true);
    try {
      const amountWei = parseUnits(amount, 18);
      
      // 1. Approve RWA
      console.log('Approving RWA...');
      const approveTx = await writeContractAsync({
        address: rwaAddress as `0x${string}`,
        abi: [{ name: 'approve', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] }],
        functionName: 'approve',
        args: [stakingAddress, amountWei],
      });
      console.log('Approve tx:', approveTx);
      
      // 2. Stake RWA
      console.log('Staking RWA...');
      const stakeTx = await writeContractAsync({
        address: stakingAddress as `0x${string}`,
        abi: [{ name: 'stakeRWA', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'amount', type: 'uint256' }, { name: 'referrer', type: 'address' }, { name: 'lockPeriod', type: 'uint256' }], outputs: [] }],
        functionName: 'stakeRWA',
        args: [amountWei, referrer as `0x${string}`, BigInt(lockPeriod)],
      });
      
      console.log('Stake tx:', stakeTx);
      return stakeTx;
    } finally {
      setIsLoading(false);
    }
  };

  return { stakeRWA, isLoading };
}
