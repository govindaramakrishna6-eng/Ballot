import { Link } from "react-router";
import { targetChain } from "../../config/chains";
import type { Poll } from "../../contract/contract";
import type { ActivityItem } from "../../hooks/useActivity";
import { useChainClock } from "../../hooks/useChainClock";
import { formatDateTime } from "../../lib/format";
import { LatestReceipt } from "./LatestReceipt";

/**
 * Front page set like a civic gazette: a dateline fed by the live chain, one plain claim,
 * and — as the "illustration" — the most recent real ballot receipt on-chain.
 */
export function Masthead({ polls, activity }: { polls: Poll[] | undefined; activity: ActivityItem[] | undefined }) {
  const { nowSec, blockNumber } = useChainClock();
  return (
    <section className="masthead" aria-labelledby="masthead-title">
      <p className="dateline mono">
        <span>{targetChain.name} edition</span>
        <span aria-hidden="true">·</span>
        <span className="pulse-dot" aria-hidden="true" />
        <span data-testid="dateline-block">{blockNumber !== null ? `Block ${blockNumber.toLocaleString()}` : "Connecting…"}</span>
        <span aria-hidden="true">·</span>
        <span>{formatDateTime(nowSec)}</span>
      </p>
      <div className="masthead-grid">
        <div>
          <h1 id="masthead-title" className="headline">
            Every vote leaves a <em>receipt</em>.
          </h1>
          <p className="standfirst">
            Ask a question, let each wallet answer once, and keep proof anyone can check on the public blockchain — no
            accounts, no admins, no recounts.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/create" className="btn btn-primary btn-lg">
              Create a poll
            </Link>
            <a href="#polls" className="btn btn-secondary btn-lg">
              Browse polls
            </a>
          </div>
        </div>
        <LatestReceipt polls={polls} activity={activity} />
      </div>
    </section>
  );
}
