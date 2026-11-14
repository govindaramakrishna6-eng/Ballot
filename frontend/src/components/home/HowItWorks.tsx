import { BallotIcon, VerifyIcon, WalletIcon } from "../icons";
import { Link } from "react-router";
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
      <SectionHead
        id="how-title"
        kicker="Three steps"
        title="How it works"
        action={
          <Link to="/watch" className="link text-sm" data-testid="watch-link">
            Watch the 2-minute video
          </Link>
        }
      />
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
    </section>
  );
}
