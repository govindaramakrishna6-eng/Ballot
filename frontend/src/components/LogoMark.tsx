import { useId } from "react";

/**
 * The Ballot mark: a ticked ballot standing in the slot of an isometric block —
 * "your vote goes into the blockchain". Drawn with the theme's colour tokens, so it follows dark mode.
 * With `animated`, the parts carry classes the intro animation targets (see .lm-* in index.css).
 */
export function LogoMark({ size = 32, animated = false, className = "" }: { size?: number; animated?: boolean; className?: string }) {
  // Unique clip id per instance: several marks can be on the page at once (header + intro).
  const clip = `lm-above-${useId().replace(/:/g, "")}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={`logo-mark ${animated ? "lm-animated" : ""} ${className}`}
      aria-hidden="true"
      overflow="visible"
    >
      <defs>
        {/* the half-plane above the slot line y = 32 + 0.5(x − 32): the part of the ballot outside the block */}
        <clipPath id={clip}>
          <path d="M-20-40H84V58L-20 6Z" />
        </clipPath>
      </defs>
      <g className="lm-cube">
        <path className="lm-face-top" d="M22 27 32 22 52 32 42 37Z" />
      </g>
      <g clipPath={`url(#${clip})`}>
        <g className="lm-ballot">
          <g transform="matrix(1 0.5 0 1 0 0)">
            <rect className="lm-paper" x="24" y="-6" width="16" height="22" rx="1.5" />
            <path className="lm-tick" d="M27.6 2.4l3.1 3.1 5.8-6.4" />
          </g>
        </g>
      </g>
      <g className="lm-cube">
        <path className="lm-face-top" d="M22 27 42 37 32 42 12 32Z" />
        <path className="lm-face-left" d="M12 32 32 42V60L12 50Z" />
        <path className="lm-face-right" d="M52 32 32 42V60L52 50Z" />
        <path className="lm-slot" d="M24 28 40 36" />
      </g>
      {animated && (
        <g className="lm-rings">
          <ellipse className="lm-ring" cx="32" cy="41" rx="24" ry="22" />
          <ellipse className="lm-ring lm-ring-2" cx="32" cy="41" rx="24" ry="22" />
        </g>
      )}
    </svg>
  );
}
