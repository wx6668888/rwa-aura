# Implementation Plan

- [x] 1. 项目初始化和开发环境搭�?




  - 创建项目目录结构（contracts、backend、scripts�?
  - 初始�?Hardhat 项目并配�?BSC 网络
  - 安装核心依赖（OpenZeppelin、ethers.js、Hardhat�?
  - 配置 TypeScript �?ESLint
  - 创建 .env.example 文件模板


  - _Requirements: 所有需求的基础_

- [ ] 2. 实现 RWAToken 合约（BEP-20 代币�?
  - 创建 RWAToken.sol 合约，继�?OpenZeppelin ERC20、Ownable、Pausable
  - 实现基本 BEP-20 功能（transfer、approve、transferFrom�?
  - 实现交易税逻辑（检�?DEX 卖出方向，征�?20% 税）
  - 实现税收分配�?0% Treasury�?% 销毁�?% 流动性基金）
  - 实现白名单管理（添加、移除、查询）
  - 实现 PancakeSwap Pair 地址设置
  - 使用 mapping 存储白名单地址（Gas 优化�?
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 17.1, 17.2, 17.3_

- [ ] 2.1 编写 RWAToken 属性测�?
  - **Property 11: 卖出交易税征�?*
  - **Validates: Requirements 4.1**

- [ ] 2.2 编写 RWAToken 属性测�?
  - **Property 12: 交易税分配正确�?*
  - **Validates: Requirements 4.2, 4.3, 4.4**

- [ ] 2.3 编写 RWAToken 属性测�?
  - **Property 13: 白名单免�?*
  - **Validates: Requirements 4.5**



- [ ] 2.4 编写 RWAToken 属性测�?
  - **Property 14: 买入交易免税**
  - **Validates: Requirements 4.6**

- [ ] 3. 实现 StakingContract 合约（质押和奖励管理�?
  - 创建 StakingContract.sol，继�?Ownable、Pausable、ReentrancyGuard
  - 定义 UserInfo 结构体（使用 18 位精度）
  - 定义 processedStakes 映射（记录已处理的质�?ID�?
  - 定义全局变量 totalStaked �?totalDynamicRewardsPaid
  - **🔴 定义 maxRewardPerCall 变量（单次奖励上限，默�?10000 USDT�?*
  - 实现 stake 函数�?0/50 资金分配、推荐关系绑定、生成唯一 stakeId�?
  - 实现 USDT 精度转换�? 位转 18 位，先乘后除�?
  - 实现推荐关系永久锁定逻辑
  - 触发 StakeEvent 事件（包�?stakeId�?
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4_

- [ ] 3.1 编写 StakingContract 质押属性测�?
  - **Property 1: 50/50 资金分配正确�?*
  - **Validates: Requirements 1.1, 1.2**

- [ ] 3.2 编写 StakingContract 质押属性测�?
  - **Property 2: 质押记录完整�?*
  - **Validates: Requirements 1.3**

- [ ] 3.3 编写 StakingContract 推荐关系属性测�?
  - **Property 3: 推荐关系不可变�?*
  - **Validates: Requirements 2.1, 2.2**

- [ ] 3.4 编写 StakingContract 推荐关系属性测�?
  - **Property 4: 推荐关系事件发射**
  - **Validates: Requirements 2.4**

- [ ] 3.5 编写 StakingContract 推荐关系属性测�?
  - **Property 29: 推荐关系不可修改�?*
  - **Validates: Requirements 2.1, 2.2**

- [ ] 3.6 编写 StakingContract 精度属性测�?
  - **Property 31: 精度一致�?*
  - **Validates: Requirements 1.1, 1.2**

- [ ] 4. 实现 StakingContract 提现功能
  - 实现 withdraw 函数（余额验证、手续费扣除、冷却时间检查）
  - 实现提现门槛验证（调用价格预言机，验证 10 USDT 等值）
  - 实现 5% 手续费扣除和销毁逻辑
  - 实现 24 小时冷却时间检�?
  - 使用 SafeERC20 进行 RWA Token 转账
  - _Requirements: 5.3, 5.4, 6.1, 6.2, 6.3, 6.4, 14.1, 14.2, 14.3, 14.4, 14.5_

