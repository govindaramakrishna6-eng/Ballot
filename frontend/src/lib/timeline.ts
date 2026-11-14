export type TimelinePoint = { t: number; inBucket: number; cumulative: number };

/**
 * Buckets vote timestamps into an even time series for the "votes over time" chart.
 * Bucket size adapts to the span (5 min / 1 h / 1 day) so there are roughly 12–48 points.
 * `startCount` = votes cast before the first timestamp we have (older history the RPC no longer serves).
 */
export function bucketVotes(times: number[], nowSec: number, startCount = 0): { points: TimelinePoint[]; bucketSec: number } {
  if (times.length === 0) return { points: [], bucketSec: 3600 };
  const sorted = [...times].sort((a, b) => a - b);
  const span = Math.max(nowSec - sorted[0], 60);
  const bucketSec = span <= 2 * 3600 ? 300 : span <= 2 * 86400 ? 3600 : 86400;
  const start = Math.floor(sorted[0] / bucketSec) * bucketSec;
  const end = Math.floor(nowSec / bucketSec) * bucketSec;
  const points: TimelinePoint[] = [];
  let i = 0;
  let cumulative = startCount;
  for (let t = start; t <= end; t += bucketSec) {
    let inBucket = 0;
    while (i < sorted.length && sorted[i] < t + bucketSec) {
      inBucket++;
      i++;
    }
    cumulative += inBucket;
    points.push({ t, inBucket, cumulative });
  }
  return { points, bucketSec };
}
