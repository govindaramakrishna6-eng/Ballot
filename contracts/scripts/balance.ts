// Checks whether the deployer has enough Sepolia ETH to deploy + run the smoke test.
// Exit code 0 = enough, 2 = top up needed (so other scripts/CI can branch on it).
import { formatEther, formatGwei } from "viem";
import { publicClientFor, walletClientFor } from "./lib/config.ts";

// Measured locally with the production profile: deploy ≈ 1.26M gas, createPoll ≈ 0.24M, vote ≈ 0.10M. Rounded up.
const GAS_NEEDED = 1_800_000n;
// Gas prices on Sepolia spike; require 3x today's price as headroom, and at least 0.02 ETH.
const HEADROOM = 3n;
const FLOOR = 20_000_000_000_000_000n; // 0.02 ETH

const client = publicClientFor("sepolia");
const wallet = await walletClientFor("sepolia");
const address = wallet.account.address;
const [balance, gasPrice] = await Promise.all([client.getBalance({ address }), client.getGasPrice()]);
const estimate = GAS_NEEDED * gasPrice * HEADROOM;
const needed = estimate > FLOOR ? estimate : FLOOR;

console.log(`Deployer:   ${address}`);
console.log(`Balance:    ${formatEther(balance)} SepoliaETH`);
console.log(`Gas price:  ${formatGwei(gasPrice)} gwei`);
console.log(`Needed:     ${formatEther(needed)} SepoliaETH (deploy + smoke test, with headroom)`);
if (balance >= needed) {
  console.log("Status:     OK — enough to deploy.");
} else {
  console.log(`Status:     TOO LOW — short by ${formatEther(needed - balance)} SepoliaETH.`);
  process.exit(2);
}
