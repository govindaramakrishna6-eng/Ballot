import { useQuery } from "@tanstack/react-query";
import type { Address, Hash } from "viem";
import { useAccount, usePublicClient } from "wagmi";
import { targetChain } from "../config/chains";
import { deployment, votingAbi, type Poll } from "../contract/contract";
import { isPollNotFound } from "../lib/errors";
import { PAGE_SIZE } from "../lib/limits";
import { pollKeys } from "../lib/queryKeys";
import { usePollingFallback } from "./useLiveUpdates";

function useClient() {
  const client = usePublicClient({ chainId: targetChain.id });
  if (!client) throw new Error(`No public client for chain ${targetChain.id}`);
  return client;
}

const contract = () => ({ address: deployment!.address, abi: votingAbi });

/** All polls, newest first. Reads pollCount, then every page of 50 in parallel. */
export function usePollList() {
  const client = useClient();
  const refetchInterval = usePollingFallback();
  return useQuery({
    queryKey: pollKeys.list(),
    enabled: Boolean(deployment),
    refetchInterval,
    queryFn: async (): Promise<Poll[]> => {
      const count = await client.readContract({ ...contract(), functionName: "pollCount" });
      const starts: bigint[] = [];
      for (let start = 1n; start <= count; start += BigInt(PAGE_SIZE)) starts.push(start);
      const pages = await Promise.all(
        starts.map((start) =>
          client.readContract({ ...contract(), functionName: "getPollsPage", args: [start, BigInt(PAGE_SIZE)] }),
        ),
      );
      return pages.flat().reverse();
    },
  });
}

/** One poll. `null` data means "no such poll" (PollNotFound), which the page renders as not-found. */
export function usePoll(id: bigint | null) {
  const client = useClient();
  const refetchInterval = usePollingFallback();
  return useQuery({
    queryKey: pollKeys.poll(id ?? 0n),
    enabled: Boolean(deployment) && id !== null,
    refetchInterval,
    queryFn: async (): Promise<Poll | null> => {
      try {
        return await client.readContract({ ...contract(), functionName: "getPoll", args: [id!] });
      } catch (err) {
        if (isPollNotFound(err)) return null;
        throw err;
      }
    },
  });
}

/**
 * The connected account's vote in each poll: 0 = not voted, else optionIndex + 1.
 * The account is part of the query key, so switching accounts re-checks immediately.
 */
export function useVotedOptions(ids: readonly bigint[]) {
  const client = useClient();
  const { address } = useAccount();
  return useQuery({
    queryKey: pollKeys.voted(address, ids),
    enabled: Boolean(deployment && address) && ids.length > 0,
    queryFn: async (): Promise<Map<string, number>> => {
      const results = await Promise.all(
        ids.map((id) => client.readContract({ ...contract(), functionName: "getVotedOption", args: [id, address!] })),
      );
      return new Map(ids.map((id, i) => [id.toString(), Number(results[i])]));
    },
  });
}

export type VoteProof = { txHash: Hash; blockNumber: bigint; timestamp: bigint; optionIndex: number; voter: Address };

/**
 * Rebuilds the ballot receipt from the chain itself (the Voted log), so it survives cleared
 * storage and other devices: the proof lives on-chain, not in this browser.
 */
export function useVoteProof(pollId: bigint | null, enabled: boolean) {
  const client = useClient();
  const { address } = useAccount();
  return useQuery({
    queryKey: pollKeys.receipt(pollId ?? 0n, address),
    enabled: Boolean(deployment && address && pollId !== null) && enabled,
    staleTime: Infinity, // a mined vote never changes
    queryFn: async (): Promise<VoteProof | null> => {
      const logs = await client.getContractEvents({
        ...contract(),
        eventName: "Voted",
        args: { pollId: pollId!, voter: address! },
        fromBlock: BigInt(deployment!.deployBlock),
        toBlock: "latest",
      });
      const log = logs[0];
      if (!log?.transactionHash || log.blockNumber === null) return null;
      const block = await client.getBlock({ blockNumber: log.blockNumber });
      return {
        txHash: log.transactionHash,
        blockNumber: log.blockNumber,
        timestamp: block.timestamp,
        optionIndex: Number(log.args.optionIndex),
        voter: address!,
      };
    },
  });
}
