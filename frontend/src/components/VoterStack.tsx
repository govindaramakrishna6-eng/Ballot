import type { Address } from "viem";
import { shortAddress } from "../lib/format";
import { Identicon } from "./Identicon";

/** Overlapping wallet avatars of recent voters — participation you can see, all of it public on-chain. */
export function VoterStack({ voters, total }: { voters: Address[]; total: bigint }) {
  if (total === 0n) return null;
  const shown = voters.slice(0, 7);
  const more = Number(total) - shown.length;
  return (
    <div className="voter-stack" data-testid="voter-stack">
      <div className="voter-faces">
        {shown.map((a) => (
          <span key={a} className="voter-face" title={shortAddress(a)}>
            <Identicon address={a} size={26} />
          </span>
        ))}
        {more > 0 && <span className="voter-more mono">+{more}</span>}
      </div>
      <span className="muted text-sm">
        {total.toString()} {total === 1n ? "wallet has" : "wallets have"} voted
      </span>
    </div>
  );
}
