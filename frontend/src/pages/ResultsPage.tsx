import { Link, useSearchParams } from "react-router";
import { ChartIcon, DownloadIcon } from "../components/icons";
import { ResultCard } from "../components/ResultCard";
import { download, toCsv, toJson } from "../lib/share";
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
  const exportRows = shown.map((poll) => ({ poll, status: tab === "final" ? "closed" : "open" }));

  return (
    <section aria-labelledby="results-page-title" className="page">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 id="results-page-title" className="display text-4xl">
            Results
          </h1>
          <p className="muted mt-1">Every outcome here is counted by the contract from public on-chain votes — nobody can edit it.</p>
        </div>
        {!polls.isPending && !polls.isError && (
          <div className="flex flex-col items-end gap-2">
            <p className="mono muted text-sm" data-testid="results-summary">
              {final.length} decided · {decidedVotes.toString()} votes counted
            </p>
            {shown.length > 0 && (
              <span className="actions-export">
                <DownloadIcon className="icon-sm" />
                <span className="muted text-sm">Export {tab === "final" ? "final" : "live"} results</span>
                <button type="button" className="btn-chip" data-testid="export-all-csv" onClick={() => download(`ballot-${tab}-results.csv`, toCsv(exportRows), "text/csv")}>
                  CSV
                </button>
                <button type="button" className="btn-chip" data-testid="export-all-json" onClick={() => download(`ballot-${tab}-results.json`, toJson(exportRows), "application/json")}>
                  JSON
                </button>
              </span>
            )}
          </div>
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
          <ul className="grid-3" aria-label="Loading results">
            {[0, 1, 2].map((i) => (
              <li key={i} className="card">
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
            <EmptyState title="No poll has closed yet — results become final the moment a deadline passes." icon={<ChartIcon />}>
              <button type="button" className="btn btn-secondary" onClick={() => setParams({ tab: "live" })}>
                See live results
              </button>
            </EmptyState>
          ) : (
            <EmptyState title="No open polls right now." icon={<ChartIcon />}>
              <Link to="/create" className="btn btn-primary">
                Create a poll
              </Link>
            </EmptyState>
          )
        ) : (
          <ul className="grid-3" data-testid="results-list">
            {shown.map((p) => (
              <ResultCard key={p.id.toString()} poll={p} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
