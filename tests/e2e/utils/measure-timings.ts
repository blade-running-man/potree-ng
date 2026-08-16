export interface MeasureStats {
  count: number;
  avg: number;
  p95: number;
  max: number;
}

/**
 * Nearest-rank percentile of an already-ascending-sorted sample. `p` is a
 * fraction in [0, 1] (e.g. 0.95 for p95). Returns 0 for an empty sample.
 * Canonical percentile helper — reused by metrics.ts's `computeFrameStats`.
 */
export function percentile(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return 0;
  const rank = Math.ceil(p * sortedAsc.length) - 1;
  const idx = Math.min(sortedAsc.length - 1, Math.max(0, rank));
  return sortedAsc[idx];
}

/** Aggregate a list of `performance.measure` durations (ms) into summary stats. */
export function aggregateMeasures(durations: number[]): MeasureStats {
  if (durations.length === 0) return { count: 0, avg: 0, p95: 0, max: 0 };
  const sorted = [...durations].sort((a, b) => a - b);
  const sum = sorted.reduce((s, d) => s + d, 0);
  return {
    count: sorted.length,
    avg: sum / sorted.length,
    p95: percentile(sorted, 0.95),
    max: sorted[sorted.length - 1],
  };
}
