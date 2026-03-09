"use client";

import { useState } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { formatEther, parseEther } from "viem";
import { LOTTERY_ABI, type PoolType } from "@/lib/contracts/lotteryABI";
import { useRWAToken } from "./useRWAToken";
import { CONTRACT_ADDRESSES } from "@/lib/contracts/addresses";

// 从 CONTRACT_ADDRESSES 获取彩票合约地址
function getLotteryContractAddress(chainId?: number): `0x${string}` | undefined {
  if (!chainId) return undefined;
  const addresses = CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES];
  return addresses?.lotteryContract as `0x${string}` | undefined;
}

export interface PoolInfo {
  currentRound: string;
  prizePool: string;
  nextDrawTime: number;
  ticketsSold: number;
  ticketPrice: string;
}

export interface Ticket {
  id: string;
  owner: string;
  number: string;
  poolType: "weekly" | "monthly";
  round: string;
  purchaseTime: number;
  isWinner: boolean;
  prizeLevel: number;
  prizeAmount: string;
  claimed: boolean;
}

export interface DrawHistory {
  round: string;
  winningNumber: string;
  drawTime: number;
  totalPrize: string;
  vrfRequestId: string;
  completed: boolean;
}

export function useLottery() {
  const { address, chainId } = useAccount();
  const { approve, allowance, balance: rwaBalance } = useRWAToken();
  const [isApproving, setIsApproving] = useState(false);
  const [buyTxHash, setBuyTxHash] = useState<`0x${string}` | undefined>();
  const [claimTxHash, setClaimTxHash] = useState<`0x${string}` | undefined>();

  // 获取彩票合约地址
  const lotteryContractAddress = getLotteryContractAddress(chainId);
  const isContractDeployed = lotteryContractAddress && lotteryContractAddress !== '0x0000000000000000000000000000000000000000';

  // 奖池信息：0=周 1=月 2=实时(5分钟) 3=年度
  const { data: weeklyPoolData, refetch: refetchWeeklyPool } = useReadContract({
    address: lotteryContractAddress,
    abi: LOTTERY_ABI,
    functionName: "getCurrentPoolInfo",
    args: [0],
    query: { enabled: !!isContractDeployed },
  });
  const { data: monthlyPoolData, refetch: refetchMonthlyPool } = useReadContract({
    address: lotteryContractAddress,
    abi: LOTTERY_ABI,
    functionName: "getCurrentPoolInfo",
    args: [1],
    query: { enabled: !!isContractDeployed },
  });
  const { data: realtimePoolData, refetch: refetchRealtimePool } = useReadContract({
    address: lotteryContractAddress,
    abi: LOTTERY_ABI,
    functionName: "getCurrentPoolInfo",
    args: [2],
    query: { enabled: !!isContractDeployed },
  });
  const { data: annualPoolData, refetch: refetchAnnualPool } = useReadContract({
    address: lotteryContractAddress,
    abi: LOTTERY_ABI,
    functionName: "getCurrentPoolInfo",
    args: [3],
    query: { enabled: !!isContractDeployed },
  });

  // 获取用户彩票 IDs
  const { data: userTicketIds, refetch: refetchUserTickets } = useReadContract({
    address: lotteryContractAddress,
    abi: LOTTERY_ABI,
    functionName: "getUserTickets",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!isContractDeployed,
    },
  });

  // 购买彩票
  const { writeContractAsync: buyTicketsWrite } = useWriteContract();

  const { isLoading: isBuying } = useWaitForTransactionReceipt({
    hash: buyTxHash,
  });

  // 领取奖金
  const { writeContractAsync: claimPrizeWrite } = useWriteContract();

  const { isLoading: isClaiming } = useWaitForTransactionReceipt({
    hash: claimTxHash,
  });

  // 格式化奖池信息
  const formatPoolInfo = (data: any): PoolInfo | null => {
    if (!data) return null;
    return {
      currentRound: data[0].toString(),
      prizePool: formatEther(data[1]),
      nextDrawTime: Number(data[2]),
      ticketsSold: Number(data[3]),
      ticketPrice: formatEther(data[4]),
    };
  };

  const weeklyPool = formatPoolInfo(weeklyPoolData);
  const monthlyPool = formatPoolInfo(monthlyPoolData);
  const realtimePool = formatPoolInfo(realtimePoolData);
  const annualPool = formatPoolInfo(annualPoolData);

  const getTicketPriceByPool = (poolType: PoolType) => {
    if (poolType === 0) return 10;
    if (poolType === 1) return 50;
    if (poolType === 2) return 2;
    return 200;
  };

  // 购买彩票函数
  const buyTickets = async (quantity: number, poolType: PoolType) => {
    if (!address) throw new Error("Wallet not connected");
    if (!isContractDeployed || !lotteryContractAddress) {
      throw new Error("彩票合约未部署，请等待合约部署完成");
    }

    try {
      const ticketPrice = getTicketPriceByPool(poolType);
      const totalCost = parseEther((quantity * ticketPrice).toString());

      // 检查授权额度
      const currentAllowance = await allowance(lotteryContractAddress);
      
      if (currentAllowance < totalCost) {
        setIsApproving(true);
        await approve(lotteryContractAddress, totalCost);
        setIsApproving(false);
      }

      const hash = await buyTicketsWrite({
        address: lotteryContractAddress,
        abi: LOTTERY_ABI,
        functionName: "buyTickets",
        args: [BigInt(quantity), poolType],
      });
      
      setBuyTxHash(hash);
      
      setTimeout(() => {
        refetchWeeklyPool();
        refetchMonthlyPool();
        refetchRealtimePool();
        refetchAnnualPool();
        refetchUserTickets();
      }, 3000);
    } catch (error) {
      setIsApproving(false);
      throw error;
    }
  };

  // 获取用户彩票详情
  const getUserTicketsDetails = async (): Promise<Ticket[]> => {
    if (!userTicketIds || !address) return [];

    // TODO: 实现批量查询彩票详情
    // 暂时返回空数组，等待合约部署后实现
    return [];
  };

  // 获取开奖历史
  const getDrawHistory = async (poolType: PoolType, rounds: number = 10): Promise<DrawHistory[]> => {
    // TODO: 实现开奖历史查询
    // 暂时返回空数组，等待合约部署后实现
    return [];
  };

  // 领取单张彩票奖金
  const claimPrize = async (ticketId: string) => {
    if (!isContractDeployed || !lotteryContractAddress) {
      throw new Error("彩票合约未部署，请等待合约部署完成");
    }

    try {
      const hash = await claimPrizeWrite({
        address: lotteryContractAddress,
        abi: LOTTERY_ABI,
        functionName: "claimPrize",
        args: [BigInt(ticketId)],
      });
      
      setClaimTxHash(hash);
      
      // 等待交易确认后刷新
      setTimeout(() => {
        refetchUserTickets();
      }, 3000);
    } catch (error) {
      console.error('领奖失败:', error);
      throw error;
    }
  };

  // 批量领取奖金
  const claimMultiplePrizes = async (ticketIds: string[]) => {
    if (!isContractDeployed || !lotteryContractAddress) {
      throw new Error("彩票合约未部署，请等待合约部署完成");
    }

    try {
      const hash = await claimPrizeWrite({
        address: lotteryContractAddress,
        abi: LOTTERY_ABI,
        functionName: "claimMultiplePrizes",
        args: [ticketIds.map(id => BigInt(id))],
      });
      
      setClaimTxHash(hash);
      
      // 等待交易确认后刷新
      setTimeout(() => {
        refetchUserTickets();
      }, 3000);
    } catch (error) {
      console.error('批量领奖失败:', error);
      throw error;
    }
  };

  return {
    weeklyPool,
    monthlyPool,
    realtimePool,
    annualPool,
    getTicketPriceByPool,
    
    // 用户彩票
    userTicketIds: userTicketIds as bigint[] | undefined,
    getUserTicketsDetails,
    
    // 购买彩票
    buyTickets,
    isBuying,
    isApproving,
    
    // 领取奖金
    claimPrize,
    claimMultiplePrizes,
    isClaiming,
    
    // 开奖历史
    getDrawHistory,
    
    refetchWeeklyPool,
    refetchMonthlyPool,
    refetchRealtimePool,
    refetchAnnualPool,
    refetchUserTickets,
    rwaBalance: rwaBalance ?? BigInt(0),
  };
}
