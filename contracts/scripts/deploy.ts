// Deploys VotingDApp, records address + deploy block, writes the ABI and deployments.json
// into the frontend, and (on Sepolia) verifies the source on Sourcify (+ Etherscan if a key exists).
// Usage: npm run deploy:local | npm run deploy:sepolia   (both compile with the production profile first)
import { execFileSync } from "node:child_process";
import { getAddress } from "viem";
import { CONTRACTS_DIR, explorerTx, parseNetwork, publicClientFor, walletClientFor } from "./lib/config.ts";
import { readArtifact, writeAbi, writeDeployment } from "./lib/deployments.ts";

const network = parseNetwork(process.argv[2]);
const publicClient = publicClientFor(network);
const wallet = await walletClientFor(network);
const chainId = await publicClient.getChainId();
const { abi, bytecode } = readArtifact();

console.log(`Deploying VotingDApp to ${network} (chainId ${chainId}) from ${wallet.account.address}…`);
const txHash = await wallet.deployContract({ abi, bytecode, account: wallet.account, chain: wallet.chain });
const tx = explorerTx(network, txHash);
console.log(`Tx sent: ${txHash}${tx ? `\n  ${tx}` : ""}`);

// Two confirmations on Sepolia so Sourcify/Etherscan can see the creation tx when we verify.
const receipt = await publicClient.waitForTransactionReceipt({
  hash: txHash,
  confirmations: network === "sepolia" ? 2 : 1,
  timeout: 300_000,
});
if (receipt.status !== "success" || !receipt.contractAddress) {
  console.error("Deployment transaction failed.");
  process.exit(1);
}

const address = getAddress(receipt.contractAddress); // checksummed for display and comparisons
// deployBlock lets the frontend start event/log queries here instead of at block 0.
writeDeployment(chainId, {
  address,
  deployBlock: Number(receipt.blockNumber),
  txHash,
});
writeAbi(abi);
console.log(`Deployed at ${address} in block ${receipt.blockNumber} (gas used ${receipt.gasUsed}).`);
console.log("Wrote frontend/src/contract/deployments.json and abi.ts");

if (network === "sepolia") {
  const verify = (sub: string) => {
    try {
      execFileSync(
        "npx",
        ["hardhat", "verify", sub, "--network", "sepolia", "--build-profile", "production",
         "--creation-tx-hash", txHash, address],
        { cwd: CONTRACTS_DIR, stdio: "inherit" },
      );
    } catch {
      // Verification failing must not lose the deployment record written above.
      console.error(`${sub} verification failed; retry later with: npm run verify:sepolia`);
    }
  };
  verify("sourcify");
  if (process.env.ETHERSCAN_API_KEY) verify("etherscan");
  console.log(`Etherscan: https://sepolia.etherscan.io/address/${address}`);
  console.log(`Sourcify:  https://repo.sourcify.dev/11155111/${address}`);
}
