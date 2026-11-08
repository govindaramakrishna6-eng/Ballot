import { describe, expect, it } from "vitest";
import { identicon } from "../identicon";

describe("identicon", () => {
  const a = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";
  it("is deterministic and case-insensitive", () => {
    expect(identicon(a)).toEqual(identicon(a.toLowerCase()));
  });
  it("is 5×5 and mirror-symmetric", () => {
    const { cells } = identicon(a);
    expect(cells).toHaveLength(25);
    for (let r = 0; r < 5; r++) {
      expect(cells[r * 5]).toBe(cells[r * 5 + 4]);
      expect(cells[r * 5 + 1]).toBe(cells[r * 5 + 3]);
    }
  });
  it("different wallets look different", () => {
    expect(identicon(a)).not.toEqual(identicon("0x70997970C51812dc3A010C7d01b50e0d17dc79C8"));
  });
});
