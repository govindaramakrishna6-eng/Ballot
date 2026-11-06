import { existsSync } from "node:fs";
import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import { configVariable, defineConfig } from "hardhat/config";

// Hardhat 3 does not read .env by itself; configVariable() reads process.env.
// Node 22's built-in loader fills process.env from .env without adding a dependency.
// Values are only resolved when a task actually needs them (e.g. --network sepolia),
// so compile/test work with an empty or missing .env.
if (existsSync(".env")) process.loadEnvFile(".env");

const SOLC_VERSION = "0.8.38";

export default defineConfig({
  plugins: [hardhatToolboxViemPlugin],
  solidity: {
    profiles: {
      default: { version: SOLC_VERSION },
      // Used for deployment (`--build-profile production`): optimizer on for cheaper user gas.
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
      url: configVariable("SEPOLIA_RPC_URL"),
      accounts: [configVariable("DEPLOYER_PRIVATE_KEY")],
    },
  },
  verify: {
    etherscan: { apiKey: configVariable("ETHERSCAN_API_KEY") },
  },
});
