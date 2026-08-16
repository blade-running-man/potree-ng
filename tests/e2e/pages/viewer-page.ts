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

export interface ViewState {
  /** Orbit distance to the pivot — the zoom discriminator. */
  radius: number;
  /** Orbit angles — the rotation discriminators. */
  yaw: number;
  pitch: number;
  /** Active camera world position (derived from the view each frame). */
  camPos: { x: number; y: number; z: number };
  /** Orbit pivot — moves only on pan. */
  pivot: { x: number; y: number; z: number };
  /** Distance from the camera to the pivot (≈ radius). */
  camDistToPivot: number;
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

  /** Wait until the render loop has advanced by at least `count` frames, so a
   *  view/material change made via the API has been applied and drawn. */
  async waitForFrames(count = 2): Promise<void> {
    const start = await this.page.evaluate(
      () => (window as any).Potree.framenumber as number,
    );
    await this.page.waitForFunction(
      (target) => ((window as any).Potree.framenumber as number) >= target,
      start + count,
      { timeout: 5_000 },
    );
  }

  /** Sample the render loop for `durationMs` and return frame statistics. */
  async measureFrames(durationMs = 3_000): Promise<FrameStats> {
    const sample = await this.page.evaluate(sampleFrames, durationMs);
    return computeFrameStats(sample);
  }

  // --- Interaction drivers (API-level) -------------------------------------
  //
  // Camera gestures are driven by feeding the OrbitControls delta accumulators
  // (`radiusDelta`/`yawDelta`/`pitchDelta`) — the exact fields the wheel/drag
  // input handlers write. This exercises the real `OrbitControls.update()` zoom
  // and rotate maths while staying deterministic and avoiding the browser's
  // legacy `mousewheel` event quirk. The controls apply and decay the deltas
  // over several frames, so callers pair these with `waitForControlsSettle()`.

  /** Read the current orbit/camera state. */
  async readView(): Promise<ViewState> {
    return this.page.evaluate(() => {
      const v = (window as any).viewer.scene.view;
      const cam = (window as any).viewer.scene.getActiveCamera();
      const p = v.getPivot();
      const dx = cam.position.x - p.x;
      const dy = cam.position.y - p.y;
      const dz = cam.position.z - p.z;
      return {
        radius: v.radius,
        yaw: v.yaw,
        pitch: v.pitch,
        camPos: { x: cam.position.x, y: cam.position.y, z: cam.position.z },
        pivot: { x: p.x, y: p.y, z: p.z },
        camDistToPivot: Math.sqrt(dx * dx + dy * dy + dz * dz),
      };
    });
  }

  /** Zoom in by pushing a negative radius delta (~`fraction` of the current
   *  radius), mirroring a wheel-up gesture. Use a negative fraction to zoom out. */
  async zoomIn(fraction = 0.5): Promise<void> {
    await this.page.evaluate((f) => {
      const oc = (window as any).viewer.orbitControls;
      oc.radiusDelta -= (window as any).viewer.scene.view.radius * f;
    }, fraction);
    await this.waitForControlsSettle();
  }

  /** Orbit the camera by feeding yaw/pitch deltas (radians), mirroring a
   *  left-drag gesture. */
  async orbit(yawDelta: number, pitchDelta: number): Promise<void> {
    await this.page.evaluate(
      ({ yd, pd }) => {
        const oc = (window as any).viewer.orbitControls;
        oc.yawDelta += yd;
        oc.pitchDelta += pd;
      },
      { yd: yawDelta, pd: pitchDelta },
    );
    await this.waitForControlsSettle();
  }

  /** Wait until the OrbitControls delta accumulators have decayed to ~0, i.e.
   *  the gesture has fully settled into the view. */
  async waitForControlsSettle(timeout = 3_000): Promise<void> {
    await this.page.waitForFunction(
      () => {
        const oc = (window as any).viewer.orbitControls;
        const pan = oc.panDelta ? Math.abs(oc.panDelta.x) + Math.abs(oc.panDelta.y) : 0;
        return (
          Math.abs(oc.radiusDelta) < 1e-3 &&
          Math.abs(oc.yawDelta) < 1e-4 &&
          Math.abs(oc.pitchDelta) < 1e-4 &&
          pan < 1e-4
        );
      },
      undefined,
      { timeout },
    );
  }

  /** The material attribute that drives point colouring (e.g. "rgba", "elevation"). */
  async getActiveAttribute(): Promise<string> {
    return this.page.evaluate(
      () => (window as any).viewer.scene.pointclouds[0].material.activeAttributeName,
    );
  }

  async setActiveAttribute(name: string): Promise<void> {
    await this.page.evaluate((n) => {
      (window as any).viewer.scene.pointclouds[0].material.activeAttributeName = n;
    }, name);
    // Let the raw-GL program recompile for the new define and draw a frame.
    await this.waitForFrames(2);
  }

  async getPointSize(): Promise<number> {
    return this.page.evaluate(
      () => (window as any).viewer.scene.pointclouds[0].material.size,
    );
  }

  async setPointSize(size: number): Promise<void> {
    await this.page.evaluate((s) => {
      (window as any).viewer.scene.pointclouds[0].material.size = s;
    }, size);
    await this.waitForFrames(2);
  }
}
