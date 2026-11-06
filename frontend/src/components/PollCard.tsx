import { Link } from "react-router";
import type { Poll } from "../contract/contract";
import { formatCountdown, formatDateTime, pluralVotes } from "../lib/format";
import { computeResults } from "../lib/results";
import { pollStatus } from "../lib/status";
import { useChainClock } from "../hooks/useChainClock";
import { StatusPill } from "./StatusPill";

export function PollCard({ poll, myVote }: { poll: Poll; myVote: number | undefined }) {
  const { nowSec } = useChainClock();
  const status = pollStatus(poll, nowSec);
  const r = computeResults(poll.options, poll.voteCounts);
  const leading =
    status === "cancelled"
      ? null
      : r.noVotes
        ? "No votes yet"
        : r.tied
          ? "Tied"
          : `${status === "closed" ? "Winner" : "Leading"}: ${poll.options[r.leader!]}`;

  return (
    <li className="ledger-row" data-testid="poll-card" data-poll-id={poll.id.toString()}>
      <div className="flex items-start justify-between gap-3">
        <Link to={`/poll/${poll.id}`} className="card-title" title={poll.title}>
          {poll.title}
        </Link>
        <StatusPill status={status} />
      </div>
      <p className="muted mt-1 text-sm">
        {status === "open"
          ? `Closes in ${formatCountdown(Number(poll.endTime) - nowSec)}`
          : status === "closed"
            ? `Ended ${formatDateTime(poll.endTime)}`
            : "Cancelled by its creator"}
      </p>
      <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <span className="mono tabular-nums">{pluralVotes(poll.totalVotes)}</span>
        {leading && (
          <span className="truncate" title={leading}>
            {leading}
          </span>
        )}
        {myVote ? <span className="label" data-testid="my-vote-mark">You voted</span> : null}
      </p>
    </li>
  );
}
