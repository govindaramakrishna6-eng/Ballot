import { Link } from "react-router";
import type { Poll } from "../contract/contract";
import { useChainClock } from "../hooks/useChainClock";
import { formatCountdown, formatDateTime, pluralVotes } from "../lib/format";
import { computeResults } from "../lib/results";
import { displayStatus, pollStatus } from "../lib/status";
import { Legend, SegmentedBar } from "./charts/SegmentedBar";
import { StatusPill } from "./StatusPill";

/** One poll's outcome: the verdict in words, a part-to-whole bar, and a legend with every figure. */
export function ResultCard({ poll }: { poll: Poll }) {
  const { nowSec } = useChainClock();
  const status = pollStatus(poll, nowSec);
  const final = status === "closed";
  const r = computeResults(poll.options, poll.voteCounts);
  const leaders = r.rows.filter((x) => x.leading);

  let verdict: React.ReactNode;
  if (r.noVotes) verdict = <span className="muted">{final ? "No votes were cast" : "No votes yet"}</span>;
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
        <span className={`label mr-2 ${final ? "label-stamp" : ""}`}>{final ? "Winner" : "Leading"}</span>
        <span className="font-semibold">{w.label}</span>
        <span className="muted"> · {w.percent}%</span>
      </>
    );
  }

  return (
    <li className="card result-card" data-testid="result-card" data-poll-id={poll.id.toString()}>
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
      <SegmentedBar rows={r.rows} total={r.total} />
      <Legend rows={r.rows} leader={r.noVotes || r.tied ? null : r.leader} final={final} />
      <div className="poll-card-foot">
        <span className="mono text-sm">{pluralVotes(r.total)}</span>
        <Link to={`/poll/${poll.id}`} className="btn btn-secondary" aria-label={`Full results: ${poll.title}`}>
          Full results
        </Link>
      </div>
    </li>
  );
}
