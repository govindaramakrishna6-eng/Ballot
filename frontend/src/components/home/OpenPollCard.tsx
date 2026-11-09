import { useState } from "react";
import { Link } from "react-router";
import type { Poll } from "../../contract/contract";
import { useChainClock } from "../../hooks/useChainClock";
import { useEnsName } from "../../hooks/useEnsName";
import { formatCountdown, formatDateTime, pluralVotes, shortAddress } from "../../lib/format";
import { pollUrl } from "../../lib/share";
import { displayStatus } from "../../lib/status";
import { Identicon } from "../Identicon";
import { ClockIcon, LinkIcon } from "../icons";
import { StatusPill } from "../StatusPill";

/** A poll as a card: question, who asked, how long is left, how many voted, and one clear action. */
export function OpenPollCard({ poll, myVote }: { poll: Poll; myVote: number | undefined }) {
  const { nowSec } = useChainClock();
  const { data: ens } = useEnsName(poll.creator);
  const [copied, setCopied] = useState(false);
  const status = displayStatus(poll, nowSec);
  const open = status === "open" || status === "closing-soon";
  const canVote = open && !myVote;
  const left = Number(poll.endTime) - nowSec;

  async function copy() {
    try {
      await navigator.clipboard.writeText(pollUrl(poll.id));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  }

  return (
    <li className="card poll-card" data-testid="open-poll-card" data-poll-id={poll.id.toString()}>
      <div className="flex items-center justify-between gap-3">
        <StatusPill status={status} />
        {open ? (
          // Countdown badge: quiet normally, highlighted in the last 3 hours.
          <span className={`countdown ${status === "closing-soon" ? "countdown-soon" : ""}`} title={`Closes ${formatDateTime(poll.endTime)}`} data-testid="countdown-badge">
            <ClockIcon className="icon-xs" />
            {formatCountdown(left)} left
          </span>
        ) : (
          <span className="mono muted text-xs">Closed {formatDateTime(poll.endTime)}</span>
        )}
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
        <span className="flex items-center gap-2 text-sm">
          <span className="mono tabular-nums">{pluralVotes(poll.totalVotes)}</span>
          {myVote ? (
            <span className="label" data-testid="my-vote-mark">
              You voted
            </span>
          ) : null}
        </span>
        <span className="flex items-center gap-1.5">
          <button type="button" className="icon-btn" onClick={copy} aria-label={`Copy link to ${poll.title}`} title={copied ? "Copied" : "Copy link"}>
            <LinkIcon className="icon-sm" />
            <span className="sr-only">{copied ? "Copied" : ""}</span>
          </button>
          <Link
            to={`/poll/${poll.id}`}
            className={`btn ${canVote ? "btn-primary" : "btn-secondary"}`}
            aria-label={`${canVote ? "Vote" : "View poll"}: ${poll.title}`}
          >
            {canVote ? "Vote" : "View poll"}
          </Link>
        </span>
      </div>
    </li>
  );
}
