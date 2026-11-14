import { useLayoutEffect, useRef, useState } from "react";
import type { TimelinePoint } from "../../lib/timeline";

const H = 220;
const PAD = { top: 16, right: 12, bottom: 28, left: 36 };

function fmtTime(t: number, bucketSec: number) {
  const d = new Date(t * 1000);
  return bucketSec >= 86400
    ? d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
    : d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function niceMax(v: number) {
  if (v <= 4) return 4;
  const pow = 10 ** Math.floor(Math.log10(v));
  return Math.ceil(v / pow) * pow;
}

/**
 * Cumulative votes over time: one series, so an area with a 2px line; recessive grid; a crosshair +
 * tooltip on hover (keyboard: arrow keys move it). Sized to its container, not a fixed width.
 */
export function AreaChart({ points, bucketSec, label }: { points: TimelinePoint[]; bucketSec: number; label: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(600);
  const [hover, setHover] = useState<number | null>(null);

  useLayoutEffect(() => {
    if (!box.current) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(260, e.contentRect.width)));
    ro.observe(box.current);
    return () => ro.disconnect();
  }, []);

  const n = points.length;
  const max = niceMax(Math.max(...points.map((p) => p.cumulative), 1));
  const x = (i: number) => PAD.left + (n <= 1 ? 0 : (i / (n - 1)) * (w - PAD.left - PAD.right));
  const y = (v: number) => PAD.top + (1 - v / max) * (H - PAD.top - PAD.bottom);
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(p.cumulative).toFixed(1)}`).join("");
  const area = `${line}L${x(n - 1).toFixed(1)} ${y(0)}L${x(0).toFixed(1)} ${y(0)}Z`;
  const ticks = [0, max / 2, max];
  const xLabels = n > 1 ? [0, Math.floor((n - 1) / 2), n - 1] : [0];

  function pick(clientX: number) {
    const r = box.current!.getBoundingClientRect();
    const rel = clientX - r.left - PAD.left;
    const i = Math.round((rel / (w - PAD.left - PAD.right)) * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, i)));
  }

  const h = hover !== null ? points[hover] : null;
  return (
    <div
      ref={box}
      className="chart"
      onPointerMove={(e) => pick(e.clientX)}
      onPointerLeave={() => setHover(null)}
      tabIndex={0}
      role="img"
      aria-label={label}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") setHover((i) => Math.min(n - 1, (i ?? -1) + 1));
        if (e.key === "ArrowLeft") setHover((i) => Math.max(0, (i ?? n) - 1));
      }}
      onBlur={() => setHover(null)}
      data-testid="votes-over-time"
    >
      <svg width={w} height={H} aria-hidden="true">
        {ticks.map((t) => (
          <g key={t}>
            <line className="chart-grid" x1={PAD.left} x2={w - PAD.right} y1={y(t)} y2={y(t)} />
            <text className="chart-axis" x={PAD.left - 8} y={y(t) + 4} textAnchor="end">
              {Math.round(t)}
            </text>
          </g>
        ))}
        {xLabels.map((i) => (
          <text key={i} className="chart-axis" x={x(i)} y={H - 8} textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"}>
            {fmtTime(points[i].t, bucketSec)}
          </text>
        ))}
        <path className="chart-area" d={area} />
        <path className="chart-line" d={line} />
        {h && hover !== null && (
          <g>
            <line className="chart-crosshair" x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={y(0)} />
            <circle className="chart-dot" cx={x(hover)} cy={y(h.cumulative)} r={4.5} />
          </g>
        )}
      </svg>
      {h && hover !== null && (
        <div className="chart-tip" style={{ left: Math.min(Math.max(x(hover), 90), w - 90), top: y(h.cumulative) - 12 }}>
          <p className="mono muted text-xs">{fmtTime(h.t, bucketSec)}</p>
          <p>
            <strong className="tabular-nums">{h.cumulative}</strong> votes total
          </p>
          <p className="muted text-xs">+{h.inBucket} in this {bucketSec >= 86400 ? "day" : bucketSec >= 3600 ? "hour" : "5 min"}</p>
        </div>
      )}
    </div>
  );
}
