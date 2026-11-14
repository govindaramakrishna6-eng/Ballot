import { describe, expect, it } from "vitest";
import { bucketVotes } from "../timeline";

describe("bucketVotes", () => {
  it("empty → no points", () => {
    expect(bucketVotes([], 1000).points).toEqual([]);
  });
  it("5-minute buckets for a short span, gaps filled with zero, cumulative increases", () => {
    const now = 3600 * 10;
    const t0 = now - 1800;
    const { points, bucketSec } = bucketVotes([t0, t0 + 10, t0 + 900], now);
    expect(bucketSec).toBe(300);
    expect(points[0].inBucket).toBe(2);
    expect(points.some((p) => p.inBucket === 0)).toBe(true);
    expect(points.at(-1)!.cumulative).toBe(3);
  });
  it("hourly / daily buckets for longer spans; startCount offsets the cumulative line", () => {
    const now = 86400 * 30;
    expect(bucketVotes([now - 86400], now).bucketSec).toBe(3600);
    const daily = bucketVotes([now - 5 * 86400], now, 10);
    expect(daily.bucketSec).toBe(86400);
    expect(daily.points.at(-1)!.cumulative).toBe(11);
  });
});
