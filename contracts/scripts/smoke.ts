// End-to-end smoke test on a live network: create a poll, vote in it, read it back.
// Usage: npm run smoke:local | npm run smoke:sepolia
import { parseEventLogs } from "viem";
import { explorerTx, parseNetwork, publicClientFor, walletClientFor } from "./lib/config.ts";
import { deploymentFor, readArtifact } from "./lib/deployments.ts";

const network = parseNetwork(process.argv[2]);
const publicClient = publicClientFor(network);
const wallet = await walletClientFor(network);
const { abi } = readArtifact();
const { address } = deploymentFor(await publicClient.getChainId());
const contract = { address, abi } as const;

async function send(functionName: "createPoll" | "vote", args: readonly unknown[]) {
  // simulate first: a revert surfaces here with a decoded reason instead of a wasted tx
  const { request } = await publicClient.simulateContract({ ...contract, functionName, args, account: wallet.account });
  const hash = await wallet.writeContract(request);
  const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 300_000 });
  const link = explorerTx(network, hash);
  console.log(`${functionName}: ${receipt.status} in block ${receipt.blockNumber} — ${hash}${link ? `\n  ${link}` : ""}`);
  if (receipt.status !== "success") process.exit(1);
  return receipt;
}

const block = await publicClient.getBlock();
const endTime = block.timestamp + 60n * 60n; // 1 hour, measured in chain time
const created = await send("createPoll", [
  "Smoke test: does the ballot box work?",
  "Created by contracts/scripts/smoke.ts",
  ["Yes", "No"],
  endTime,
]);
const [event] = parseEventLogs({ abi, logs: created.logs, eventName: "PollCreated" });
const pollId = (event.args as { pollId: bigint }).pollId;
console.log(`Poll id from PollCreated event: ${pollId}`);

await send("vote", [pollId, 0n]);
const poll = (await publicClient.readContract({ ...contract, functionName: "getPoll", args: [pollId] })) as {
  options: string[];
  voteCounts: bigint[];
  totalVotes: bigint;
};
const voted = await publicClient.readContract({
  ...contract,
  functionName: "getVotedOption",
  args: [pollId, wallet.account.address],
});
console.log(`Results: ${poll.options.map((o, i) => `${o}=${poll.voteCounts[i]}`).join(", ")} (total ${poll.totalVotes})`);
console.log(`getVotedOption(deployer) = ${voted} (expected 1)`);
if (poll.totalVotes !== 1n || voted !== 1n) {
  console.error("Smoke test FAILED: unexpected on-chain state.");
  process.exit(1);
}
console.log("Smoke test PASSED.");
