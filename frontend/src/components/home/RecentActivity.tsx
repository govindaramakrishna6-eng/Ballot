import { useState } from "react";
import { Link } from "react-router";
import type { Poll } from "../../contract/contract";
import type { ChainEvents } from "../../hooks/useActivity";
import { useChainClock } from "../../hooks/useChainClock";
import { buildFeed, type FeedItem } from "../../lib/activity";
import { pluralVotes, shortAddress } from "../../lib/format";
import { relativeTime } from "../../lib/relativeTime";
import { Skeleton } from "../Skeleton";
import { LatestReceipt } from "./LatestReceipt";

const SHOWN = 8;

function Sentence({ item }: { item: FeedItem }) {
  const q = <span className="note-quote">‘{item.poll.title}’</span>;
  switch (item.kind) {
    case "vote":
      return <>A wallet voted in {q}</>;
    case "created":
      return <>A new poll was created: {q}</>;
    case "closed":
      return <>{q} closed with {pluralVotes(item.poll.totalVotes)}.</>;
    case "cancelled":
      return <>{q} was cancelled by its creator.</>;
  }
}

/**
 * A light, human feed — sentences, not transaction rows. Every note links to its poll;
 * wallets are masked. Notes that arrive while you're watching slide in once.
 */
export function RecentActivity({ chain, polls, loading, failed }: { chain: ChainEvents | undefined; polls: Poll[] | undefined; loading: boolean; failed: boolean }) {
  const { nowSec } = useChainClock();
  const feed = chain && polls ? buildFeed(chain.events, chain.times, polls, nowSec, SHOWN) : [];

  // React's "adjust state when a prop changes" pattern: compare with the previous feed during render.
  const ids = feed.map((f) => f.id).join("|");
  const [previous, setPrevious] = useState<string | null>(null);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  if (chain && polls && ids !== previous) {
    setPrevious(ids);
    if (previous !== null) {
      const before = new Set(previous.split("|"));
      setFresh(new Set(feed.filter((f) => !before.has(f.id)).map((f) => f.id)));
    }
  }

  return (
    <section className="home-section" aria-labelledby="activity-title">
      <div className="section-bar">
        <h2 id="activity-title" className="home-h2">
          Recent activity
        </h2>
        <span className="live-chip" aria-hidden="true">
          <span className="pulse-dot" /> Live
        </span>
      </div>
      <div className="activity-layout">
        {loading ? <Skeleton className="h-64 w-full" /> : <LatestReceipt chain={chain} polls={polls} />}
        <div className="min-w-0">
      {loading ? (
            <ul className="note-grid" aria-label="Loading activity">
              {[0, 1, 2].map((i) => (
                <li key={i} className="note">
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="mt-2 h-4 w-1/2" />
                </li>
              ))}
            </ul>
          ) : failed ? (
            <p className="hint">Recent activity isn't available right now. Polls and results still work.</p>
          ) : feed.length === 0 ? (
            <p className="hint">It's quiet so far. Votes and new polls will show up here as they happen.</p>
          ) : (
            <ul className="note-grid" data-testid="activity">
              {feed.map((item) => (
                <li key={item.id} className={fresh.has(item.id) ? "note-in" : ""}>
                  <Link to={`/poll/${item.poll.id}`} className={`note note-${item.kind}`} data-testid={`activity-${item.kind}`}>
                    <span className="note-text">
                      <Sentence item={item} />
                    </span>
                    <span className="note-meta">
                      {item.actor && (
                        <span className="mono" title={item.actor}>
                          {shortAddress(item.actor)}
                        </span>
                      )}
                      {item.actor && item.at !== null && <span aria-hidden="true">·</span>}
                      {item.at !== null && <span>{relativeTime(item.at, nowSec)}</span>}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
