import { explorerAddressUrl, isLocalChain, targetChain } from "../config/chains";
import { deployment } from "../contract/contract";
import { shortAddress } from "../lib/format";
import { Identicon } from "./Identicon";

const GUARANTEES = [
  { title: "Immutable", body: "The rules are a deployed contract. Nobody can edit them — not even us." },
  { title: "No admin", body: "No owner key, no hidden switch. Votes can't be changed or deleted." },
  { title: "One wallet, one vote", body: "Enforced by the contract itself, not by this website." },
  { title: "Publicly verifiable", body: "Every vote is a public record anyone can audit." },
];

/** Why this isn't "just a poll": what the blockchain guarantees, and where to check it yourself. */
export function OnChainProof({ totalVotes }: { totalVotes: bigint }) {
  if (!deployment) return null;
  const contractUrl = explorerAddressUrl(deployment.address);
  return (
    <section className="proof" aria-labelledby="proof-title" data-testid="onchain-proof">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="proof-title" className="section-title">
          Verified on-chain
        </h2>
        <p className="mono muted text-xs">
          {totalVotes.toString()} public vote {totalVotes === 1n ? "record" : "records"} · {targetChain.name}
        </p>
      </div>
      <ul className="proof-grid">
        {GUARANTEES.map((g) => (
          <li key={g.title} className="proof-item">
            <svg viewBox="0 0 20 20" className="proof-icon" aria-hidden="true">
              <path d="M10 2.5 16 5v4.6c0 3.8-2.6 6.6-6 7.9-3.4-1.3-6-4.1-6-7.9V5l6-2.5Z" />
              <path d="M7.2 10.2 9.2 12.2 13 8.2" />
            </svg>
            <div>
              <p className="font-semibold">{g.title}</p>
              <p className="muted text-sm">{g.body}</p>
            </div>
          </li>
        ))}
      </ul>
      <p className="proof-contract">
        <Identicon address={deployment.address} size={22} />
        <span className="mono" title={deployment.address}>
          Contract {shortAddress(deployment.address)}
        </span>
        {contractUrl && (
          <>
            <a href={contractUrl} target="_blank" rel="noreferrer" className="link">
              View on Etherscan
            </a>
            {!isLocalChain && (
              <a
                href={`https://sourcify.dev/server/repo-ui/${targetChain.id}/${deployment.address}`}
                target="_blank"
                rel="noreferrer"
                className="link"
              >
                Read the verified source
              </a>
            )}
          </>
        )}
      </p>
    </section>
  );
}
