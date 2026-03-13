import { useAccount, useSignTypedData } from 'wagmi';
import { parseUnits } from 'viem';
import { useState } from 'react';

const DOMAIN = {
  name: 'RWAStaking',
  version: '1',
  chainId: 97, // BSC Testnet
  verifyingContract: '0xaa2ba3E010545186bD4418B5d6acD687730627Ce' as `0x${string}`,
};

const RELAYER_URL = process.env.NEXT_PUBLIC_RELAYER_URL || 'http://localhost:3001';

export function useMetaStake() {
  const { address } = useAccount();
  const { signTypedDataAsync } = useSignTypedData();
  const [isLoading, setIsLoading] = useState(false);

  const metaStake = async (amount: string, referrer: string, lockPeriod: number) => {
    if (!address) throw new Error('Not connected');
    
    setIsLoading(true);
    try {
      // 1. 获取 nonce
      const nonceRes = await fetch(`${RELAYER_URL}/api/nonce/${address}`);
      const { nonce } = await nonceRes.json();
      
      // 2. 签名
      const deadline = Math.floor(Date.now() / 1000) + 3600;
      const amountWei = parseUnits(amount, 6);
      
      const signature = await signTypedDataAsync({
        domain: DOMAIN,
        types: {
          Stake: [
            { name: 'user', type: 'address' },
            { name: 'amount', type: 'uint256' },
            { name: 'referrer', type: 'address' },
            { name: 'lockPeriod', type: 'uint256' },
            { name: 'nonce', type: 'uint256' },
            { name: 'deadline', type: 'uint256' },
          ],
        },
        primaryType: 'Stake',
        message: {
          user: address,
          amount: amountWei,
          referrer: referrer as `0x${string}`,
          lockPeriod: BigInt(lockPeriod),
          nonce: BigInt(nonce),
          deadline: BigInt(deadline),
        },
      });
      
      // 3. 发送到中继服务
      const res = await fetch(`${RELAYER_URL}/api/meta-stake`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: address,
          amount: amountWei.toString(),
          referrer,
          lockPeriod,
          deadline,
          signature,
        }),
      });
      
      const result = await res.json();
      if (!result.success) throw new Error(result.error);
      
      return result.txHash;
    } finally {
      setIsLoading(false);
    }
  };

  return { metaStake, isLoading };
}