- [ ] 4.1 编写提现属性测�?
  - **Property 17: 提现余额扣减**
  - **Validates: Requirements 6.2, 6.3**

- [ ] 4.2 编写提现属性测�?
  - **Property 22: 提现门槛验证**
  - **Validates: Requirements 14.1**

- [ ] 4.3 编写提现属性测�?
  - **Property 23: 提现手续费扣�?*
  - **Validates: Requirements 14.3**

- [ ] 4.4 编写提现属性测�?
  - **Property 24: 提现冷却时间**
  - **Validates: Requirements 14.4, 14.5**

- [ ] 5. 实现 StakingContract 管理员功�?
  - **🔴 实现 updateUserRewards 函数（必须严格按"先锁后查后加"顺序，防重入攻击�?*
  - **🔴 在 updateUserRewards 中增加单次限额校验（maxRewardPerCall�?*
  - 实现 setMaxRewardPerCall 函数（管理员设置单次奖励上限�?
  - 实现 setTreasuryAddress 函数（挂载时间锁�?8 小时延迟�?
  - 实现 setWhitelist 函数（添�?移除白名单）
  - 实现 pause �?unpause 函数
  - 实现 emergencyWithdraw 函数（用户取回本金，扣除收益�?
  - 实现 updateNodeLevel 函数（后端调用，需权限控制�?
  - 实现 getTotalDynamicRewardsPaid �?getTotalStaked 查询函数
  - �?updateUserRewards 中增�?50% 上限硬性校�?
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 15.1, 15.2, 15.3, 15.4, 15.5_

- [ ] 5.1 编写管理员功能属性测�?
  - **Property 18: 管理员权限控�?*
  - **Validates: Requirements 9.3, 15.5**

- [ ] 5.2 编写管理员功能属性测�?
  - **Property 19: 白名单管理往返一致�?*
  - **Validates: Requirements 9.4, 9.5**

- [ ] 5.3 编写暂停机制属性测�?
  - **Property 25: 暂停机制往返一致�?*
  - **Validates: Requirements 15.1, 15.2, 15.3**

- [ ] 5.4 编写紧急提取属性测�?
  - **Property 26: 紧急提取本金保�?*
  - **Validates: Requirements 15.4**

- [ ] 5.5 编写 stakeId 唯一性属性测�?
  - **Property 32: stakeId 唯一性保�?*
  - **Validates: Requirements 3.11, 7.4**

- [ ] 5.6 编写动态奖励上限属性测�?
  - **Property 33: 动态奖�?50% 上限硬性约�?*
  - **Validates: Requirements 3.3, 16.3**

- [ ] 6. 实现 StakingContract 查询功能
  - 实现 getUserStakeInfo 函数（返回质押信息、余额、推荐人、等级）
  - 实现 getUserRewards 函数（返回静态和动态收益）
  - 实现 getReferralInfo 函数（返回推荐人和直推列表）
  - _Requirements: 12.1, 12.2, 12.3, 12.4_

- [ ] 6.1 编写查询功能属性测�?
  - **Property 20: 查询功能数据一致�?*
  - **Validates: Requirements 12.1, 12.3**

- [ ] 7. Checkpoint - 合约层测试验�?
  - 确保所有合约单元测试通过
  - 确保所有属性测试通过（至�?100 次迭代）
  - 使用 Hardhat Coverage 检查代码覆盖率（目�?>80%�?
  - �?Hardhat Network 上进行集成测�?
  - 如有问题，询问用�?

- [ ] 8. 数据库设计和初始�?
  - 创建 MySQL 数据库和用户
  - **🔴 创建 users 表（所有金额字段使�?DECIMAL(38, 0) 存储 18 位整数�?*
  - **🔴 创建 stakes 表（amount 字段使�?DECIMAL(38, 0)�?*
  - **🔴 创建 rewards 表（amount 字段使�?DECIMAL(38, 0)�?*
  - **🔴 创建 department_volumes 表（department_volume 使用 DECIMAL(38, 0)�?*
  - **🔴 创建 referral_relations 表（用于精确匹配级差查询，替代模糊匹配�?*
  - 创建 node_level_history 表（team_volume 使用 DECIMAL(38, 0)�?
  - 创建必要的索引（referrer、node_level、timestamp�?
  - 编写数据库迁移脚�?
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 13.1, 13.2, 13.3, 13.4, 13.5_

