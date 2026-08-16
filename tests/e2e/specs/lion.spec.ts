import { test, expect } from '../fixtures/potree';
import { PERF_THRESHOLDS } from '../utils/metrics';

// First E2E baseline: examples/lion.html. Verifies potree's functionality
// (viewer initialises, the point cloud loads and actually renders points, the
// configured budget is honoured, no console/page errors, no crash page) and
// collects performance metrics (load time, frame timing) with soft gates.

test.describe('examples/lion.html', () => {
  test('loads, renders points, and performs acceptably', async ({
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

    // Performance: sample the render loop while the scene draws.
    const frames = await viewerPage.measureFrames(3_000);

    const report = {
      loadMs,
      pointBudget: snap.pointBudget,
      numVisiblePoints: snap.numVisiblePoints,
      visibleNodes: snap.visibleNodes,
      lruNumPoints: snap.lruNumPoints,
      frames,
    };
    // Logged for local runs and attached to the HTML report for inspection.
    console.log('[lion.html metrics]', JSON.stringify(report, null, 2));
    await testInfo.attach('lion-metrics.json', {
      body: JSON.stringify(report, null, 2),
      contentType: 'application/json',
    });

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
