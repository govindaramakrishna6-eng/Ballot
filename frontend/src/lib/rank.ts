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
