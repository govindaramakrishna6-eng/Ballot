import type { Poll } from "../contract/contract";

export type PollStatus = "open" | "closed" | "cancelled";

/** Matches the contract: voting is allowed only while chainNow < endTime. */
export function pollStatus(poll: Pick<Poll, "cancelled" | "endTime">, nowSec: number): PollStatus {
  if (poll.cancelled) return "cancelled";
  return BigInt(nowSec) < poll.endTime ? "open" : "closed";
}

/** Open polls with less than this left are labelled "Closing soon". */
export const CLOSING_SOON_SEC = 3 * 60 * 60;

export type DisplayStatus = PollStatus | "closing-soon";

/** What the label on a card says: like pollStatus, plus "closing-soon" for the last 3 hours. */
export function displayStatus(poll: Pick<Poll, "cancelled" | "endTime">, nowSec: number): DisplayStatus {
  const s = pollStatus(poll, nowSec);
  return s === "open" && Number(poll.endTime) - nowSec < CLOSING_SOON_SEC ? "closing-soon" : s;
}
