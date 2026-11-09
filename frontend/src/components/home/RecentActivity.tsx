import { useState } from "react";
import { Link } from "react-router";
import type { Poll } from "../../contract/contract";
import type { ChainEvents } from "../../hooks/useActivity";
import { useChainClock } from "../../hooks/useChainClock";
import { buildFeed, type FeedItem } from "../../lib/activity";
import { pluralVotes, shortAddress } from "../../lib/format";
import { relativeTime } from "../../lib/relativeTime";
import { computeResults } from "../../lib/results";
import { Identicon } from "../Identicon";
import { ActivityIcon } from "../icons";
import { Skeleton } from "../Skeleton";
import { EmptyState } from "../States";
import { LatestReceipt } from "./LatestReceipt";
import { SectionHead } from "./SectionHead";

/** Four items = an even 2 × 2 grid, about the height of the receipt beside it. */
const SHOWN = 4;

const KIND_LABEL: Record<FeedItem["kind"], string> = { vote: "Vote", created: "New poll", closed: "Closed", cancelled: "Cancelled" };

/** Headline + one detail line per event — human sentences, wallets masked. */
function describe(item: FeedItem): { headline: React.ReactNode; detail: React.ReactNode } {
  const title = <span className="note-quote">‘{item.poll.title}’</span>;
  switch (item.kind) {
    case "vote":
      return { headline: <>Vote cast on {title}</>, detail: item.actor ? shortAddress(item.actor) : null };
    case "created":
      return { headline: <>New poll created by <span className="mono">{item.actor ? shortAddress(item.actor) : "a wallet"}</span></>, detail: <>{title}</> };
    case "closed": {
      const r = computeResults(item.poll.options, item.poll.voteCounts);
      const verdict = r.noVotes ? "No votes cast" : r.tied ? "Ended in a tie" : `Winner: ${item.poll.options[r.leader!]}`;
      return { headline: <>{title} closed with {pluralVotes(item.poll.totalVotes)}</>, detail: verdict };
    }
    case "cancelled":
      return { headline: <>{title} was cancelled by its creator</>, detail: "Cancelled before any votes" };
  }
}

/**
 * A light live feed: newest real ballot as a receipt (left third), recent events as an even grid
 * (right two-thirds). New items fade in once; every item links to its poll.
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
      <SectionHead
        id="activity-title"
        kicker="On-chain, right now"
        title="Recent activity"
        action={
          <span className="live-badge" data-testid="live-badge">
            <span className="pulse-dot" aria-hidden="true" /> Live
          </span>
        }
      />
      <div className="split">
        <div className="split-intro">{loading ? <Skeleton className="h-64 w-full" /> : <LatestReceipt chain={chain} polls={polls} />}</div>
        <div className="min-w-0">
          {loading ? (
            <ul className="grid-2" aria-label="Loading activity">
              {[0, 1, 2, 3].map((i) => (
                <li key={i} className="card">
                  <Skeleton className="h-3 w-1/4" />
                  <Skeleton className="mt-3 h-4 w-5/6" />
                  <Skeleton className="mt-3 h-3 w-1/2" />
                </li>
              ))}
            </ul>
          ) : failed ? (
            <EmptyState title="Recent activity isn't available right now. Polls and results still work." icon={<ActivityIcon />} testId="activity-unavailable" />
          ) : feed.length === 0 ? (
            <EmptyState title="It's quiet so far. Votes and new polls will appear here the moment they're on-chain." icon={<ActivityIcon />} testId="activity-empty">
              <Link to="/create" className="btn btn-primary">
                Create the first poll
              </Link>
            </EmptyState>
          ) : (
            <ul className="grid-2" data-testid="activity">
              {feed.map((item) => {
                const { headline, detail } = describe(item);
                return (
                  <li key={item.id} className={fresh.has(item.id) ? "note-in" : ""}>
                    <Link to={`/poll/${item.poll.id}`} className={`card note note-${item.kind}`} data-testid={`activity-${item.kind}`}>
                      <span className="note-top">
                        <span className={`note-kind note-kind-${item.kind}`}>{KIND_LABEL[item.kind]}</span>
                        {item.at !== null && <span className="note-time">{relativeTime(item.at, nowSec)}</span>}
                      </span>
                      <span className="note-text">{headline}</span>
                      <span className="note-meta">
                        {item.actor && item.kind === "vote" && <Identicon address={item.actor} size={14} />}
                        <span className={item.kind === "vote" ? "mono" : "truncate"}>{detail}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
