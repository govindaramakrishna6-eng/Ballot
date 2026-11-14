import { useState } from "react";
import { isLocalChain, targetChain } from "../../config/chains";
import type { ChainEvents } from "../../hooks/useActivity";
import { useChainClock } from "../../hooks/useChainClock";
import { relativeTime } from "../../lib/relativeTime";

const TILES = 9;

/**
 * The chain as a row of boxes: the newest blocks slide in from the right as they're produced; blocks
 * carrying Ballot activity are filled green. Hover (or keyboard focus) lifts a block and shows what's
 * in it. The page is reading a public ledger, not a server — this makes that visible.
 */
export function BlockRibbon({ chain }: { chain: ChainEvents | undefined }) {
  const { blockNumber, recentBlocks, nowSec } = useChainClock();

  // Keep the last TILES block numbers; new ones are appended when the clock sees a newer block.
  const [blocks, setBlocks] = useState<bigint[]>([]);
  const [seenLatest, setSeenLatest] = useState<bigint | null>(null);
  if (blockNumber !== null && blockNumber !== seenLatest) {
    setSeenLatest(blockNumber);
    const from = seenLatest === null || blockNumber - seenLatest > BigInt(TILES) ? blockNumber - BigInt(TILES - 1) : seenLatest + 1n;
    const added: bigint[] = [];
    for (let n = from < 0n ? 0n : from; n <= blockNumber; n++) added.push(n);
    setBlocks((prev) => [...prev, ...added].slice(-TILES));
  }

  const ballot = new Map<bigint, { votes: number; polls: number }>();
  for (const e of chain?.events ?? []) {
    const b = ballot.get(e.blockNumber) ?? { votes: 0, polls: 0 };
    if (e.kind === "vote") b.votes++;
    else if (e.kind === "created") b.polls++;
    ballot.set(e.blockNumber, b);
  }
  const summary = new Map(recentBlocks.map((b) => [b.number, b]));
  const latest = blocks.at(-1);

  return (
    <div className="ribbon" role="group" aria-label={`Live ${targetChain.name} blocks`} data-testid="block-ribbon">
      <span className="ribbon-label mono">
        <span className="pulse-dot" aria-hidden="true" /> Live blocks
      </span>
      <ol className="ribbon-blocks">
        {blocks.map((n) => {
          const b = ballot.get(n);
          const s = summary.get(n);
          const has = Boolean(b && (b.votes || b.polls));
          const parts = [
            s ? `${s.txCount} ${s.txCount === 1 ? "transaction" : "transactions"}` : null,
            b?.votes ? `${b.votes} Ballot ${b.votes === 1 ? "vote" : "votes"}` : null,
            b?.polls ? `${b.polls} new ${b.polls === 1 ? "poll" : "polls"}` : null,
            s ? relativeTime(s.timestamp, nowSec) : null,
          ].filter(Boolean);
          const label = `Block ${n.toLocaleString()}${parts.length ? ` — ${parts.join(", ")}` : ""}`;
          const face = (
            <>
              <span className="tile-num">#{n.toString().slice(-4)}</span>
              {has && <span className="tile-mark">Ballot</span>}
              {/* hover / focus card */}
              <span className="tile-tip" role="tooltip">
                <strong className="mono">Block {n.toLocaleString()}</strong>
                {parts.length ? parts.map((p) => <span key={p}>{p}</span>) : <span>On the public ledger</span>}
                {!isLocalChain && <span className="tile-tip-link">Open on Etherscan ↗</span>}
              </span>
            </>
          );
          return (
            <li key={n.toString()} className={`tile ${has ? "tile-ballot" : ""} ${n === latest ? "tile-latest" : ""}`} data-block={n.toString()}>
              {isLocalChain ? (
                <span tabIndex={0} aria-label={label}>
                  {face}
                </span>
              ) : (
                <a href={`https://sepolia.etherscan.io/block/${n}`} target="_blank" rel="noreferrer" aria-label={label}>
                  {face}
                </a>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
