import { explorerTxUrl } from "../config/chains";
import { shortHash } from "../lib/format";
import { CopyButton } from "./CopyButton";
import { HashText } from "./HashText";

export function TxHash({ hash }: { hash: string }) {
  const url = explorerTxUrl(hash);
  return (
    <p className="mt-1 flex flex-wrap items-center gap-2 text-sm">
      <HashText value={shortHash(hash)} full={hash} testId="tx-hash" />
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
