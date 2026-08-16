// Frame-timing measurement for the E2E perf checks.
//
// The sampler runs in the browser (passed to `page.evaluate`) and must be
// self-contained — it may only reference its argument, never module scope,
// because Playwright serialises it by source. It returns raw per-frame deltas;
// the pure `computeFrameStats` derives statistics on the Node side so the maths
// stay unit-testable. Only the Node-side `computeFrameStats` uses the imported
// `percentile`; `sampleFrames` never references module scope, so the import is
// safe from the serialisation constraint above.

import { percentile } from './measure-timings';

export interface FrameSample {
  /** Milliseconds between consecutive animation frames. */
  deltas: number[];
  /** Total wall-clock duration the sampler ran, in milliseconds. */
  durationMs: number;
}

export interface FrameStats {
  frames: number;
  durationMs: number;
  avgFrameMs: number;
  minFrameMs: number;
  maxFrameMs: number;
  p95FrameMs: number;
  fps: number;
}

/** Soft, catastrophe-level perf gates — meant to catch total breakage, not
 *  hardware jitter. */
export const PERF_THRESHOLDS = {
  minFps: 5,
  maxLoadMs: 30_000,
} as const;

/**
 * Browser-side sampler: records `requestAnimationFrame` deltas for `durationMs`
 * and resolves with the raw sample. Self-contained for `page.evaluate`.
 */
export function sampleFrames(durationMs: number): Promise<FrameSample> {
  return new Promise((resolve) => {
    const deltas: number[] = [];
    const start = performance.now();
    let last = start;
    const tick = (now: number) => {
      deltas.push(now - last);
      last = now;
      if (now - start >= durationMs) {
        resolve({ deltas, durationMs: now - start });
      } else {
        requestAnimationFrame(tick);
      }
    };
    requestAnimationFrame(tick);
  });
}

/**
 * Derive frame statistics from a raw sample. The first delta is dropped as
 * warm-up (it also spans the gap since injection, so it is not a real frame
 * interval). Returns zeroed stats when there are no usable frames.
 */
export function computeFrameStats(sample: FrameSample): FrameStats {
  const frames = sample.deltas.slice(1).filter((d) => d > 0);
  if (frames.length === 0) {
    return {
      frames: 0,
      durationMs: sample.durationMs,
      avgFrameMs: 0,
      minFrameMs: 0,
      maxFrameMs: 0,
      p95FrameMs: 0,
      fps: 0,
    };
  }

  const sorted = [...frames].sort((a, b) => a - b);
  const sum = frames.reduce((acc, d) => acc + d, 0);
  const avgFrameMs = sum / frames.length;

  return {
    frames: frames.length,
    durationMs: sample.durationMs,
    avgFrameMs,
    minFrameMs: sorted[0],
    maxFrameMs: sorted[sorted.length - 1],
    p95FrameMs: percentile(sorted, 0.95),
    fps: avgFrameMs > 0 ? 1000 / avgFrameMs : 0,
  };
}