- [ ] 9. 实现后端事件监听服务
  - 创建 EventMonitor 类，使用 ethers.js 监听合约事件
  - 实现 12 区块确认延迟机制（防止短链分叉）
  - 实现事件幂等性检查（基于 tx_hash �?stakeId�?
  - 实现断点续传（记录最后处理的区块号）
  - 连接数据库并存储质押记录
  - 从事件中提取 stakeId 并传递给奖励计算引擎
  - 触发级差奖励计算流程
  - 实现错误处理和自动重�?
  - _Requirements: 7.1, 7.2, 7.5_

- [ ] 10. 实现级差奖励计算引擎
  - 创建 RewardEngine �?
  - **🔴 实现 calculateDifferentialRewards 函数（使用 referral_relations 表精确匹配，禁止 LIKE 模糊匹配�?*
  - 实现节点等级到奖励比例的映射（V1:5%, V2:10%, V3:15%, V4:20%, V5:50%�?
  - 实现"压级"逻辑（上级等�?�?已分配最高等级时收益�?0�?
  - 确保总奖励不超过 50%
  - 实现 validateRewardLimit 函数（验证动态奖励总额不超�?50% 上限�?
  - 使用数据库事务包装整个奖励分发流�?
  - 使用行级锁（SELECT ... FOR UPDATE）防止并发冲�?
  - 使用 BigNumber 库处理精度（18 位整数�?
  - 所有金额字段使�?string 类型传输
  - 调用合约 updateUserRewards 时传�?stakeId
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11, 16.2, 16.3_

- [ ] 10.1 编写级差奖励计算属性测�?
  - **Property 5: 级差奖励计算正确�?*
  - **Validates: Requirements 3.1, 3.4**

- [ ] 10.2 编写级差奖励计算属性测�?
  - **Property 6: 无限层级支持**
  - **Validates: Requirements 3.2**

- [ ] 10.3 编写级差奖励计算属性测�?
  - **Property 7: 级差奖励总额上限**
  - **Validates: Requirements 3.3**

- [ ] 10.4 编写级差奖励计算属性测�?
  - **Property 8: 资金完整�?*
  - **Validates: Requirements 3.5**

- [ ] 10.5 编写级差奖励计算属性测�?
  - **Property 9: 节点等级到奖励比例映�?*
  - **Validates: Requirements 3.6, 3.7, 3.8, 3.9, 3.10**

- [ ] 10.6 编写级差奖励计算属性测�?
  - **Property 10: 动态奖励币种正确�?*
  - **Validates: Requirements 3.11**

- [ ] 10.7 编写级差奖励计算属性测�?
  - **Property 27: 动态奖励资金来�?*
  - **Validates: Requirements 16.3**

- [ ] 11. 实现团队业绩增量更新
  - 创建 updateTeamVolume 函数
  - 当用户质押时，向上追�?referral_path 中的所有上�?
  - 为每个上级的 team_volume 增加质押金额
  - 同时更新 department_volumes 表（记录各部门业绩）
  - 使用数据库事务确保原子�?
  - _Requirements: 13.2, 13.3, 13.4, 13.5, 13.6_

- [ ] 12. 实现节点等级升级逻辑
  - 创建 checkAndUpgradeNodeLevel 函数
  - 查询用户的直推达标节点数（按等级统计�?
  - 查询用户的团队总业�?
  - 查询各直推部门的业绩（从 department_volumes 表）
  - 实现大区小区平衡检查（最大单部门业绩 �?50%�?
  - 根据升级条件判断是否升级
  - 升级时更�?users 表的 node_level 字段
  - 记录升级历史�?node_level_history �?
  - 调用合约�?updateNodeLevel 函数同步链上状�?
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.7_

- [ ] 12.1 编写节点等级升级属性测�?
  - **Property 21: 节点等级升级条件**
  - **Validates: Requirements 13.2, 13.3, 13.4, 13.5**

