import { Link } from "react-router";
import { explorerAddressUrl, explorerTxUrl } from "../../config/chains";
import { deployment, type Poll } from "../../contract/contract";
import type { ChainEvents } from "../../hooks/useActivity";
import { useChainClock } from "../../hooks/useChainClock";
import { formatCountdown, formatDateTime, pluralVotes, shortAddress } from "../../lib/format";
import { computeResults } from "../../lib/results";
import { pickFeatured } from "../../lib/rank";
import { displayStatus } from "../../lib/status";
import { Identicon } from "../Identicon";
import { BallotIcon, ClockIcon } from "../icons";
import { PollActions } from "../PollActions";
import { Skeleton } from "../Skeleton";
import { EmptyState } from "../States";
import { StatusPill } from "../StatusPill";
import { SectionHead } from "./SectionHead";

export function FeaturedPoll({ polls, chain, loading }: { polls: Poll[] | undefined; chain: ChainEvents | undefined; loading: boolean }) {
  const { nowSec } = useChainClock();
  const poll = polls ? pickFeatured(polls, nowSec) : null;

  return (
    <section className="home-section" aria-labelledby="featured-title">
      <SectionHead id="featured-title" kicker="Spotlight" title="Featured poll" />
      {loading ? (
        <div className="featured-card grid-3">
          <div className="card featured-main">
            <Skeleton className="h-8 w-5/6" />
            <Skeleton className="mt-6 h-4 w-full" />
            <Skeleton className="mt-3 h-4 w-full" />
          </div>
          <div className="card featured-side">
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      ) : !poll ? (
        <EmptyState title="No polls yet — yours could be the first one featured here." icon={<BallotIcon />} testId="featured-empty">
          <Link to="/create" className="btn btn-primary">
            Create the first poll
          </Link>
        </EmptyState>
      ) : (
        <FeaturedCard poll={poll} chain={chain} nowSec={nowSec} />
      )}
    </section>
  );
}

function FeaturedCard({ poll, chain, nowSec }: { poll: Poll; chain: ChainEvents | undefined; nowSec: number }) {
  const status = displayStatus(poll, nowSec);
  const open = status === "open" || status === "closing-soon";
  const r = computeResults(poll.options, poll.voteCounts);
  // Link to the poll's own creation transaction when it's in the readable log window, else the contract.
  const createdTx = chain?.events.find((e) => e.kind === "created" && e.pollId === poll.id)?.txHash;
  const etherscan = createdTx ? explorerTxUrl(createdTx) : deployment ? explorerAddressUrl(deployment.address) : null;

  return (
    <article className="featured-card grid-3" data-testid="featured-poll" data-poll-id={poll.id.toString()}>
      <div className="card featured-main">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill status={status} />
          <span className="mono muted text-xs">Poll #{poll.id.toString()}</span>
        </div>
        <h3 className="featured-question">
          <Link to={`/poll/${poll.id}`}>{poll.title}</Link>
        </h3>
        <p className="muted flex items-center gap-1.5 text-sm">
          by <Identicon address={poll.creator} size={16} />
          <span className="mono" title={poll.creator}>
            {shortAddress(poll.creator)}
          </span>
        </p>
        <ol className="featured-bars" aria-label="Current results">
          {r.rows.map((row) => (
            <li key={row.index}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="truncate" title={row.label}>
                  {row.label}
                  {status === "closed" && r.leader === row.index && <span className="label label-stamp ml-2">Winner</span>}
                </span>
                <span className="mono tabular-nums">
                  {row.count.toString()} · {row.percent === null ? "—" : `${row.percent}%`}
                </span>
              </div>
              <div className="bar-track mt-1" aria-hidden="true">
                <div className="bar-fill" style={{ width: `${row.percent ?? 0}%` }} />
              </div>
            </li>
          ))}
        </ol>
      </div>

      <aside className="card featured-side" aria-label="Poll details">
        <dl className="featured-facts">
          <div>
            <dt>Total votes</dt>
            <dd className="featured-number tabular-nums" data-testid="featured-total">
              {r.total.toString()}
            </dd>
          </div>
          <div>
            <dt>{open ? "Time remaining" : "Closed"}</dt>
            <dd className={`featured-time ${status === "closing-soon" ? "is-soon" : ""}`}>
              <ClockIcon className="icon-sm" />
              <span className="mono" data-testid="featured-countdown">
                {open ? formatCountdown(Number(poll.endTime) - nowSec) : formatDateTime(poll.endTime)}
              </span>
            </dd>
          </div>
        </dl>
        <Link to={`/poll/${poll.id}`} className="btn btn-primary btn-lg btn-block" data-testid="featured-cta">
          {open ? "Vote now" : "View results"}
        </Link>
        <p className="muted text-center text-xs">{r.noVotes ? "No votes yet — be the first." : `${pluralVotes(r.total)} recorded on-chain`}</p>
        {etherscan && (
          <a href={etherscan} target="_blank" rel="noreferrer" className="link text-center text-sm" data-testid="featured-etherscan">
            View on Etherscan
          </a>
        )}
        <div className="featured-share">
          <PollActions poll={poll} exportable={false} />
        </div>
      </aside>
    </article>
  );
}
