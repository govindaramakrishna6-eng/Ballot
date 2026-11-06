import { Link } from "react-router";

/** One sentence of what it is, one of what you can do, two ways in. Centred in the first screen. */
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
          <a href="#open-polls" className="btn btn-secondary btn-lg">
            Browse polls
          </a>
        </div>
      </div>
    </section>
  );
}
