// Pending tx hashes survive a page refresh so a vote in flight is never "lost" from the UI.
// Keyed by chain + action (e.g. "vote:3"); values are tx hashes, which are public anyway.
import type { Hash } from "viem";

const PREFIX = "ballot:pending:";

function key(chainId: number, action: string) {
  return `${PREFIX}${chainId}:${action}`;
}

// Storage can throw (private mode, blocked site data); a lost pending marker is not fatal.
export function loadPending(chainId: number, action: string): Hash | null {
  try {
    const v = localStorage.getItem(key(chainId, action));
    return v && /^0x[0-9a-fA-F]{64}$/.test(v) ? (v as Hash) : null;
  } catch {
    return null;
  }
}

export function savePending(chainId: number, action: string, hash: Hash): void {
  try {
    localStorage.setItem(key(chainId, action), hash);
  } catch {
    /* ignore */
  }
}

export function clearPending(chainId: number, action: string): void {
  try {
    localStorage.removeItem(key(chainId, action));
  } catch {
    /* ignore */
  }
}
