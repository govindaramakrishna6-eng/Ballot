import type { Poll } from "../../contract/contract";
import type { ChainEvents } from "../../hooks/useActivity";
import { useChainClock } from "../../hooks/useChainClock";
import { useCountUp } from "../../hooks/useCountUp";
import { uniqueWallets } from "../../lib/activity";
import { pollStatus } from "../../lib/status";
import { SectionHead } from "./SectionHead";

function Stat({ value, label, plus = false }: { value: number; label: string; plus?: boolean }) {
  const shown = useCountUp(value);
  return (
    <div className="stat">
      <dd className="stat-number tabular-nums">
        {shown.toLocaleString()}
        {plus && <span title="Early history is beyond what the public network keeps, so this is a lower bound.">+</span>}
      </dd>
      <dt className="stat-label">{label}</dt>
    </div>
  );
}

/** Proof the platform is alive — every number read from the contract or its public log. */
export function NetworkStats({ polls, chain }: { polls: Poll[] | undefined; chain: ChainEvents | undefined }) {
  const { nowSec } = useChainClock();
  const all = polls ?? [];
  return (
    <section className="home-section" aria-labelledby="stats-title">
      <SectionHead id="stats-title" kicker="Live network stats" title="Ballot in numbers" />
      <dl className="stats" data-testid="stats">
        <Stat value={all.filter((p) => pollStatus(p, nowSec) === "open").length} label="Active open polls" />
        <Stat value={all.reduce((n, p) => n + Number(p.totalVotes), 0)} label="Total votes cast" />
        <Stat value={all.length} label="Total polls created" />
        <Stat value={uniqueWallets(all, chain?.events ?? [])} label="Unique wallets participating" plus={chain ? !chain.complete : false} />
      </dl>
    </section>
  );
}
