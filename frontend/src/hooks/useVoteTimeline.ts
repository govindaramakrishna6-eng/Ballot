import { useQuery } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";
import { targetChain } from "../config/chains";
import { useChainEvents } from "./useActivity";

/** At most this many distinct blocks are looked up (batched into few HTTP requests). */
const MAX_BLOCKS = 400;

/**
 * Unix times of every vote in the readable log window, read from the votes' blocks.
 * Keyed on the vote count so it refetches only when new votes arrive.
 */
export function useVoteTimes() {
  const client = usePublicClient({ chainId: targetChain.id });
  const chain = useChainEvents();
  const votes = (chain.data?.events ?? []).filter((e) => e.kind === "vote");
  const blocks = [...new Set(votes.map((v) => v.blockNumber))].slice(0, MAX_BLOCKS);
  const query = useQuery({
    queryKey: ["ballot", targetChain.id, "vote-times", votes.length, blocks.length],
    enabled: Boolean(client && chain.data),
    staleTime: Infinity,
    queryFn: async () => {
      const known = new Map(chain.data!.times);
      const missing = blocks.filter((b) => !known.has(b));
      const fetched = await Promise.all(missing.map((n) => client!.getBlock({ blockNumber: n })));
      for (const b of fetched) known.set(b.number, b.timestamp);
      return votes.flatMap((v) => (known.has(v.blockNumber) ? [Number(known.get(v.blockNumber))] : []));
    },
  });
  return { ...query, complete: chain.data?.complete ?? true, chainPending: chain.isPending };
}
