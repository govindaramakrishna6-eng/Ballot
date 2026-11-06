import type { PollStatus } from "../lib/status";

const LABEL: Record<PollStatus, string> = { open: "Open", closed: "Closed", cancelled: "Cancelled" };

/** A small printed label. The word carries the meaning; styling is secondary. */
export function StatusPill({ status }: { status: PollStatus }) {
  return (
    <span className={`label label-${status}`} data-testid="status-pill">
      {LABEL[status]}
    </span>
  );
}
