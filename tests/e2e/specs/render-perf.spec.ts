import fs from 'node:fs';
import path from 'node:path';
import { test } from '../fixtures/potree';
import { aggregateMeasures } from '../utils/measure-timings';

// Perf harness: captures the `render.renderNodes` CPU cost (the octree draw
// loop in src/PotreeRenderer.js, gated by `Potree.measureTimings`) at three
// fixed, deterministic camera placements so future refactors can be compared
// against a known baseline (tests/e2e/perf/BASELINE.md) rather than an
// arbitrary/interactive viewpoint.

const VIEWPOINTS = ['overview', 'interior', 'closeup'] as const;

const METRICS_OUTPUT = path.join('test-results', 'perf', 'render-perf.json');

test('render.renderNodes CPU profile across fixed viewpoints', async ({ viewerPage }, testInfo) => {
  await viewerPage.goto('/examples/lion.html');
  await viewerPage.waitForPointCloudLoaded();
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
    // Sanity: the profiler must have produced samples.
    if (stats.count === 0) throw new Error(`no render.renderNodes samples at ${vp}`);
  }

  const outDir = path.dirname(METRICS_OUTPUT);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(METRICS_OUTPUT, JSON.stringify(results, null, 2));
  await testInfo.attach('render-perf.json', {
    path: METRICS_OUTPUT,
    contentType: 'application/json',
  });
  console.log('[render-perf]', JSON.stringify(results, null, 2));
});
