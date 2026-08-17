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
  /**
   * `globalName` is the window property the example assigns its
   * `Potree.Viewer` instance to. Every example so far uses `window.viewer`
   * (the default), except the Cesium integration pages
   * (`examples/cesium_*.html`), which run their own manual
   * render loop alongside a separate Cesium viewer and expose the Potree
   * side as `window.potreeViewer` instead — pass that explicitly for those.
   */
  constructor(
    private readonly page: Page,
    private readonly globalName: string = 'viewer',
  ) {}

  /** Navigate to an example and wait for the viewer global to be constructed.
   *  Defaults to `lion.html` (the baseline example) so existing specs that
   *  call `goto()` with no argument are unaffected. */
  async goto(examplePath = '/examples/lion.html'): Promise<void> {
    await this.page.goto(examplePath, { waitUntil: 'load' });
    // The viewer is created in the page's module script, which may run just
    // after the 'load' event — wait for the instance and its scene.
    await this.page.waitForFunction(
      (name) => !!(window as any)[name]?.scene,
      this.globalName,
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
      (name) => {
        const pcs = (window as any)[name]?.scene?.pointclouds;
        return !!pcs && pcs.length >= 1 && pcs[0].numVisiblePoints > 0;
      },
      this.globalName,
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
    return this.page.evaluate((name) => {
      const v = (window as any)[name];
      const P = (window as any).Potree;
      const pc = v.scene.pointclouds[0];
      return {
        pointCloudCount: v.scene.pointclouds.length,
        numVisiblePoints: pc?.numVisiblePoints ?? 0,
        visibleNodes: pc?.visibleNodes?.length ?? 0,
        pointBudget: v.getPointBudget(),
        lruNumPoints: P?.lru?.numPoints ?? 0,
      };
    }, this.globalName);
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

  // --- Perf harness ----------------------------------------------------------
  //
  // `render.renderNodes` measures are only emitted when the `Potree` UMD
  // namespace has `measureTimings` truthy (verified against
  // src/PotreeRenderer.js, gated by `exports.measureTimings`, which is the
  // same object as `window.Potree` per the UMD factory in
  // src/Potree.js/build/potree/potree.js: `factory(global.Potree = {})`).

  /** Enable the built-in renderNodes profiler (gates performance.measure calls). */
  async enableMeasureTimings(): Promise<void> {
    await this.page.evaluate(() => {
      (window as any).Potree.measureTimings = true;
    });
  }

  /**
   * Deterministically place the camera. `preset` is one of the fixed
   * viewpoints, derived from the loaded point cloud's world-space bounding
   * box (`viewer.scene.getBoundingBox()`, which applies `matrixWorld` —
   * unlike the pointcloud's local `boundingBox`). Camera state is set via
   * `View.setView(position, target, 0)` (duration 0 = synchronous placement),
   * the same `(position, target, duration)` entry point used by
   * `src/modules/Images360/Images360.js`, so no `THREE` global is needed (the
   * example pages don't expose one — `View.js` constructs its own
   * `THREE.Vector3` from the array args internally).
   */
  async setViewpoint(preset: 'overview' | 'interior' | 'closeup'): Promise<void> {
    await this.page.evaluate((p) => {
      const viewer = (window as any).viewer;
      const box = viewer.scene.getBoundingBox();
      const cx = (box.min.x + box.max.x) / 2;
      const cy = (box.min.y + box.max.y) / 2;
      const cz = (box.min.z + box.max.z) / 2;
      const sx = box.max.x - box.min.x;
      const sy = box.max.y - box.min.y;
      const sz = box.max.z - box.min.z;
      const size = Math.sqrt(sx * sx + sy * sy + sz * sz);

      const dist =
        p === 'overview'
          ? size * 1.2
          : p === 'interior'
            ? size * 0.4
            : size * 0.05; // closeup → most visible nodes / highest LOD (see BASELINE.md closeup caveat)

      viewer.scene.view.setView(
        [cx + dist, cy + dist, cz + dist],
        [cx, cy, cz],
        0,
      );
    }, preset);
    // Let visibility update + a few frames settle so the new frustum is drawn.
    await this.waitForFrames(5);
  }

  /**
   * Sample `render.renderNodes` measures over `frames` animation frames.
   * Clears existing measures, waits, then reads durations back.
   *
   * Note: while `Potree.measureTimings` is enabled, the viewer's own
   * `resolveTimings()` (src/viewer/viewer.js) clears ALL marks/measures
   * roughly once per second of elapsed render time as a side effect of
   * logging its own diagnostic table. A sampling window that spans one of
   * those clears will simply see fewer than `frames` entries (never a
   * failure) — keep `frames` small enough that a call finishes well under a
   * second on the target hardware to get full samples.
   */
  async sampleRenderNodes(frames = 120): Promise<number[]> {
    return this.page.evaluate(async (n) => {
      performance.clearMeasures('render.renderNodes');
      await new Promise<void>((resolve) => {
        let seen = 0;
        const tick = () => {
          seen++;
          if (seen >= n) resolve();
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
      return performance
        .getEntriesByType('measure')
        .filter((m) => m.name === 'render.renderNodes')
        .map((m) => m.duration);
    }, frames);
  }
}
