import { test, expect } from '../fixtures/potree';

// Regression coverage for PotreeViewerPage#assertNoCrash(): Viewer#onCrash()
// (src/viewer/viewer.js) replaces the render area with a `#potree_failpage`
// div when the viewer or a render pass throws, and assertNoCrash() looks for
// that element with the CSS id selector `#potree_failpage`. The two must
// agree on the id string, or a real crash silently goes undetected by every
// spec that relies on assertNoCrash().
//
// These tests exercise the real Viewer#onCrash() method rather than
// hand-rolling the fail-page markup, so a regression in how viewer.js builds
// the id is caught here directly.

test.describe('crash detection', () => {
  test('assertNoCrash passes while the render area is healthy', async ({ viewerPage }) => {
    await viewerPage.goto('/examples/lion.html');
    await viewerPage.waitForPointCloudLoaded();

    await expect(viewerPage.assertNoCrash()).resolves.toBeUndefined();
  });

  test('assertNoCrash detects the fail page produced by Viewer#onCrash()', async ({
    page,
    viewerPage,
  }) => {
    await viewerPage.goto('/examples/lion.html');
    await viewerPage.waitForPointCloudLoaded();

    // Drive the actual production code path that builds the fail page.
    // onCrash() always rethrows the error it's given after appending the
    // fail page, so the injected error is expected and caught here.
    await page.evaluate(() => {
      const viewer = (window as any).viewer;
      try {
        viewer.onCrash(new Error('simulated crash for e2e crash-detection test'));
      } catch {
        // expected: onCrash() rethrows after building the fail page
      }
    });

    // Sanity check on the raw DOM: exactly one fail page was appended, with
    // the id assertNoCrash()'s selector expects. If viewer.js regresses to
    // writing the id as a literal "#potree_failpage" string, this element
    // exists but under a different id and this lookup finds nothing.
    await expect(page.locator('#potree_failpage')).toHaveCount(1);

    // The behaviour under test: assertNoCrash() must now detect the crash
    // instead of silently passing.
    await expect(viewerPage.assertNoCrash()).rejects.toThrow();
  });
});
