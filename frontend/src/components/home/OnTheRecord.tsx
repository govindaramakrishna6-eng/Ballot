import { useState } from "react";
import { Link } from "react-router";
import { explorerTxUrl } from "../../config/chains";
import type { Poll } from "../../contract/contract";
import type { ActivityItem } from "../../hooks/useActivity";
import { useChainClock } from "../../hooks/useChainClock";
import { shortAddress } from "../../lib/format";
import { relativeTime } from "../../lib/relativeTime";
import { Skeleton } from "../Skeleton";

function describe(item: ActivityItem, poll: Poll | undefined) {
  const title = poll?.title ?? `Poll #${item.pollId}`;
  if (item.kind === "vote") {
    const choice = poll && item.optionIndex !== null ? poll.options[item.optionIndex] : undefined;
    return { verb: "voted", detail: choice ? `“${choice}” in ${title}` : `in ${title}` };
  }
  if (item.kind === "created") return { verb: "opened", detail: title };
  return { verb: "cancelled", detail: title };
}

/**
 * A live column of what just happened on-chain. Rows that arrive while you're watching get a
 * brief ink-wash highlight (none under reduced motion); the first load is not highlighted.
 */
export function OnTheRecord({
  polls,
  activity,
  loading,
  failed,
}: {
  polls: Poll[] | undefined;
  activity: ActivityItem[] | undefined;
  loading: boolean;
  failed: boolean;
}) {
  const { nowSec } = useChainClock();
  // React's "adjust state when a prop changes" pattern: compare with the previous list during render.
  const [previous, setPrevious] = useState(activity);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  if (activity !== previous) {
    setPrevious(activity);
    if (previous && activity) {
      const before = new Set(previous.map((a) => a.id));
      setFresh(new Set(activity.filter((a) => !before.has(a.id)).map((a) => a.id)));
    }
  }

  return (
    <aside className="record" aria-labelledby="record-title">
      <h2 id="record-title" className="record-title">
        <span className="pulse-dot" aria-hidden="true" /> On the record
      </h2>
      <p className="muted text-xs">Live from the contract's public log.</p>
      {loading ? (
        <div className="mt-3 space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : failed ? (
        <p className="hint mt-3">The activity log isn't reachable right now. Polls and results still work.</p>
      ) : !activity || activity.length === 0 ? (
        <p className="hint mt-3">Nothing on the record yet. The first vote will appear here the moment it's mined.</p>
      ) : (
        <ol className="record-list" data-testid="activity">
          {activity.map((item) => {
            const poll = polls?.find((p) => p.id === item.pollId);
            const { verb, detail } = describe(item, poll);
            const url = explorerTxUrl(item.txHash);
            return (
              <li key={item.id} className={`record-row ${fresh.has(item.id) ? "record-new" : ""}`}>
                <p className="text-sm">
                  <span className="mono">{item.actor ? shortAddress(item.actor) : "Creator"}</span> <strong>{verb}</strong>{" "}
                  <Link to={`/poll/${item.pollId}`} className="record-detail" title={detail}>
                    {detail}
                  </Link>
                </p>
                <p className="mono muted mt-0.5 text-xs">
                  {item.timestamp !== null ? relativeTime(item.timestamp, nowSec) : "…"} · block {item.blockNumber.toLocaleString()}
                  {url && (
                    <>
                      {" · "}
                      <a href={url} target="_blank" rel="noreferrer" className="link">
                        tx
                      </a>
                    </>
                  )}
                </p>
              </li>
            );
          })}
        </ol>
      )}
    </aside>
  );
}
