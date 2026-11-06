/** 0x1234…abcd — full value goes in a title attribute wherever this is shown. */
export function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function shortHash(hash: string): string {
  return `${hash.slice(0, 10)}…${hash.slice(-8)}`;
}

/** Local time with the zone label (e.g. "6 Nov 2026, 9:15 pm IST"). */
export function formatDateTime(epochSec: number | bigint): string {
  // dateStyle/timeStyle can't be combined with timeZoneName, so the fields are listed explicitly.
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(
    new Date(Number(epochSec) * 1000),
  );
}

/** "2d 4h", "3h 12m", "4m 09s" — precise enough to watch, short enough for a card. */
export function formatCountdown(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${String(sec).padStart(2, "0")}s`;
}

export function pluralVotes(n: bigint): string {
  return `${n.toString()} ${n === 1n ? "vote" : "votes"}`;
}
