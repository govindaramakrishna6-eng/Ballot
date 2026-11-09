import type { Poll } from "../contract/contract";
import { CLOSING_SOON_SEC, pollStatus } from "./status";

/**
 * Most useful first: polls about to close (soonest first), then the busiest, then the newest.
 * Pure function so the ordering is easy to reason about and test.
 */
export function rankOpenPolls(polls: readonly Poll[], nowSec: number): Poll[] {
  const closingSoon = (p: Poll) => Number(p.endTime) - nowSec < CLOSING_SOON_SEC;
  return polls
    .filter((p) => pollStatus(p, nowSec) === "open")
    .sort((a, b) => {
      const ca = closingSoon(a);
      const cb = closingSoon(b);
      if (ca !== cb) return ca ? -1 : 1;
      if (ca && cb) return Number(a.endTime - b.endTime);
      if (a.totalVotes !== b.totalVotes) return b.totalVotes > a.totalVotes ? 1 : -1;
      return Number(b.id - a.id);
    });
}

/**
 * Which poll gets the spotlight: the open poll with the most votes (ties → closes soonest).
 * With nothing open, the most recently closed poll — so the slot always shows a real result.
 */
export function pickFeatured(polls: readonly Poll[], nowSec: number): Poll | null {
  const open = polls.filter((p) => pollStatus(p, nowSec) === "open");
  if (open.length) {
    return [...open].sort((a, b) => (b.totalVotes > a.totalVotes ? 1 : b.totalVotes < a.totalVotes ? -1 : Number(a.endTime - b.endTime)))[0];
  }
  const closed = polls.filter((p) => pollStatus(p, nowSec) === "closed");
  return closed.length ? [...closed].sort((a, b) => Number(b.endTime - a.endTime))[0] : null;
}

export type PollFilter = "all" | "open" | "closing" | "closed" | "mine";

/** Filter + search + order for the poll browser. Pure, so it's unit-tested. */
export function browsePolls(
  polls: readonly Poll[],
  { filter, query, nowSec, account }: { filter: PollFilter; query: string; nowSec: number; account?: string },
): Poll[] {
  const q = query.trim().toLowerCase();
  const matches = (p: Poll) => {
    if (!q) return true;
    if (/^#\d+$/.test(q)) return p.id.toString() === q.slice(1); // "#12" = exactly poll 12
    if (/^\d+$/.test(q)) return p.id.toString() === q || p.title.toLowerCase().includes(q); // "12" = id or text
    if (q.startsWith("0x")) return p.creator.toLowerCase().includes(q);
    return p.title.toLowerCase().includes(q);
  };
  const isOpen = (p: Poll) => pollStatus(p, nowSec) === "open";
  const closingSoon = (p: Poll) => isOpen(p) && Number(p.endTime) - nowSec < CLOSING_SOON_SEC;
  const byFilter = (p: Poll) =>
    filter === "open" ? isOpen(p)
    : filter === "closing" ? closingSoon(p)
    : filter === "closed" ? !isOpen(p) // includes cancelled
    : filter === "mine" ? account !== undefined && p.creator.toLowerCase() === account.toLowerCase()
    : true;

  const list = polls.filter((p) => byFilter(p) && matches(p));
  const open = rankOpenPolls(list, nowSec);
  const finished = list.filter((p) => !isOpen(p)).sort((a, b) => Number(b.endTime - a.endTime));
  return [...open, ...finished];
}
