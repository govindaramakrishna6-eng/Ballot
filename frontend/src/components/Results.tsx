import { useState } from "react";
import type { Address } from "viem";
import type { Poll } from "../contract/contract";
import { computeResults } from "../lib/results";
import type { PollStatus } from "../lib/status";
import { VoterStack } from "./VoterStack";

/**
 * Results readable without colour: every row states its count and percentage in text,
 * and Tied / Winner / Your vote are words, not hues.
 */
export function Results({ poll, status, myVote, voters = [] }: { poll: Poll; status: PollStatus; myVote: number; voters?: Address[] }) {
  // Which rows just gained votes while the page was open (React's "compare with previous prop" pattern).
  const counts = poll.voteCounts.join(",");
  const [previous, setPrevious] = useState(counts);
  const [bumped, setBumped] = useState<number[]>([]);
  if (counts !== previous) {
    const before = previous.split(",").map(BigInt);
    setBumped(poll.voteCounts.flatMap((c, i) => (c > (before[i] ?? 0n) ? [i] : [])));
    setPrevious(counts);
  }

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
      <VoterStack voters={voters} total={r.total} />
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
                <span className="relative">
                  {bumped.includes(row.index) && (
                    // keyed by count so a second live vote replays the bump
                    <span key={row.count.toString()} className="bump" aria-hidden="true">
                      +1
                    </span>
                  )}
                  <span className="mono tabular-nums text-sm" data-testid="result-count">
                    {row.count.toString()} · {row.percent === null ? "—" : `${row.percent}%`}
                  </span>
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
