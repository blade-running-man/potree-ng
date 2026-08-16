import type { Page } from '@playwright/test';

// CPU and memory measurement for the E2E perf baseline. Frame timing lives in
// metrics.ts; this module adds main-thread CPU time (via the Chrome DevTools
// Protocol Performance domain) and JS heap usage. Both are Chromium-specific,
// which matches the headed-Chromium run target.

const BYTES_PER_MB = 1024 * 1024;

export interface MemoryStats {
  usedJSHeapMB: number;
  totalJSHeapMB: number;
  jsHeapLimitMB: number | null;
}

export interface CpuStats {
  /** Wall-clock span the sample covered. */
  wallMs: number;
  /** Total main-thread task time in the span. */
  taskMs: number;
  scriptMs: number;
  layoutMs: number;
  recalcStyleMs: number;
  /** Main-thread busy time as a percentage of wall-clock (CPU-load proxy). */
  mainThreadBusyPct: number;
  jsHeapUsedMB: number;
}

/** Read JS heap usage from `performance.memory` (Chrome; values are bucketed).
 *  Returns null if the API is unavailable. */
export async function readMemory(page: Page): Promise<MemoryStats | null> {
  return page.evaluate(() => {
    const m = (performance as any).memory;
    if (!m) return null;
    const MB = 1024 * 1024;
    return {
      usedJSHeapMB: m.usedJSHeapSize / MB,
      totalJSHeapMB: m.totalJSHeapSize / MB,
      jsHeapLimitMB: m.jsHeapSizeLimit ? m.jsHeapSizeLimit / MB : null,
    };
  });
}

/**
 * Open a CDP Performance session. The domain exposes cumulative main-thread
 * timing counters; sampling before and after a window and diffing yields the
 * CPU time spent in that window.
 */
export async function createCdpMetrics(page: Page) {
  const session = await page.context().newCDPSession(page);
  await session.send('Performance.enable');
  const sample = async (): Promise<Record<string, number>> => {
    const { metrics } = await session.send('Performance.getMetrics');
    const map: Record<string, number> = {};
    for (const metric of metrics) map[metric.name] = metric.value;
    return map;
  };
  return { session, sample };
}

/** Diff two CDP metric samples into CPU statistics. `Timestamp` is in seconds;
 *  the `*Duration` counters are cumulative seconds. */
export function diffCpu(
  start: Record<string, number>,
  end: Record<string, number>,
): CpuStats {
  const delta = (key: string) => (end[key] ?? 0) - (start[key] ?? 0);
  const wallMs = delta('Timestamp') * 1000;
  const taskMs = delta('TaskDuration') * 1000;
  return {
    wallMs,
    taskMs,
    scriptMs: delta('ScriptDuration') * 1000,
    layoutMs: delta('LayoutDuration') * 1000,
    recalcStyleMs: delta('RecalcStyleDuration') * 1000,
    mainThreadBusyPct: wallMs > 0 ? (taskMs / wallMs) * 100 : 0,
    jsHeapUsedMB: (end['JSHeapUsedSize'] ?? 0) / BYTES_PER_MB,
  };
}
