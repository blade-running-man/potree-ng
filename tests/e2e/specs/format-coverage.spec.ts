import { test, expect } from '../fixtures/potree';

// Data-driven smoke coverage for alternate/heavier local point-cloud formats,
// beyond lion's default 1.x binary octree: EPT binary, LAZ (laz-perf WASM
// decode), and matcap/normals shading. Each dataset is served locally by the
// static server (see playwright.config.ts) — no network access.
//
// For EPT binary in particular, the `runtimeErrors` assertion is the point:
// it locks in a prior fix for an `initialRange` TypeError that regressed EPT
// rendering. Do NOT allowlist that error class if it reappears — it means the
// regression is back.

const PAGES = [
  { name: 'EPT binary', path: '/examples/ept_binary.html' },
  { name: 'LAZ (laz-perf)', path: '/examples/lion_laz.html' },
  { name: 'matcap/normals', path: '/examples/matcap.html' },
  { name: 'clipping volume', path: '/examples/clipping_volume.html' },
];

for (const { name, path } of PAGES) {
  test(`renders ${name}`, async ({ viewerPage, runtimeErrors }) => {
    test.setTimeout(90_000);

    await viewerPage.goto(path);
    await viewerPage.waitForPointCloudLoaded(60_000);

    await viewerPage.assertNoCrash();
    await expect(viewerPage.canvas()).toBeVisible();

    const snap = await viewerPage.snapshot();
    expect(snap.numVisiblePoints, `${name}: points are actually rendered`).toBeGreaterThan(0);

    expect(
      runtimeErrors,
      `${name}: unexpected runtime errors:\n${runtimeErrors.join('\n')}`,
    ).toEqual([]);
  });
}
