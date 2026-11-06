import type { Address, Hash } from "viem";
import type { Poll } from "../contract/contract";
import type { ChainEvent } from "../hooks/useActivity";
import { pollStatus } from "./status";

export type FeedItem = {
  id: string;
  kind: "vote" | "created" | "cancelled" | "closed";
  poll: Poll;
  actor: Address | null;
  txHash: Hash | null;
  /** Unix seconds; null when the block time isn't loaded yet. */
  at: number | null;
};

/** Polls that closed in the last week appear in the feed as "closed with N votes". */
const CLOSED_LOOKBACK_SEC = 7 * 24 * 60 * 60;

/**
 * Merges on-chain events with "closed" moments (a deadline passing emits no event, so those come
 * from the poll list) into one newest-first feed. Pure, so it's unit-tested.
 */
export function buildFeed(
  events: readonly ChainEvent[],
  times: ReadonlyMap<bigint, bigint>,
  polls: readonly Poll[],
  nowSec: number,
  limit: number,
): FeedItem[] {
  const byId = new Map(polls.map((p) => [p.id, p]));
  const fromEvents: FeedItem[] = events.flatMap((e) => {
    const poll = byId.get(e.pollId);
    if (!poll) return [];
    const t = times.get(e.blockNumber);
    return [{ id: e.id, kind: e.kind, poll, actor: e.actor, txHash: e.txHash, at: t === undefined ? null : Number(t) }];
  });
  const closed: FeedItem[] = polls
    .filter((p) => pollStatus(p, nowSec) === "closed" && nowSec - Number(p.endTime) <= CLOSED_LOOKBACK_SEC)
    .map((p) => ({ id: `closed:${p.id}`, kind: "closed", poll: p, actor: null, txHash: null, at: Number(p.endTime) }));

  // Events without a loaded time are older than every timestamped one (they're past the newest dozen).
  return [...fromEvents, ...closed].sort((a, b) => (b.at ?? -1) - (a.at ?? -1)).slice(0, limit);
}

/** Wallets that created a poll (complete, from the contract) or voted (from the readable log window). */
export function uniqueWallets(polls: readonly Poll[], events: readonly ChainEvent[]): number {
  const set = new Set<string>(polls.map((p) => p.creator.toLowerCase()));
  for (const e of events) if (e.actor) set.add(e.actor.toLowerCase());
  return set.size;
}
