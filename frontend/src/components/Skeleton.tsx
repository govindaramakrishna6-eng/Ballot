/** Placeholder block shown while data loads; aria-hidden because the region announces "Loading". */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`skeleton ${className}`} />;
}
