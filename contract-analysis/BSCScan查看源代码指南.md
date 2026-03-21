# BSCScan 查看合约源代码指南

## 📍 当前页面

您当前在地址概览页面，显示的是：
- 地址信息
- 交易记录
- 代币持有量

**要查看源代码，需要点击 "Contract" 标签！**

---

## 🔍 查看源代码的步骤

### 方法1：通过标签页（推荐）

1. **在当前页面找到标签栏**
   - 您应该能看到这些标签：`Overview` | `Transactions` | **`Contract`** | `Token` | `Comments` 等

2. **点击 "Contract" 标签**
   - 这会切换到合约代码页面

3. **查看源代码**
   - 如果合约已验证，会显示完整的 Solidity 源代码
   - 如果未验证，会显示字节码

### 方法2：直接访问合约页面

**LGNS 合约源代码链接**：
```
https://bscscan.com/address/0xeb51d9a39ad5eef215dc0bf39a8821ff804a0f01#code
```

**sLGNS 合约源代码链接**：
```
https://bscscan.com/address/0x99a57e6c8558bc6689f894e068733adf83c19725#code
```

**质押池合约源代码链接**：
```
https://bscscan.com/address/0x1964Ca90474b11FFD08af387b110ba6C96251Bfc#code
```

---

## 📋 所有合约的直接链接

### 核心代币合约
- **LGNS 代币**: https://bscscan.com/address/0xeb51d9a39ad5eef215dc0bf39a8821ff804a0f01#code
- **sLGNS 代币**: https://bscscan.com/address/0x99a57e6c8558bc6689f894e068733adf83c19725#code

### 质押相关
- **质押池**: https://bscscan.com/address/0x1964Ca90474b11FFD08af387b110ba6C96251Bfc#code
- **涡轮提现**: https://bscscan.com/address/0x07Ff4e06865de4934409Aa6eCea503b08Cc1C78d#code

### 资金管理
- **国库地址**: https://bscscan.com/address/0x7B9B7d4F870A38e92c9a181B00f9b33cc8Ef5321#code
- **手续费销毁**: https://bscscan.com/address/0x91F1D2c2165B17a1eD2dC3B73Ae77224E6e1410E#code
- **撤回销毁**: https://bscscan.com/address/0xeeeabf5304a7ed876e7a28ec016bb57ae6e89f26#code
- **交易所底池**: https://bscscan.com/address/0x882df4b0fb50a229c3b4124eb18c759911485bfb#code
- **DAO管理奖**: https://bscscan.com/address/0x0309Ca717d6989676194b88fD06029a88CEEfee6#code

### 匿名稳定币系统
- **匿名稳定币A**: https://bscscan.com/address/0x6631eE651DA438Db2BE611B5A44dFE2Ca04590C5#code
- **空投A**: https://bscscan.com/address/0x7DC3d391dD1303894eB359b483C8894A0C1Cf681#code
- **销毁铸造A**: https://bscscan.com/address/0xA6036c7ae9F7dAE757E9BeE5BF02860A8D5F457e#code
- **撤底池**: https://bscscan.com/address/0x1D6A7F2cB262aFbb1204bbFCBb3db642662b15c3#code
- **销毁A中转**: https://bscscan.com/address/0x9dA64DF74565861708781B9Ad2e559b7328b97c4#code

---

## 📖 页面说明

### Contract 标签页的内容

当您点击 "Contract" 标签后，会看到：

1. **Contract Source Code**（合约源代码）
   - 如果合约已验证：显示完整的 Solidity 代码
   - 如果合约未验证：显示字节码

2. **Read Contract**（读取合约）
   - 可以调用只读函数查看合约状态
   - 例如：查看代币名称、总供应量等

3. **Write Contract**（写入合约）
   - 可以调用需要交易的函数
   - 需要连接钱包

4. **Contract ABI**（合约ABI）
   - 合约的接口定义
   - 可以复制用于前端集成

---

## 🔑 如果合约未验证

如果点击 "Contract" 标签后只看到字节码（而不是源代码），说明：

1. **合约未验证**
   - 项目方没有公开源代码
   - 只能看到编译后的字节码

2. **如何查看未验证合约**
   - 可以查看 "Read Contract" 标签
   - 可以查看 "Write Contract" 标签
   - 可以查看交易记录推断功能

3. **反编译工具**
   - BSCScan 提供 "Decompile Bytecode" 功能
   - 可以尝试反编译，但结果可能不准确

---

## 💡 建议

### 优先查看的合约

1. **LGNS 合约**（最重要）
   - 了解主代币的实现
   - 查看交易税机制
   - 查看销毁逻辑

2. **sLGNS 合约**
   - 了解质押代币的实现
   - 查看双代币转换逻辑

3. **质押池合约**
   - 了解质押机制
   - 查看收益分配逻辑

---

## 📝 查看源代码后的操作

### 如果看到源代码：

1. **复制源代码**
   - 点击 "Copy" 按钮复制完整代码
   - 保存到本地文件

2. **分析代码**
   - 查看核心函数实现
   - 理解业务逻辑
   - 找出关键机制

3. **提供给我分析**
   - 将源代码复制给我
   - 我可以帮您详细分析项目架构

---

## ✅ 快速操作

**现在就可以：**

1. 在当前页面点击 **"Contract"** 标签
2. 或者直接访问：https://bscscan.com/address/0xeb51d9a39ad5eef215dc0bf39a8821ff804a0f01#code
3. 查看源代码并复制给我分析

---

**找到源代码后，我可以帮您详细分析这个项目的完整架构！**
