import { useState } from "react";
import { isLocalChain, targetChain } from "../../config/chains";
import type { ChainEvents } from "../../hooks/useActivity";
import { useChainClock } from "../../hooks/useChainClock";

const TILES = 9;

/**
 * The chain, visibly moving: the newest blocks slide in from the right as they're produced, and any
 * block that carries Ballot transactions is stamped. It's the clearest "this is decentralised" cue —
 * the page is reading a public ledger, not a server.
 */
export function BlockRibbon({ chain }: { chain: ChainEvents | undefined }) {
  const { blockNumber } = useChainClock();

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

  const ballotTxs = new Map<bigint, number>();
  for (const e of chain?.events ?? []) ballotTxs.set(e.blockNumber, (ballotTxs.get(e.blockNumber) ?? 0) + 1);

  return (
    <div className="ribbon" aria-label={`Live ${targetChain.name} blocks`} data-testid="block-ribbon">
      <span className="ribbon-label mono">
        <span className="pulse-dot" aria-hidden="true" /> Live blocks
      </span>
      <ol className="ribbon-blocks">
        {blocks.map((n) => {
          const count = ballotTxs.get(n) ?? 0;
          const label = `Block ${n.toLocaleString()}${count ? ` — ${count} Ballot ${count === 1 ? "event" : "events"}` : ""}`;
          const tile = (
            <>
              <span className="tile-num">#{n.toString().slice(-4)}</span>
              {count > 0 && <span className="tile-mark">Ballot</span>}
            </>
          );
          return (
            <li key={n.toString()} className={`tile ${count ? "tile-ballot" : ""}`} data-block={n.toString()}>
              {isLocalChain ? (
                <span title={label}>{tile}</span>
              ) : (
                <a href={`https://sepolia.etherscan.io/block/${n}`} target="_blank" rel="noreferrer" title={label} aria-label={label}>
                  {tile}
                </a>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
