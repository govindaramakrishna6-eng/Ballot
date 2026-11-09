import { explorerAddressUrl, isLocalChain, targetChain } from "../../config/chains";
import { deployment } from "../../contract/contract";
import { shortAddress } from "../../lib/format";
import { Identicon } from "../Identicon";
import { ChainIcon, EyeIcon, KeyIcon, LockIcon } from "../icons";

const POINTS = [
  { icon: <ChainIcon />, title: "Votes are recorded on-chain", body: "Each vote is a transaction stored on Ethereum's public ledger, not in our database." },
  { icon: <EyeIcon />, title: "Independently verifiable", body: "Anyone can check any poll or vote on Etherscan — the counts here are read straight from the contract." },
  { icon: <LockIcon />, title: "Immutable, no admin controls", body: "The contract has no owner and no upgrade switch. Nobody can edit, delete or recount votes." },
  { icon: <KeyIcon />, title: "You keep custody", body: "You connect your own wallet and sign each action yourself. Ballot never holds keys or funds." },
];

/** "Why you can trust the results" — intro on the left third, four points on the right two-thirds. */
export function TrustSection() {
  const url = deployment ? explorerAddressUrl(deployment.address) : null;
  return (
    <section className="home-section" aria-labelledby="trust-title" id="security">
      <div className="split">
        <div className="split-intro">
          <p className="kicker">Security &amp; transparency</p>
          <h2 id="trust-title" className="home-h2">
            Why you can trust the results
          </h2>
          <p className="card-body mt-3">
            Ballot is a thin, open window onto a public contract. Everything you see can be checked without trusting us.
          </p>
          {deployment && (
            <p className="contract-chip">
              <Identicon address={deployment.address} size={20} />
              <span className="mono" title={deployment.address}>
                {shortAddress(deployment.address)}
              </span>
              {url ? (
                <a href={url} target="_blank" rel="noreferrer" className="link">
                  Contract on Etherscan
                </a>
              ) : (
                <span className="muted">{targetChain.name}</span>
              )}
              {!isLocalChain && (
                <a href={`https://sourcify.dev/server/repo-ui/${targetChain.id}/${deployment.address}`} target="_blank" rel="noreferrer" className="link">
                  Verified source
                </a>
              )}
            </p>
          )}
        </div>
        <ul className="grid-2" data-testid="trust-points">
          {POINTS.map((p) => (
            <li key={p.title} className="card trust-card">
              <span className="icon-badge">{p.icon}</span>
              <h3 className="card-h3">{p.title}</h3>
              <p className="card-body">{p.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
