# Requirements Document

## Introduction

本协议是一个基于 BSC（币安智能链）的现实资产（RWA）代币化协议，通过智能合约实现资产质押、分配管理和社区激励机制。协议采用 **50/50 资产分配模型**，其中 50% 用于资产储备，50% 用于社区激励。系统支持无限级差推荐奖励机制，并通过交易调节税维护流动性稳定。

## Glossary

- **Protocol**: 指本 RWA 代币化协议系统
- **USDT**: Tether USD 稳定币，用户质押的基础资产
- **RWA Token**: 协议原生代币，用户通过质押获得的映射收益代币
- **Treasury Address**: 协议指定的资产管理储备金地址
- **Staking Contract**: 处理用户质押和资金分配的智能合约
- **Node Level**: 用户在协议中的等级（V1-V5）
- **Differential Reward**: 基于推荐关系的级差奖励
- **Exit Stability Fee**: 对 DEX 卖出行为征收的调节税
- **Referrer**: 推荐人，邀请新用户参与质押的上级用户
- **DEX**: 去中心化交易所（如 PancakeSwap）
- **Whitelist Address**: 免税地址列表
- **Daily Yield**: 每日静态产出收益
- **Community Growth Fund**: 社区共识激励金池
- **Team Volume**: 团队总质押业绩，包含用户本人及所有下级的累计质押金额
- **Direct Referral**: 直推用户，由该用户直接邀请的一级下级
- **Liquidity-Fund Wallet**: 专门用于收集流动性税费的钱包地址
- **Minimum Stake**: 最低有效质押金额

## Requirements

### Requirement 1

**User Story:** 作为协议管理员，我希望系统能够自动分配质押资金，以确保资产储备和社区激励的合理配置。

#### Acceptance Criteria

1. WHEN 用户调用 stake 函数质押 USDT THEN the Staking Contract SHALL 将 50% 的资金转账至 Treasury Address
2. WHEN 用户调用 stake 函数质押 USDT THEN the Staking Contract SHALL 将 50% 的资金保留在合约内或分配至激励池
3. WHEN 资金分配完成 THEN the Staking Contract SHALL 记录用户的质押金额和时间戳
4. WHEN 资金转账失败 THEN the Staking Contract SHALL 回滚整个交易并返回错误信息

### Requirement 2

**User Story:** 作为用户，我希望在首次质押时绑定推荐人关系，以便参与社区激励体系。

#### Acceptance Criteria

1. WHEN 用户首次调用 stake 函数并提供有效的 referrer 地址 THEN the Staking Contract SHALL 永久记录该推荐关系
2. WHEN 用户已存在推荐关系 THEN the Staking Contract SHALL 忽略新的 referrer 参数并保持原有关系
3. WHEN referrer 地址为零地址或用户自身地址 THEN the Staking Contract SHALL 拒绝绑定并继续处理质押
4. WHEN 推荐关系记录完成 THEN the Staking Contract SHALL 触发事件以供后端系统监听

### Requirement 3

**User Story:** 作为协议设计者，我希望实现无限级差激励算法，以驱动社区裂变并控制总支出在 50% 以内。

#### Acceptance Criteria

1. WHEN 计算上级节点收益 THEN the Protocol SHALL 使用公式：质押金额 × (上级当前等级比例 - 路径上已分配过的最高比例)
2. WHEN 追溯推荐链条 THEN the Protocol SHALL 支持无限层级向上查找
3. WHEN 计算所有级差奖励总和 THEN the Protocol SHALL 确保总支出不超过质押金额的 50%
4. WHEN 上级节点等级低于或等于路径中已结算过的最高等级 THEN the Protocol SHALL 将该上级收益设为 0 并继续向上追溯
5. WHEN 存在未发放完的剩余比例 THEN the Protocol SHALL 将剩余资金保留在合约或划转至 Treasury Address 作为协议净利润
6. WHEN 节点等级为 V1 THEN the Protocol SHALL 使用 5% 的收益比例
7. WHEN 节点等级为 V2 THEN the Protocol SHALL 使用 10% 的收益比例
8. WHEN 节点等级为 V3 THEN the Protocol SHALL 使用 15% 的收益比例
9. WHEN 节点等级为 V4 THEN the Protocol SHALL 使用 20% 的收益比例
10. WHEN 节点等级为 V5 THEN the Protocol SHALL 使用 50% 的收益比例
11. WHEN 级差奖励计算完成 THEN the Protocol SHALL 以 USDT 形式即时结算动态奖励

### Requirement 4

**User Story:** 作为协议管理员，我希望对 DEX 卖出行为征收调节税，以维护流动性稳定性。

#### Acceptance Criteria

1. WHEN 用户在 DEX 卖出 RWA Token THEN the RWA Token SHALL 征收 20% 的交易税
2. WHEN 征收交易税 THEN the RWA Token SHALL 将 10% 转入 Treasury Address
3. WHEN 征收交易税 THEN the RWA Token SHALL 销毁 5% 的代币
4. WHEN 征收交易税 THEN the RWA Token SHALL 将 5% 添加至流动性池
5. WHEN 交易地址在 Whitelist Address 中 THEN the RWA Token SHALL 免除交易税
6. WHEN 用户在 DEX 买入 RWA Token THEN the RWA Token SHALL 不征收交易税

