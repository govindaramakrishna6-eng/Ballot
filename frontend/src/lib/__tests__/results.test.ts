import { describe, expect, it } from "vitest";
import { computeResults } from "../results";

describe("computeResults", () => {
  it("zero votes: no NaN, no leader", () => {
    const r = computeResults(["A", "B"], [0n, 0n]);
    expect(r.noVotes).toBe(true);
    expect(r.rows.map((x) => x.percent)).toEqual([null, null]);
    expect(r.leader).toBeNull();
    expect(r.tied).toBe(false);
  });

  it("single leader", () => {
    const r = computeResults(["A", "B", "C"], [1n, 3n, 0n]);
    expect(r.leader).toBe(1);
    expect(r.rows[1].percent).toBe(75);
  });

  it("ties have no leader", () => {
    const r = computeResults(["A", "B", "C"], [2n, 2n, 1n]);
    expect(r.tied).toBe(true);
    expect(r.leader).toBeNull();
  });

  it("rounded percentages may not sum to 100", () => {
    const r = computeResults(["A", "B", "C"], [1n, 1n, 1n]);
    expect(r.rows.map((x) => x.percent)).toEqual([33, 33, 33]);
    expect(r.total).toBe(3n);
  });
});
