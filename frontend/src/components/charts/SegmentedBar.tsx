import type { ResultRow } from "../../lib/results";

/** Colour follows the option (its index), never its rank, so a reorder never repaints an option. */
export const SERIES_SLOTS = 5; // validated set; a 6th+ option shares the neutral "other" swatch
export function seriesVar(index: number) {
  return index < SERIES_SLOTS ? `var(--series-${index + 1})` : "var(--series-other)";
}

/**
 * Part-to-whole as one thin bar: each option its own block (2px surface gaps, rounded ends),
 * in its fixed slot colour. Names and figures live in the legend beside it (never colour alone).
 */
export function SegmentedBar({ rows, total, tall = false }: { rows: ResultRow[]; total: bigint; tall?: boolean }) {
  if (total === 0n) return <div className={`seg seg-empty ${tall ? "seg-tall" : ""}`} aria-hidden="true" />;
  return (
    <div className={`seg ${tall ? "seg-tall" : ""}`} aria-hidden="true">
      {rows
        .filter((r) => r.count > 0n)
        .map((r) => (
          <span
            key={r.index}
            className="seg-part"
            style={{ flexGrow: Number(r.count), background: seriesVar(r.index) }}
            title={`${r.label}: ${r.count} (${r.percent}%)`}
          />
        ))}
    </div>
  );
}

export function Legend({ rows, leader, final }: { rows: ResultRow[]; leader: number | null; final: boolean }) {
  return (
    <ul className="legend">
      {rows.map((r) => (
        <li key={r.index} className={leader === r.index ? "legend-lead" : ""}>
          <span className="swatch" style={{ background: seriesVar(r.index) }} aria-hidden="true" />
          <span className="legend-name" title={r.label}>
            {r.label}
          </span>
          {leader === r.index && <span className="sr-only">{final ? "(winner)" : "(leading)"}</span>}
          <span className="legend-fig mono tabular-nums">
            {r.count.toString()} · {r.percent === null ? "—" : `${r.percent}%`}
          </span>
        </li>
      ))}
    </ul>
  );
}
