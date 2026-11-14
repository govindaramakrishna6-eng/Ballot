import { Link, useSearchParams } from "react-router";
import { AreaChart } from "../components/charts/AreaChart";
import { RankedBars } from "../components/charts/RankedBars";
import { ChartIcon, DownloadIcon } from "../components/icons";
import { ResultCard } from "../components/ResultCard";
import { download, toCsv, toJson } from "../lib/share";
import { Skeleton } from "../components/Skeleton";
import { EmptyState, ErrorState } from "../components/States";
import { useChainClock } from "../hooks/useChainClock";
import { useCountUp } from "../hooks/useCountUp";
import { usePollList } from "../hooks/usePolls";
import { useVoteTimes } from "../hooks/useVoteTimeline";
import { bucketVotes } from "../lib/timeline";
import { pollStatus } from "../lib/status";
import type { Poll } from "../contract/contract";

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
          <p className="kicker">Dashboard</p>
          <h1 id="results-page-title" className="home-h2">
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

      <Dashboard polls={all} final={final.length} live={live.length} loading={polls.isPending} nowSec={nowSec} />

      <div role="tablist" aria-label="Which results" className="tabs mt-10">
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

function Kpi({ value, label, sub }: { value: number; label: string; sub?: string }) {
  const shown = useCountUp(value);
  return (
    <div className="card kpi">
      <dt className="kpi-label">{label}</dt>
      <dd className="kpi-value tabular-nums">{shown.toLocaleString()}</dd>
      {sub && <dd className="kpi-sub">{sub}</dd>}
    </div>
  );
}

/** Headline figures, the turnout curve and the most-voted polls — all read from the chain. */
function Dashboard({ polls, final, live, loading, nowSec }: { polls: Poll[]; final: number; live: number; loading: boolean; nowSec: number }) {
  const times = useVoteTimes();
  const totalVotes = polls.reduce((n, p) => n + Number(p.totalVotes), 0);
  const avg = polls.length ? totalVotes / polls.length : 0;
  // Votes older than the readable log window still count: they start the curve's baseline.
  const inWindow = times.data?.length ?? 0;
  const { points, bucketSec } = bucketVotes(times.data ?? [], nowSec, Math.max(0, totalVotes - inWindow));
  const ranked = [...polls]
    .filter((p) => p.totalVotes > 0n)
    .sort((a, b) => (b.totalVotes > a.totalVotes ? 1 : b.totalVotes < a.totalVotes ? -1 : 0))
    .slice(0, 6)
    .map((p) => ({ key: p.id.toString(), label: p.title, value: Number(p.totalVotes), href: `/poll/${p.id}` }));

  if (loading) {
    return (
      <div className="dash-kpis mt-6">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="card">
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="mt-3 h-8 w-1/3" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <dl className="dash-kpis mt-6" data-testid="results-kpis">
        <Kpi value={totalVotes} label="Votes counted" sub="across every poll" />
        <Kpi value={final} label="Polls decided" sub="final, can't change" />
        <Kpi value={live} label="Live right now" sub="still taking votes" />
        <Kpi value={Math.round(avg * 10) / 10} label="Avg. votes per poll" sub={`${polls.length} polls in total`} />
      </dl>
      <div className="split mt-6">
        <section className="card" aria-labelledby="mv-title">
          <h2 id="mv-title" className="card-h3">
            Most voted
          </h2>
          {ranked.length ? (
            <RankedBars rows={ranked} unit={(n) => `${n}`} />
          ) : (
            <p className="card-body">No votes yet — the busiest polls will rank here.</p>
          )}
        </section>
        <section className="card" aria-labelledby="vot-title">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="vot-title" className="card-h3">
              Votes over time
            </h2>
            <span className="mono muted text-xs">{times.complete ? "since launch" : "last ~3 days in detail"} · cumulative</span>
          </div>
          {times.isPending || times.chainPending ? (
            <Skeleton className="mt-3 h-48 w-full" />
          ) : points.length ? (
            <AreaChart points={points} bucketSec={bucketSec} label={`Cumulative votes over time, now ${points.at(-1)!.cumulative}`} />
          ) : (
            <p className="card-body">The curve starts with the first vote.</p>
          )}
        </section>
      </div>
    </>
  );
}
