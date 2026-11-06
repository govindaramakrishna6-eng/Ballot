/** "just now", "4m ago", "3h ago", "2d ago" — measured against chain time, not the user's clock. */
export function relativeTime(epochSec: bigint | number, nowSec: number): string {
  const diff = Math.max(0, nowSec - Number(epochSec));
  if (diff < 45) return "just now";
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  return `${Math.round(diff / 86400)}d ago`;
}
