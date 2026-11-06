import { useQuery } from "@tanstack/react-query";
import type { Address, Hash } from "viem";
import { usePublicClient } from "wagmi";
import { isLocalChain, targetChain } from "../config/chains";
import { deployment, votingAbi } from "../contract/contract";
import { pollKeys } from "../lib/queryKeys";
import { usePollingFallback } from "./useLiveUpdates";

export type ActivityItem = {
  id: string; // txHash:logIndex — unique per log
  kind: "vote" | "created" | "cancelled";
  pollId: bigint;
  actor: Address | null;
  optionIndex: number | null;
  txHash: Hash;
  blockNumber: bigint;
  timestamp: bigint | null;
};

/**
 * Public RPCs only serve logs for a limited window (publicnode: ~20k blocks ≈ 2.8 days on Sepolia;
 * older history is pruned). The feed covers that window and then grows live via the event watcher.
 */
const WINDOW = 20_000n;
const SHOWN = 8;

export function useActivity() {
  const client = usePublicClient({ chainId: targetChain.id });
  const refetchInterval = usePollingFallback();
  return useQuery({
    queryKey: pollKeys.activity(),
    enabled: Boolean(client && deployment),
    refetchInterval,
    queryFn: async (): Promise<ActivityItem[]> => {
      const latest = await client!.getBlockNumber();
      const deployBlock = BigInt(deployment!.deployBlock);
      const from = isLocalChain || latest - deployBlock < WINDOW ? deployBlock : latest - WINDOW;
      const logs = await client!.getContractEvents({ address: deployment!.address, abi: votingAbi, fromBlock: from, toBlock: latest });

      const items: ActivityItem[] = logs.flatMap((log): ActivityItem[] => {
        if (!log.transactionHash || log.blockNumber === null || log.logIndex === null) return [];
        const base = { id: `${log.transactionHash}:${log.logIndex}`, txHash: log.transactionHash, blockNumber: log.blockNumber, timestamp: null };
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
      });

      // Newest first; only the shown rows need a timestamp, so fetch at most SHOWN blocks (batched).
      const shown = items.reverse().slice(0, SHOWN);
      const blocks = [...new Set(shown.map((i) => i.blockNumber))];
      const fetched = await Promise.all(blocks.map((n) => client!.getBlock({ blockNumber: n })));
      const time = new Map(fetched.map((b) => [b.number, b.timestamp]));
      return shown.map((i) => ({ ...i, timestamp: time.get(i.blockNumber) ?? null }));
    },
  });
}
