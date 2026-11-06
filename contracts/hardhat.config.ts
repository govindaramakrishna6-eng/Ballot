import { existsSync } from "node:fs";
import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import { configVariable, defineConfig } from "hardhat/config";

// Hardhat 3 does not read .env by itself; Node 22's built-in loader fills process.env without a dependency.
if (existsSync(".env")) process.loadEnvFile(".env");

const SOLC_VERSION = "0.8.38";

// Same default as scripts/lib/config.ts. Hardhat is only used here for `verify`, which needs a
// single URL; deploy/smoke scripts use viem's fallback transport across several public RPCs.
const SEPOLIA_RPC = process.env.SEPOLIA_RPC_URL?.split(",")[0]?.trim() || "https://ethereum-sepolia-rpc.publicnode.com";

export default defineConfig({
  plugins: [hardhatToolboxViemPlugin],
  solidity: {
    profiles: {
      default: { version: SOLC_VERSION },
      // Used for deployment and verification: optimizer on for cheaper user gas.
      production: {
        version: SOLC_VERSION,
        settings: { optimizer: { enabled: true, runs: 200 } },
      },
    },
  },
  networks: {
    // In-process simulated chain (chainId 31337) used by tests and `hardhat node`.
    hardhat: { type: "edr-simulated", chainType: "l1" },
    localhost: { type: "http", chainType: "l1", url: "http://127.0.0.1:8545" },
    sepolia: {
      type: "http",
      chainType: "l1",
      url: SEPOLIA_RPC,
      // Only resolved if a Hardhat task needs to sign; verification does not.
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [configVariable("DEPLOYER_PRIVATE_KEY")] : [],
    },
  },
  verify: {
    // Sourcify needs no API key, so it is always on.
    sourcify: { enabled: true },
    // Etherscan only when the user has added a key; otherwise it would fail on every verify.
    etherscan: process.env.ETHERSCAN_API_KEY
      ? { apiKey: configVariable("ETHERSCAN_API_KEY") }
      : { enabled: false },
  },
});
