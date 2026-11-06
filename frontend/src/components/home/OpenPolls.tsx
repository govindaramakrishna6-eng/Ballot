import { Link } from "react-router";
import type { Poll } from "../../contract/contract";
import { useChainClock } from "../../hooks/useChainClock";
import { rankOpenPolls } from "../../lib/rank";
import { Skeleton } from "../Skeleton";
import { ErrorState } from "../States";
import { OpenPollCard } from "./OpenPollCard";

const SHOWN = 9;

type Props = {
  polls: Poll[] | undefined;
  loading: boolean;
  error: unknown;
  onRetry: () => void;
  voted: Map<string, number> | undefined;
};

export function OpenPolls({ polls, loading, error, onRetry, voted }: Props) {
  const { nowSec } = useChainClock();
  const ranked = rankOpenPolls(polls ?? [], nowSec);

  return (
    <section id="open-polls" className="home-section" aria-labelledby="open-polls-title">
      <div className="section-bar">
        <h2 id="open-polls-title" className="home-h2">
          Open polls
        </h2>
        {ranked.length > 0 && (
          <Link to="/polls" className="link text-sm">
            {ranked.length > SHOWN ? `See all ${ranked.length} open polls` : "All polls"}
          </Link>
        )}
      </div>

      {loading ? (
        <ul className="poll-grid" aria-label="Loading polls">
          {[0, 1, 2].map((i) => (
            <li key={i} className="poll-card">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="mt-4 h-6 w-5/6" />
              <Skeleton className="mt-2 h-6 w-2/3" />
              <Skeleton className="mt-6 h-9 w-full" />
            </li>
          ))}
        </ul>
      ) : error ? (
        <ErrorState error={error} onRetry={onRetry} />
      ) : ranked.length === 0 ? (
        <div className="empty-card" data-testid="no-open-polls">
          <p className="empty-card-text">No open polls yet. Be the first to create one.</p>
          <Link to="/create" className="btn btn-primary btn-lg mt-5 inline-block">
            Create a poll
          </Link>
        </div>
      ) : (
        <ul className="poll-grid" data-testid="open-polls">
          {ranked.slice(0, SHOWN).map((p) => (
            <OpenPollCard key={p.id.toString()} poll={p} myVote={voted?.get(p.id.toString())} />
          ))}
        </ul>
      )}
    </section>
  );
}
