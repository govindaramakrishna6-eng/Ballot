import { explorerTxUrl, targetChain } from "../config/chains";
import { formatDateTime } from "../lib/format";
import { CopyButton } from "./CopyButton";
import { HashText } from "./HashText";

export type ReceiptData = {
  pollId: bigint;
  pollTitle: string;
  choice: string;
  voter: string;
  txHash: string;
  blockNumber: bigint;
  timestamp: bigint;
};

/** The ballot receipt: everything someone needs to independently verify this vote on-chain. */
export function Receipt({ data, fresh = false }: { data: ReceiptData; fresh?: boolean }) {
  const url = explorerTxUrl(data.txHash);
  return (
    <section className={`receipt ${fresh ? "receipt-fresh" : ""}`} aria-labelledby="receipt-heading" data-testid="receipt">
      <h2 id="receipt-heading" className="receipt-title">
        Ballot receipt
      </h2>
      {fresh && (
        <p className="stamp" aria-hidden="true">
          Recorded
        </p>
      )}
      <dl className="receipt-grid">
        <dt>Poll</dt>
        <dd className="truncate" title={data.pollTitle}>
          #{data.pollId.toString()} · {data.pollTitle}
        </dd>
        <dt>Choice</dt>
        <dd className="break-words">{data.choice}</dd>
        <dt>Voter</dt>
        <dd className="mono break-all">{data.voter}</dd>
        <dt>Network</dt>
        <dd>
          {targetChain.name} (chain {targetChain.id})
        </dd>
        <dt>Block</dt>
        <dd className="mono tabular-nums" data-testid="receipt-block">
          {data.blockNumber.toString()}
        </dd>
        <dt>Time</dt>
        <dd>{formatDateTime(data.timestamp)}</dd>
        <dt>Tx hash</dt>
        <dd className="mono break-all" data-testid="receipt-hash">
          <HashText value={data.txHash} /> <CopyButton value={data.txHash} label="transaction hash" />
        </dd>
      </dl>
      <p className="receipt-foot">
        {url ? (
          <a href={url} target="_blank" rel="noreferrer" className="link">
            Verify on Etherscan
          </a>
        ) : (
          "Local chain — no public explorer."
        )}
      </p>
    </section>
  );
}