### Requirement 5

**User Story:** 作为用户，我希望每日获得静态产出收益，以实现资产增值。

#### Acceptance Criteria

1. WHEN 系统计算每日收益 THEN the Protocol SHALL 按用户质押 USDT 金额的 0.8% 释放 RWA Token
2. WHEN 收益计算完成 THEN the Protocol SHALL 更新用户的可提取余额
3. WHEN 用户请求提现 THEN the Protocol SHALL 允许用户提取可用的 RWA Token 至钱包
4. WHEN 提现金额超过可用余额 THEN the Protocol SHALL 拒绝提现请求

### Requirement 6

**User Story:** 作为用户，我希望能够安全地提现 RWA 代币到我的钱包，以便在 DEX 中交易。

#### Acceptance Criteria

1. WHEN 用户调用提现函数 THEN the Staking Contract SHALL 验证用户的可提取余额
2. WHEN 余额充足 THEN the Staking Contract SHALL 转账 RWA Token 至用户钱包地址
3. WHEN 转账成功 THEN the Staking Contract SHALL 扣减用户的可提取余额
4. WHEN 转账失败 THEN the Staking Contract SHALL 回滚交易并保持余额不变

### Requirement 7

**User Story:** 作为后端系统，我需要监控合约事件并计算级差奖励，以自动化激励分发流程。

#### Acceptance Criteria

1. WHEN Staking Contract 触发质押事件 THEN the Backend System SHALL 捕获事件并解析参数
2. WHEN 解析质押事件 THEN the Backend System SHALL 查询推荐关系树形结构
3. WHEN 查询推荐链条 THEN the Backend System SHALL 计算每个上级节点的级差奖励
4. WHEN 计算完成 THEN the Backend System SHALL 更新数据库中的用户收益记录
5. WHEN 数据库更新失败 THEN the Backend System SHALL 记录错误日志并触发告警

### Requirement 8

**User Story:** 作为协议管理员，我希望部署自动化做市系统，以维护市场价格稳定性和流动性深度。

#### Acceptance Criteria

1. WHEN 做市脚本运行 THEN the Market Support System SHALL 在随机时间间隔执行买入操作
2. WHEN 执行买入 THEN the Market Support System SHALL 在 PancakeSwap 使用小额 USDT 购买 RWA Token
3. WHEN 买入完成 THEN the Market Support System SHALL 记录交易哈希和执行时间
4. WHEN 买入失败 THEN the Market Support System SHALL 记录错误并在下一个周期重试
5. WHEN 钱包余额不足 THEN the Market Support System SHALL 发送告警通知管理员

### Requirement 9

**User Story:** 作为系统管理员，我希望智能合约具备管理员权限控制，以便进行协议参数调整和紧急操作。

#### Acceptance Criteria

1. WHEN 部署合约 THEN the Staking Contract SHALL 设置部署者为初始管理员
2. WHEN 管理员调用设置 Treasury Address 函数 THEN the Staking Contract SHALL 更新 Treasury Address
3. WHEN 非管理员调用管理函数 THEN the Staking Contract SHALL 拒绝交易并返回权限错误
4. WHEN 管理员添加白名单地址 THEN the Staking Contract SHALL 将地址加入免税列表
5. WHEN 管理员移除白名单地址 THEN the Staking Contract SHALL 将地址从免税列表中删除

### Requirement 10

**User Story:** 作为开发者，我希望后端系统能够安全地存储和查询用户数据，以支持复杂的推荐关系和收益计算。

#### Acceptance Criteria

1. WHEN 用户首次质押 THEN the Backend System SHALL 在数据库中创建用户记录
2. WHEN 存储推荐关系 THEN the Backend System SHALL 使用树形结构表示推荐网络
3. WHEN 查询用户的下级节点 THEN the Backend System SHALL 返回所有直接和间接下级列表
4. WHEN 计算用户总收益 THEN the Backend System SHALL 汇总静态收益和动态级差奖励
5. WHEN 数据库连接失败 THEN the Backend System SHALL 使用连接池自动重连

### Requirement 11

**User Story:** 作为安全审计员，我希望系统具备完善的安全机制，以防止常见的智能合约漏洞。

#### Acceptance Criteria

1. WHEN 执行资金转账操作 THEN the Staking Contract SHALL 使用 ReentrancyGuard 防止重入攻击
2. WHEN 处理用户输入 THEN the Staking Contract SHALL 验证所有参数的有效性
3. WHEN 执行数学运算 THEN the Staking Contract SHALL 使用 SafeMath 或 Solidity 0.8+ 内置溢出检查
4. WHEN 存储敏感数据 THEN the Backend System SHALL 加密存储私钥和敏感配置
5. WHEN 访问数据库 THEN the Backend System SHALL 仅允许本地 IP 访问并使用强密码

### Requirement 12

