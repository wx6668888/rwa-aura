import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";
import * as path from "path";

// 必须用 .env 覆盖机器上已存在的同名环境变量（否则 PRIVATE_KEY 可能被污染导致 HH8）
dotenv.config({ path: path.resolve(__dirname, ".env"), override: true });

function normalizedPrivateKeys(): string[] {
  const raw = (process.env.PRIVATE_KEY || "").trim();
  if (!raw) return [];
  const hex = raw.startsWith("0x") ? raw.slice(2) : raw;
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error(
      "PRIVATE_KEY in .env must be 64 hex chars (optionally 0x-prefixed). Check for spaces/换行/重复导出。"
    );
  }
  return [`0x${hex}`];
}

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        // runs 越低 bytecode 越小（主网 EIP-170 24KB；StakingContract 体积临界）
        runs: 1,
      },
      viaIR: true,
      evmVersion: "cancun",
      metadata: {
        bytecodeHash: "none",
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
      blockGasLimit: 30000000, // Increase gas limit to 30M (default is 30M, but explicit is better)
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    bscTestnet: {
      url: process.env.BSC_TESTNET_RPC_URL || "https://data-seed-prebsc-1-s1.binance.org:8545",
      chainId: 97,
      accounts: normalizedPrivateKeys(),
    },
    bscMainnet: {
      url: process.env.BSC_MAINNET_RPC_URL || "https://bsc-dataseed.binance.org/",
      chainId: 56,
      accounts: normalizedPrivateKeys(),
    },
  },
  etherscan: {
    apiKey: {
      bsc: process.env.BSCSCAN_API_KEY || "",
      bscTestnet: process.env.BSCSCAN_API_KEY || "",
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

export default config;
