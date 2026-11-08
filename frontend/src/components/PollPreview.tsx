import type { Address } from "viem";
import { formatCountdown, shortAddress } from "../lib/format";
import { Identicon } from "./Identicon";

/** How the poll will look once it's on-chain — same anatomy as a homepage card, but inert. */
export function PollPreview({
  title,
  options,
  creator,
  secondsLeft,
}: {
  title: string;
  options: string[];
  creator: Address | undefined;
  secondsLeft: number | null;
}) {
  const shownOptions = options.filter((o) => o.trim()).slice(0, 4);
  return (
    <div className="poll-card preview-card" data-testid="poll-preview" aria-label="Live preview of your poll">
      <div className="flex items-center justify-between gap-3">
        <span className="label label-open">Open</span>
        <span className="mono muted text-xs">{secondsLeft !== null && secondsLeft > 0 ? `${formatCountdown(secondsLeft)} left` : "—"}</span>
      </div>
      <p className="poll-card-title">{title.trim() || <span className="muted">Your question appears here</span>}</p>
      <p className="muted flex items-center gap-1.5 text-sm">
        by {creator ? <Identicon address={creator} size={16} /> : null}
        <span className="mono">{creator ? shortAddress(creator) : "your wallet"}</span>
      </p>
      <ul className="space-y-1.5 text-sm">
        {(shownOptions.length ? shownOptions : ["Option 1", "Option 2"]).map((o, i) => (
          <li key={i} className="preview-option">
            <span className="truncate">{o}</span>
            <span className="mono muted">0</span>
          </li>
        ))}
        {options.filter((o) => o.trim()).length > 4 && <li className="muted text-xs">+{options.filter((o) => o.trim()).length - 4} more</li>}
      </ul>
      <div className="poll-card-foot">
        <span className="mono text-sm">0 votes</span>
        <span className="btn btn-primary" aria-hidden="true">
          Vote
        </span>
      </div>
    </div>
  );
}

const STEPS = [
  ["Your wallet signs it", "No account or password — your wallet is your identity."],
  ["It's broadcast to Ethereum", "Thousands of independent computers receive it."],
  ["A block records it for good", "Usually within ~12 seconds. From then on it can't be edited."],
  ["Anyone can vote", "One vote per wallet, enforced by the contract — not by us."],
] as const;

export function OnChainSteps() {
  return (
    <ol className="chain-steps" aria-label="What happens when you create a poll">
      {STEPS.map(([title, body], i) => (
        <li key={title} className="chain-step">
          <span className="chain-step-n mono">{i + 1}</span>
          <div>
            <p className="font-semibold text-sm">{title}</p>
            <p className="muted text-xs">{body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
