# 合约分析说明

## 使用方法

### 1. 安装依赖

```bash
npm install axios
```

### 2. 设置 BSCScan API Key

在 `.env` 文件中添加：

```
BSCSCAN_API_KEY=your_api_key_here
```

获取 API Key：
1. 访问 https://bscscan.com/apis
2. 注册账号并申请 API Key

### 3. 运行分析脚本

```bash
node scripts/analyze-contracts.js
```

## 分析结果

脚本会：
1. 获取每个合约的源代码
2. 获取每个合约的 ABI
3. 分析主要函数
4. 保存源代码到 `contract-analysis` 目录

## 手动查看合约

如果脚本无法运行，可以手动访问 BSCScan：

1. 访问 https://bscscan.com
2. 输入合约地址
3. 点击 "Contract" 标签
4. 查看源代码和 ABI

## 合约地址列表

- **撤回销毁地址**: 0xeeeabf5304a7ed876e7a28ec016bb57ae6e89f26
- **国库地址**: 0x7B9B7d4F870A38e92c9a181B00f9b33cc8Ef5321
- **手续费销毁**: 0x91F1D2c2165B17a1eD2dC3B73Ae77224E6e1410E
- **质押池**: 0x1964Ca90474b11FFD08af387b110ba6C96251Bfc
- **交易所底池**: 0x882df4b0fb50a229c3b4124eb18c759911485bfb
- **DAO管理奖**: 0x0309Ca717d6989676194b88fD06029a88CEEfee6
- **涡轮提现**: 0x07Ff4e06865de4934409Aa6eCea503b08Cc1C78d
- **LGNS代币**: 0xeb51d9a39ad5eef215dc0bf39a8821ff804a0f01
- **sLGNS代币**: 0x99a57e6c8558bc6689f894e068733adf83c19725
- **匿名稳定币A**: 0x6631eE651DA438Db2BE611B5A44dFE2Ca04590C5
- **空投A**: 0x7DC3d391dD1303894eB359b483C8894A0C1Cf681
- **销毁铸造A**: 0xA6036c7ae9F7dAE757E9BeE5BF02860A8D5F457e
- **撤底池**: 0x1D6A7F2cB262aFbb1204bbFCBb3db642662b15c3
- **销毁A中转**: 0x9dA64DF74565861708781B9Ad2e559b7328b97c4
