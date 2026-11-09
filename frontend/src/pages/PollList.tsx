import { useMemo } from "react";
import { Link, useSearchParams } from "react-router";
import { PollBrowser } from "../components/PollBrowser";
import { usePollList, useVotedOptions } from "../hooks/usePolls";
import type { PollFilter } from "../lib/rank";

const FILTERS: PollFilter[] = ["all", "open", "closing", "closed", "mine"];

/** Every poll with search + filters; filter and query live in the URL so views can be shared. */
export function PollList() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab");
  const filter: PollFilter = FILTERS.includes(tab as PollFilter) ? (tab as PollFilter) : "all";
  const query = params.get("q") ?? "";
  const polls = usePollList();
  const ids = useMemo(() => (polls.data ?? []).map((p) => p.id), [polls.data]);
  const voted = useVotedOptions(ids);

  const update = (next: { filter?: PollFilter; query?: string }) => {
    const f = next.filter ?? filter;
    const q = next.query ?? query;
    setParams({ ...(f !== "all" ? { tab: f } : {}), ...(q ? { q } : {}) }, { replace: true });
  };

  return (
    <section aria-labelledby="polls-heading" className="page">
      <div className="section-head">
        <div>
          <p className="kicker">Browse</p>
          <h1 id="polls-heading" className="home-h2">
            All polls
          </h1>
        </div>
        <Link to="/create" className="btn btn-primary">
          Create a poll
        </Link>
      </div>
      <PollBrowser
        polls={polls.data}
        voted={voted.data}
        loading={polls.isPending}
        error={polls.isError ? polls.error : null}
        onRetry={() => void polls.refetch()}
        filter={filter}
        onFilter={(f) => update({ filter: f })}
        query={query}
        onQuery={(q) => update({ query: q })}
        withMine
      />
    </section>
  );
}
