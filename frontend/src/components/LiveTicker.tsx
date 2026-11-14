import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { isLocalChain } from "../config/chains";
import type { Poll } from "../contract/contract";
import { useChainEvents } from "../hooks/useActivity";
import { useChainClock } from "../hooks/useChainClock";
import { usePollList } from "../hooks/usePolls";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { formatCountdown, shortAddress } from "../lib/format";
import { relativeTime } from "../lib/relativeTime";
import { computeResults } from "../lib/results";
import { pollStatus } from "../lib/status";

const SPEED_PX_PER_SEC = 42;

type Item = { key: string; node: React.ReactNode };

function trimTitle(t: string, max = 38) {
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

/** Remembers each poll's vote total so an increase can show ▲ for a while, like a price tick. */
function useVoteDeltas(polls: Poll[] | undefined) {
  const last = useRef(new Map<string, bigint>());
  const [up, setUp] = useState<Map<string, number>>(new Map());
  useEffect(() => {
    if (!polls) return;
    const now = Date.now();
    const next = new Map(up);
    let changed = false;
    for (const p of polls) {
      const id = p.id.toString();
      const before = last.current.get(id);
      if (before !== undefined && p.totalVotes > before) {
        next.set(id, now);
        changed = true;
      }
      last.current.set(id, p.totalVotes);
    }
    if (changed) setUp(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only new poll data should re-run this
  }, [polls]);
  return (id: bigint) => {
    const at = up.get(id.toString());
    return at !== undefined && Date.now() - at < 60_000;
  };
}

/**
 * A market-tape style ticker running right → left: the newest blocks as they're mined, open polls
 * with their current leader and vote count (▲ when votes just came in), and the latest votes.
 * Pauses on hover/focus. With reduced motion it's a still, horizontally scrollable row.
 */
export function LiveTicker() {
  const { nowSec, recentBlocks } = useChainClock();
  const polls = usePollList();
  const chain = useChainEvents();
  const rising = useVoteDeltas(polls.data);
  const reduce = useReducedMotion();

  const items: Item[] = [];
  for (const b of recentBlocks.slice(0, 4)) {
    const label = (
      <>
        <span className="tk-tag">Block</span>
        <span className="mono">#{b.number.toLocaleString()}</span>
        <span className="tk-muted">
          {b.txCount} {b.txCount === 1 ? "tx" : "txs"} · {relativeTime(b.timestamp, nowSec)}
        </span>
      </>
    );
    items.push({
      key: `b${b.number}`,
      node: isLocalChain ? (
        <span className="tk-item">{label}</span>
      ) : (
        <a className="tk-item" href={`https://sepolia.etherscan.io/block/${b.number}`} target="_blank" rel="noreferrer">
          {label}
        </a>
      ),
    });
  }
  const open = (polls.data ?? [])
    .filter((p) => pollStatus(p, nowSec) === "open")
    .sort((a, b) => (b.totalVotes > a.totalVotes ? 1 : b.totalVotes < a.totalVotes ? -1 : 0))
    .slice(0, 8);
  for (const p of open) {
    const r = computeResults(p.options, p.voteCounts);
    const lead = r.noVotes ? "no votes yet" : r.tied ? "tied" : `${trimTitle(p.options[r.leader!], 18)} ${r.rows[r.leader!].percent}%`;
    const isUp = rising(p.id);
    items.push({
      key: `p${p.id}`,
      node: (
        <Link className="tk-item" to={`/poll/${p.id}`}>
          <span className="tk-tag tk-tag-poll">#{p.id.toString()}</span>
          <span>{trimTitle(p.title)}</span>
          <span className="tk-lead">{lead}</span>
          <span className={`tk-delta ${isUp ? "tk-up" : ""}`}>
            {isUp ? "▲ " : ""}
            {p.totalVotes.toString()} {p.totalVotes === 1n ? "vote" : "votes"}
          </span>
          <span className="tk-muted">{formatCountdown(Number(p.endTime) - nowSec)} left</span>
        </Link>
      ),
    });
  }
  const pollById = new Map((polls.data ?? []).map((p) => [p.id, p]));
  for (const e of (chain.data?.events ?? []).filter((x) => x.kind === "vote").slice(0, 4)) {
    const p = pollById.get(e.pollId);
    if (!p) continue;
    items.push({
      key: e.id,
      node: (
        <Link className="tk-item" to={`/poll/${p.id}`}>
          <span className="tk-tag tk-tag-vote">Vote</span>
          <span className="mono">{e.actor ? shortAddress(e.actor) : "a wallet"}</span>
          <span className="tk-muted">on</span>
          <span>{trimTitle(p.title, 30)}</span>
        </Link>
      ),
    });
  }

  // Seamless loop: the track holds the items twice and moves left by exactly one copy's width.
  const track = useRef<HTMLDivElement>(null);
  const firstCopy = useRef<HTMLDivElement>(null);
  const offset = useRef(0);
  const paused = useRef(false);
  useEffect(() => {
    if (reduce) return;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(64, now - last) / 1000; // clamp after a background tab
      last = now;
      const width = firstCopy.current?.offsetWidth ?? 0;
      if (!paused.current && width > 0) {
        offset.current -= SPEED_PX_PER_SEC * dt;
        if (-offset.current >= width) offset.current += width;
        if (track.current) track.current.style.transform = `translate3d(${offset.current}px,0,0)`;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [reduce]);

  if (items.length === 0) return null;
  const copy = (hidden: boolean, ref?: React.Ref<HTMLDivElement>) => (
    <div className="tk-copy" ref={ref} aria-hidden={hidden || undefined} {...(hidden ? { inert: true } : {})}>
      {items.map((it) => (
        <span key={it.key} className="tk-slot">
          {it.node}
          <span className="tk-sep" aria-hidden="true">
            ◆
          </span>
        </span>
      ))}
    </div>
  );

  return (
    <div
      className={`ticker ${reduce ? "ticker-still" : ""}`}
      role="region"
      aria-label="Live activity ticker"
      data-testid="live-ticker"
      onMouseEnter={() => (paused.current = true)}
      onMouseLeave={() => (paused.current = false)}
      onFocus={() => (paused.current = true)}
      onBlur={() => (paused.current = false)}
    >
      <span className="tk-live mono" aria-hidden="true">
        <span className="pulse-dot" /> Live
      </span>
      <div className="tk-window">
        <div className="tk-track" ref={track}>
          {copy(false, firstCopy)}
          {!reduce && copy(true)}
        </div>
      </div>
    </div>
  );
}
