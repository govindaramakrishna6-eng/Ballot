import { describe, expect, it } from "vitest";
import type { Poll } from "../../contract/contract";
import { browsePolls, pickFeatured } from "../rank";
import { toCsv, toJson } from "../share";

const NOW = 1_800_000_000;
const A = "0x00000000000000000000000000000000000000aa";
const B = "0x00000000000000000000000000000000000000bb";
function poll(id: number, over: Partial<Poll> = {}): Poll {
  return {
    id: BigInt(id), creator: A, title: `Poll ${id}`, description: "", options: ["Yes", "No"], voteCounts: [0n, 0n],
    createdAt: BigInt(NOW - 100), endTime: BigInt(NOW + 86_400), totalVotes: 0n, cancelled: false, ...over,
  };
}
const polls = [
  poll(1, { title: "Should Chennai adopt more EV buses?", totalVotes: 4n }),
  poll(2, { endTime: BigInt(NOW + 600), title: "Weekend plans?" }),
  poll(3, { endTime: BigInt(NOW - 10), title: "Best filter coffee?" }),
  poll(4, { cancelled: true, creator: B }),
];
const ids = (list: Poll[]) => list.map((p) => Number(p.id));

describe("browsePolls", () => {
  it("filters: all / open / closing / closed (closed includes cancelled) / mine", () => {
    const args = { query: "", nowSec: NOW, account: B };
    // finished polls: latest deadline first (the cancelled poll's deadline is later than poll 3's)
    expect(ids(browsePolls(polls, { ...args, filter: "all" }))).toEqual([2, 1, 4, 3]);
    expect(ids(browsePolls(polls, { ...args, filter: "open" }))).toEqual([2, 1]);
    expect(ids(browsePolls(polls, { ...args, filter: "closing" }))).toEqual([2]);
    expect(ids(browsePolls(polls, { ...args, filter: "closed" }))).toEqual([4, 3]);
    expect(ids(browsePolls(polls, { ...args, filter: "mine" }))).toEqual([4]);
  });
  it("search: text (case-insensitive), #id, creator address", () => {
    const f = (query: string) => ids(browsePolls(polls, { filter: "all", query, nowSec: NOW }));
    expect(f("chennai")).toEqual([1]);
    expect(f("#3")).toEqual([3]);
    expect(f("3")).toEqual([3]);
    expect(f("0x00000000000000000000000000000000000000b")).toEqual([4]);
    expect(f("nothing like this")).toEqual([]);
  });
});

describe("pickFeatured", () => {
  it("most-voted open poll; falls back to the most recently closed; null when empty", () => {
    expect(Number(pickFeatured(polls, NOW)!.id)).toBe(1);
    expect(Number(pickFeatured([polls[2], poll(9, { endTime: BigInt(NOW - 500) })], NOW)!.id)).toBe(3);
    expect(pickFeatured([], NOW)).toBeNull();
  });
});

describe("export", () => {
  it("CSV quotes every cell, doubles quotes and defuses spreadsheet formulas", () => {
    const evil = poll(7, { title: '=HYPERLINK("x") "quoted"', options: ["@cmd", "ok"], voteCounts: [1n, 3n], totalVotes: 4n });
    const csv = toCsv([{ poll: evil, status: "open" }]);
    const lines = csv.trim().split("\r\n");
    expect(lines[0]).toBe("pollId,title,status,option,votes,percent,totalVotes,endTime");
    expect(lines).toHaveLength(3);
    expect(lines[1]).toContain(`"'=HYPERLINK(""x"") ""quoted"""`);
    expect(lines[1]).toContain(`"'@cmd","1","25","4"`);
  });
  it("JSON carries network, contract and per-option counts", () => {
    const json = JSON.parse(toJson([{ poll: polls[0], status: "open" }]));
    expect(json.polls[0]).toMatchObject({ id: "1", status: "open", totalVotes: "4" });
    expect(json.polls[0].options).toEqual([
      // zero total votes → percent left blank, never a fake 0% or NaN
      { option: "Yes", votes: "0", percent: "" },
      { option: "No", votes: "0", percent: "" },
    ]);
    expect(json).toHaveProperty("network.chainId");
  });
});
