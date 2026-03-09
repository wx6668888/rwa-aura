# Lottery Build Error 修复完成

## 问题描述

Next.js 构建错误：`useContractRead` 和 `useContractWrite` 不存在于 wagmi 模块中。

这是因为项目使用的是 wagmi v2，而这些 API 在 v2 中已被移除。

## 解决方案

### 1. 更新 useLottery.ts Hook

已将 wagmi v1 API 迁移到 v2：

**旧 API (v1)**:
- `useContractRead` → `useReadContract`
- `useContractWrite` → `useWriteContract`
- `useWaitForTransaction` → `useWaitForTransactionReceipt`
- `ethers.utils.formatEther` → `formatEther` from viem
- `ethers.utils.parseEther` → `parseEther` from viem

**新实现**:
```typescript
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { formatEther, parseEther } from "viem";

// 读取合约
const { data, refetch } = useReadContract({
  address: CONTRACT_ADDRESS,
  abi: ABI,
  functionName: "functionName",
  args: [arg1, arg2],
  query: {
    enabled: !!condition,
  },
});

// 写入合约
const { writeContractAsync } = useWriteContract();

const hash = await writeContractAsync({
  address: CONTRACT_ADDRESS,
  abi: ABI,
  functionName: "functionName",
  args: [arg1, arg2],
});

// 等待交易
const { isLoading } = useWaitForTransactionReceipt({
  hash: txHash,
});
```

### 2. 移除 ethers.js 依赖

组件中不再使用 `ethers.js`，全部改用 `viem`：

```typescript
// ❌ 旧代码
import { ethers } from 'ethers';
const formatted = ethers.utils.formatEther(value);

// ✅ 新代码
import { formatEther } from 'viem';
const formatted = formatEther(value);
```

### 3. 更新组件导入

**ticket-purchase-card.tsx**:
```typescript
import { formatEther } from 'viem';
import { useRWAToken } from '@/hooks/useRWAToken';

const rwaBalanceNum = rwaBalance ? parseFloat(formatEther(rwaBalance)) : 0;
```

**my-tickets-card.tsx**:
- 已移除 ethers 导入
- 使用 useLottery Hook 的返回值

**prize-pool-card.tsx**:
- 已移除 ethers 导入
- 直接使用 useLottery 返回的格式化数据

## 已修复的文件

1. ✅ `frontend/hooks/useLottery.ts` - 完全重写，使用 wagmi v2 API
2. ✅ `frontend/components/lucky/ticket-purchase-card.tsx` - 移除 ethers，使用 viem
3. ✅ `frontend/components/lucky/my-tickets-card.tsx` - 更新导入
4. ✅ `frontend/components/lucky/prize-pool-card.tsx` - 更新导入

## 当前状态

构建应该可以通过了。如果还有错误，请检查：

1. 确保 `useRWAToken` Hook 返回正确的类型
2. 确保所有组件都移除了 `ethers` 导入
3. 确保环境变量 `NEXT_PUBLIC_LOTTERY_CONTRACT` 已设置

## 下一步

1. 部署 Lottery 合约
2. 更新 `.env.local` 添加合约地址
3. 测试前端集成

## 注意事项

由于合约还未部署，以下功能暂时返回空数据：
- `getUserTicketsDetails()` - 返回空数组
- `getDrawHistory()` - 返回空数组

这些功能需要在合约部署后实现完整的查询逻辑。