- [ ] 12.2 编写节点等级升级属性测�?
  - **Property 28: 大区小区平衡限制**
  - **Validates: Requirements 13.2, 13.3, 13.4, 13.5**

- [ ] 13. 实现每日静态收益计�?
  - 创建 DailyYieldScheduler �?
  - 使用 node-cron 配置每日定时任务（如每天 00:00 UTC�?
  - 查询所�?is_active = true 的用�?
  - 计算每个用户的静态收益（total_staked × 0.8%�?
  - 更新用户�?rwa_pending 余额
  - 记录收益明细�?rewards �?
  - 使用 BigNumber 库确保精度（18 位）
  - _Requirements: 5.1, 5.2, 16.1_

- [ ] 13.1 编写静态收益计算属性测�?
  - **Property 15: 静态收益计算正确�?*
  - **Validates: Requirements 5.1**

- [ ] 13.2 编写静态收益计算属性测�?
  - **Property 16: 收益余额更新**
  - **Validates: Requirements 5.2**

- [ ] 13.3 编写静态收益计算属性测�?
  - **Property 30: 收益计算与本金状态关�?*
  - **Validates: Requirements 5.1**

- [ ] 14. 实现价格预言机服�?
  - 创建 PriceOracle �?
  - 实现 getRWAPrice 函数（调�?PancakeSwap Router �?Pair 合约�?
  - 实现价格缓存机制（使�?Redis，TTL 5 分钟�?
  - 实现 convertRWAToUSDT �?convertUSDTToRWA 函数
  - 实现错误处理（使用缓存价格或拒绝请求�?
  - 配置定时任务�?5 分钟更新价格
  - _Requirements: 14.1_

- [ ] 15. 实现后端 API 服务
  - 创建 Express.js API 服务�?
  - 实现用户查询接口（GET /api/user/:address�?
  - 实现质押历史查询接口（GET /api/stakes/:address�?
  - 实现收益明细查询接口（GET /api/rewards/:address�?
  - 实现推荐关系查询接口（GET /api/referrals/:address�?
  - 实现节点等级历史查询接口（GET /api/level-history/:address�?
  - 实现数据聚合和格式化
  - **所有金额字段使�?string 类型返回（禁�?number 类型�?*
  - 配置 CORS 和安全中间件
  - _Requirements: 12.1, 12.2, 12.3_

- [ ] 16. Checkpoint - 后端服务测试验证
  - 确保事件监听服务正常运行
  - 确保级差奖励计算正确（使用测试数据）
  - 确保静态收益计算正�?
  - 确保价格预言机正常工�?
  - 确保 API 接口返回正确数据
  - 如有问题，询问用�?

- [ ] 17. 实现做市机器人（Python�?
  - 创建 MarketMakerBot �?
  - 使用 web3.py 连接 BSC 节点
  - 实现 execute_buy 函数（在 PancakeSwap 买入 RWA Token�?
  - 实现随机时间间隔�?0 分钟�?2 小时�?
  - 实现随机买入金额�?0-50 USDT�?
  - 实现每日买入上限�?00 USDT�?
  - 实现钱包余额监控和告�?
  - 实现交易日志记录
  - 实现错误处理和重试机�?
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 18. 部署脚本和配�?
  - 编写合约部署脚本（deploy.ts�?
  - **部署 Gnosis Safe 多签合约作为 Treasury�?/2 配置：3 个签名者，至少 2 个签名�?*
  - **部署 TimeLockController 合约�?8 小时延迟�?*
  - 配置 BSC Testnet �?Mainnet 网络参数
  - 编写初始化脚本（设置 Treasury、白名单、Pair 地址�?
  - 编写后端服务启动脚本
  - 配置 PM2 进程管理
  - 编写数据库备份脚�?
  - 配置 Nginx 反向代理�?SSL
  - 编写监控和告警脚本（Telegram Bot�?
  - _Requirements: 所有需求的部署基础_

