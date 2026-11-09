import type { Poll } from "../contract/contract";
import { targetChain } from "../config/chains";
import { deployment } from "../contract/contract";
import { computeResults } from "./results";

export function pollUrl(id: bigint): string {
  return `${window.location.origin}/poll/${id}`;
}

/** X (Twitter) web intent — opens a pre-filled post; nothing is posted without the user. */
export function xShareUrl(poll: Pick<Poll, "id" | "title">): string {
  const text = `Vote on “${poll.title}” — every vote is recorded on-chain and publicly verifiable.`;
  return `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(pollUrl(poll.id))}`;
}

type Row = { pollId: string; title: string; status: string; option: string; votes: string; percent: string; totalVotes: string; endTime: string };

function rows(poll: Poll, status: string): Row[] {
  const r = computeResults(poll.options, poll.voteCounts);
  return r.rows.map((x) => ({
    pollId: poll.id.toString(),
    title: poll.title,
    status,
    option: x.label,
    votes: x.count.toString(),
    percent: x.percent === null ? "" : String(x.percent),
    totalVotes: r.total.toString(),
    endTime: new Date(Number(poll.endTime) * 1000).toISOString(),
  }));
}

/** RFC 4180 quoting: always quote, double any quote inside. Poll text is untrusted — also defuse
 *  spreadsheet formulas (a cell starting with = + - @ would be executed by Excel/Sheets). */
function csvCell(v: string): string {
  const safe = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function toCsv(polls: { poll: Poll; status: string }[]): string {
  const header: (keyof Row)[] = ["pollId", "title", "status", "option", "votes", "percent", "totalVotes", "endTime"];
  const lines = polls.flatMap(({ poll, status }) => rows(poll, status)).map((r) => header.map((h) => csvCell(r[h])).join(","));
  return [header.join(","), ...lines].join("\r\n") + "\r\n";
}

export function toJson(polls: { poll: Poll; status: string }[]): string {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      network: { name: targetChain.name, chainId: targetChain.id },
      contract: deployment?.address ?? null,
      note: "Counts are read from the VotingDApp contract; verify them independently on a block explorer.",
      polls: polls.map(({ poll, status }) => ({
        id: poll.id.toString(),
        title: poll.title,
        description: poll.description,
        creator: poll.creator,
        status,
        createdAt: new Date(Number(poll.createdAt) * 1000).toISOString(),
        endTime: new Date(Number(poll.endTime) * 1000).toISOString(),
        totalVotes: poll.totalVotes.toString(),
        options: rows(poll, status).map((r) => ({ option: r.option, votes: r.votes, percent: r.percent })),
      })),
    },
    null,
    2,
  );
}

/** Saves text as a file in the browser — no server involved. */
export function download(filename: string, text: string, type: string): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
