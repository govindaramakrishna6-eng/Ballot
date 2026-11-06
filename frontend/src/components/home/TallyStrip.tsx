import type { Poll } from "../../contract/contract";
import { useChainClock } from "../../hooks/useChainClock";
import { useCountUp } from "../../hooks/useCountUp";
import { pollStatus } from "../../lib/status";

function Figure({ value, label }: { value: number; label: string }) {
  const shown = useCountUp(value);
  return (
    <div className="tally-cell">
      <dd className="tally-number tabular-nums">{shown.toLocaleString()}</dd>
      <dt className="tally-label">{label}</dt>
    </div>
  );
}

/** Three numbers read straight from the contract — the "front page figures". */
export function TallyStrip({ polls }: { polls: Poll[] | undefined }) {
  const { nowSec } = useChainClock();
  const all = polls ?? [];
  const open = all.filter((p) => pollStatus(p, nowSec) === "open").length;
  const votes = all.reduce((sum, p) => sum + Number(p.totalVotes), 0);
  return (
    <dl className="tally" aria-label="Totals on-chain" data-testid="tally">
      <Figure value={all.length} label="Polls created" />
      <Figure value={open} label="Open right now" />
      <Figure value={votes} label="Votes on the record" />
    </dl>
  );
}
