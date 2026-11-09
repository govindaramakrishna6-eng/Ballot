// A small, consistent line-icon set (24×24, 1.75 stroke, currentColor). Decorative: always paired with text.
type P = { className?: string };
const base = (className = "icon") => ({
  className,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
});

export const WalletIcon = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3" />
    <path d="M4 7.5V17a2 2 0 0 0 2 2h13a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1H6.5A2.5 2.5 0 0 1 4 7.5Z" />
    <circle cx="16" cy="13.5" r="1.2" />
  </svg>
);
export const BallotIcon = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M4 12h16v8H4z" />
    <path d="M8 12V5h8v7" />
    <path d="m10 8.5 1.5 1.5 3-3" />
    <path d="M9 16h6" />
  </svg>
);
export const VerifyIcon = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M12 3 19 6v5.5c0 4.2-2.9 7.6-7 9-4.1-1.4-7-4.8-7-9V6l7-3Z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);
export const ChainIcon = ({ className }: P) => (
  <svg {...base(className)}>
    <rect x="3" y="8" width="7" height="8" rx="1.5" />
    <rect x="14" y="8" width="7" height="8" rx="1.5" />
    <path d="M10 12h4" />
  </svg>
);
export const LockIcon = ({ className }: P) => (
  <svg {...base(className)}>
    <rect x="5" y="10.5" width="14" height="9.5" rx="2" />
    <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
  </svg>
);
export const KeyIcon = ({ className }: P) => (
  <svg {...base(className)}>
    <circle cx="8" cy="15" r="4" />
    <path d="m11 12 8-8M16 7l2 2M14 9l2 2" />
  </svg>
);
export const EyeIcon = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
    <circle cx="12" cy="12" r="2.8" />
  </svg>
);
export const SearchIcon = ({ className }: P) => (
  <svg {...base(className)}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m20 20-4.2-4.2" />
  </svg>
);
export const LinkIcon = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
    <path d="M14 10a4 4 0 0 0-5.7 0l-3 3A4 4 0 0 0 11 18.7l1-1" />
  </svg>
);
export const DownloadIcon = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14" />
  </svg>
);
export const ShareIcon = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M12 15V4M8 8l4-4 4 4" />
    <path d="M6 11v8h12v-8" />
  </svg>
);
export const ActivityIcon = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M3 12h4l3-7 4 14 3-7h4" />
  </svg>
);
export const ChartIcon = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M4 20h16" />
    <path d="M7 16V10M12 16V5M17 16v-4" />
  </svg>
);
export const ChevronIcon = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);
export const ClockIcon = ({ className }: P) => (
  <svg {...base(className)}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </svg>
);
