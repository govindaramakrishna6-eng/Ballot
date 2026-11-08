import { Link } from "react-router";
import { explorerTxUrl, targetChain } from "../../config/chains";
import type { Poll } from "../../contract/contract";
import type { ChainEvents } from "../../hooks/useActivity";
import { formatDateTime, shortAddress, shortHash } from "../../lib/format";
import { HashText } from "../HashText";
import { Identicon } from "../Identicon";

/**
 * The newest real vote on-chain, printed as a stamped paper receipt. The poll title opens the poll;
 * the footer link opens the transaction on Etherscan so anyone can check it independently.
 * Before any vote exists it shows a clearly marked specimen.
 */
export function LatestReceipt({ chain, polls }: { chain: ChainEvents | undefined; polls: Poll[] | undefined }) {
  const vote = chain?.events.find((e) => e.kind === "vote");
  const poll = vote ? polls?.find((p) => p.id === vote.pollId) : undefined;

  if (!vote || !poll) {
    return (
      <figure className="hero-receipt" aria-label="Example ballot receipt" data-testid="latest-receipt-specimen">
        <p className="stamp stamp-hero">Specimen</p>
        <p className="receipt-title">Ballot receipt</p>
        <dl className="receipt-grid">
          <dt>Poll</dt>
          <dd>Your question</dd>
          <dt>Choice</dt>
          <dd>Your answer</dd>
          <dt>Network</dt>
          <dd>{targetChain.name}</dd>
          <dt>Tx hash</dt>
          <dd className="mono">0x…</dd>
        </dl>
        <figcaption className="receipt-foot">Every vote gets a receipt like this.</figcaption>
      </figure>
    );
  }

  const time = chain?.times.get(vote.blockNumber);
  const url = explorerTxUrl(vote.txHash);
  return (
    <figure className="hero-receipt" aria-label="Latest ballot on-chain" data-testid="latest-receipt">
      <p className="stamp stamp-hero">Recorded</p>
      <p className="receipt-title">Latest ballot</p>
      <dl className="receipt-grid">
        <dt>Poll</dt>
        <dd className="truncate" title={poll.title}>
          <Link to={`/poll/${poll.id}`} className="link" data-testid="latest-receipt-poll">
            #{poll.id.toString()} · {poll.title}
          </Link>
        </dd>
        <dt>Choice</dt>
        <dd className="truncate" title={vote.optionIndex !== null ? poll.options[vote.optionIndex] : undefined}>
          {vote.optionIndex !== null ? poll.options[vote.optionIndex] : "—"}
        </dd>
        <dt>Voter</dt>
        <dd className="mono flex items-center gap-1.5" title={vote.actor ?? undefined}>
          {vote.actor && <Identicon address={vote.actor} size={16} />}
          {vote.actor ? shortAddress(vote.actor) : "—"}
        </dd>
        <dt>Block</dt>
        <dd className="mono tabular-nums">{vote.blockNumber.toLocaleString()}</dd>
        {time !== undefined && (
          <>
            <dt>Time</dt>
            <dd>{formatDateTime(time)}</dd>
          </>
        )}
        <dt>Tx hash</dt>
        <dd>
          <HashText value={shortHash(vote.txHash)} full={vote.txHash} />
        </dd>
      </dl>
      <figcaption className="receipt-foot">
        {url ? (
          <a href={url} target="_blank" rel="noreferrer" className="link" data-testid="latest-receipt-tx">
            Check it yourself on Etherscan
          </a>
        ) : (
          <Link to={`/poll/${poll.id}`} className="link">
            Open this poll
          </Link>
        )}
      </figcaption>
    </figure>
  );
}
