import { useAccount, useSignTypedData } from 'wagmi';
import { parseUnits, hexToSignature } from 'viem';
import { useState } from 'react';

const RELAYER_URL = process.env.NEXT_PUBLIC_RELAYER_URL || 'http://localhost:3001';

export function useGaslessStake() {
  const { address, chainId } = useAccount();
  const { signTypedDataAsync } = useSignTypedData();
  const [isLoading, setIsLoading] = useState(false);

  const gaslessStake = async (
    usdtAddress: string,
    stakingAddress: string,
    amount: string,
    referrer: string,
    lockPeriod: number
  ) => {
    if (!address || !chainId) throw new Error('Not connected');
    const amt = amount != null ? String(amount).trim() : '';
    if (!amt || isNaN(parseFloat(amt))) throw new Error('请输入有效的质押金额');
    const lockSafe = Number.isFinite(Number(lockPeriod)) ? Number(lockPeriod) : 0;
    
    setIsLoading(true);
    try {
      console.log('Starting gasless stake...');
      const amountWei = parseUnits(amt, 6);
      const deadline = Math.floor(Date.now() / 1000) + 3600;
      
      // 获取 nonces
      console.log('Fetching nonce...');
      const nonceRes = await fetch(`${RELAYER_URL}/api/nonce/${address}`);
      if (!nonceRes.ok) {
        throw new Error(`Failed to fetch nonce: ${nonceRes.status}`);
      }
      const noncePayload = await nonceRes.json();
      const nonce = noncePayload?.nonce;
      if (nonce == null) {
        throw new Error('后端未返回 nonce，请确认后端已启动且 /api/nonce 可用');
      }
      console.log('Staking nonce:', nonce);

      // 获取 USDT permit nonce
      console.log('Fetching USDT permit nonce...');
      const usdtNonceRes = await fetch(`${RELAYER_URL}/api/usdt-nonce/${address}`);
      if (!usdtNonceRes.ok) {
        throw new Error(`Failed to fetch USDT nonce: ${usdtNonceRes.status}`);
      }
      const usdtNoncePayload = await usdtNonceRes.json();
      const usdtNonce = usdtNoncePayload?.nonce;
      if (usdtNonce == null) {
        throw new Error('后端未返回 USDT permit nonce，请确认 /api/usdt-nonce 可用');
      }
      console.log('USDT permit nonce:', usdtNonce);

      // 1. Permit 签名
      console.log('Requesting Permit signature...');
      const permitSig = await signTypedDataAsync({
        domain: {
          name: 'Test USDT',
          version: '1',
          chainId,
          verifyingContract: usdtAddress as `0x${string}`,
        },
        types: {
          Permit: [
            { name: 'owner', type: 'address' },
            { name: 'spender', type: 'address' },
            { name: 'value', type: 'uint256' },
            { name: 'nonce', type: 'uint256' },
            { name: 'deadline', type: 'uint256' },
          ],
        },
        primaryType: 'Permit',
        message: {
          owner: address,
          spender: stakingAddress as `0x${string}`,
          value: amountWei,
          nonce: BigInt(usdtNonce),
          deadline: BigInt(deadline),
        },
      });
      
      const { v, r, s } = hexToSignature(permitSig);
      console.log('Permit signature:', { v, r, s });
      
      // 2. Stake 签名
      console.log('Requesting Stake signature...');
      const stakeSig = await signTypedDataAsync({
        domain: {
          name: 'RWAStaking',
          version: '1',
          chainId,
          verifyingContract: stakingAddress as `0x${string}`,
        },
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
          lockPeriod: BigInt(lockSafe),
          nonce: BigInt(nonce),
          deadline: BigInt(deadline),
        },
      });
      
      // 3. 发送到中继
      console.log('Sending to relayer...');
      const res = await fetch(`${RELAYER_URL}/api/meta-stake-permit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: address,
          amount: amountWei.toString(),
          referrer,
          lockPeriod: String(lockSafe),
          deadline: deadline.toString(),
          v: Number(v),
          r: r,
          s: s,
          signature: stakeSig,
        }),
      });
      
      const result = await res.json();
      console.log('Relayer response:', result);
      if (!result.success) throw new Error(result.error);
      
      console.log('Gasless stake successful!', result.txHash);
      return result.txHash;
    } catch (error) {
      console.error('Gasless stake error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const gaslessStakeRWA = async (
    rwaAddress: string,
    stakingAddress: string,
    amount: string,
    referrer: string,
    lockPeriod: number
  ) => {
    if (!address || !chainId) throw new Error('Not connected');
    const amt = amount != null ? String(amount).trim() : '';
    if (!amt || isNaN(parseFloat(amt))) throw new Error('请输入有效的质押金额');
    const lockSafe = Number.isFinite(Number(lockPeriod)) ? Number(lockPeriod) : 0;
    
    setIsLoading(true);
    try {
      console.log('Starting RWA gasless stake...');
      const amountWei = parseUnits(amt, 18);
      const deadline = Math.floor(Date.now() / 1000) + 3600;
      
      // 获取 nonces
      console.log('Fetching nonce...');
      const nonceRes = await fetch(`${RELAYER_URL}/api/nonce/${address}`);
      if (!nonceRes.ok) {
        throw new Error(`获取 nonce 失败: ${nonceRes.status}`);
      }
      const noncePayload = await nonceRes.json();
      const nonce = noncePayload?.nonce;
      if (nonce == null) {
        throw new Error('后端未返回 nonce，请确认后端已启动且 /api/nonce 可用');
      }
      console.log('Stake nonce:', nonce);

      // 获取 RWA Permit nonce
      console.log('Fetching RWA permit nonce...');
      const rwaPermitNonceRes = await fetch(`${RELAYER_URL}/api/rwa-nonce/${address}`);
      if (!rwaPermitNonceRes.ok) {
        throw new Error(`获取 RWA permit nonce 失败: ${rwaPermitNonceRes.status}`);
      }
      const rwaPermitPayload = await rwaPermitNonceRes.json();
      const rwaPermitNonce = rwaPermitPayload?.nonce;
      if (rwaPermitNonce == null) {
        throw new Error('后端未返回 RWA permit nonce，请确认 /api/rwa-nonce 可用');
      }
      console.log('RWA Permit nonce:', rwaPermitNonce);

      // 1. Permit 签名
      console.log('Requesting RWA Permit signature...');
      const permitSig = await signTypedDataAsync({
        domain: {
          name: 'RWA Token',
          version: '1',
          chainId,
          verifyingContract: rwaAddress as `0x${string}`,
        },
        types: {
          Permit: [
            { name: 'owner', type: 'address' },
            { name: 'spender', type: 'address' },
            { name: 'value', type: 'uint256' },
            { name: 'nonce', type: 'uint256' },
            { name: 'deadline', type: 'uint256' },
          ],
        },
        primaryType: 'Permit',
        message: {
          owner: address,
          spender: stakingAddress as `0x${string}`,
          value: amountWei,
          nonce: BigInt(rwaPermitNonce),
          deadline: BigInt(deadline),
        },
      });
      
      const { v, r, s } = hexToSignature(permitSig);
      console.log('RWA Permit signature:', { v, r, s });
      
      // 2. Stake 签名
      console.log('Requesting Stake signature...');
      const stakeSig = await signTypedDataAsync({
        domain: {
          name: 'RWAStaking',
          version: '1',
          chainId,
          verifyingContract: stakingAddress as `0x${string}`,
        },
        types: {
          StakeRWA: [
            { name: 'user', type: 'address' },
            { name: 'amount', type: 'uint256' },
            { name: 'referrer', type: 'address' },
            { name: 'lockPeriod', type: 'uint256' },
            { name: 'nonce', type: 'uint256' },
            { name: 'deadline', type: 'uint256' },
          ],
        },
        primaryType: 'StakeRWA',
        message: {
          user: address,
          amount: amountWei,
          referrer: referrer as `0x${string}`,
          lockPeriod: BigInt(lockSafe),
          nonce: BigInt(nonce),
          deadline: BigInt(deadline),
        },
      });
      
      // 3. 发送到中继
      console.log('Sending to relayer...');
      const res = await fetch(`${RELAYER_URL}/api/meta-stake-rwa-permit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: address,
          amount: amountWei.toString(),
          referrer,
          lockPeriod: String(lockSafe),
          deadline: deadline.toString(),
          v: Number(v),
          r: r,
          s: s,
          signature: stakeSig,
        }),
      });
      
      const result = await res.json();
      console.log('Relayer response:', result);
      if (!result.success) throw new Error(result.error);
      
      console.log('RWA gasless stake successful!', result.txHash);
      return result.txHash;
    } catch (error) {
      console.error('RWA gasless stake error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return { gaslessStake, gaslessStakeRWA, isLoading };
}
