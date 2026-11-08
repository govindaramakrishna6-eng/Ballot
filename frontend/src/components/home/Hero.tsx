import { Link } from "react-router";
import type { ChainEvents } from "../../hooks/useActivity";
import { BlockRibbon } from "./BlockRibbon";

const TRUST = ["Immutable contract", "No admins", "One wallet, one vote", "Publicly verifiable"];

/** One sentence of what it is, one of what you can do, two ways in — and the live chain beneath. */
export function Hero({ chain }: { chain: ChainEvents | undefined }) {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-inner">
        {/* U+2011 non-breaking hyphen keeps "tamper‑proof" on one line */}
        <h1 id="hero-title" className="hero-title">
          Verifiable, tamper‑proof voting
        </h1>
        <p className="hero-sub">Create polls, vote with your wallet, and see transparent on-chain results.</p>
        <ul className="trust-chips" aria-label="Guarantees">
          {TRUST.map((t) => (
            <li key={t} className="trust-chip">
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M3.5 8.5 6.5 11.5 12.5 5" />
              </svg>
              {t}
            </li>
          ))}
        </ul>
        <div className="hero-ctas">
          <Link to="/create" className="btn btn-primary btn-lg">
            Create a poll
          </Link>
          <a href="#open-polls" className="btn btn-secondary btn-lg">
            Browse polls
          </a>
        </div>
        <BlockRibbon chain={chain} />
      </div>
    </section>
  );
}
