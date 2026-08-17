import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '../fixtures/potree';
import { aggregateMeasures } from '../utils/measure-timings';

// Heavy-render perf harness: mirrors render-perf.spec.ts but targets
// examples/viewer.html (`pointclouds/vol_total`) instead of lion. vol_total is
// a geo-referenced (Swiss-coordinate) octree loaded through the 1.x binary
// decoder — a materially heavier scene than lion (larger extents, more nodes
// in view at the same fixed viewpoints), giving a richer signal for the
// perf/Morton work than lion alone. See tests/e2e/perf/BASELINE.md for the
// lion comparison numbers.

const VIEWPOINTS = ['overview', 'interior', 'closeup'] as const;

const METRICS_OUTPUT = path.join('test-results', 'perf', 'vol-total-perf.json');

test('render.renderNodes CPU profile across fixed viewpoints (vol_total)', async ({
  viewerPage,
  runtimeErrors,
}, testInfo) => {
  test.setTimeout(90_000);

  await viewerPage.goto('/examples/viewer.html');
  await viewerPage.waitForPointCloudLoaded(60_000);

  // Functional asserts before spending time on perf sampling.
  await viewerPage.assertNoCrash();
  const canvas = viewerPage.canvas();
  await expect(canvas).toBeVisible();

  const initialSnap = await viewerPage.snapshot();
  expect(initialSnap.pointCloudCount, 'exactly one point cloud loaded').toBe(1);
  expect(initialSnap.numVisiblePoints, 'points are actually rendered').toBeGreaterThan(0);
  expect(initialSnap.visibleNodes, 'octree nodes are visible').toBeGreaterThan(0);

  await viewerPage.enableMeasureTimings();

  const results: Record<string, unknown> = { measuredAt: new Date().toISOString() };

  for (const vp of VIEWPOINTS) {
    await viewerPage.setViewpoint(vp);
    const snap = await viewerPage.snapshot();
    const durations = await viewerPage.sampleRenderNodes(120);
    const stats = aggregateMeasures(durations);
    results[vp] = {
      nodes: snap.visibleNodes,
      points: snap.numVisiblePoints,
      renderNodesMs: stats,
    };
    // Log node/point counts per viewpoint so it's visible this scene is
    // heavier than lion's (see BASELINE.md for the lion figures).
    console.log(
      `[vol-total-perf] ${vp}: nodes=${snap.visibleNodes} points=${snap.numVisiblePoints} ` +
        `renderNodesMs.avg=${stats.avg.toFixed(3)} p95=${stats.p95.toFixed(3)}`,
    );
    if (stats.count === 0) throw new Error(`no render.renderNodes samples at ${vp}`);
  }

  const outDir = path.dirname(METRICS_OUTPUT);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(METRICS_OUTPUT, JSON.stringify(results, null, 2));
  await testInfo.attach('vol-total-perf.json', {
    path: METRICS_OUTPUT,
    contentType: 'application/json',
  });
  console.log('[vol-total-perf]', JSON.stringify(results, null, 2));

  expect(
    runtimeErrors,
    `unexpected runtime errors:\n${runtimeErrors.join('\n')}`,
  ).toEqual([]);
});
