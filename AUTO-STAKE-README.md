# 自动质押定时任务

## 功能说明

- **总共执行10次**
- **每次生成1个地址**
- 每个地址转入150-3000 RWA（随机金额）
- 自动执行Gasless质押（不锁仓，无推荐人）
- **不转BNB**（使用gasless meta-transaction）
- **每次间隔10-30分钟（随机）**

## 执行流程

```
第1次: 生成地址 → 转RWA → 质押 → 等待10-30分钟
第2次: 生成地址 → 转RWA → 质押 → 等待10-30分钟
第3次: 生成地址 → 转RWA → 质押 → 等待10-30分钟
...
第10次: 生成地址 → 转RWA → 质押 → 完成
```

## 使用方法

### 1. 设置私钥

首先需要设置一个有足够RWA余额的账户私钥：

```bash
export OWNER_PRIVATE_KEY='your_private_key_here'
```

### 2. 启动定时任务

```bash
cd /www/wwwroot/rwaprotocol.dpdns.org
./start-auto-stake.sh
```

任务启动后会自动运行，完成10次后自动停止。

### 3. 管理任务

```bash
# 查看状态
pm2 status

# 查看实时日志
pm2 logs auto-stake

# 查看日志（最近100行）
pm2 logs auto-stake --lines 100

# 停止任务（中途停止）
pm2 stop auto-stake

# 重启任务（从头开始）
pm2 restart auto-stake

# 删除任务
pm2 delete auto-stake
```

## 执行记录

所有执行记录保存在：`batch-stake-log.json`

每次执行会记录：
- 执行序号（1-10）
- 时间戳
- 生成的地址和私钥
- 转账交易哈希
- 质押结果（成功/失败）
- 质押交易哈希或错误信息

示例：
```json
[
  {
    "count": 1,
    "timestamp": "2026-03-28T09:20:00.000Z",
    "address": "0x...",
    "privateKey": "0x...",
    "amount": 2450,
    "transferTxHash": "0x...",
    "stakeSuccess": true,
    "stakeTxHash": "0x...",
    "stakeError": null
  }
]
```

## 预计执行时间

- 最快：10次 × 10分钟 = 约1小时40分钟
- 最慢：10次 × 30分钟 = 约5小时
- 平均：10次 × 20分钟 = 约3小时20分钟

## 注意事项

1. **确保Backend运行中**：定时任务需要调用 backend 的 gasless API
2. **余额检查**：每次执行前会检查RWA余额是否足够（最多需要3000 RWA/次）
3. **自动完成**：完成10次后任务会自动停止，无需手动干预
4. **安全性**：私钥通过环境变量传递，不会保存到代码文件中

## 文件说明

- `auto-stake-scheduler.js` - 主调度器脚本
- `start-auto-stake.sh` - 启动脚本
- `batch-stake-log.json` - 执行记录日志（JSON格式）
