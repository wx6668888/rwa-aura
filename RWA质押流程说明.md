# 📋 RWA 质押完整流程说明

## 🎯 当前逻辑流程

### 第一步：选择质押模式

用户在质押页面顶部看到两个按钮：
- **RWA 质押（推荐）** - 默认选中（紫色渐变背景）
- **USDT 质押（≥100 USDT）** - 灰色

**用户操作**：点击选择模式

---

### 第二步：输入质押数量

**RWA 模式**：
- 输入框显示：`输入质押数量`
- 余额显示：`余额: X RWA`（从 `useRWA` Hook 读取）
- Token 标识：显示 `R`（紫色圆形图标）+ `RWA` 文字
- 最小限制：**无限制**（可以质押任意数量）

**USDT 模式**：
- 输入框显示：`输入质押数量`
- 余额显示：`余额: X USDT`（从 `useUSDT` Hook 读取）
- Token 标识：显示 `U`（青色圆形图标）+ `USDT` 文字
- 最小限制：**≥100 USDT**（低于100 USDT无法授权）

---

### 第三步：授权代币

#### RWA 模式授权流程：

1. **用户点击"授权代币"按钮**
   - 按钮文字：`授权代币`
   - 调用函数：`handleApprove()`
   - 执行操作：`approveRWA(amount)` → `useRWA.approveStaking(amount)`
   - 链上操作：调用 RWA Token 合约的 `approve(stakingContract, amount)`

2. **等待交易确认**
   - 显示：`授权中...` + 加载动画
   - 等待 3 秒
   - 重新查询授权额度：`refetchRWAAllowance()`

3. **授权成功**
   - 状态更新：`setStatus('approved')`
   - 按钮变化：
     - ✅ 显示绿色边框和文字
     - ✅ 显示 `已授权` + 绿色对勾图标
     - ✅ 按钮变为禁用状态（不可再次点击）

---

### 第四步：立即质押（授权后的下一步）

**授权成功后，用户会看到：**

1. **"授权代币"按钮**：
   - 状态：`已授权`（绿色，禁用）
   - 位置：第一个按钮

2. **"立即质押"按钮**（自动出现）：
   - 状态：**可点击**（绿色背景）
   - 文字：`立即质押`
   - 位置：第二个按钮（在授权按钮下方）

**用户操作**：点击"立即质押"按钮

**执行流程**：
1. 调用 `handleStake()` 函数
2. 检查状态：`status === 'approved'` ✅
3. 执行质押：
   - RWA 模式：调用 `stakeRWA(amount, referrer, lockPeriod)`
   - 链上调用：`StakingContract.stakeRWA(amount, referrer, lockPeriod)`
4. 等待交易确认
5. 成功后：
   - 刷新余额：`refetchRWABalance()`
   - 刷新质押信息：`refetchStakeInfo()`
   - 显示成功提示
   - **2秒后自动跳转到 Dashboard**

---

## 🔄 完整流程图

```
┌─────────────────────────────────────┐
│  1. 选择模式                        │
│  [RWA 质押（推荐）] [USDT 质押]    │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  2. 输入数量                         │
│  [输入质押数量: 100] [R] RWA        │
│  余额: 1000 RWA                     │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  3. 授权代币                         │
│  [授权代币] 按钮                     │
│  → 点击后显示"授权中..."            │
│  → 成功后显示"已授权" ✅            │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  4. 立即质押（自动出现）             │
│  [已授权] ✅ (禁用)                  │
│  [立即质押] 🟢 (可点击)              │
│  → 点击后显示"质押中..."            │
│  → 成功后显示"质押成功"             │
│  → 2秒后跳转 Dashboard              │
└─────────────────────────────────────┘
```

---

## 📝 关键代码逻辑

### 授权检查逻辑

```typescript
// RWA 模式授权检查
const isRWAApproved = allowance && allowance > 0n  // useRWA Hook

// 授权状态判断
const isApprovedForStake = stakeMode === 'USDT' 
  ? isApproved(amount)      // USDT 模式：检查 USDT 授权
  : isRWAApproved           // RWA 模式：检查 RWA 授权

// 自动更新状态
useEffect(() => {
  const approved = stakeMode === 'USDT' ? isApproved(amount) : isRWAApproved
  if (numAmount > 0 && approved) {
    setStatus('approved')  // 授权成功，状态变为 'approved'
  }
}, [numAmount, amount, stakeMode, isApproved, isRWAApproved, status])
```

### 按钮显示逻辑

```typescript
// 授权按钮
<button onClick={handleApprove} disabled={isApproveDisabled}>
  {status === 'approving' ? '授权中...' : 
   isApprovedForStake ? '已授权' : 
   '授权代币'}
</button>

// 质押按钮（只在授权成功后显示）
{isApprovedForStake && (
  <button onClick={handleStake} disabled={isStakeDisabled}>
    {status === 'staking' ? '质押中...' : '立即质押'}
  </button>
)}
```

---

## ⚠️ 注意事项

### RWA 模式特点：

1. **无最小限制**：可以质押任意数量的 RWA（即使只有 0.1 RWA 也可以）
2. **授权检查**：授权额度 > 0 即认为已授权（不需要检查具体金额）
3. **质押函数**：调用 `stakeRWA()`，参数为 18 位小数精度
4. **事件监听**：监听 `RWAStakeEvent` 事件

### USDT 模式特点：

1. **最小限制**：必须 ≥100 USDT 才能授权
2. **授权检查**：需要检查授权额度是否 ≥ 输入金额
3. **质押函数**：调用 `stake()`，参数为 6 位小数精度
4. **事件监听**：监听 `StakeEvent` 事件

---

## 🎯 用户操作步骤总结

**RWA 质押模式**：

1. ✅ 选择 **"RWA 质押（推荐）"**（默认已选中）
2. ✅ 输入 RWA 数量（例如：100 RWA）
3. ✅ 点击 **"授权代币"** 按钮
4. ✅ 在钱包中确认授权交易
5. ✅ 等待授权成功（按钮变为"已授权"）
6. ✅ 点击 **"立即质押"** 按钮（自动出现）
7. ✅ 在钱包中确认质押交易
8. ✅ 等待质押成功
9. ✅ 自动跳转到 Dashboard

**关键点**：授权成功后，"立即质押"按钮会自动出现，用户直接点击即可完成质押！
