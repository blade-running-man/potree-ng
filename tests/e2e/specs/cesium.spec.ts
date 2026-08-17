import { test, expect } from '../fixtures/potree';
import { PotreeViewerPage } from '../pages/viewer-page';

// Cesium integration coverage: examples/cesium_sorvilier.html and
// examples/cesium_ca13.html both layer a Potree viewer and a Cesium globe in
// the same page, syncing the Cesium camera to Potree's every frame (see the
// `loop()` function in each example). Unlike every other example, these pages
// do NOT assign `window.viewer` — they use `window.potreeViewer` (with a
// separate `window.cesiumViewer` for the Cesium side), because they disable
// each viewer's default render loop (`useDefaultRenderLoop: false`) and drive
// both manually. `PotreeViewerPage` takes the global name as a constructor
// arg for exactly this case.

const LOCAL_HOST = '127.0.0.1:5183';

/**
 * Cesium's globe/imagery layer reaches out to remote hosts (OpenStreetMap
 * tile servers, Cesium ion's asset/terrain endpoints) that the offline e2e
 * harness (`scripts/static-server.mjs`, no network) cannot serve — those
 * failed requests/console errors are expected noise, not a signal. This
 * filters `runtimeErrors` down to entries that still matter offline:
 *
 *  - `pageerror:` entries are never tolerated. They mean a script actually
 *    threw (an uncaught exception), the exact class of bug this suite exists
 *    to catch (e.g. the Cesium + orthographic-camera crash in #1279, if it
 *    were to trigger here) — no amount of "it's just Cesium's network" makes
 *    an uncaught JS exception OK.
 *  - Entries mentioning "Potree" or "pointcloud" are never tolerated either,
 *    even if they also reference a remote URL — that combination would mean
 *    Potree's own code is what's reaching out or erroring, not Cesium's
 *    basemap.
 *  - Everything else is only tolerated if it does NOT reference the local
 *    dev server: a failure that never left 127.0.0.1:5183 is a real local
 *    regression (a missing local asset, a broken local script), not offline
 *    map noise, so it still fails the test.
 */
function isTolerableOfflineCesiumNoise(entry: string): boolean {
  if (entry.startsWith('pageerror:')) return false;
  if (/potree|pointcloud/i.test(entry)) return false;
  return !entry.includes(LOCAL_HOST);
}

test.describe('examples/cesium_sorvilier.html', () => {
  test('renders the local point cloud alongside Cesium, offline', async ({
    page,
    runtimeErrors,
  }) => {
    test.setTimeout(90_000);

    const viewerPage = new PotreeViewerPage(page, 'potreeViewer');
    await viewerPage.goto('/examples/cesium_sorvilier.html');
    await viewerPage.waitForPointCloudLoaded(60_000);

    await viewerPage.assertNoCrash();
    await expect(viewerPage.canvas()).toBeVisible();

    const snap = await viewerPage.snapshot();
    expect(snap.numVisiblePoints, 'Potree cloud is actually rendered').toBeGreaterThan(0);

    const seriousErrors = runtimeErrors.filter((e) => !isTolerableOfflineCesiumNoise(e));
    expect(
      seriousErrors,
      `unexpected runtime errors (offline map-tile noise already filtered out):\n${seriousErrors.join('\n')}\n\nfull capture:\n${runtimeErrors.join('\n')}`,
    ).toEqual([]);
  });
});

test.describe('examples/cesium_ca13.html', () => {
  test('renders the remote CA13 point cloud alongside Cesium, online', async ({
    page,
    runtimeErrors,
  }) => {
    // Needs network access plus the external opentopography server at
    // 5.9.65.151, which is out of this repo's control — gated off by default
    // so the offline suite never depends on it.
    test.skip(
      !process.env.RUN_NETWORK_TESTS,
      'requires network + external CA13 server (set RUN_NETWORK_TESTS=1)',
    );
    test.setTimeout(180_000);

    const viewerPage = new PotreeViewerPage(page, 'potreeViewer');
    await viewerPage.goto('/examples/cesium_ca13.html');
    await viewerPage.waitForPointCloudLoaded(150_000);

    await viewerPage.assertNoCrash();
    await expect(viewerPage.canvas()).toBeVisible();

    const snap = await viewerPage.snapshot();
    expect(snap.numVisiblePoints, 'CA13 cloud is actually rendered').toBeGreaterThan(0);

    // Online, so real requests are expected to succeed — no offline-noise
    // filter needed; any captured error here is a genuine regression.
    expect(
      runtimeErrors,
      `unexpected runtime errors:\n${runtimeErrors.join('\n')}`,
    ).toEqual([]);
  });
});
