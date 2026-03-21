# 📝 RWA 代币化协议 - 文档修改建议清单

**生成日期：** 2026-02-26  
**格式：** 五处高优先级修改建议，包含具体文本替换指导  
**用途：** 供开发团队和项目经理参考，自行决定是否修改  

---

## 修改建议 1：明确后端私钥泄露防御方案

### 位置
文件：`design.md`  
章节：`Critical Implementation Notes` → `2. 后端调用合约必须设置"单次最高限额"`（第 1790-1850 行附近）

### 当前问题
当前描述只提到"短期方案"和"长期方案"，但**未明确声明采用哪个方案**。开发团队不清楚应该实现哪个方案。

### 建议修改方案

**在该部分的最后，添加以下"决策声明"：**

```
---

### 【决策声明】V1 版本采用方案

根据成本-收益分析，**V1 版本采用"短期方案"：单次限额（maxRewardPerCall）+ 实时余额校验**

**理由：**
- ✅ 实现快速（1-2 周）
- ✅ 安全系数充分（即使后端被黑，每次最多转走 10000 USDT）
- ✅ Gas 成本低（无链上验证开销）
- ✅ 用户体验最佳（无需额外步骤）

**长期规划（V2 版本）：**
- 可评估引入 Merkle Root 验证，完全去除后端私钥依赖
- 需要专项研究和 Gas 优化

**后端被黑应急预案：**
1. 检测到异常交易 → 立即调用 pause() 暂停合约
2. 通过 TimeLock 队列修改 maxRewardPerCall 为 0
3. 48 小时后执行，此间所有 updateUserRewards 调用被阻止
4. 进行安全审计，修复后恢复 maxRewardPerCall
```

---

### 修改影响
- 为开发团队明确了技术方向
- 避免重复讨论和工程浪费
- 为后期升级指明了 V2 路线图

---

## 修改建议 2：删除价格预言机的自相矛盾内容

### 位置
文件：`design.md`  
章节：`Components and Interfaces` → `3. Price Oracle Service`（第 400-470 行附近）

### 当前问题
该部分既列出"**推荐方案：Chainlink**"，又列出"**不推荐方案：Chainlink 不支持新发行的小币种**"，形成逻辑矛盾。

### 建议修改方案

**完全重写该部分为以下结构：**

```markdown
### 3. Price Oracle Service

#### V1 版本（当前 - 推荐方案）

**采用：后端缓存 + Redis**

- 后端每 5 分钟从 PancakeSwap 获取 RWA/USDT 实时价格
- 调用 PancakeSwap Router 的 `getAmountsOut` 或直接查询 Pair 合约
- 价格缓存到 Redis，TTL = 5 分钟
- 提现时从缓存读取价格，验证"10 USDT 等值"门槛
- 缓存失效时，使用上次成功的价格（最长 5 分钟前）
- 如果缓存也过期，拒绝提现请求并向管理员告警

**优点：**
- ✅ 实现简单，无需链上部署
- ✅ 成本低，仅需 Redis 存储
- ✅ 性能高，缓存查询 < 10ms
- ✅ 满足 V1 版本需求

**风险：**
- ⚠️ 后端宕机影响提现
- ⚠️ 价格可能被后端操纵（低概率）

**【建议】简化为固定门槛**

为了完全消除价格风险，建议：
- 不使用价格预言机验证
- 改为固定提现门槛：**最低提现数量 = 10 RWA Token**（而不是"10 USDT 等值"）
- 优点：简单、透明、无外部依赖
- 缺点：随着 RWA Token 价格上升，提现门槛相对上升

---

#### V2 版本（未来升级）

**计划升级：链上 Chainlink 价格预言机**

- 使用 Chainlink Price Feed（如果 RWA 被列上）
- 完全去中心化，无单点故障
- 适用于大规模、对价格精度要求高的场景
- 需评估：RWA 是否能上 Chainlink，否则需改为其他方案

---

#### 失败时的降级策略

| 场景 | 处理方案 |
|------|---------|
| Redis 缓存有效 | 使用缓存价格 |
| Redis 缓存过期 | 使用上次成功的价格（最长 5 分钟前） |
| 缓存也失效 | **拒绝提现，发送告警** |
| 推荐用户改用固定门槛 | "改为提现 10 RWA Token，无需价格验证" |
```

