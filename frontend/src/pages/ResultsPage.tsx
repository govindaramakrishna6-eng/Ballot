import { Link, useSearchParams } from "react-router";
import { ResultCard } from "../components/ResultCard";
import { Skeleton } from "../components/Skeleton";
import { EmptyState, ErrorState } from "../components/States";
import { useChainClock } from "../hooks/useChainClock";
import { usePollList } from "../hooks/usePolls";
import { pollStatus } from "../lib/status";

const TABS = [
  { id: "final", label: "Final results" },
  { id: "live", label: "Live results" },
] as const;
type Tab = (typeof TABS)[number]["id"];

/**
 * Every poll's outcome. "Final" = closed polls (most recently closed first) — these can never change.
 * "Live" = open polls (most votes first), updating as votes land. Cancelled polls have no result,
 * so they're left out here (they still appear under Polls → Closed).
 */
export function ResultsPage() {
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get("tab") === "live" ? "live" : "final";
  const { nowSec } = useChainClock();
  const polls = usePollList();

  const all = polls.data ?? [];
  const final = all.filter((p) => pollStatus(p, nowSec) === "closed").sort((a, b) => Number(b.endTime - a.endTime));
  const live = all
    .filter((p) => pollStatus(p, nowSec) === "open")
    .sort((a, b) => (b.totalVotes > a.totalVotes ? 1 : b.totalVotes < a.totalVotes ? -1 : Number(b.id - a.id)));
  const shown = tab === "final" ? final : live;
  const decidedVotes = final.reduce((n, p) => n + p.totalVotes, 0n);

  return (
    <section aria-labelledby="results-page-title" className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 id="results-page-title" className="display text-4xl">
            Results
          </h1>
          <p className="muted mt-1">Every outcome here is counted by the contract from public on-chain votes — nobody can edit it.</p>
        </div>
        {!polls.isPending && !polls.isError && (
          <p className="mono muted text-sm" data-testid="results-summary">
            {final.length} decided · {decidedVotes.toString()} votes counted
          </p>
        )}
      </div>

      <div role="tablist" aria-label="Which results" className="tabs mt-6">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className="tab"
            onClick={() => setParams(t.id === "final" ? {} : { tab: t.id })}
          >
            {t.label}
            <span className="mono muted ml-1.5 text-xs">{t.id === "final" ? final.length : live.length}</span>
          </button>
        ))}
      </div>

      <div role="tabpanel" className="mt-5" aria-busy={polls.isPending}>
        {polls.isPending ? (
          <ul className="poll-grid" aria-label="Loading results">
            {[0, 1, 2].map((i) => (
              <li key={i} className="result-card">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="mt-4 h-6 w-5/6" />
                <Skeleton className="mt-4 h-3 w-full" />
                <Skeleton className="mt-3 h-3 w-full" />
              </li>
            ))}
          </ul>
        ) : polls.isError ? (
          <ErrorState error={polls.error} onRetry={() => void polls.refetch()} />
        ) : shown.length === 0 ? (
          tab === "final" ? (
            <EmptyState title="No poll has closed yet.">
              <p className="mt-1">Results become final the moment a poll's deadline passes.</p>
              <button type="button" className="btn btn-secondary mt-3" onClick={() => setParams({ tab: "live" })}>
                See live results
              </button>
            </EmptyState>
          ) : (
            <EmptyState title="No open polls right now.">
              <Link to="/create" className="btn btn-primary mt-3 inline-block">
                Create a poll
              </Link>
            </EmptyState>
          )
        ) : (
          <ul className="poll-grid" data-testid="results-list">
            {shown.map((p) => (
              <ResultCard key={p.id.toString()} poll={p} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
