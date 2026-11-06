import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";
import { isLocalChain, targetChain } from "../config/chains";

type Clock = { nowSec: number; synced: boolean };
const ClockContext = createContext<Clock>({ nowSec: Math.floor(Date.now() / 1000), synced: false });

/**
 * Poll status must follow CHAIN time, not the user's clock (which may be wrong).
 * Each new block gives a lower bound for the offset (block time - when we saw it); the max of
 * those bounds is our estimate. A local Hardhat node mines only on demand, so an old block says
 * nothing — there the node follows the wall clock plus any time travel, so the offset never goes below 0.
 * The provider re-renders every second so countdowns tick and polls flip to Closed at zero.
 */
export function ChainClockProvider({ children }: { children: ReactNode }) {
  const client = usePublicClient({ chainId: targetChain.id });
  // Plain polling of the latest block (one cheap request per interval) — explicit and easy to reason about.
  const { data: block } = useQuery({
    queryKey: ["ballot", targetChain.id, "latest-block"],
    queryFn: () => client!.getBlock(),
    enabled: Boolean(client),
    refetchInterval: isLocalChain ? 1_000 : 4_000,
    staleTime: 0,
  });
  const offsetMs = useRef<number | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    if (!block) return;
    const observed = Number(block.timestamp) * 1000 - Date.now();
    const floor = isLocalChain ? 0 : -Infinity;
    offsetMs.current = Math.max(offsetMs.current ?? -Infinity, observed, floor);
    setNowMs(Date.now() + offsetMs.current);
    setSynced(true);
  }, [block]);

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now() + (offsetMs.current ?? 0)), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <ClockContext.Provider value={{ nowSec: Math.floor(nowMs / 1000), synced }}>
      {children}
    </ClockContext.Provider>
  );
}

export function useChainClock(): Clock {
  return useContext(ClockContext);
}