---

### 修改影响
- 消除逻辑矛盾
- 为开发团队提供清晰的实现目标
- 为运维提供清晰的应急预案

---

## 修改建议 3：明确 stakeId 生成方式

### 位置
文件：`design.md`  
章节：`Components and Interfaces` → `2. StakingContract` → 在"关键数据结构"小节后添加新小节

### 当前问题
设计文档提到"生成唯一 stakeId"，但**未说明如何生成**。合约开发者不知道是使用自增计数器、tx_hash、还是其他方式。

### 建议修改方案

**在 StakingContract 部分新增小节：**

```markdown
#### StakeId 生成机制

**选择方案：合约内维护自增计数器**

**实现代码（伪代码）：**

```solidity
// 全局自增计数器
uint256 private stakesCounter = 0;

function stake(uint256 amount, address referrer) external {
    // ... 验证逻辑 ...
    
    // 1. 生成唯一 stakeId（自增）
    uint256 stakeId = stakesCounter++;
    
    // 2. 执行 50/50 分配
    IERC20(usdt).safeTransferFrom(msg.sender, treasury, amount * 50 / 100);
    IERC20(usdt).safeTransferFrom(msg.sender, address(this), amount * 50 / 100);
    
    // 3. 绑定推荐关系
    if (referrer != address(0) && referrer != msg.sender && users[msg.sender].referrer == address(0)) {
        users[msg.sender].referrer = referrer;
    }
    
    // 4. 记录质押信息
    users[msg.sender].totalStaked += amount;
    totalStaked += amount;
    
    // 5. 触发事件（包含 stakeId）
    emit StakeEvent(msg.sender, amount, users[msg.sender].referrer, stakeId, block.timestamp);
}
```

**对应数据库：**
- `stakes` 表的 `id` 字段为自增主键
- 后端从 StakeEvent 中读取 stakeId
- 存储到 `stakes.id` 字段
- 确保合约 stakeId 和数据库 id 保持对应

**防重入机制：**
- 合约维护 `mapping(uint256 => bool) processedStakes`
- 记录已处理的 stakeId
- 后端调用 `updateUserRewards(user, rwAmount, usdtAmount, stakeId)` 时必须传入 stakeId
- 合约检查 `require(!processedStakes[stakeId], "Stake already processed")`
- 防止同一笔质押被多次计奖

**关键设计原则：**
1. stakeId 从 0 开始，单调递增
2. 每次 stake 都会生成新的 stakeId，不会重复
3. stakeId 在事件中暴露，后端可以可靠地获取和存储
4. 为未来的 Merkle Root 验证预留了链条标识
```

---

### 修改影响
- 合约开发者清楚地知道如何实现
- 后端开发者清楚如何同步 stakeId
- 为后期升级预留了可扩展性

---

## 修改建议 4：补充完整的 Solidity 事件定义

### 位置
文件：`design.md`  
章节：`Components and Interfaces` → `2. StakingContract` → 在合约接口后添加"事件定义"小节

### 当前问题
设计文档提到各种事件（StakeEvent、RewardsUpdated 等），但**没有给出完整的 Solidity 事件签名**。开发者需要猜测参数类型和 indexed 属性。

### 建议修改方案

**新增小节：**

