import { Link } from "react-router";
import { isLocalChain, targetChain } from "../../config/chains";
import { ChainIcon, EyeIcon, LockIcon, VerifyIcon } from "../icons";

const TRUST = [
  { icon: <ChainIcon className="icon-xs" />, label: `Built on ${isLocalChain ? "a local chain" : targetChain.name}` },
  { icon: <VerifyIcon className="icon-xs" />, label: "Verified contract" },
  { icon: <EyeIcon className="icon-xs" />, label: "On-chain results" },
  { icon: <LockIcon className="icon-xs" />, label: "No admin controls" },
];

/** Headline, one line of what you can do, the primary + secondary action, then trust badges. */
export function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-inner">
        {/* U+2011 non-breaking hyphen keeps "tamper‑proof" on one line */}
        <h1 id="hero-title" className="hero-title">
          Verifiable, tamper‑proof voting
        </h1>
        <p className="hero-sub">Create polls, vote with your wallet, and see transparent on-chain results.</p>
        <div className="hero-ctas">
          <Link to="/create" className="btn btn-primary btn-lg">
            Create a poll
          </Link>
          <a href="#polls" className="btn btn-secondary btn-lg">
            Browse polls
          </a>
        </div>
        <ul className="trust-chips" aria-label="Guarantees">
          {TRUST.map((t) => (
            <li key={t.label} className="trust-chip">
              {t.icon}
              {t.label}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
