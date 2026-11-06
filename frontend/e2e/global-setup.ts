import { execSync } from "node:child_process";
import { createPublicClient, http } from "viem";
import { hardhat } from "viem/chains";
import deployments from "../src/contract/deployments.json" with { type: "json" };

/** Deploys VotingDApp to the fresh node (deterministic address) unless it is already there. */
export default async function globalSetup() {
  const client = createPublicClient({ chain: hardhat, transport: http("http://127.0.0.1:8545") });
  const address = deployments["31337"].address as `0x${string}`;
  const code = await client.getCode({ address });
  if (!code || code === "0x") {
    execSync("npm run deploy:local", { cwd: "../contracts", stdio: "inherit" });
  }
}
