import { BallotIcon, VerifyIcon, WalletIcon } from "../icons";
import { SectionHead } from "./SectionHead";

const STEPS = [
  {
    icon: <WalletIcon />,
    title: "Connect your wallet",
    body: "MetaMask or any browser wallet. No sign-up, no password — your wallet is your identity.",
  },
  {
    icon: <BallotIcon />,
    title: "Create or vote in a poll",
    body: "Ask a question with 2–10 options, or cast your one vote on an open poll in a single click.",
  },
  {
    icon: <VerifyIcon />,
    title: "Verify results on Etherscan",
    body: "Every poll and vote is a public on-chain record. Check any result yourself — no trust required.",
  },
];

export function HowItWorks() {
  return (
    <section className="home-section" aria-labelledby="how-title" id="how-it-works">
      <SectionHead id="how-title" kicker="Three steps" title="How it works" />
      <ol className="grid-3">
        {STEPS.map((s, i) => (
          <li key={s.title} className="card step-card">
            <div className="flex items-center justify-between">
              <span className="icon-badge">{s.icon}</span>
              <span className="step-n mono" aria-hidden="true">
                0{i + 1}
              </span>
            </div>
            <h3 className="card-h3">{s.title}</h3>
            <p className="card-body">{s.body}</p>
          </li>
        ))}
      </ol>
      {/* Self-hosted (same origin, so the CSP needs no change). preload="none" keeps the homepage light:
          the 5 MB file only downloads when someone presses play. Captions are burned into the video. */}
      <figure className="card explainer" data-testid="explainer">
        <video
          className="explainer-video"
          controls
          preload="none"
          playsInline
          poster="/explainer-poster.jpg"
          width={1280}
          height={720}
          aria-label="Ballot explained in 2 minutes, with narration and on-screen captions"
          data-testid="explainer-video"
        >
          <source src="/ballot-explainer.mp4" type="video/mp4" />
          Your browser can't play this video.
        </video>
        <figcaption className="explainer-cap">
          <span className="mono">2:00</span> Watch the whole journey: create a poll, vote, get your receipt, and see the result.
        </figcaption>
      </figure>
    </section>
  );
}
