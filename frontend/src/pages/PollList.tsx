import { useMemo } from "react";
import { Link, useSearchParams } from "react-router";
import { useAccount } from "wagmi";
import { PollCard } from "../components/PollCard";
import { Skeleton } from "../components/Skeleton";
import { EmptyState, ErrorState } from "../components/States";
import { useChainClock } from "../hooks/useChainClock";
import { usePollList, useVotedOptions } from "../hooks/usePolls";
import { pollStatus } from "../lib/status";

const TABS = [
  { id: "open", label: "Open" },
  { id: "closed", label: "Closed" },
  { id: "mine", label: "Mine" },
] as const;
type Tab = (typeof TABS)[number]["id"];

/** Every poll, filterable by Open / Closed / Mine (the homepage shows only the best open ones). */
export function PollList() {
  // The tab lives in the URL so it survives refresh and can be shared.
  const [params, setParams] = useSearchParams();
  const tab: Tab = (TABS.find((t) => t.id === params.get("tab"))?.id ?? "open") as Tab;
  const { address } = useAccount();
  const { nowSec } = useChainClock();
  const polls = usePollList();
  const ids = useMemo(() => (polls.data ?? []).map((p) => p.id), [polls.data]);
  const voted = useVotedOptions(ids);

  const visible = (polls.data ?? []).filter((p) => {
    if (tab === "mine") return address !== undefined && p.creator.toLowerCase() === address.toLowerCase();
    const s = pollStatus(p, nowSec);
    // Cancelled polls are finished, so they live under Closed.
    return tab === "open" ? s === "open" : s !== "open";
  });

  return (
    <section aria-labelledby="polls-heading" className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 id="polls-heading" className="display text-4xl">
          All polls
        </h1>
        <Link to="/create" className="btn btn-primary">
          Create a poll
        </Link>
      </div>

      <div role="tablist" aria-label="Filter polls" className="tabs mt-6">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className="tab"
            onClick={() => setParams(t.id === "open" ? {} : { tab: t.id })}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" className="mt-4" aria-busy={polls.isPending}>
        {polls.isPending ? (
          <ul className="ledger" aria-label="Loading polls">
            {[0, 1, 2].map((i) => (
              <li key={i} className="ledger-row">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="mt-3 h-4 w-1/3" />
              </li>
            ))}
          </ul>
        ) : polls.isError ? (
          <ErrorState error={polls.error} onRetry={() => void polls.refetch()} />
        ) : polls.data.length === 0 ? (
          <EmptyState title="No polls yet">
            <p className="mt-1">Be the first to ask a question.</p>
            <Link to="/create" className="btn btn-primary mt-3 inline-block">
              Create the first poll
            </Link>
          </EmptyState>
        ) : tab === "mine" && !address ? (
          <EmptyState title="Connect a wallet to see polls you created." />
        ) : visible.length === 0 ? (
          <EmptyState title={tab === "mine" ? "You haven't created any polls yet." : `No ${tab} polls right now.`}>
            {tab !== "closed" && (
              <Link to="/create" className="btn btn-secondary mt-3 inline-block">
                Create a poll
              </Link>
            )}
          </EmptyState>
        ) : (
          <ul className="ledger" data-testid="poll-list">
            {visible.map((p) => (
              <PollCard key={p.id.toString()} poll={p} myVote={voted.data?.get(p.id.toString())} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
