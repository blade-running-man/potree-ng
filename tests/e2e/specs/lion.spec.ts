import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { test, expect } from '../fixtures/potree';
import { PERF_THRESHOLDS } from '../utils/metrics';
import { createCdpMetrics, diffCpu, readMemory } from '../utils/perf';

// Machine-readable metrics from the latest run, for diffing against the
// committed baseline (tests/e2e/perf/BASELINE.md). Under test-results/, which
// is gitignored.
const METRICS_OUTPUT = 'test-results/perf/lion.json';

// First E2E baseline: examples/lion.html. Verifies potree's functionality
// (viewer initialises, the point cloud loads and actually renders points, the
// configured budget is honoured, no console/page errors, no crash page) and
// collects performance metrics (load time, frame timing) with soft gates.

test.describe('examples/lion.html', () => {
  test('loads, renders points, and performs acceptably', async ({
    page,
    viewerPage,
    runtimeErrors,
  }, testInfo) => {
    await viewerPage.goto('/examples/lion.html');

    // Functional: the point cloud loads and begins rendering points.
    const { loadMs } = await viewerPage.waitForPointCloudLoaded(
      PERF_THRESHOLDS.maxLoadMs,
    );

    // No crash page was injected in place of the render area.
    await viewerPage.assertNoCrash();

    // The WebGL canvas is present with a real layout box.
    const canvas = viewerPage.canvas();
    await expect(canvas).toBeVisible();
    const box = await canvas.boundingBox();
    expect(box, 'canvas should have a layout box').not.toBeNull();
    expect(box!.width).toBeGreaterThan(0);
    expect(box!.height).toBeGreaterThan(0);

    const snap = await viewerPage.snapshot();

    // Functional assertions (hard — a failure means a real regression).
    expect(snap.pointCloudCount, 'exactly one point cloud loaded').toBe(1);
    expect(snap.numVisiblePoints, 'points are actually rendered').toBeGreaterThan(0);
    expect(snap.visibleNodes, 'octree nodes are visible').toBeGreaterThan(0);
    expect(snap.pointBudget, 'point budget from lion.html honoured').toBe(1_000_000);

    // Performance: sample frame timing, plus CPU (CDP) and memory around the
    // same window.
    const cdp = await createCdpMetrics(page);
    const cpuStart = await cdp.sample();
    const frames = await viewerPage.measureFrames(3_000);
    const cpu = diffCpu(cpuStart, await cdp.sample());
    const memory = await readMemory(page);

    const report = {
      measuredAt: new Date().toISOString(),
      example: 'lion.html',
      pointBudget: snap.pointBudget,
      loadMs,
      render: {
        numVisiblePoints: snap.numVisiblePoints,
        visibleNodes: snap.visibleNodes,
        lruNumPoints: snap.lruNumPoints,
      },
      frames,
      cpu,
      memory,
    };
    const serialized = JSON.stringify(report, null, 2);
    // Logged for local runs, attached to the HTML report, and written to a
    // stable path for diffing against the committed baseline.
    console.log('[lion.html metrics]', serialized);
    await testInfo.attach('lion-metrics.json', {
      body: serialized,
      contentType: 'application/json',
    });
    mkdirSync(dirname(METRICS_OUTPUT), { recursive: true });
    writeFileSync(METRICS_OUTPUT, serialized);

    // Performance gates are catastrophe-level only, to avoid hardware flakiness.
    expect(loadMs, 'point cloud load time').toBeLessThan(PERF_THRESHOLDS.maxLoadMs);
    expect(frames.frames, 'sampler observed frames').toBeGreaterThan(0);
    expect(frames.fps, 'render frame rate').toBeGreaterThan(PERF_THRESHOLDS.minFps);

    // No page errors, console errors, or failed network requests during the run.
    expect(
      runtimeErrors,
      `unexpected runtime errors:\n${runtimeErrors.join('\n')}`,
    ).toEqual([]);
  });
});
