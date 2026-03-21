# 合约 Hooks 集成完成报告

## 完成时间
2026-02-26

## 已完成的工作

### 1. 合约 ABI 文件 ✅

#### StakingContract ABI
文件：`frontend/lib/contracts/stakingContractABI.ts`
- stake() - 质押 USDT
- withdraw() - 提现 RWA
- emergencyWithdraw() - 紧急提现
- getUserStakeInfo() - 获取用户质押信息
- getUserRewards() - 获取用户奖励
- getReferralInfo() - 获取推荐人信息
- getTotalStaked() - 获取总质押量
- getTotalDynamicRewardsPaid() - 获取总动态奖励

#### ERC20 ABI
文件：`frontend/lib/contracts/erc20ABI.ts`
- balanceOf() - 查询余额
- approve() - 授权
- allowance() - 查询授权额度
- decimals() - 查询精度
- symbol() - 查询符号

### 2. 合约地址配置 ✅
文件：`frontend/lib/contracts/addresses.ts`
- BSC 主网地址配置
- BSC 测试网地址配置
- 支持环境变量配置
- TypeScript 类型安全

### 3. 质押合约 Hook ✅
文件：`frontend/hooks/useStakingContract.ts`

**读取功能：**
- userStakeInfo - 用户质押信息（总质押、待领取 RWA、USDT 奖励、最后提现时间、推荐人、节点等级）
- userRewards - 用户奖励信息
- totalStaked - 全局总质押量

**写入功能：**
- stake(amount, referrer) - 质押 USDT
- withdraw(amount) - 提现 RWA
- emergencyWithdraw() - 紧急提现

**工具功能：**
- refetchStakeInfo() - 刷新质押信息
- refetchRewards() - 刷新奖励信息
- 自动格式化数值（18 位精度）

### 4. USDT Token Hook ✅
文件：`frontend/hooks/useUSDT.ts`

**读取功能：**
- balance - USDT 余额
- allowance - 授权额度

**写入功能：**
- approve(amount) - 授权指定数量
- approveMax() - 授权最大数量
- isApproved(amount) - 检查是否已授权

**工具功能：**
- refetchBalance() - 刷新余额
- refetchAllowance() - 刷新授权额度
- 自动格式化数值（6 位精度）

## 使用示例

### 质押流程

```typescript
import { useStakingContract } from '@/hooks/useStakingContract'
import { useUSDT } from '@/hooks/useUSDT'

function StakePage() {
  const { stake, userStakeInfo } = useStakingContract()
  const { balance, approve, isApproved } = useUSDT()
  
  async function handleStake(amount: string, referrer?: string) {
    // 1. 检查是否已授权
    if (!isApproved(amount)) {
      // 2. 授权 USDT
      const approveTx = await approve(amount)
      // 等待交易确认...
    }
    
    // 3. 质押
    const stakeTx = await stake(amount, referrer)
    // 等待交易确认...
  }
  
  return (
    <div>
      <p>USDT 余额: {balance}</p>
      <p>已质押: {userStakeInfo?.totalStaked}</p>
      <button onClick={() => handleStake('100')}>质押 100 USDT</button>
    </div>
  )
}
```

### 提现流程

```typescript
import { useStakingContract } from '@/hooks/useStakingContract'

function WithdrawPage() {
  const { withdraw, userRewards } = useStakingContract()
  
  async function handleWithdraw(amount: string) {
    const tx = await withdraw(amount)
    // 等待交易确认...
  }
  
  return (
    <div>
      <p>可提现 RWA: {userRewards?.rwaPending}</p>
      <button onClick={() => handleWithdraw('10')}>提现 10 RWA</button>
    </div>
  )
}
```

## 环境变量配置

需要在 `.env.local` 文件中添加：

```env
# WalletConnect Project ID
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id

# BSC 主网合约地址
NEXT_PUBLIC_STAKING_CONTRACT_BSC=0x...
NEXT_PUBLIC_RWA_TOKEN_BSC=0x...

# BSC 测试网合约地址
NEXT_PUBLIC_STAKING_CONTRACT_TESTNET=0x...
NEXT_PUBLIC_RWA_TOKEN_TESTNET=0x...
```

## 精度说明

- **USDT**: 6 位小数（1 USDT = 1,000,000）
- **RWA Token**: 18 位小数（1 RWA = 1,000,000,000,000,000,000）
- **合约内部**: 18 位小数（统一精度）

Hooks 会自动处理精度转换：
- 输入：用户友好的字符串（如 "100"）
- 合约调用：自动转换为正确精度的 BigInt
- 输出：自动格式化为用户友好的字符串

## 下一步工作

### 1. 集成到页面 UI
- [ ] 质押页面 - 添加质押表单和授权流程
- [ ] 提现页面 - 添加提现表单和余额显示
- [ ] 仪表板页面 - 显示用户数据和统计
- [ ] 节点页面 - 显示节点等级和奖励

### 2. 添加交易状态管理
- [ ] 加载状态显示
- [ ] 成功/失败提示
- [ ] 交易确认等待
- [ ] 错误处理

### 3. 添加数据刷新
- [ ] 自动刷新用户数据
- [ ] 交易成功后刷新
- [ ] 轮询最新数据

### 4. 优化用户体验
- [ ] 输入验证
- [ ] 余额不足提示
- [ ] Gas 费用估算
- [ ] 交易历史记录

## 注意事项

1. **网络检查**: 确保用户在正确的网络（BSC）
2. **授权流程**: 质押前必须先授权 USDT
3. **精度转换**: 使用 Hooks 提供的函数，避免手动转换
4. **错误处理**: 捕获并显示合约错误信息
5. **交易确认**: 等待交易确认后再更新 UI
