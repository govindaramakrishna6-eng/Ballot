// Re-runs source verification for the recorded Sepolia deployment (use if deploy-time verify failed).
import { execFileSync } from "node:child_process";
import { CONTRACTS_DIR } from "./lib/config.ts";
import { deploymentFor } from "./lib/deployments.ts";

const { address, txHash } = deploymentFor(11155111);
const subtasks = ["sourcify", ...(process.env.ETHERSCAN_API_KEY ? ["etherscan"] : [])];
for (const sub of subtasks) {
  execFileSync(
    "npx",
    ["hardhat", "verify", sub, "--network", "sepolia", "--build-profile", "production",
     "--creation-tx-hash", txHash, address],
    { cwd: CONTRACTS_DIR, stdio: "inherit" },
  );
}
