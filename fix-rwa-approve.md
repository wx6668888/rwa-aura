# RWA Token Approve 错误修复指南

## 错误信息
```
The contract function "approve" reverted with the following reason: Failed to fetch
Contract Call: address: 0x2B0d36FACD61B71CC05ab8F3D2355ec3631C0dd5
function: approve(address spender, uint256 amount)
args: (0xC9a43158891282A2B1475592D5719c001986Aaec, 1000000000000000000000)
sender: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
```

## 可能的原因

### 1. RWA Token 合约被暂停 ⚠️（最可能）
RWAToken 合约使用了 `Pausable`，如果合约被暂停，所有转账和授权操作都会失败。

**检查方法**：
```javascript
// 在浏览器控制台或 Hardhat console 中执行
const rwaToken = await ethers.getContractAt("RWAToken", "0x2B0d36FACD61B71CC05ab8F3D2355ec3631C0dd5");
const paused = await rwaToken.paused();
console.log("合约是否暂停:", paused);
```

**解决方法**：
如果合约被暂停，需要合约所有者调用 `unpause()`：
```javascript
// 使用合约所有者账户
const [owner] = await ethers.getSigners();
const rwaToken = await ethers.getContractAt("RWAToken", "0x2B0d36FACD61B71CC05ab8F3D2355ec3631C0dd5");
await rwaToken.connect(owner).unpause();
```

### 2. 用户余额不足
用户 `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` 可能没有足够的 RWA 代币。

**检查方法**：
```javascript
const rwaToken = await ethers.getContractAt("RWAToken", "0x2B0d36FACD61B71CC05ab8F3D2355ec3631C0dd5");
const balance = await rwaToken.balanceOf("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");
console.log("用户余额:", ethers.formatUnits(balance, 18), "RWA");
```

**解决方法**：
如果余额不足，需要：
1. 从其他账户转账 RWA 代币
2. 或者通过 Swap 合约用 USDT 兑换 RWA

### 3. 合约地址配置错误
确认前端使用的合约地址是否正确。

**检查方法**：
- RWA Token: `0x2B0d36FACD61B71CC05ab8F3D2355ec3631C0dd5` ✅
- StakingContract: `0xC9a43158891282A2B1475592D5719c001986Aaec` ✅

## 快速修复步骤

### 步骤 1: 启动 Hardhat 节点
```bash
npx hardhat node
```

### 步骤 2: 检查合约状态
在新的终端中执行：
```bash
npx hardhat run check-rwa-status.js --network localhost
```

### 步骤 3: 如果合约被暂停，取消暂停
```bash
npx hardhat console --network localhost
```
然后在 console 中执行：
```javascript
const [deployer] = await ethers.getSigners();
const rwaToken = await ethers.getContractAt("RWAToken", "0x2B0d36FACD61B71CC05ab8F3D2355ec3631C0dd5");
const owner = await rwaToken.owner();
console.log("合约所有者:", owner);
console.log("当前账户:", deployer.address);

// 如果当前账户是所有者，取消暂停
if (owner.toLowerCase() === deployer.address.toLowerCase()) {
  const paused = await rwaToken.paused();
  if (paused) {
    console.log("合约已暂停，正在取消暂停...");
    await rwaToken.unpause();
    console.log("✅ 合约已取消暂停");
  } else {
    console.log("✅ 合约未暂停");
  }
} else {
  console.log("❌ 当前账户不是合约所有者，无法取消暂停");
  console.log("请使用所有者账户:", owner);
}
```

### 步骤 4: 检查并分配 RWA 代币
```javascript
// 检查用户余额
const userAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const balance = await rwaToken.balanceOf(userAddress);
console.log("用户余额:", ethers.formatUnits(balance, 18), "RWA");

// 如果余额不足，从部署者账户转账
if (balance < ethers.parseUnits("1000", 18)) {
  console.log("余额不足，正在转账...");
  await rwaToken.transfer(userAddress, ethers.parseUnits("10000", 18));
  console.log("✅ 已转账 10000 RWA");
}
```

## 前端修复建议

如果问题持续，可以在前端添加更好的错误处理：

```typescript
// 在 useRWA.ts 中添加错误处理
async function approveStaking(amount: string) {
  if (!rwaTokenAddress || !stakingAddress) {
    throw new Error('RWA token or staking contract not found')
  }

  try {
    const amountInWei = parseUnits(amount, 18)
    const hash = await writeContractAsync({
      address: rwaTokenAddress as Address,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [stakingAddress as Address, amountInWei],
    })
    return hash
  } catch (error: any) {
    // 检查是否是暂停错误
    if (error.message?.includes('paused') || error.message?.includes('Pausable')) {
      throw new Error('RWA Token contract is paused. Please contact the administrator.')
    }
    // 检查是否是余额不足
    if (error.message?.includes('insufficient') || error.message?.includes('balance')) {
      throw new Error('Insufficient RWA balance. Please ensure you have enough RWA tokens.')
    }
    throw error
  }
}
```

## 验证修复

修复后，在浏览器中：
1. 刷新页面
2. 连接钱包
3. 尝试再次授权
4. 检查浏览器控制台的错误信息

如果仍有问题，请检查：
- Hardhat 节点是否正常运行
- 合约地址是否正确
- 网络配置是否正确（Chain ID: 31337）