- [ ] 19. BSC Testnet 部署和测�?
  - �?BSC Testnet 部署 RWAToken 合约
  - �?BSC Testnet 部署 StakingContract 合约
  - �?PancakeSwap Testnet 创建 RWA/USDT 交易�?
  - 添加初始流动�?
  - 部署后端服务到测试服务器
  - 进行端到端测试（质押、收益、提现、级差奖励）
  - 测试做市机器�?
  - 验证所有功能正常工�?
  - _Requirements: 所有需求的集成测试_

- [ ] 20. 安全审计和优�?
  - 使用 Slither 进行静态分�?
  - 使用 Mythril 进行安全扫描
  - **🔴 验证 updateUserRewards 函数严格按"先锁后查后加"顺序实现**
  - **🔴 验证 maxRewardPerCall 单次限额校验已实现**
  - **🔴 验证数据库所有金额字段使�?DECIMAL(38, 0) 存储 18 位整数**
  - **🔴 验证级差查询使用 referral_relations 表精确匹配，禁止 LIKE 模糊匹配**
  - 检查所�?Critical Implementation Notes 是否实现
  - 验证 SafeERC20 使用
  - 验证 12 区块确认延迟
  - 验证事件幂等性（tx_hash + stakeId�?
  - 验证 stakeId 唯一性校验（processedStakes 映射�?
  - 验证动态奖�?50% 上限硬性校�?
  - 验证 Treasury �?Gnosis Safe 多签合约
  - 验证敏感参数修改挂载 48 小时时间�?
  - 验证 API 接口所有金额字段使�?string 类型
  - 验证数据库事务和行锁
  - 验证精度处理�?8 位）
  - 验证白名单使�?mapping
  - 验证价格预言机缓�?
  - 验证做市机器人每日限�?
  - 进行 Gas 优化
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [ ] 21. 文档和交付
  - 编写合约 API 文档
  - 编写后端 API 文档
  - 编写部署指南
  - 编写运维手册
  - 编写用户使用指南
  - 准备审计报告
  - 准备主网部署清单
  - _Requirements: 所有需求的文档化_

- [ ] 21.5 实现前端用户界面
  - 创建 React/Next.js 项目并配置 Web3 集成
  - 配置 ethers.js 和钱包连接（MetaMask、WalletConnect）
  - 实现钱包连接组件和网络切换（BSC Mainnet/Testnet）
  - _Requirements: 所有需求的用户界面基础_

- [ ] 21.5.1 实现质押页面
  - 创建质押表单（输入 USDT 金额、选择推荐人地址）
  - 实现 USDT 授权（approve）流程
  - 实现质押（stake）交易提交
  - 显示交易状态（待确认、确认中、成功、失败）
  - 显示当前质押信息（总质押、节点等级、推荐人）
  - 实现输入验证（最小质押金额、地址格式验证）
  - 显示预估的资金分配（50% Treasury、50% 社区池）
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2_

- [ ] 21.5.2 实现提现页面
  - 显示用户可提现余额（RWA Token）
  - 创建提现表单（输入提现金额）
  - 实现提现门槛验证（调用价格预言机 API，显示 USDT 等值）
  - 显示冷却时间倒计时（24 小时）
  - 显示手续费预览（5% 销毁）
  - 实现提现（withdraw）交易提交
  - 显示交易状态和结果
  - 提示用户提现后的实际到账金额（扣除 5% 手续费）
  - _Requirements: 6.1, 6.2, 6.3, 14.1, 14.2, 14.3, 14.4, 14.5_

- [ ] 21.5.3 实现用户仪表板
  - 显示用户质押概览（总质押、节点等级、推荐人）
  - 显示收益明细（静态收益、动态奖励）
  - 显示推荐关系树（直推列表、团队业绩）
  - 实现收益历史查询（调用后端 API）
  - 显示节点等级升级进度（当前等级、升级条件、进度条）
  - 实现数据自动刷新（每 30 秒）
  - 所有金额使用 ethers.utils.formatUnits 转换显示
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 13.1_

