import { type Page, expect } from '@playwright/test';
import { sampleFrames, computeFrameStats } from '../utils/metrics';
import type { FrameStats } from '../utils/metrics';

// Page Object for a Potree example page. Encapsulates how to reach into the
// live viewer (readiness, rendered-point count, budget, frame timing) so specs
// stay declarative. Runtime property paths are the ones verified against src/:
// point clouds render via a custom raw-GL path, so visible-point counts come
// from potree's own per-cloud `numVisiblePoints`, not three's renderer.info.

export interface ViewerLoadResult {
  /** Wall-clock milliseconds from the call until points began rendering. */
  loadMs: number;
}

export interface ViewerSnapshot {
  pointCloudCount: number;
  numVisiblePoints: number;
  visibleNodes: number;
  pointBudget: number;
  lruNumPoints: number;
}

export class PotreeViewerPage {
  constructor(private readonly page: Page) {}

  /** Navigate to an example and wait for `window.viewer` to be constructed. */
  async goto(examplePath: string): Promise<void> {
    await this.page.goto(examplePath, { waitUntil: 'load' });
    // The viewer is created in the page's module script, which may run just
    // after the 'load' event — wait for the instance and its scene.
    await this.page.waitForFunction(
      () => !!(window as any).viewer?.scene,
      undefined,
      { timeout: 15_000 },
    );
  }

  /**
   * Wait until a point cloud is present AND has started rendering points.
   * `numVisiblePoints > 0` is the decisive "actually drawing" signal — it is
   * only set once an update frame has promoted loaded geometry into visible
   * nodes. Returns the elapsed time to reach that state.
   */
  async waitForPointCloudLoaded(timeout = 30_000): Promise<ViewerLoadResult> {
    const start = Date.now();
    await this.page.waitForFunction(
      () => {
        const pcs = (window as any).viewer?.scene?.pointclouds;
        return !!pcs && pcs.length >= 1 && pcs[0].numVisiblePoints > 0;
      },
      undefined,
      { timeout },
    );
    return { loadMs: Date.now() - start };
  }

  /** Potree replaces the render area with `#potree_failpage` when the viewer or
   *  a render pass throws. Its absence is the crash check. */
  async assertNoCrash(): Promise<void> {
    await expect(this.page.locator('#potree_failpage')).toHaveCount(0);
  }

  /** The WebGL canvas — a direct child of the render area. */
  canvas() {
    return this.page.locator('#potree_render_area > canvas');
  }

  /** Read a consistent snapshot of viewer state from the page. */
  async snapshot(): Promise<ViewerSnapshot> {
    return this.page.evaluate(() => {
      const v = (window as any).viewer;
      const P = (window as any).Potree;
      const pc = v.scene.pointclouds[0];
      return {
        pointCloudCount: v.scene.pointclouds.length,
        numVisiblePoints: pc?.numVisiblePoints ?? 0,
        visibleNodes: pc?.visibleNodes?.length ?? 0,
        pointBudget: v.getPointBudget(),
        lruNumPoints: P?.lru?.numPoints ?? 0,
      };
    });
  }

  /** Sample the render loop for `durationMs` and return frame statistics. */
  async measureFrames(durationMs = 3_000): Promise<FrameStats> {
    const sample = await this.page.evaluate(sampleFrames, durationMs);
    return computeFrameStats(sample);
  }
}
