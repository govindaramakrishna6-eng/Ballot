import { Link } from "react-router";
import type { Poll } from "../../contract/contract";
import { useChainClock } from "../../hooks/useChainClock";
import { formatCountdown, pluralVotes } from "../../lib/format";
import { computeResults } from "../../lib/results";
import { pollStatus } from "../../lib/status";

/** The most-voted open poll, given front-page treatment with its live ink bars. */
export function FeaturedPoll({ polls }: { polls: Poll[] | undefined }) {
  const { nowSec } = useChainClock();
  const open = (polls ?? []).filter((p) => pollStatus(p, nowSec) === "open");
  if (open.length === 0) return null;
  const poll = open.reduce((best, p) => (p.totalVotes > best.totalVotes ? p : best), open[0]);
  const r = computeResults(poll.options, poll.voteCounts);
  const rows = [...r.rows].sort((a, b) => (b.count > a.count ? 1 : b.count < a.count ? -1 : a.index - b.index)).slice(0, 4);

  return (
    <article className="featured" aria-labelledby="featured-title" data-featured-id={poll.id.toString()}>
      <p className="kicker">Most active poll · closes in {formatCountdown(Number(poll.endTime) - nowSec)}</p>
      <h2 id="featured-title" className="featured-title">
        <Link to={`/poll/${poll.id}`} title={poll.title}>
          {poll.title}
        </Link>
      </h2>
      <ol className="mt-4 space-y-3">
        {rows.map((row) => (
          <li key={row.index}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate" title={row.label}>
                {row.label}
              </span>
              <span className="mono tabular-nums">
                {row.count.toString()} · {row.percent === null ? "—" : `${row.percent}%`}
              </span>
            </div>
            <div className="bar-track mt-1" aria-hidden="true">
              <div className="bar-fill" style={{ width: `${row.percent ?? 0}%` }} />
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="muted">{r.noVotes ? "No votes yet — be the first." : `${pluralVotes(r.total)} so far`}</span>
        <Link to={`/poll/${poll.id}`} className="btn btn-primary">
          Cast your vote
        </Link>
      </p>
    </article>
  );
}
