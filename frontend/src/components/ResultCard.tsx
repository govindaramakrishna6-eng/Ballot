import { Link } from "react-router";
import type { Poll } from "../contract/contract";
import { useChainClock } from "../hooks/useChainClock";
import { formatCountdown, formatDateTime, pluralVotes } from "../lib/format";
import { computeResults } from "../lib/results";
import { displayStatus, pollStatus } from "../lib/status";
import { StatusPill } from "./StatusPill";

const TOP = 3;

/** One poll's outcome at a glance: the verdict in words, then the top options as ink bars. */
export function ResultCard({ poll }: { poll: Poll }) {
  const { nowSec } = useChainClock();
  const status = pollStatus(poll, nowSec);
  const r = computeResults(poll.options, poll.voteCounts);
  const rows = [...r.rows].sort((a, b) => (b.count > a.count ? 1 : b.count < a.count ? -1 : a.index - b.index));
  const leaders = r.rows.filter((x) => x.leading);

  // The verdict sentence: final wording once closed, "leading" wording while open.
  let verdict: React.ReactNode;
  if (r.noVotes) verdict = status === "open" ? "No votes yet" : "No votes were cast";
  else if (r.tied)
    verdict = (
      <>
        <span className="label mr-2">Tied</span>
        {leaders.map((l) => l.label).join(" · ")}
      </>
    );
  else {
    const w = r.rows[r.leader!];
    verdict = (
      <>
        <span className={`label mr-2 ${status === "closed" ? "label-stamp" : ""}`}>{status === "closed" ? "Winner" : "Leading"}</span>
        <span className="font-semibold">{w.label}</span>
        <span className="muted"> · {w.percent}%</span>
      </>
    );
  }

  return (
    <li className="result-card" data-testid="result-card" data-poll-id={poll.id.toString()}>
      <div className="flex items-center justify-between gap-3">
        <StatusPill status={displayStatus(poll, nowSec)} />
        <span className="mono muted text-xs">
          {status === "open" ? `${formatCountdown(Number(poll.endTime) - nowSec)} left` : `Closed ${formatDateTime(poll.endTime)}`}
        </span>
      </div>
      <h2 className="poll-card-title" title={poll.title}>
        <Link to={`/poll/${poll.id}`}>{poll.title}</Link>
      </h2>
      <p className="result-verdict" data-testid="result-verdict">
        {verdict}
      </p>
      {!r.noVotes && (
        <ol className="space-y-2">
          {rows.slice(0, TOP).map((row) => (
            <li key={row.index}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="truncate" title={row.label}>
                  {row.label}
                </span>
                <span className="mono tabular-nums">
                  {row.count.toString()} · {row.percent}%
                </span>
              </div>
              <div className="bar-track mt-1" aria-hidden="true">
                <div className="bar-fill" style={{ width: `${row.percent ?? 0}%` }} />
              </div>
            </li>
          ))}
          {rows.length > TOP && <li className="muted text-xs">+{rows.length - TOP} more options</li>}
        </ol>
      )}
      <div className="poll-card-foot">
        <span className="mono text-sm">{pluralVotes(r.total)}</span>
        <Link to={`/poll/${poll.id}`} className="btn btn-secondary" aria-label={`Full results: ${poll.title}`}>
          Full results
        </Link>
      </div>
    </li>
  );
}
