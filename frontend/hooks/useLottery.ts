"use client";

import { useCallback, useMemo, useState } from "react";
import { useAccount, usePublicClient, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { readContract } from "wagmi/actions";
import { formatEther, parseEther } from "viem";
import { LOTTERY_ABI, type PoolType } from "@/lib/contracts/lotteryABI";
import { useRWAToken } from "./useRWAToken";
import { CONTRACT_ADDRESSES } from "@/lib/contracts/addresses";
import { config } from "@/lib/wagmi";

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
  const publicClient = usePublicClient()
  const { approve, getAllowance, balance: rwaBalance } = useRWAToken();
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

  // 使用 useMemo 固定引用，避免每次 render 都创建新对象导致下游 useEffect 依赖抖动
  const weeklyPool = useMemo(() => formatPoolInfo(weeklyPoolData), [weeklyPoolData]);
  const monthlyPool = useMemo(() => formatPoolInfo(monthlyPoolData), [monthlyPoolData]);
  const realtimePool = useMemo(() => formatPoolInfo(realtimePoolData), [realtimePoolData]);
  const annualPool = useMemo(() => formatPoolInfo(annualPoolData), [annualPoolData]);

  const poolsByType = useMemo(() => {
    return {
      0: weeklyPool,
      1: monthlyPool,
      2: realtimePool,
      3: annualPool,
    } as Record<PoolType, PoolInfo | null>
  }, [weeklyPool, monthlyPool, realtimePool, annualPool])

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
      const used = lotteryContractAddress || 'undefined'
      throw new Error(`彩票合约未部署/未配置（chainId=${chainId ?? 'unknown'}，lottery=${used}）。请确认钱包网络与前端合约地址配置一致。`);
    }

    try {
      const ticketPrice = getTicketPriceByPool(poolType);
      const totalCost = parseEther((quantity * ticketPrice).toString());

      // 检查授权额度
      const currentAllowance = await getAllowance(lotteryContractAddress);
      
      if (currentAllowance < totalCost) {
        setIsApproving(true);
        const approveHash = await approve(lotteryContractAddress, totalCost);
        
        // 等待授权交易确认（重要！）
        await new Promise(resolve => setTimeout(resolve, 3000));
        
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
      console.error('购买失败:', error);
      setIsApproving(false);
      throw error;
    }
  };

  // 获取用户彩票详情
  const getUserTicketsDetails = useCallback(async (): Promise<Ticket[]> => {
    if (!address || !lotteryContractAddress) {
      return [];
    }

    try {
      const ticketIds = await readContract(config, {
        address: lotteryContractAddress,
        abi: LOTTERY_ABI,
        functionName: 'getUserTickets',
        args: [address],
      }) as bigint[];
      
      if (!ticketIds || ticketIds.length === 0) {
        return [];
      }

      const ticketPromises = ticketIds.map(async (ticketId) => {
        const ticketData = await readContract(config, {
          address: lotteryContractAddress,
          abi: LOTTERY_ABI,
          functionName: 'getTicket',
          args: [ticketId],
        }) as any;

        const poolTypeMap: Record<number, 'weekly' | 'monthly' | 'realtime' | 'annual'> = {
          0: 'weekly',
          1: 'monthly', 
          2: 'realtime',
          3: 'annual'
        };

        // viem/wagmi 对 tuple 的返回在不同版本/配置下可能是 array 或 object（带字段名）。
        // 这里做兼容解析，避免 undefined.toString 造成页面卡死。
        const owner = ticketData?.owner ?? ticketData?.[0]
        const number = ticketData?.number ?? ticketData?.[1]
        const pt = ticketData?.poolType ?? ticketData?.[2]
        const round = ticketData?.round ?? ticketData?.[3]
        const purchaseTime = ticketData?.purchaseTime ?? ticketData?.[4]
        const isWinner = ticketData?.isWinner ?? ticketData?.[5]
        const prizeLevel = ticketData?.prizeLevel ?? ticketData?.[6]
        const prizeAmount = ticketData?.prizeAmount ?? ticketData?.[7]
        const claimed = ticketData?.claimed ?? ticketData?.[8]

        if (!owner || number == null || pt == null || round == null) {
          throw new Error('invalid ticketData shape')
        }

        const ptNum = typeof pt === 'bigint' ? Number(pt) : Number(pt)

        const ticket = {
          id: ticketId.toString(),
          owner: String(owner),
          number: (typeof number === 'bigint' ? number : BigInt(number)).toString(),
          poolType: poolTypeMap[ptNum] || 'weekly',
          round: (typeof round === 'bigint' ? round : BigInt(round)).toString(),
          purchaseTime: Number(purchaseTime ?? 0),
          isWinner: Boolean(isWinner),
          prizeLevel: Number(prizeLevel ?? 0),
          prizeAmount: prizeAmount != null ? formatEther(prizeAmount as bigint) : '0',
          claimed: Boolean(claimed)
        } as Ticket;
        return ticket;
      });

      const tickets = (await Promise.allSettled(ticketPromises))
        .filter((r): r is PromiseFulfilledResult<Ticket> => r.status === 'fulfilled')
        .map((r) => r.value)
      return tickets;
    } catch (error) {
      console.error('获取彩票详情失败:', error);
      return [];
    }
  }, [address, lotteryContractAddress]);

  // 获取开奖历史
  const getDrawHistory = useCallback(async (poolType: PoolType, rounds: number = 10): Promise<DrawHistory[]> => {
    if (!isContractDeployed || !lotteryContractAddress) return []
    const current = poolsByType[poolType]?.currentRound ? Number(poolsByType[poolType]!.currentRound) : undefined
    if (!current || current <= 1) return []

    const out: DrawHistory[] = []
    const startRound = current - 1
    for (let r = startRound; r >= 1 && out.length < rounds; r--) {
      try {
        const draw = await readContract(config, {
          address: lotteryContractAddress,
          abi: LOTTERY_ABI,
          functionName: 'getDraw',
          args: [poolType, BigInt(r)],
        }) as any

        const completed = !!draw?.[5]
        const drawTime = Number(draw?.[1] ?? 0)
        const totalPrize = draw?.[2] != null ? formatEther(draw[2]) : '0'
        const winningNumber = draw?.[0] != null ? draw[0].toString() : '0'

        // 只展示已完成的开奖（completed 或 drawTime>0）
        if (!completed && (!drawTime || drawTime <= 0)) continue

        out.push({
          round: String(r),
          winningNumber,
          drawTime,
          totalPrize,
          vrfRequestId: '',
          completed,
        })
      } catch {
        // 某些轮次可能没数据，跳过
      }
    }

    return out
  }, [isContractDeployed, lotteryContractAddress, poolsByType]);

  type RecentPrize = { winner: `0x${string}`; ticketId: string; prizeLevel: number; prizeAmount: string; txHash: `0x${string}`; blockNumber: bigint }

  const getRecentPrizes = useCallback(async (limit: number = 5): Promise<RecentPrize[]> => {
    if (!publicClient || !isContractDeployed || !lotteryContractAddress) return []
    const latest = await publicClient.getBlockNumber()
    const fromBlock = latest > 50_000n ? (latest - 50_000n) : 0n
    const logs = await publicClient.getLogs({
      address: lotteryContractAddress,
      event: {
        type: 'event',
        name: 'PrizeClaimed',
        inputs: [
          { indexed: true, name: 'winner', type: 'address' },
          { indexed: false, name: 'ticketId', type: 'uint256' },
          { indexed: false, name: 'prizeLevel', type: 'uint8' },
          { indexed: false, name: 'prizeAmount', type: 'uint256' },
        ],
      } as any,
      fromBlock,
      toBlock: 'latest',
    })

    const parsed = logs
      .slice(-Math.max(20, limit * 3))
      .reverse()
      .map((l: any) => ({
        winner: l.args.winner as `0x${string}`,
        ticketId: (l.args.ticketId as bigint).toString(),
        prizeLevel: Number(l.args.prizeLevel),
        prizeAmount: formatEther(l.args.prizeAmount as bigint),
        txHash: l.transactionHash as `0x${string}`,
        blockNumber: l.blockNumber as bigint,
      }))

    const unique: RecentPrize[] = []
    const seen = new Set<string>()
    for (const p of parsed) {
      const k = `${p.txHash}:${p.ticketId}`
      if (seen.has(k)) continue
      seen.add(k)
      unique.push(p)
      if (unique.length >= limit) break
    }
    return unique
  }, [publicClient, isContractDeployed, lotteryContractAddress])

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

  // 批量领取奖金（逐个调用 claimPrize）
  const claimMultiplePrizes = async (ticketIds: string[]) => {
    if (!isContractDeployed || !lotteryContractAddress) {
      throw new Error("彩票合约未部署，请等待合约部署完成");
    }

    try {
      for (const id of ticketIds) {
        const hash = await claimPrizeWrite({
          address: lotteryContractAddress,
          abi: LOTTERY_ABI,
          functionName: "claimPrize",
          args: [BigInt(id)],
        });
        setClaimTxHash(hash);
        // 等待片刻以避免 RPC 速率限制
        await new Promise((r) => setTimeout(r, 500));
      }
      setTimeout(() => { refetchUserTickets(); }, 3000);
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
    getRecentPrizes,
    
    refetchWeeklyPool,
    refetchMonthlyPool,
    refetchRealtimePool,
    refetchAnnualPool,
    refetchUserTickets,
    rwaBalance: rwaBalance ?? BigInt(0),
  };
}
