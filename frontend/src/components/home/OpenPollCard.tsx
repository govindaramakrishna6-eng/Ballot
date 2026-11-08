import { Link } from "react-router";
import type { Poll } from "../../contract/contract";
import { useChainClock } from "../../hooks/useChainClock";
import { useEnsName } from "../../hooks/useEnsName";
import { formatCountdown, formatDateTime, pluralVotes, shortAddress } from "../../lib/format";
import { displayStatus } from "../../lib/status";
import { Identicon } from "../Identicon";
import { StatusPill } from "../StatusPill";

/** A poll as a card: question, who asked, how long is left, how many voted, and one clear action. */
export function OpenPollCard({ poll, myVote }: { poll: Poll; myVote: number | undefined }) {
  const { nowSec } = useChainClock();
  const { data: ens } = useEnsName(poll.creator);
  const status = displayStatus(poll, nowSec);
  const open = status === "open" || status === "closing-soon";
  const canVote = open && !myVote;
  const left = Number(poll.endTime) - nowSec;

  return (
    <li className="poll-card" data-testid="open-poll-card" data-poll-id={poll.id.toString()}>
      <div className="flex items-center justify-between gap-3">
        <StatusPill status={status} />
        <span className="mono muted text-xs" title={`Closes ${formatDateTime(poll.endTime)}`}>
          {open ? `${formatCountdown(left)} left` : `Closed ${formatDateTime(poll.endTime)}`}
        </span>
      </div>
      <h3 className="poll-card-title" title={poll.title}>
        <Link to={`/poll/${poll.id}`}>{poll.title}</Link>
      </h3>
      <p className="muted flex items-center gap-1.5 text-sm">
        by <Identicon address={poll.creator} size={16} />
        <span className={ens ? "" : "mono"} title={poll.creator}>
          {ens ?? shortAddress(poll.creator)}
        </span>
      </p>
      <div className="poll-card-foot">
        <span className="text-sm">
          <span className="mono tabular-nums">{pluralVotes(poll.totalVotes)}</span>
          {myVote ? (
            <span className="label ml-2" data-testid="my-vote-mark">
              You voted
            </span>
          ) : null}
        </span>
        <Link to={`/poll/${poll.id}`} className={`btn ${canVote ? "btn-primary" : "btn-secondary"}`} aria-label={`${canVote ? "Vote" : "View poll"}: ${poll.title}`}>
          {canVote ? "Vote" : "View poll"}
        </Link>
      </div>
    </li>
  );
}
