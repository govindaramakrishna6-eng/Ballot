import { explorerAddressUrl, targetChain } from "../config/chains";
import { deployment } from "../contract/contract";
import { useChainClock } from "../hooks/useChainClock";

/** The quiet place for network details: which chain, chain time, latest block, the contract. */
export function Footer() {
  const { nowSec, blockNumber } = useChainClock();
  const time = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(nowSec * 1000);
  const contractUrl = deployment ? explorerAddressUrl(deployment.address) : null;
  return (
    <footer className="site-footer">
      <div className="wrap flex flex-wrap items-center justify-between gap-3 py-6 text-xs">
        <p className="mono muted flex items-center gap-2" data-testid="network-indicator">
          <span className="pulse-dot" aria-hidden="true" />
          <span>
            {targetChain.name.replace(" Local", "")} • {time}
          </span>
          {blockNumber !== null && <span className="hidden sm:inline">• block {blockNumber.toLocaleString()}</span>}
        </p>
        {contractUrl && (
          <a href={contractUrl} target="_blank" rel="noreferrer" className="link muted">
            View the contract
          </a>
        )}
      </div>
    </footer>
  );
}