```markdown
#### 事件定义（Solidity Events）

**质押事件**
```solidity
/// @notice 用户质押事件
/// @param user 质押用户地址
/// @param amount 质押 USDT 金额（6 位精度）
/// @param referrer 推荐人地址（可能为零地址）
/// @param stakeId 唯一质押 ID
/// @param timestamp 事件时间戳
event StakeEvent(
    address indexed user,
    uint256 amount,
    address indexed referrer,
    uint256 indexed stakeId,
    uint256 timestamp
);
```

**推荐关系绑定事件**
```solidity
/// @notice 推荐关系绑定事件
/// @param user 新用户地址
/// @param referrer 推荐人地址
/// @param timestamp 绑定时间戳
event ReferralBound(
    address indexed user,
    address indexed referrer,
    uint256 timestamp
);
```

**奖励发放事件**
```solidity
/// @notice 级差奖励发放事件
/// @param user 受益人地址
/// @param rwAmount 发放的 RWA Token 数量（18 位精度）
/// @param usdtAmount 发放的 USDT 金额（18 位精度）
/// @param stakeId 对应的质押 ID
/// @param timestamp 发放时间戳
event RewardsUpdated(
    address indexed user,
    uint256 rwAmount,
    uint256 usdtAmount,
    uint256 indexed stakeId,
    uint256 timestamp
);
```

**节点等级升级事件**
```solidity
/// @notice 节点等级升级事件
/// @param user 升级的用户地址
/// @param oldLevel 升级前的等级
/// @param newLevel 升级后的等级
/// @param timestamp 升级时间戳
event NodeLevelUpdated(
    address indexed user,
    uint8 oldLevel,
    uint8 newLevel,
    uint256 timestamp
);
```

**提现请求事件**
```solidity
/// @notice 用户提现事件
/// @param user 提现用户地址
/// @param amount 提现 RWA Token 数量（18 位精度）
/// @param fee 手续费（销毁）金额
/// @param timestamp 提现时间戳
event WithdrawalRequested(
    address indexed user,
    uint256 amount,
    uint256 fee,
    uint256 timestamp
);
```

**合约暂停事件**
```solidity
/// @notice 合约暂停状态变更
/// @param paused 暂停状态（true=暂停，false=恢复）
event PausedStatusChanged(bool indexed paused);
```

**单次限额更新事件**
```solidity
/// @notice 后端单次奖励限额更新
/// @param newLimit 新的限额（USDT 数量，18 位精度）
event MaxRewardPerCallUpdated(uint256 newLimit);
```

**事件使用规范：**

| 规范 | 说明 |
|------|------|
| indexed 属性 | 所有 address 类型参数都使用 indexed，便于链上事件筛选 |
| indexed 属性 | 所有关键 ID（stakeId、level 等）都使用 indexed |
| timestamp 字段 | 所有事件都包含 timestamp，便于后端查询和排序 |
| 参数注释 | 每个参数都注明单位和精度（如"18 位精度"） |
| 事件命名 | 使用动宾或被动语态，清晰表达含义 |
```

---

### 修改影响
- 合约开发者快速了解所有事件
- 后端开发者知道从事件中能获取哪些信息
- 便于前端集成和事件监听

---

## 修改建议 5：补充紧急提取的前端展示警告

### 位置
文件：`design.md`  
章节：`Critical Implementation Notes` → `9. 紧急熔断和管理员权限`（第 1900+ 行附近）

### 当前问题
设计文档解释了"只能退回 50% 本金"的规则，但**未明确前端需要如何展示这个限制**。用户可能误解为"能取回全部本金"。

### 建议修改方案

**在该小节中增加"前端要求"子部分：**

```markdown
### 9. 紧急熔断和管理员权限

#### 紧急提取模式说明

- **资金分配回顾：** 用户首次质押时，50% 立即转入 Treasury（国库），合约内只保留 50%
- **紧急提取规则：** 
  ```
  紧急提取金额 = 用户质押总额 × 50% - 已获得的 USDT 动态奖励
  ```
- **关键限制：** **用户无法取回全部本金，只能取回合约内保留的 50% 部分**
- **另外 50% 去向：** 已转入 Treasury（国库多签地址），永久无法退回，用于锚定实物资产

---

#### 🔴 前端展示要求（CRITICAL FOR UX）

为了避免用户投诉和误解，前端在紧急提取流程中**必须**遵循以下要求：

**第一步：入口处警告**
- [ ] 紧急提取按钮上显示 🔴 **红色气泡提示**
- [ ] 提示文案：**"⚠️ 注意：最多可退回 50% 本金"**
- [ ] 使用醒目颜色和图标，吸引用户注意

**第二步：点击后的确认对话框**
```
标题：紧急提取确认

⚠️ 重要警告

您的本金分配如下：
- Treasury（已转出，无法退回）: 50%
- 合约内（可退回）: 50%

本次紧急提取将退回合约内的 50% 本金。
另外 50% 已用于锚定实物资产，永久无法退回。

已获得的 USDT 奖励将被扣除。

现有本金: X USDT
可退回金额: X/2 USDT - 已获奖励
不可退回金额: X/2 USDT

