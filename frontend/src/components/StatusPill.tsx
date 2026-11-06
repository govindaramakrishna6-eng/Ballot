import type { DisplayStatus } from "../lib/status";

const LABEL: Record<DisplayStatus, string> = { open: "Open", "closing-soon": "Closing soon", closed: "Closed", cancelled: "Cancelled" };

/** A small printed label. The word carries the meaning; styling is secondary. */
export function StatusPill({ status }: { status: DisplayStatus }) {
  return (
    <span className={`label label-${status}`} data-testid="status-pill">
      {LABEL[status]}
    </span>
  );
}