**User Story:** 作为用户，我希望能够查询我的质押信息和收益明细，以了解资产状况。

#### Acceptance Criteria

1. WHEN 用户查询质押信息 THEN the Protocol SHALL 返回质押金额、质押时间和节点等级
2. WHEN 用户查询收益明细 THEN the Protocol SHALL 返回静态收益和动态收益的详细记录
3. WHEN 用户查询推荐关系 THEN the Protocol SHALL 返回推荐人地址和直接下级列表
4. WHEN 查询不存在的用户 THEN the Protocol SHALL 返回空数据或默认值

### Requirement 13

**User Story:** 作为后端系统，我需要根据用户团队业绩自动调整节点等级，以实现自动化管理和激励分配。

#### Acceptance Criteria

1. WHEN 用户完成首次有效质押 THEN the Backend System SHALL 设置用户节点等级为 V1
2. WHEN 用户直推有效用户达到 3 人且团队总质押业绩达到 5000 USDT THEN the Backend System SHALL 升级用户节点等级为 V2
3. WHEN 用户直推 3 个 V2 节点且团队总质押业绩达到 20000 USDT THEN the Backend System SHALL 升级用户节点等级为 V3
4. WHEN 用户直推 3 个 V3 节点且团队总质押业绩达到 100000 USDT THEN the Backend System SHALL 升级用户节点等级为 V4
5. WHEN 用户直推 3 个 V4 节点且团队总质押业绩达到 500000 USDT THEN the Backend System SHALL 升级用户节点等级为 V5
6. WHEN 发生新的质押事件 THEN the Backend System SHALL 向上追溯推荐链条并实时更新符合条件者的等级
7. WHEN 用户等级升级 THEN the Backend System SHALL 触发等级变更事件并记录升级时间

### Requirement 14

**User Story:** 作为用户，我希望提现 RWA 代币时有合理的门槛和手续费机制，以确保系统稳定运行。

#### Acceptance Criteria

1. WHEN 用户请求提现 RWA Token THEN the Staking Contract SHALL 验证提现金额是否达到 10 USDT 等值
2. WHEN 提现金额低于最低额度 THEN the Staking Contract SHALL 拒绝提现请求
3. WHEN 提现金额满足要求 THEN the Staking Contract SHALL 扣除 5% 的 RWA Token 作为处理费并销毁
4. WHEN 用户在 24 小时内已提现 THEN the Staking Contract SHALL 拒绝新的提现请求
5. WHEN 提现冷却时间已过 THEN the Staking Contract SHALL 允许用户发起新的提现请求

### Requirement 15

**User Story:** 作为协议管理员，我希望拥有紧急熔断机制，以在极端情况下保护用户资产和协议安全。

#### Acceptance Criteria

1. WHEN 管理员调用 pause 函数 THEN the Staking Contract SHALL 暂停所有 stake 和 withdraw 操作
2. WHEN 合约处于暂停状态 THEN the Staking Contract SHALL 拒绝所有用户的质押和提现请求
3. WHEN 管理员调用 unpause 函数 THEN the Staking Contract SHALL 恢复正常操作
4. WHEN 管理员开启紧急提取通道 THEN the Staking Contract SHALL 允许用户退回合约内保留的 50% 本金（扣除已获得的 USDT 动态奖励），另外 50% 已转入 Treasury 无法退回
5. WHEN 非管理员调用 pause 或 unpause 函数 THEN the Staking Contract SHALL 拒绝交易并返回权限错误

### Requirement 16

**User Story:** 作为协议设计者，我希望明确静态收益和动态奖励的币种和资金流转路径，以实现清晰的资金闭环。

#### Acceptance Criteria

1. WHEN 系统计算每日静态收益 THEN the Backend System SHALL 以 RWA Token 形式发放至用户待提取余额
2. WHEN 系统计算级差动态奖励 THEN the Backend System SHALL 以 USDT 形式即时结算
3. WHEN 分发动态奖励 THEN the Staking Contract SHALL 从合约内的 50% 社区池中支付 USDT 给受益人
4. WHEN Treasury Address 接收资金 THEN the Protocol SHALL 将其标记为协议利润并与社区池隔离
5. WHEN 社区池余额不足以支付奖励 THEN the Protocol SHALL 记录错误并触发告警

### Requirement 17

**User Story:** 作为协议管理员，我希望简化交易调节税的流动性管理，以降低自动化复杂度。

#### Acceptance Criteria

1. WHEN 征收 20% 交易税 THEN the RWA Token SHALL 将 10% 转入 Treasury Address
2. WHEN 征收 20% 交易税 THEN the RWA Token SHALL 销毁 5% 的代币
3. WHEN 征收 20% 交易税 THEN the RWA Token SHALL 将 5% 转入 Liquidity-Fund 钱包
4. WHEN Liquidity-Fund 钱包积累足够资金 THEN 管理员 SHALL 手动或通过脚本将资产添加至 PancakeSwap 流动性池
5. WHEN 添加流动性完成 THEN the Protocol SHALL 记录操作日志和 LP Token 数量