□ 我已理解退回限制，确认继续
[ 取消 ]  [ 确认 ]
```

**第三步：交易确认后的结果显示**
- [ ] 明确显示"已退回金额"和"无法退回金额"的对比
- [ ] 示例：
  ```
  提取成功 ✓

  已退回到钱包: 5,000 RWA Token (相当于 5,000 USDT)
  已扣除奖励: 100 USDT
  未能取回: 5,000 USDT (已转入 Treasury，用于资产锚定)
  
  Treasury 地址: 0x...xxx
  Transaction Hash: 0x...xxx
  ```

**第四步：常见问题（FAQ）**
- [ ] 在紧急提取页面下方添加 FAQ 部分
- [ ] Q: 为什么只能取回 50%？
  - A: 用户质押时，50% 即时转入 Treasury 用于锚定实物资产，这是协议的核心设计。只有合约内保留的 50% 可在紧急情况下退回。
- [ ] Q: 另外 50% 去哪了？
  - A: 已转入 Treasury 多签钱包，用于收购和维护现实资产，不可退回。
- [ ] Q: 我的奖励呢？
  - A: 在紧急提取时，已获得的 USDT 动态奖励将从退回金额中扣除。

---

#### 合约实现

```solidity
/// @notice 紧急提取用户本金（50% 部分）
/// @dev 用户只能取回合约内保留的 50% 本金，另外 50% 已转入 Treasury
function emergencyWithdraw() external nonReentrant whenEmergency {
    require(users[msg.sender].totalStaked > 0, "No stake found");
    
    // 计算可退回金额 = 本金 × 50% - 已获得的 USDT 奖励
    uint256 refundAmount = users[msg.sender].totalStaked * 50 / 100;
    uint256 alreadyWithdrawn = users[msg.sender].usdtRewards;
    
    uint256 finalRefund = refundAmount > alreadyWithdrawn 
        ? refundAmount - alreadyWithdrawn 
        : 0;
    
    require(finalRefund > 0, "No amount to refund");
    
    // 转账并标记用户为非活跃（停止生息）
    IERC20(rwaToken).safeTransfer(msg.sender, finalRefund);
    users[msg.sender].isActive = false;
    users[msg.sender].totalStaked = 0;  // 清空本金记录
    
    emit EmergencyWithdrawal(msg.sender, finalRefund, alreadyWithdrawn);
}

/// @notice 紧急提取事件
event EmergencyWithdrawal(
    address indexed user,
    uint256 refundAmount,
    uint256 deductedRewards
);
```

---

#### 用户手册补充说明

在"常见问题"和"使用指南"中添加：

**【紧急提取详解】**

协议采用 50/50 分配模型：
- **50% 即时转入 Treasury**：用于锚定底层实物资产，确保协议有真实价值支撑
- **50% 保留在合约**：用于支付日常收益和紧急情况退款

**紧急提取时：**
1. 用户只能取回合约内保留的 50% 本金
2. 需扣除已获得的 USDT 动态奖励
3. 另外 50%（在 Treasury 中）无法退回，因为已用于收购资产

**建议：** 
- 正常情况下，用户应该继续质押以获得日常收益
- 仅在协议出现严重问题时，才需要使用紧急提取

**示例场景：**
```
用户 Alice 质押 10,000 USDT

立即：
- Treasury 收到 5,000 USDT（用于资产锚定）
- 合约保留 5,000 USDT（用于运营和收益）

3 个月后，Alice 获得收益 200 USDT

如果 Alice 选择紧急提取：
- 可取回：5,000 USDT - 200 USDT = 4,800 USDT
- 不可取回：5,000 USDT（在 Treasury，已用于资产收购）
- 总本金损失：1,000 USDT（加上紧急提取的 5% 手续费）
```
```

---

### 修改影响
- 用户清晰理解"只能取回 50%"的规则
- 避免投诉和法律纠纷
- 提高对协议设计的认可度

---

## 📋 修改优先级总表

| 序号 | 修改主题 | 文件 | 优先级 | 复杂度 | 预计时间 |
|------|---------|------|--------|--------|---------|
| 1 | 后端私钥泄露防御方案明确化 | design.md | 🔴 高 | 低 | 15 分钟 |
| 2 | 删除价格预言机自相矛盾 | design.md | 🔴 高 | 中 | 30 分钟 |
| 3 | 补充 stakeId 生成方式 | design.md | 🔴 高 | 低 | 20 分钟 |
| 4 | 补充完整事件定义 | design.md | 🟠 中 | 低 | 25 分钟 |
| 5 | 补充紧急提取前端警告 | design.md | 🟠 中 | 中 | 30 分钟 |

