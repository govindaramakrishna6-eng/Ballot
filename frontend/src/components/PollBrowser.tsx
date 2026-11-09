import { Link } from "react-router";
import { useAccount } from "wagmi";
import type { Poll } from "../contract/contract";
import { useChainClock } from "../hooks/useChainClock";
import { browsePolls, type PollFilter } from "../lib/rank";
import { OpenPollCard } from "./home/OpenPollCard";
import { BallotIcon, SearchIcon } from "./icons";
import { Skeleton } from "./Skeleton";
import { EmptyState, ErrorState } from "./States";

const BASE_FILTERS: { id: PollFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "open", label: "Open" },
  { id: "closing", label: "Closing soon" },
  { id: "closed", label: "Closed" },
];

type Props = {
  polls: Poll[] | undefined;
  voted: Map<string, number> | undefined;
  loading: boolean;
  error: unknown;
  onRetry: () => void;
  filter: PollFilter;
  onFilter: (f: PollFilter) => void;
  query: string;
  onQuery: (q: string) => void;
  /** Show at most this many cards (homepage); undefined = all. */
  limit?: number;
  withMine?: boolean;
};

/** Search + filter chips + an even grid of poll cards, with honest empty states. */
export function PollBrowser({ polls, voted, loading, error, onRetry, filter, onFilter, query, onQuery, limit, withMine = false }: Props) {
  const { nowSec } = useChainClock();
  const { address } = useAccount();
  const filters = withMine ? [...BASE_FILTERS, { id: "mine" as const, label: "Mine" }] : BASE_FILTERS;
  const all = polls ?? [];
  const list = browsePolls(all, { filter, query, nowSec, account: address });
  const count = (f: PollFilter) => browsePolls(all, { filter: f, query, nowSec, account: address }).length;
  const shown = limit ? list.slice(0, limit) : list;

  return (
    <div>
      <div className="browser-bar">
        <label className="search">
          <SearchIcon className="icon-sm" />
          <span className="sr-only">Search polls</span>
          <input
            type="search"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Search by question, #id or 0x address"
            data-testid="poll-search"
          />
        </label>
        <div role="tablist" aria-label="Filter polls" className="chips">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={filter === f.id}
              className="chip"
              onClick={() => onFilter(f.id)}
              data-testid={`filter-${f.id}`}
            >
              {f.label}
              {!loading && <span className="chip-count">{f.id === "mine" && !address ? "–" : count(f.id)}</span>}
            </button>
          ))}
        </div>
      </div>

      <div role="tabpanel" aria-busy={loading} className="mt-6">
        {loading ? (
          <ul className="grid-3" aria-label="Loading polls">
            {[0, 1, 2].map((i) => (
              <li key={i} className="card">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="mt-4 h-6 w-5/6" />
                <Skeleton className="mt-2 h-6 w-2/3" />
                <Skeleton className="mt-6 h-9 w-full" />
              </li>
            ))}
          </ul>
        ) : error ? (
          <ErrorState error={error} onRetry={onRetry} />
        ) : all.length === 0 || (filter === "open" && !query && list.length === 0) ? (
          <EmptyState title="No open polls yet. Be the first to create one." icon={<BallotIcon />} testId="no-open-polls">
            <Link to="/create" className="btn btn-primary btn-lg">
              Create a poll
            </Link>
          </EmptyState>
        ) : filter === "mine" && !address ? (
          <EmptyState title="Connect a wallet to see polls you created." />
        ) : list.length === 0 ? (
          <EmptyState title={query ? `No polls match “${query}”.` : "Nothing here right now."} icon={<SearchIcon />} testId="no-results">
            <div className="flex flex-wrap justify-center gap-2">
              {query && (
                <button type="button" className="btn btn-secondary" onClick={() => onQuery("")}>
                  Clear search
                </button>
              )}
              {filter !== "all" && (
                <button type="button" className="btn btn-secondary" onClick={() => onFilter("all")}>
                  Show all polls
                </button>
              )}
              <Link to="/create" className="btn btn-primary">
                Create a poll
              </Link>
            </div>
          </EmptyState>
        ) : (
          <ul className="grid-3" data-testid="open-polls">
            {shown.map((p) => (
              <OpenPollCard key={p.id.toString()} poll={p} myVote={voted?.get(p.id.toString())} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
