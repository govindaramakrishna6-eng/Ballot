import { Link } from "react-router";

export type RankedRow = { key: string; label: string; value: number; href: string };

/** Ranked horizontal bars, largest first, one hue — comparing magnitudes on a shared baseline. */
export function RankedBars({ rows, unit }: { rows: RankedRow[]; unit: (n: number) => string }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ol className="ranked" data-testid="most-voted">
      {rows.map((r, i) => (
        <li key={r.key}>
          <Link to={r.href} className="ranked-row" title={r.label}>
            <span className="ranked-head">
              <span className="ranked-n mono">{i + 1}</span>
              <span className="ranked-label">{r.label}</span>
              <span className="mono tabular-nums ranked-value">{unit(r.value)}</span>
            </span>
            <span className="ranked-track">
              <span className="ranked-fill" style={{ width: `${(r.value / max) * 100}%` }} />
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
