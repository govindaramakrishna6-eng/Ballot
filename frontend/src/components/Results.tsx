import type { Poll } from "../contract/contract";
import { computeResults } from "../lib/results";
import type { PollStatus } from "../lib/status";

/**
 * Results readable without colour: every row states its count and percentage in text,
 * and Tied / Winner / Your vote are words, not hues.
 */
export function Results({ poll, status, myVote }: { poll: Poll; status: PollStatus; myVote: number }) {
  if (status === "cancelled") {
    return <p className="muted" data-testid="results-cancelled">This poll was cancelled before any votes, so there are no results.</p>;
  }
  const r = computeResults(poll.options, poll.voteCounts);
  return (
    <section aria-labelledby="results-heading" data-testid="results">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="results-heading" className="section-title">
          {status === "open" ? "Live results" : "Final results"}
        </h2>
        <p className="mono text-sm" data-testid="total-votes">
          {r.noVotes ? "No votes yet" : `${r.total.toString()} ${r.total === 1n ? "vote" : "votes"} total`}
        </p>
      </div>
      {r.tied && <p className="label mt-2 inline-block" data-testid="tied">Tied</p>}
      <ol className="mt-3 space-y-3">
        {r.rows.map((row) => {
          const winner = status === "closed" && r.leader === row.index;
          return (
            <li key={row.index} data-testid="result-row">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="break-words">
                  {row.label}
                  {winner && <span className="label label-stamp ml-2" data-testid="winner">Winner</span>}
                  {myVote === row.index + 1 && <span className="label ml-2">Your vote</span>}
                </span>
                <span className="mono tabular-nums text-sm" data-testid="result-count">
                  {row.count.toString()} · {row.percent === null ? "—" : `${row.percent}%`}
                </span>
              </div>
              <div
                className="bar-track mt-1"
                role="img"
                aria-label={`${row.label}: ${row.count} ${row.count === 1n ? "vote" : "votes"}${row.percent === null ? "" : `, ${row.percent} percent`}`}
              >
                <div className="bar-fill" style={{ width: `${row.percent ?? 0}%` }} />
              </div>
            </li>
          );
        })}
      </ol>
      {!r.noVotes && <p className="muted mt-2 text-xs">Percentages are rounded and may not add up to exactly 100. Counts are exact.</p>}
    </section>
  );
}
