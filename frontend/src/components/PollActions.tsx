import { useState } from "react";
import type { Poll } from "../contract/contract";
import { useChainClock } from "../hooks/useChainClock";
import { download, pollUrl, toCsv, toJson, xShareUrl } from "../lib/share";
import { pollStatus } from "../lib/status";
import { DownloadIcon, LinkIcon, ShareIcon } from "./icons";

/** Copy link · Share on X · Export (CSV / JSON). Used on the poll page and the featured card. */
export function PollActions({ poll, exportable = true }: { poll: Poll; exportable?: boolean }) {
  const { nowSec } = useChainClock();
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(pollUrl(poll.id));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked: the link is still in the address bar */
    }
  }

  const status = pollStatus(poll, nowSec);
  const exportAs = (format: "csv" | "json") => {
    const data = [{ poll, status }];
    if (format === "csv") download(`ballot-poll-${poll.id}.csv`, toCsv(data), "text/csv");
    else download(`ballot-poll-${poll.id}.json`, toJson(data), "application/json");
  };

  return (
    <div className="actions" data-testid="poll-actions">
      <button type="button" className="btn btn-ghost-strong" onClick={copy} data-testid="copy-link">
        <LinkIcon className="icon-sm" /> {copied ? "Link copied" : "Copy link"}
      </button>
      <a className="btn btn-ghost-strong" href={xShareUrl(poll)} target="_blank" rel="noreferrer" data-testid="share-x">
        <ShareIcon className="icon-sm" /> Share on X
      </a>
      {exportable && (
        <span className="actions-export">
          <DownloadIcon className="icon-sm" />
          <span className="muted text-sm">Export</span>
          <button type="button" className="btn-chip" onClick={() => exportAs("csv")} data-testid="export-csv">
            CSV
          </button>
          <button type="button" className="btn-chip" onClick={() => exportAs("json")} data-testid="export-json">
            JSON
          </button>
        </span>
      )}
      <span role="status" className="sr-only">
        {copied ? "Link copied" : ""}
      </span>
    </div>
  );
}
