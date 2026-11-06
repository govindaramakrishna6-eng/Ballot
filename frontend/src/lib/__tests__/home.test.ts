import { describe, expect, it } from "vitest";
import type { Poll } from "../../contract/contract";
import type { ChainEvent } from "../../hooks/useActivity";
import { buildFeed, uniqueWallets } from "../activity";
import { rankOpenPolls } from "../rank";
import { displayStatus } from "../status";

const NOW = 1_800_000_000;
const A = "0x00000000000000000000000000000000000000aa";
const B = "0x00000000000000000000000000000000000000bb";

function poll(id: number, over: Partial<Poll> = {}): Poll {
  return {
    id: BigInt(id), creator: A, title: `P${id}`, description: "", options: ["x", "y"], voteCounts: [0n, 0n],
    createdAt: BigInt(NOW - 100), endTime: BigInt(NOW + 86_400), totalVotes: 0n, cancelled: false, ...over,
  };
}

describe("displayStatus", () => {
  it("labels the last 3 hours as Closing soon", () => {
    expect(displayStatus(poll(1, { endTime: BigInt(NOW + 3600) }), NOW)).toBe("closing-soon");
    expect(displayStatus(poll(1), NOW)).toBe("open");
    expect(displayStatus(poll(1, { endTime: BigInt(NOW) }), NOW)).toBe("closed");
  });
});

describe("rankOpenPolls", () => {
  it("closing soon first (soonest first), then most votes, then newest; closed polls excluded", () => {
    const ranked = rankOpenPolls(
      [
        poll(1, { totalVotes: 5n }),
        poll(2, { endTime: BigInt(NOW + 7200) }),
        poll(3, { endTime: BigInt(NOW + 600) }),
        poll(4, { totalVotes: 9n }),
        poll(5),
        poll(6, { endTime: BigInt(NOW - 1) }),
      ],
      NOW,
    );
    expect(ranked.map((p) => Number(p.id))).toEqual([3, 2, 4, 1, 5]);
  });
});

describe("buildFeed", () => {
  const ev = (id: string, kind: ChainEvent["kind"], pollId: number, block: number): ChainEvent => ({
    id, kind, pollId: BigInt(pollId), actor: kind === "cancelled" ? null : B, txHash: `0x${"1".repeat(64)}`, blockNumber: BigInt(block),
  });

  it("merges events with recently closed polls, newest first, and drops unknown polls", () => {
    const polls = [poll(1), poll(2, { endTime: BigInt(NOW - 50), totalVotes: 42n }), poll(3, { endTime: BigInt(NOW - 30 * 86_400) })];
    const events = [ev("b", "vote", 1, 11), ev("a", "created", 1, 10), ev("z", "vote", 99, 12)];
    const times = new Map([[11n, BigInt(NOW - 10)], [10n, BigInt(NOW - 100)], [12n, BigInt(NOW - 5)]]);
    const feed = buildFeed(events, times, polls, NOW, 10);
    expect(feed.map((f) => `${f.kind}:${f.poll.id}`)).toEqual(["vote:1", "closed:2", "created:1"]);
  });

  it("respects the limit", () => {
    const events = Array.from({ length: 20 }, (_, i) => ev(`e${i}`, "vote", 1, 100 - i));
    expect(buildFeed(events, new Map(), [poll(1)], NOW, 9)).toHaveLength(9);
  });
});

describe("uniqueWallets", () => {
  it("counts creators and voters once each, case-insensitively", () => {
    const events: ChainEvent[] = [
      { id: "1", kind: "vote", pollId: 1n, actor: B, txHash: `0x${"1".repeat(64)}`, blockNumber: 1n },
      { id: "2", kind: "vote", pollId: 1n, actor: B.toUpperCase().replace("0X", "0x") as `0x${string}`, txHash: `0x${"2".repeat(64)}`, blockNumber: 2n },
    ];
    expect(uniqueWallets([poll(1), poll(2)], events)).toBe(2);
  });
});
