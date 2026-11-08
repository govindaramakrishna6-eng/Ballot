import { identicon } from "../lib/identicon";

/** Wallet avatar. Muted colours so it sits in the paper palette; decorative (the address is always shown or titled). */
export function Identicon({ address, size = 20, className = "" }: { address: string; size?: number; className?: string }) {
  const { hue, cells } = identicon(address);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 5 5"
      className={`identicon ${className}`}
      aria-hidden="true"
      shapeRendering="crispEdges"
      style={{ ["--id-bg" as string]: `oklch(0.92 0.035 ${hue})`, ["--id-fg" as string]: `oklch(0.5 0.11 ${hue})` }}
    >
      <rect width="5" height="5" fill="var(--id-bg)" />
      {cells.map((on, i) => (on ? <rect key={i} x={i % 5} y={Math.floor(i / 5)} width="1" height="1" fill="var(--id-fg)" /> : null))}
    </svg>
  );
}
