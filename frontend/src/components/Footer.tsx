import { Link } from "react-router";
import { explorerAddressUrl, isLocalChain, targetChain } from "../config/chains";
import { env } from "../config/env";
import { deployment } from "../contract/contract";
import { useChainClock } from "../hooks/useChainClock";
import { LogoMark } from "./LogoMark";

/**
 * Brand + transparency statement (left third), then "Product" and "Verify" link columns.
 * Optional links come from env vars; until they're set, each falls back to something real:
 * source → the verified contract source on Sourcify, docs/support → the FAQ.
 */
export function Footer() {
  const { nowSec, blockNumber } = useChainClock();
  const time = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(nowSec * 1000);
  const contractUrl = deployment ? explorerAddressUrl(deployment.address) : null;
  const sourcify = deployment && !isLocalChain ? `https://sourcify.dev/server/repo-ui/${targetChain.id}/${deployment.address}` : null;
  const source = env.sourceUrl ?? sourcify;
  const ext = (href: string) => (href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {});

  return (
    <footer className="site-footer">
      <div className="wrap footer-grid">
        <div className="footer-brand">
          <Link to="/" className="brand brand-lockup" aria-label="Ballot — home">
            <LogoMark size={28} />
            <span>Ballot</span>
          </Link>
          <p className="card-body mt-2">
            Every poll and vote lives in a public, immutable smart contract. We can't change results — and you never have to take our
            word for them.
          </p>
        </div>
        <nav aria-label="Footer: product" className="footer-col">
          <p className="footer-h">Product</p>
          <Link to="/polls">All polls</Link>
          <Link to="/results">Results</Link>
          <Link to="/create">Create a poll</Link>
          {env.docsUrl ? (
            <a href={env.docsUrl} {...ext(env.docsUrl)}>
              Documentation
            </a>
          ) : (
            <a href="/#how-it-works">Documentation</a>
          )}
          {env.supportUrl ? (
            <a href={env.supportUrl} {...ext(env.supportUrl)}>
              Support
            </a>
          ) : (
            <a href="/#faq">Support &amp; FAQ</a>
          )}
        </nav>
        <nav aria-label="Footer: verify" className="footer-col">
          <p className="footer-h">Verify</p>
          {contractUrl && (
            <a href={contractUrl} target="_blank" rel="noreferrer">
              Contract on Etherscan
            </a>
          )}
          {source && (
            <a href={source} target="_blank" rel="noreferrer" data-testid="footer-source">
              {env.sourceUrl ? "Source code on GitHub" : "Verified source code"}
            </a>
          )}
          <a href="/#security">How results are secured</a>
          <p className="network-status mono" data-testid="network-indicator">
            <span className="pulse-dot" aria-hidden="true" />
            <span>
              {targetChain.name.replace(" Local", "")} • {time}
            </span>
            {blockNumber !== null && <span>• block {blockNumber.toLocaleString()}</span>}
          </p>
        </nav>
      </div>
    </footer>
  );
}