- [ ] 21.5.4 实现紧急提取流程（带安全警告）
  - **🔴 入口处红色气泡提示**
    - 在用户仪表板显著位置添加"紧急提取"按钮
    - 按钮上显示红色气泡："⚠️ 注意：最多可退回 50% 本金"
    - 使用醒目的红色或橙色配色
  - **🔴 确认对话框（第一层警告）**
    - 标题："紧急提取确认"
    - 显示资金分配说明：
      - Treasury（已转出，无法退回）: 50%
      - 合约内（可退回）: 50%
    - 显示计算结果：
      - 现有本金: X USDT
      - 可退回金额: X/2 USDT - 已获奖励
      - 不可退回金额: X/2 USDT
    - 必选复选框："□ 我已理解退回限制，确认继续"
    - 两个按钮："取消" 和 "确认"
  - **🔴 交易结果显示（第二层说明）**
    - 成功后显示详细结果：
      - 已退回到钱包: X RWA Token (相当于 X USDT)
      - 已扣除奖励: X USDT
      - 未能取回: X USDT (已转入 Treasury，用于资产锚定)
      - 总本金损失: X USDT
    - 显示 Treasury 地址和交易哈希
  - **🔴 FAQ 部分**
    - Q: 为什么只能取回 50%？
    - Q: 另外 50% 去哪了？
    - Q: 我的奖励呢？
  - 实现 emergencyWithdraw 交易提交
  - _Requirements: 15.4_

- [ ] 21.5.5 实现节点等级展示和升级进度
  - 创建节点等级卡片（V1-V5，显示当前等级）
  - 显示升级条件（直推达标节点数、团队业绩、大区平衡）
  - 实现进度条（显示各项条件的完成度）
  - 显示节点等级历史（升级时间、升级前后等级）
  - 显示节点等级对应的奖励比例（5%-50%）
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

- [ ] 21.5.6 实现交易状态跟踪和错误处理
  - 创建交易状态组件（待签名、待确认、确认中、成功、失败）
  - 实现交易哈希链接（跳转到 BSCScan）
  - 实现错误处理和用户友好的错误提示
  - 处理常见错误（余额不足、Gas 不足、用户拒绝、网络错误）
  - 实现交易重试机制
  - 显示交易 Gas 费用预估
  - _Requirements: 所有需求的用户体验_

- [ ] 21.5.7 实现响应式设计和 UI/UX 优化
  - 实现响应式布局（支持桌面、平板、手机）
  - 使用 Tailwind CSS 或 Material-UI 组件库
  - 实现深色/浅色主题切换
  - 添加加载动画和骨架屏
  - 实现数据可视化（收益图表、推荐关系树状图）
  - 优化页面加载性能（代码分割、懒加载）
  - 实现多语言支持（中文、英文）
  - _Requirements: 所有需求的用户体验_

- [ ] 21.5.8 前端单元测试和集成测试
  - 使用 Jest 和 React Testing Library 编写组件测试
  - 测试钱包连接流程
  - 测试质押和提现表单验证
  - 测试交易状态显示
  - 测试紧急提取警告流程
  - 使用 Cypress 编写端到端测试
  - 测试完整的用户流程（连接钱包 → 质押 → 查看收益 → 提现）
  - _Requirements: 所有需求的前端测试_
  - 准备审计报告
  - 准备主网部署清单
  - _Requirements: 所有需求的文档化_

- [ ] 22. 实现治理公示栏（DAO 1.0 公示期）
  - 创建前端治理公示页面（纯展示，无合约调用�?
  - 展示当前协议参数（税率、收益率、节点升级条件）
  - 展示参数调整历史（从链上事件查询�?
  - 展示时间锁状态（待执行的参数修改�?
  - 展示 Treasury 和社区池余额（链上只读查询）
  - 展示多签钱包签名者列�?
  - 实现美观�?UI 设计（体现透明度和专业性）
  - 添加"DAO 1.0 公示�?说明文案
  - **严格确保：页面无任何资金转移或参数修改权�?*
  - _Requirements: 未来增强功能的基础_

- [ ] 23. Final Checkpoint - 主网部署前验�?
  - 确保所有测试通过
  - 确保所有安全检查完�?
  - 确保所有文档完�?
  - 确保备份和监控系统就�?
  - 验证治理公示栏正常展�?
  - 与用户确认主网部署时�?
  - 如有问题，询问用�?

