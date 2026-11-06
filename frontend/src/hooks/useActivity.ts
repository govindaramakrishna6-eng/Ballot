import { useQuery } from "@tanstack/react-query";
import type { Address, Hash } from "viem";
import { usePublicClient } from "wagmi";
import { isLocalChain, targetChain } from "../config/chains";
import { deployment, votingAbi } from "../contract/contract";
import { pollKeys } from "../lib/queryKeys";
import { usePollingFallback } from "./useLiveUpdates";

export type ChainEvent = {
  id: string; // txHash:logIndex — unique per log
  kind: "vote" | "created" | "cancelled";
  pollId: bigint;
  actor: Address | null;
  /** Chosen option for votes; null for other events. */
  optionIndex: number | null;
  txHash: Hash;
  blockNumber: bigint;
};

export type ChainEvents = {
  /** Newest first. */
  events: ChainEvent[];
  /** Block timestamps for the newest few events (enough for the feed). */
  times: Map<bigint, bigint>;
  /** False when the contract is older than the RPC's log window, so early history is missing. */
  complete: boolean;
};

/**
 * Public RPCs only serve logs for a limited window (publicnode: ~20k blocks ≈ 2.8 days on Sepolia;
 * older history is pruned — tested). We read that window and the event watcher keeps it current.
 */
const WINDOW = 20_000n;
const TIMESTAMPED = 12;

export function useChainEvents() {
  const client = usePublicClient({ chainId: targetChain.id });
  const refetchInterval = usePollingFallback();
  return useQuery({
    queryKey: pollKeys.activity(),
    enabled: Boolean(client && deployment),
    refetchInterval,
    queryFn: async (): Promise<ChainEvents> => {
      const latest = await client!.getBlockNumber();
      const deployBlock = BigInt(deployment!.deployBlock);
      const complete = isLocalChain || latest - deployBlock < WINDOW;
      const from = complete ? deployBlock : latest - WINDOW;
      const logs = await client!.getContractEvents({ address: deployment!.address, abi: votingAbi, fromBlock: from, toBlock: latest });

      const events = logs
        .flatMap((log): ChainEvent[] => {
          if (!log.transactionHash || log.blockNumber === null || log.logIndex === null) return [];
          const base = { id: `${log.transactionHash}:${log.logIndex}`, txHash: log.transactionHash, blockNumber: log.blockNumber };
          switch (log.eventName) {
            case "Voted":
              return [{ ...base, kind: "vote", pollId: log.args.pollId!, actor: log.args.voter!, optionIndex: Number(log.args.optionIndex) }];
            case "PollCreated":
              return [{ ...base, kind: "created", pollId: log.args.pollId!, actor: log.args.creator!, optionIndex: null }];
            case "PollCancelled":
              return [{ ...base, kind: "cancelled", pollId: log.args.pollId!, actor: null, optionIndex: null }];
            default:
              return [];
          }
        })
        .reverse();

      // Only the newest rows are shown with a time, so fetch at most a dozen blocks (batched into one request).
      const blocks = [...new Set(events.slice(0, TIMESTAMPED).map((e) => e.blockNumber))];
      const fetched = await Promise.all(blocks.map((n) => client!.getBlock({ blockNumber: n })));
      return { events, times: new Map(fetched.map((b) => [b.number, b.timestamp])), complete };
    },
  });
}
