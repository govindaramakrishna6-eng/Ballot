import { useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, useRef, useState, type ReactNode } from "react";
import { useWatchContractEvent } from "wagmi";
import { targetChain } from "../config/chains";
import { deployment, votingAbi } from "../contract/contract";
import { pollKeys } from "../lib/queryKeys";

/** When the event watcher fails, queries poll every ~12s instead (one Sepolia block). */
export const FALLBACK_POLL_MS = 12_000;
const LiveContext = createContext<{ fallbackPolling: boolean }>({ fallbackPolling: false });

export function LiveUpdatesProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const seen = useRef(new Set<string>());
  const [fallbackPolling, setFallbackPolling] = useState(false);
  const enabled = Boolean(deployment) && !fallbackPolling;

  // Several watchers (or a reorg-free re-delivery) can report the same log twice;
  // tx hash + log index identifies a log uniquely, so refetch once per log.
  function firstTime(log: { transactionHash: string | null; logIndex: number | null }) {
    const id = `${log.transactionHash}:${log.logIndex}`;
    if (seen.current.has(id)) return false;
    seen.current.add(id);
    return true;
  }

  function refetchPoll(pollId: bigint | undefined) {
    // invalidateQueries only refetches queries that are on screen, i.e. "visible polls".
    void queryClient.invalidateQueries({ queryKey: pollKeys.list() });
    if (pollId !== undefined) void queryClient.invalidateQueries({ queryKey: pollKeys.poll(pollId) });
  }

  const common = {
    address: deployment?.address,
    abi: votingAbi,
    chainId: targetChain.id,
    enabled,
    onError: () => setFallbackPolling(true),
  } as const;

  useWatchContractEvent({
    ...common,
    eventName: "Voted",
    onLogs: (logs) =>
      logs.filter(firstTime).forEach((log) => {
        refetchPoll(log.args.pollId);
        // A vote from this account in another tab/device must also update "my vote".
        void queryClient.invalidateQueries({ queryKey: pollKeys.votedAll() });
      }),
  });
  useWatchContractEvent({
    ...common,
    eventName: "PollCreated",
    onLogs: (logs) => logs.filter(firstTime).forEach((log) => refetchPoll(log.args.pollId)),
  });
  useWatchContractEvent({
    ...common,
    eventName: "PollCancelled",
    onLogs: (logs) => logs.filter(firstTime).forEach((log) => refetchPoll(log.args.pollId)),
  });

  return <LiveContext.Provider value={{ fallbackPolling }}>{children}</LiveContext.Provider>;
}

/** refetchInterval for poll queries: off while events stream, ~12s after the watcher failed. */
export function usePollingFallback(): number | false {
  return useContext(LiveContext).fallbackPolling ? FALLBACK_POLL_MS : false;
}
