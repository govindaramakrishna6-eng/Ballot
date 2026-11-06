import { explorerTxUrl } from "../config/chains";
import { shortHash } from "../lib/format";
import { CopyButton } from "./CopyButton";

export function TxHash({ hash }: { hash: string }) {
  const url = explorerTxUrl(hash);
  return (
    <p className="mt-1 flex flex-wrap items-center gap-2 text-sm">
      <span className="mono" title={hash} data-testid="tx-hash">
        {shortHash(hash)}
      </span>
      <CopyButton value={hash} label="transaction hash" />
      {url ? (
        <a href={url} target="_blank" rel="noreferrer" className="link">
          View on Etherscan
        </a>
      ) : (
        <span className="muted">(local chain — no public explorer)</span>
      )}
    </p>
  );
}
