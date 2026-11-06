import type { Address } from "viem";
import { votingAbi } from "./abi";
import deployments from "./deployments.json";
import { targetChain } from "../config/chains";

export type Deployment = { address: Address; deployBlock: number; txHash: string };

/** The deployment for the app's chain, or null (the app then shows a "not deployed" screen). */
export const deployment: Deployment | null =
  (deployments as Record<string, Deployment>)[String(targetChain.id)] ?? null;

export { votingAbi };

/** Shape returned by getPoll / getPollsPage (inferred from the ABI). */
export type Poll = {
  id: bigint;
  creator: Address;
  title: string;
  description: string;
  options: readonly string[];
  voteCounts: readonly bigint[];
  createdAt: bigint;
  endTime: bigint;
  totalVotes: bigint;
  cancelled: boolean;
};
