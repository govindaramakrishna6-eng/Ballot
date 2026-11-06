import type { Poll } from "../contract/contract";

export type PollStatus = "open" | "closed" | "cancelled";

/** Matches the contract: voting is allowed only while chainNow < endTime. */
export function pollStatus(poll: Pick<Poll, "cancelled" | "endTime">, nowSec: number): PollStatus {
  if (poll.cancelled) return "cancelled";
  return BigInt(nowSec) < poll.endTime ? "open" : "closed";
}
