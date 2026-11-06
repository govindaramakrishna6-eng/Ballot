// Shared settings for the deploy/ops scripts. Plain viem (no Hardhat runtime) so we control
// RPC fallback and never route the private key through anything that might log it.
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createPublicClient, createWalletClient, fallback, http, type Chain } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { hardhat, sepolia } from "viem/chains";

export const CONTRACTS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export const ENV_PATH = resolve(CONTRACTS_DIR, ".env");
if (existsSync(ENV_PATH)) process.loadEnvFile(ENV_PATH);

// Free, no-signup public endpoints. publicnode first (fast, CORS-enabled); Tenderly as fallback.
export const PUBLIC_SEPOLIA_RPCS = [
  "https://ethereum-sepolia-rpc.publicnode.com",
  "https://sepolia.gateway.tenderly.co",
];

/** SEPOLIA_RPC_URL (comma-separated allowed) overrides the public list. */
export function sepoliaRpcUrls(): string[] {
  const override = process.env.SEPOLIA_RPC_URL?.split(",").map((s) => s.trim()).filter(Boolean);
  return override?.length ? override : PUBLIC_SEPOLIA_RPCS;
}

export type NetworkName = "localhost" | "sepolia";

export function parseNetwork(arg: string | undefined): NetworkName {
  if (arg === "localhost" || arg === "sepolia") return arg;
  console.error('Usage: node scripts/<script>.ts <localhost|sepolia>');
  process.exit(1);
}

export function chainFor(network: NetworkName): Chain {
  return network === "sepolia" ? sepolia : hardhat;
}

export function transportFor(network: NetworkName) {
  if (network === "localhost") return http("http://127.0.0.1:8545");
  // viem's fallback transport tries each URL in order when one fails or times out.
  return fallback(sepoliaRpcUrls().map((url) => http(url, { timeout: 15_000 })));
}

export function publicClientFor(network: NetworkName) {
  return createPublicClient({ chain: chainFor(network), transport: transportFor(network) });
}

/**
 * Local: the Hardhat node's first unlocked account (no key needed).
 * Sepolia: the generated deployer key from .env, held only in memory.
 */
export async function walletClientFor(network: NetworkName) {
  const chain = chainFor(network);
  const transport = transportFor(network);
  if (network === "localhost") {
    const [address] = await createWalletClient({ chain, transport }).getAddresses();
    return createWalletClient({ chain, transport, account: address });
  }
  const key = process.env.DEPLOYER_PRIVATE_KEY;
  if (!key || !/^0x[0-9a-fA-F]{64}$/.test(key)) {
    console.error("DEPLOYER_PRIVATE_KEY missing or malformed in contracts/.env. Run: npm run wallet:new");
    process.exit(1);
  }
  return createWalletClient({ chain, transport, account: privateKeyToAccount(key as `0x${string}`) });
}

export function explorerTx(network: NetworkName, hash: string): string | null {
  return network === "sepolia" ? `https://sepolia.etherscan.io/tx/${hash}` : null;
}
