# RWA Protocol Backend API 文档

**版本**: 1.0.0  
**基础 URL**: `http://localhost:3000`

---

## 目录

1. [健康检查](#健康检查)
2. [用户信息](#用户信息)
3. [质押历史](#质押历史)
4. [收益明细](#收益明细)
5. [推荐关系](#推荐关系)
6. [节点等级历史](#节点等级历史)
7. [全局统计](#全局统计)
8. [价格查询](#价格查询)

---

## 通用说明

### 响应格式

所有 API 响应都遵循以下格式：

**成功响应**:
```json
{
  "success": true,
  "data": { ... }
}
```

**错误响应**:
```json
{
  "success": false,
  "error": "错误信息"
}
```

### 金额字段

🔴 **重要**: 所有金额字段都使用 `string` 类型返回，表示 18 位精度的整数。

例如：
- `"1000000000000000000"` = 1 USDT/RWA
- `"1000000000000000000000"` = 1000 USDT/RWA

前端需要使用 `ethers.utils.formatUnits(amount, 18)` 转换为可读格式。

---

## API 端点

### 健康检查

**GET** `/health`

检查服务器状态。

**响应示例**:
```json
{
  "status": "ok",
  "timestamp": "2026-02-26T10:00:00.000Z"
}
```

---

### 用户信息

**GET** `/api/user/:address`

查询用户基本信息。

**路径参数**:
- `address` (string, required): 用户钱包地址

**响应示例**:
```json
{
  "success": true,
  "data": {
    "address": "0x1234567890abcdef1234567890abcdef12345678",
    "referrer": "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
    "nodeLevel": 2,
    "totalStaked": "5000000000000000000000",
    "rwaPending": "1234567890123456789012",
    "totalStaticRewards": "400000000000000000000",
    "totalDynamicRewards": "250000000000000000000",
    "isActive": true,
    "lastStakeTime": "2026-02-25T10:00:00.000Z",
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-02-26T10:00:00.000Z"
  }
}
```

**字段说明**:
- `nodeLevel`: 节点等级 (0-5)
- `totalStaked`: 总质押金额（18 位精度）
- `rwaPending`: 待提现 RWA Token 余额（18 位精度）
- `totalStaticRewards`: 累计静态收益（18 位精度）
- `totalDynamicRewards`: 累计动态奖励（18 位精度）
- `isActive`: 是否活跃（是否有质押）

**错误响应**:
```json
{
  "success": false,
  "error": "User not found"
}
```

---

### 质押历史

**GET** `/api/stakes/:address`

查询用户质押历史（分页）。

**路径参数**:
- `address` (string, required): 用户钱包地址

**查询参数**:
- `page` (number, optional): 页码，默认 1
- `limit` (number, optional): 每页数量，默认 10

**响应示例**:
```json
{
  "success": true,
  "data": {
    "stakes": [
      {
        "stakeId": "123",
        "userAddress": "0x1234567890abcdef1234567890abcdef12345678",
        "amount": "1000000000000000000000",
        "treasuryAmount": "500000000000000000000",
        "communityAmount": "500000000000000000000",
        "referrer": "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
        "txHash": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        "blockNumber": 12345678,
        "createdAt": "2026-02-25T10:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 5,
      "totalPages": 1
    }
  }
}
```

**字段说明**:
- `stakeId`: 质押 ID（唯一标识）
- `amount`: 质押金额（18 位精度）
- `treasuryAmount`: 分配到 Treasury 的金额（50%）
- `communityAmount`: 分配到社区池的金额（50%）

---

### 收益明细

**GET** `/api/rewards/:address`

查询用户收益明细（分页）。

**路径参数**:
- `address` (string, required): 用户钱包地址

**查询参数**:
- `page` (number, optional): 页码，默认 1
- `limit` (number, optional): 每页数量，默认 20
- `type` (string, optional): 收益类型，可选值：`static`（静态收益）、`dynamic`（动态奖励）

**响应示例**:
```json
{
  "success": true,
  "data": {
    "rewards": [
      {
        "id": 1,
        "userAddress": "0x1234567890abcdef1234567890abcdef12345678",
        "rewardType": "static",
        "amount": "8000000000000000000",
        "fromAddress": null,
        "stakeId": null,
        "txHash": null,
        "createdAt": "2026-02-26T00:00:00.000Z"
      },
      {
        "id": 2,
        "userAddress": "0x1234567890abcdef1234567890abcdef12345678",
        "rewardType": "dynamic",
        "amount": "50000000000000000000",
        "fromAddress": "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
        "stakeId": "123",
        "txHash": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        "createdAt": "2026-02-25T10:05:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50,
      "totalPages": 3
    }
  }
}
```

**字段说明**:
- `rewardType`: 收益类型（`static` 或 `dynamic`）
- `amount`: 收益金额（18 位精度）
- `fromAddress`: 来源地址（仅动态奖励有值，表示下级地址）
- `stakeId`: 关联的质押 ID（仅动态奖励有值）

---

### 推荐关系

**GET** `/api/referrals/:address`

查询用户推荐关系和团队统计。

**路径参数**:
- `address` (string, required): 用户钱包地址

**响应示例**:
```json
{
  "success": true,
  "data": {
    "directReferrals": [
      {
        "address": "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
        "nodeLevel": 1,
        "totalStaked": "2000000000000000000000",
        "isActive": true,
        "createdAt": "2026-02-20T10:00:00.000Z"
      }
    ],
    "teamStats": {
      "teamCount": 15,
      "teamVolume": "30000000000000000000000"
    },
    "departments": [
      {
        "directReferral": "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
        "departmentVolume": "15000000000000000000000"
      },
      {
        "directReferral": "0x1111111111111111111111111111111111111111",
        "departmentVolume": "10000000000000000000000"
      }
    ]
  }
}
```

**字段说明**:
- `directReferrals`: 直推列表
- `teamStats.teamCount`: 团队总人数（不含自己）
- `teamStats.teamVolume`: 团队总业绩（18 位精度）
- `departments`: 各部门业绩（按业绩降序排列）

---

### 节点等级历史

**GET** `/api/level-history/:address`

查询用户节点等级升级历史。

**路径参数**:
- `address` (string, required): 用户钱包地址

**响应示例**:
```json
{
  "success": true,
  "data": {
    "history": [
      {
        "id": 1,
        "userAddress": "0x1234567890abcdef1234567890abcdef12345678",
        "oldLevel": 1,
        "newLevel": 2,
        "directReferralsCount": 3,
        "teamVolume": "10000000000000000000000",
        "maxDepartmentVolume": "4000000000000000000000",
        "txHash": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        "createdAt": "2026-02-25T10:00:00.000Z"
      }
    ]
  }
}
```

**字段说明**:
- `oldLevel`: 升级前等级
- `newLevel`: 升级后等级
- `directReferralsCount`: 直推达标节点数
- `teamVolume`: 团队总业绩（18 位精度）
- `maxDepartmentVolume`: 最大单部门业绩（18 位精度）

---

### 全局统计

**GET** `/api/stats/global`

查询全局统计数据。

**响应示例**:
```json
{
  "success": true,
  "data": {
    "totalUsers": 1234,
    "activeUsers": 567,
    "totalStaked": "5000000000000000000000000",
    "totalStaticRewards": "400000000000000000000000",
    "totalDynamicRewards": "250000000000000000000000"
  }
}
```

**字段说明**:
- `totalUsers`: 总用户数
- `activeUsers`: 活跃用户数（有质押的用户）
- `totalStaked`: 全网总质押（18 位精度）
- `totalStaticRewards`: 全网累计静态收益（18 位精度）
- `totalDynamicRewards`: 全网累计动态奖励（18 位精度）

---

### 价格查询

**GET** `/api/price/rwa`

查询 RWA Token 当前价格（USDT 计价）。

**响应示例**:
```json
{
  "success": true,
  "data": {
    "price": "1234567890123456789",
    "timestamp": "2026-02-26T10:00:00.000Z"
  }
}
```

**字段说明**:
- `price`: RWA Token 价格（18 位精度，单位：USDT）
  - 例如：`"1234567890123456789"` = 1.234567890123456789 USDT

**错误响应**:
```json
{
  "success": false,
  "error": "Price not available"
}
```

---

## 错误代码

| HTTP 状态码 | 说明 |
|------------|------|
| 200 | 成功 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

---

## 使用示例

### JavaScript (ethers.js)

```javascript
import { ethers } from 'ethers';

// 查询用户信息
async function getUserInfo(address) {
  const response = await fetch(`http://localhost:3000/api/user/${address}`);
  const result = await response.json();
  
  if (result.success) {
    const user = result.data;
    
    // 转换金额为可读格式
    const totalStaked = ethers.utils.formatUnits(user.totalStaked, 18);
    const rwaPending = ethers.utils.formatUnits(user.rwaPending, 18);
    
    console.log(`总质押: ${totalStaked} USDT`);
    console.log(`待提现: ${rwaPending} RWA`);
  }
}

// 查询质押历史
async function getStakes(address, page = 1) {
  const response = await fetch(
    `http://localhost:3000/api/stakes/${address}?page=${page}&limit=10`
  );
  const result = await response.json();
  
  if (result.success) {
    result.data.stakes.forEach(stake => {
      const amount = ethers.utils.formatUnits(stake.amount, 18);
      console.log(`质押 ${amount} USDT (ID: ${stake.stakeId})`);
    });
  }
}

// 查询收益明细
async function getRewards(address, type = null) {
  let url = `http://localhost:3000/api/rewards/${address}?page=1&limit=20`;
  if (type) {
    url += `&type=${type}`;
  }
  
  const response = await fetch(url);
  const result = await response.json();
  
  if (result.success) {
    result.data.rewards.forEach(reward => {
      const amount = ethers.utils.formatUnits(reward.amount, 18);
      console.log(`${reward.rewardType} 收益: ${amount} USDT`);
    });
  }
}
```

### cURL

```bash
# 查询用户信息
curl http://localhost:3000/api/user/0x1234567890abcdef1234567890abcdef12345678

# 查询质押历史（第 1 页，每页 10 条）
curl "http://localhost:3000/api/stakes/0x1234567890abcdef1234567890abcdef12345678?page=1&limit=10"

# 查询收益明细（仅静态收益）
curl "http://localhost:3000/api/rewards/0x1234567890abcdef1234567890abcdef12345678?type=static"

# 查询推荐关系
curl http://localhost:3000/api/referrals/0x1234567890abcdef1234567890abcdef12345678

# 查询全局统计
curl http://localhost:3000/api/stats/global

# 查询 RWA 价格
curl http://localhost:3000/api/price/rwa
```

---

## 注意事项

1. **金额精度**: 所有金额字段都是 18 位精度的整数字符串，前端需要使用 `ethers.utils.formatUnits(amount, 18)` 转换。

2. **地址格式**: 所有地址都会自动转换为小写存储和查询。

3. **分页**: 质押历史和收益明细支持分页，建议每页不超过 50 条。

4. **缓存**: 价格数据有 5 分钟缓存，不需要频繁请求。

5. **CORS**: 默认允许所有来源，生产环境需要配置 `CORS_ORIGIN` 环境变量。

---

## 部署说明

### 环境变量

```bash
# 服务器配置
PORT=3000
CORS_ORIGIN=https://your-frontend-domain.com

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_NAME=rwa_protocol
DB_USER=rwa_user
DB_PASSWORD=your_password

# Redis 配置
REDIS_HOST=localhost
REDIS_PORT=6379
```

### 启动服务

```bash
# 开发模式
npm run dev

# 生产模式
npm run build
npm start
```

### 健康检查

```bash
curl http://localhost:3000/health
```

---

**版本历史**:
- v1.0.0 (2026-02-26): 初始版本

