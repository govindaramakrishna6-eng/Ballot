import { describe, expect, it } from "vitest";
import { byteLength } from "../bytes";
import { checkDraft } from "../validation";

const NOW = 1_800_000_000;
const ok = { title: "Lunch?", description: "", options: ["Dosa", "Idli"], endTimeSec: NOW + 86400 };

describe("checkDraft mirrors the contract", () => {
  it("accepts a valid draft and trims whitespace", () => {
    const r = checkDraft({ ...ok, title: "  Lunch?  ", options: [" Dosa ", "Idli"] }, NOW);
    expect(r.valid).toBe(true);
    expect(r.clean).toEqual({ title: "Lunch?", description: "", options: ["Dosa", "Idli"] });
  });

  it("counts bytes, not characters (Tamil: 41 chars = 123 bytes > 120)", () => {
    const tamil = "த".repeat(41);
    expect(byteLength(tamil)).toBe(123);
    expect(checkDraft({ ...ok, title: tamil }, NOW).errors.title).toMatch(/120 bytes/);
    expect(checkDraft({ ...ok, title: "a".repeat(120) }, NOW).errors.title).toBeUndefined();
  });

  it("flags empty, too-long (61 bytes) and emoji-heavy options", () => {
    const r = checkDraft({ ...ok, options: ["", "b".repeat(61), "🗳".repeat(16)] }, NOW);
    expect(r.errors.options[0]).toMatch(/empty/);
    expect(r.errors.options[1]).toMatch(/60 bytes/);
    expect(r.errors.options[2]).toMatch(/60 bytes/);
  });

  it("blocks exact duplicates but only warns on case-insensitive near-duplicates", () => {
    const exact = checkDraft({ ...ok, options: ["Yes", "No", "Yes"] }, NOW);
    expect(exact.valid).toBe(false);
    expect(exact.errors.options[2]).toBe("Same as option 1.");
    const near = checkDraft({ ...ok, options: ["Yes", "yes"] }, NOW);
    expect(near.valid).toBe(true);
    expect(near.warnings[1]).toMatch(/capitalisation/);
  });

  it("enforces 2–10 options", () => {
    expect(checkDraft({ ...ok, options: ["only"] }, NOW).errors.optionCount).toBeDefined();
    expect(checkDraft({ ...ok, options: Array.from({ length: 11 }, (_, i) => `o${i}`) }, NOW).errors.optionCount).toBeDefined();
    expect(checkDraft({ ...ok, options: Array.from({ length: 10 }, (_, i) => `o${i}`) }, NOW).valid).toBe(true);
  });

  it("description over 500 bytes is rejected", () => {
    expect(checkDraft({ ...ok, description: "d".repeat(501) }, NOW).errors.description).toBeDefined();
  });

  it("deadline must be 6 min (5 + safety margin) to 30 days (minus margin) ahead", () => {
    expect(checkDraft({ ...ok, endTimeSec: NOW + 5 * 60 }, NOW).errors.endTime).toBeDefined();
    expect(checkDraft({ ...ok, endTimeSec: NOW + 6 * 60 }, NOW).errors.endTime).toBeUndefined();
    expect(checkDraft({ ...ok, endTimeSec: NOW + 30 * 86400 }, NOW).errors.endTime).toBeDefined();
    expect(checkDraft({ ...ok, endTimeSec: null }, NOW).errors.endTime).toBeDefined();
  });
});