**总修改时间：** 约 2 小时（一人完成）

---

## ✅ 修改完成后的验证清单

修改完成后，建议全团队检查以下项目，确保文档一致性：

### 检查清单

- [ ] **修改 1 验证：**
  - [ ] design.md 中明确说明"V1 版本采用单次限额 + 余额校验方案"
  - [ ] tasks.md 中的 maxRewardPerCall = 10000 USDT 与 design.md 一致
  - [ ] 所有提到"防止后端被黑"的地方都指向同一个方案

- [ ] **修改 2 验证：**
  - [ ] 删除所有"Chainlink 不支持新币种"的矛盾表述
  - [ ] V1 版本明确为"后端缓存 + Redis"或"固定门槛"
  - [ ] V2 版本清晰描述升级路线

- [ ] **修改 3 验证：**
  - [ ] stakeId 生成方式在 design.md 有完整说明
  - [ ] tasks.md 第 3 任务中关于"生成唯一 stakeId"有清晰指向
  - [ ] 数据库 stakes 表的 id 字段与合约 stakesCounter 对应

- [ ] **修改 4 验证：**
  - [ ] design.md 中列出 6 个完整的 Solidity 事件定义
  - [ ] 每个事件都包含 @notice、@param 注释
  - [ ] 所有 address 类型参数都标注 indexed
  - [ ] 合约开发者可直接复制粘贴使用

- [ ] **修改 5 验证：**
  - [ ] 紧急提取页面的前端展示要求明确具体
  - [ ] 用户手册中包含"示例场景"
  - [ ] 合约代码中的 emergencyWithdraw 函数与文档说明一致

---

## 🎯 后续建议

### 短期（修改后立即）
1. ✅ 更新 design.md（按上述 5 处修改建议）
2. ✅ 更新 tasks.md（同步修改 1-3）
3. ✅ 发布修改后的文档版本 v2.0
4. ✅ 全团队走读和评审（半天会议）

### 中期（启动开发前）
1. 基于修改后的文档生成"实现指南"（模块级别）
2. 为每个模块明确"验收标准"和"测试用例"
3. 建立 Git 仓库和 CI/CD 流程
4. 分配开发任务和 code owner

### 长期（V1 发布后）
1. 基于实际开发经验反馈修改设计文档
2. 补充运维手册和故障排查指南
3. 记录所有设计决策的决策记录（Decision Log）

---

## 📞 反馈和问题处理

**如果团队有疑问：**
- Q1: "修改 2 中选择'固定 10 RWA Token 门槛'还是'后端缓存价格'？"
  - A: **建议选择"固定 10 RWA Token 门槛"**（更简单透明，避免价格风险）

- Q2: "stakeId 自增计数器会不会 overflow？"
  - A: uint256 的范围是 0 ~ 2^256-1，即使每秒生成 100 个 stakeId，也需要 10^72 年才会 overflow，完全不用考虑

- Q3: "紧急提取的前端警告是否过于复杂？"
  - A: **简洁版本**可以是一个简单的 4 行确认对话框。建议参考其他 DeFi 产品的"风险确认"流程

- Q4: "这 5 处修改会影响已有的代码吗？"
  - A: **不会**。这 5 处都是文档澄清和补充，**不改变已有的逻辑或数据结构**

---

## 📄 文档版本号建议

**修改前版本：** v1.0（当前）  
**修改后版本：** v1.1（澄清和补充）  
**建议在 design.md 顶部添加版本历史：**

```markdown
# 版本历史

| 版本 | 日期 | 主要变更 |
|------|------|---------|
| v1.1 | 2026-02-26 | 澄清后端私钥防御方案、删除价格预言机矛盾、补充 stakeId 定义、补充事件定义、强化紧急提取警告 |
| v1.0 | 2026-02-01 | 初始版本 |
```

---

**修改建议完成** ✅

以上 5 处修改建议，均已提供具体的文本替换方案。团队可按优先级自行决定是否采纳和何时执行。

