export type ResultRow = { index: number; label: string; count: bigint; percent: number | null; leading: boolean };
export type Results = {
  rows: ResultRow[];
  total: bigint;
  noVotes: boolean;
  tied: boolean;
  /** Index of the single leading option, or null if no votes or a tie. */
  leader: number | null;
};

/** Counts are the truth; percentages are rounded for display and may not sum to exactly 100. */
export function computeResults(options: readonly string[], counts: readonly bigint[]): Results {
  const total = counts.reduce((a, b) => a + b, 0n);
  const max = counts.reduce((a, b) => (b > a ? b : a), 0n);
  const leaders = max === 0n ? [] : counts.flatMap((c, i) => (c === max ? [i] : []));
  const rows = options.map((label, index) => ({
    index,
    label,
    count: counts[index] ?? 0n,
    // Guard the zero-total case explicitly: never divide by zero, never show NaN.
    percent: total === 0n ? null : Math.round((Number(counts[index] ?? 0n) / Number(total)) * 100),
    leading: leaders.includes(index),
  }));
  return { rows, total, noVotes: total === 0n, tied: leaders.length > 1, leader: leaders.length === 1 ? leaders[0] : null };
}
