# 欧易（OKX）DApp 审核与域名配置

本文档说明如何将本项目配置为**符合欧易 DApp 展示/审核要求**的线上环境，并给出提交前自查清单。提交给欧易的 DApp 入口域名使用你已部署的站点。

---

## 一、推荐 DApp 入口域名

| 环境 | 域名 | 说明 |
|------|------|------|
| **生产（提交欧易）** | **https://kelian.dpdns.org** | 你已在宝塔部署的站点，作为欧易 DApp 申请时填写的「DApp 链接」 |

要求：

- 必须使用 **HTTPS**（欧易示例为 `https://app.uniswap.org/`，不接受纯 HTTP 或 IP）。
- 域名需可公网访问、稳定，避免使用纯 IP 或临时域名。

---

## 二、生产环境必须配置的环境变量

在**服务器**或构建时设置以下变量，确保线上站不会出现 localhost、错误链或空合约。

在 `frontend` 目录下建立 `.env.production`（或宝塔/CI 中配置）：

```env
# DApp 入口域名（用于 metadata、分享链接、欧易审核）
NEXT_PUBLIC_APP_URL=https://kelian.dpdns.org

# 后端 API（与 DApp 同域，避免跨域）
NEXT_PUBLIC_API_URL=https://kelian.dpdns.org/api

# 链与合约（主网或测试网二选一，按你实际上线链填写）
NEXT_PUBLIC_CHAIN=bsc
# 若上 BSC 主网，填写主网合约地址：
NEXT_PUBLIC_STAKING_CONTRACT_BSC=0x...
NEXT_PUBLIC_RWA_TOKEN_BSC=0x...
NEXT_PUBLIC_ST_RWA_BSC=0x...
NEXT_PUBLIC_SWAP_CONTRACT_BSC=0x...
NEXT_PUBLIC_TREASURY_CONTRACT_BSC=0x...

# 若上 BSC 测试网，使用：
# NEXT_PUBLIC_CHAIN=testnet
# NEXT_PUBLIC_STAKING_CONTRACT_TESTNET=0x...
# NEXT_PUBLIC_RWA_TOKEN_TESTNET=0x...
# ...

# WalletConnect（必须配置，否则移动端/钱包内浏览器连接异常）
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=你的项目ID
```

说明：

- **NEXT_PUBLIC_APP_URL**：页面内分享链接、Open Graph、manifest 等会基于该域名生成，欧易审核时看到的也是该域名。
- **NEXT_PUBLIC_API_URL**：必须与用户访问的前端域名同源或为可信 API 域名，推荐 `https://kelian.dpdns.org/api`（由 Nginx 反代到后端）。
- **NEXT_PUBLIC_CHAIN** 与合约地址：必须与你要展示的链一致，否则会连错链或显示零地址。

---

## 三、项目已为欧易 DApp 做的配置

| 项 | 说明 |
|----|------|
| **钱包** | 使用 RainbowKit `getDefaultWallets`，已包含 **OKX Wallet**、MetaMask、WalletConnect、TokenPocket 等，无需改代码即可支持欧易钱包。 |
| **WalletConnect** | 使用 `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`，移动端/钱包内浏览器通过 WalletConnect 连接。 |
| **metadataBase + Open Graph** | `layout.tsx` 中通过 `NEXT_PUBLIC_APP_URL` 设置 `metadataBase` 和 `openGraph.url`，分享与审核时显示正确域名。 |
| **manifest.json** | `public/manifest.json` 提供 PWA/DApp 名称、描述、图标、start_url，便于钱包或 DApp 商店抓取。 |
| **HTTPS** | 部署在宝塔并配置 SSL 后，站点为 HTTPS，满足欧易要求。 |

---

## 四、欧易 DApp 提交前自查清单

在提交 [欧易 DApp 申请](https://forms.gle/kLwVFevWXBjRa6WC6) 或联系 wallet@okx.com 前，建议逐项确认：

### 4.1 域名与访问

- [ ] DApp 链接使用 **https://kelian.dpdns.org**（或你最终确定的正式域名），且为 **HTTPS**。
- [ ] 浏览器直接打开该链接可正常打开页面，无证书错误、无 404。
- [ ] 移动端或 OKX 钱包内浏览器打开同一链接，页面可正常加载（无混合内容、无 localhost 请求）。

### 4.2 环境变量与内容

- [ ] 已在生产环境配置 **NEXT_PUBLIC_APP_URL**、**NEXT_PUBLIC_API_URL**、**NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID** 及对应链的合约地址。
- [ ] 页面上不再出现「localhost:3001」等本地地址（错误提示中的 fallback 可保留为兜底文案，但正常使用应走 API）。
- [ ] 当前链与合约地址与你要展示的链一致（主网/测试网、合约已部署且可读）。

### 4.3 钱包与连接

- [ ] 在 OKX Wallet（或支持 WalletConnect 的钱包）内打开 DApp 链接，能正常唤起连接、切换账户。
- [ ] 连接后能正确显示链、余额或合约数据（根据你当前功能），无报错或空白。

### 4.4 内容与合规

- [ ] 标题、描述、图标与 DApp 实际功能一致（已通过 `metadata` 和 `manifest.json` 配置）。
- [ ] 无违规、误导性文案或承诺收益的违规表述（具体以欧易及当地法规为准）。

---

## 五、欧易 DApp 申请方式（参考）

1. **表单申请**：  
   https://forms.gle/kLwVFevWXBjRa6WC6  
   填写时「DApp 链接」填：**https://kelian.dpdns.org**

2. **邮件咨询**：  
   wallet@okx.com  
   可询问 DApp 展示/审核的具体要求与当前政策。

3. **开发文档**：  
   - [Apply to display DApps](https://web3.okx.com/build/docs/waas/walletapi-resources-dapp-application)  
   - [OKX WaaS Requirement Standard](https://web3.okx.com/build/docs/waas/okx-waas-requirement-standard)

---

## 六、若更换正式域名

若之后改用正式域名（例如 `app.xxx.com`）：

1. 在**服务器/构建环境**将 `NEXT_PUBLIC_APP_URL`、`NEXT_PUBLIC_API_URL` 改为新域名（如 `https://app.xxx.com`、`https://app.xxx.com/api`）。
2. 在**宝塔**为新域名添加站点、SSL 和 Nginx 反代（同当前 `kelian.dpdns.org` 的配置方式）。
3. 重新构建并部署前端，然后更新欧易申请中的「DApp 链接」为新域名。

当前项目已按「可通过欧易 DApp 审核」的方式配置了**入口域名（kelian.dpdns.org）、HTTPS、metadata、manifest 和钱包支持**；你只需确保生产环境变量正确、站点稳定可访问，再按上述清单自检后提交即可。
