import { fallback, http, type Chain } from "viem";
import { hardhat, sepolia } from "viem/chains";
import { env } from "./env";

/**
 * The app talks to exactly ONE chain. "Wrong network" means the wallet is on anything else.
 * Sepolia in production; the local Hardhat node for development and E2E tests.
 */
export const targetChain: Chain =
  env.chain === "localhost"
    ? { ...hardhat, name: "Hardhat Local", rpcUrls: { default: { http: [env.localRpcUrl] } } }
    : sepolia;

export const isLocalChain = targetChain.id === hardhat.id;

/** batch: true folds parallel reads (e.g. getVotedOption for 20 polls) into one HTTP request. */
export const targetTransport =
  env.chain === "localhost"
    ? http(env.localRpcUrl, { batch: true })
    : fallback(env.sepoliaRpcUrls.map((url) => http(url, { batch: true, timeout: 15_000 })));

export function explorerTxUrl(hash: string): string | null {
  return isLocalChain ? null : `https://sepolia.etherscan.io/tx/${hash}`;
}

export function explorerAddressUrl(address: string): string | null {
  return isLocalChain ? null : `https://sepolia.etherscan.io/address/${address}`;
}
