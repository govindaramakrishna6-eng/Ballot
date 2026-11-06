import { Link } from "react-router";
import { explorerTxUrl, targetChain } from "../../config/chains";
import type { Poll } from "../../contract/contract";
import type { ActivityItem } from "../../hooks/useActivity";
import { formatDateTime, shortAddress, shortHash } from "../../lib/format";

/**
 * The hero image is real data: the newest vote on-chain, printed as a receipt.
 * Before any vote exists it shows a clearly marked specimen instead.
 */
export function LatestReceipt({ polls, activity }: { polls: Poll[] | undefined; activity: ActivityItem[] | undefined }) {
  const vote = activity?.find((a) => a.kind === "vote");
  const poll = vote ? polls?.find((p) => p.id === vote.pollId) : undefined;

  if (!vote || !poll) {
    return (
      <figure className="hero-receipt" aria-label="Example ballot receipt">
        <p className="stamp stamp-hero">Specimen</p>
        <p className="receipt-title">Ballot receipt</p>
        <dl className="receipt-grid">
          <dt>Poll</dt>
          <dd>#— · Your question here</dd>
          <dt>Choice</dt>
          <dd>Your answer</dd>
          <dt>Network</dt>
          <dd>{targetChain.name}</dd>
          <dt>Block</dt>
          <dd className="mono">—</dd>
          <dt>Tx hash</dt>
          <dd className="mono">0x…</dd>
        </dl>
        <figcaption className="receipt-foot">What you get after you vote.</figcaption>
      </figure>
    );
  }

  const url = explorerTxUrl(vote.txHash);
  return (
    <figure className="hero-receipt" aria-label="Most recent ballot receipt on-chain" data-testid="hero-receipt">
      <p className="stamp stamp-hero">Recorded</p>
      <p className="receipt-title">Latest ballot</p>
      <dl className="receipt-grid">
        <dt>Poll</dt>
        <dd className="truncate" title={poll.title}>
          <Link to={`/poll/${poll.id}`} className="link">
            #{poll.id.toString()} · {poll.title}
          </Link>
        </dd>
        <dt>Choice</dt>
        <dd className="truncate">{vote.optionIndex !== null ? poll.options[vote.optionIndex] : "—"}</dd>
        <dt>Voter</dt>
        <dd className="mono" title={vote.actor ?? ""}>
          {vote.actor ? shortAddress(vote.actor) : "—"}
        </dd>
        <dt>Block</dt>
        <dd className="mono tabular-nums">{vote.blockNumber.toLocaleString()}</dd>
        {vote.timestamp !== null && (
          <>
            <dt>Time</dt>
            <dd>{formatDateTime(vote.timestamp)}</dd>
          </>
        )}
        <dt>Tx hash</dt>
        <dd className="mono" title={vote.txHash}>
          {shortHash(vote.txHash)}
        </dd>
      </dl>
      <figcaption className="receipt-foot">
        {url ? (
          <a href={url} target="_blank" rel="noreferrer" className="link">
            Check it yourself on Etherscan
          </a>
        ) : (
          "Local chain — no public explorer."
        )}
      </figcaption>
    </figure>
  );
}
