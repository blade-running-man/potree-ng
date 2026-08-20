import { describe, it, expect } from 'vitest';
import { aggregateMeasures } from '../measure-timings';

describe('aggregateMeasures', () => {
  it('computes count/avg/p95/max for a named measure', () => {
    // 1..20 (given here shuffled so the helper's own sort is exercised). With
    // n = 20 the nearest-rank p95 is DISTINCT from the max, so a buggy
    // `p95: max` implementation would fail here: rank = ceil(0.95 * 20) - 1
    // = 18 → sorted[18] = 19, whereas max = 20.
    const durations = [11, 3, 20, 7, 1, 15, 9, 18, 5, 13, 2, 17, 8, 4, 19, 10, 6, 16, 12, 14];
    const stats = aggregateMeasures(durations);
    expect(stats.count).toBe(20);
    expect(stats.avg).toBeCloseTo(10.5, 5);
    expect(stats.max).toBe(20);
    expect(stats.p95).toBe(19); // 95th percentile of 1..20 (nearest-rank) ≠ max
  });

  it('returns zeros for an empty sample', () => {
    expect(aggregateMeasures([])).toEqual({ count: 0, avg: 0, p95: 0, max: 0 });
  });
});
