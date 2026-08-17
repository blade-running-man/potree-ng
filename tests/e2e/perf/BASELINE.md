# Potree E2E performance baseline — `examples/lion.html`

This document is the committed performance baseline for the Potree viewer, kept
in git history so future refactors can be compared against a known-good point.
It is produced by the Playwright E2E test `tests/e2e/specs/lion.spec.ts`.

Numbers are **hardware- and browser-dependent** — compare a future run against a
baseline **recorded on the same machine and browser build**, or re-record this
baseline first. Treat the figures as relative, not absolute.

## Environment (baseline run)

| | |
|---|---|
| Recorded | 2026-08-16 |
| Potree | 1.8.0 |
| three.js | 0.185.1 |
| Dataset | `pointclouds/lion_takanawa` (RGB octree) |
| Point budget | 1,000,000 |
| Browser | Chromium (Playwright 1.62.1, build 1234), **headed** |
| GPU flags | `--disable-gpu-vsync --disable-frame-rate-limit --ignore-gpu-blocklist` |
| OS | macOS 26.6.1 (25G76) |
| CPU | Apple M5 Pro (18 cores), arm64 |
| RAM | 24 GB |
| Node | v24.16.0 |

## How to reproduce

```bash
npm run build      # ensure build/potree is current (or: npm run test:e2e:build)
npm run test:e2e   # runs the suite headed on the real GPU
```

The baseline test prints `[lion.html metrics] { … }`, attaches
`lion-metrics.json` to the HTML report (`npm run test:e2e:report`), and writes
the machine-readable latest run to `test-results/perf/lion.json` (gitignored)
for diffing against the table below.

## Baseline metrics

Representative single run (streaming-dependent counts such as `visibleNodes` and
`lruNumPoints` vary a few % run to run; frame timing and CPU are stable).

### Load & render

| Metric | Value | Notes |
|---|---:|---|
| Load time (`loadMs`) | ~10 ms | navigation → first frame with rendered points |
| Visible points | 272,768 | `numVisiblePoints` at steady state (well under 1M budget) |
| Visible nodes | ~48–64 | octree nodes drawn |
| LRU points cached | ~90k–115k | `Potree.lru.numPoints` |

### Frame timing (3 s window, vsync/frame-cap OFF)

| Metric | Value |
|---|---:|
| FPS (avg) | ~678 |
| Avg frame time | ~1.48 ms |
| p95 frame time | ~2.7 ms |
| Min / Max frame time | ~0.2 ms / ~28 ms |
| Frames sampled | ~2035 |

Max frame time (~28 ms) is the initial warm-up frame; the steady p95 (~2.7 ms)
is the meaningful number.

### CPU (main thread, CDP Performance, same 3 s window)

| Metric | Value | Notes |
|---|---:|---|
| Main-thread busy | ~99% | **expected** — vsync off means the render loop runs flat-out |
| Script time total | ~2797 ms | over the window |
| **Script time / frame** | **~1.37 ms** | ← best refactor-comparison CPU metric |
| Recalc-style / Layout | ~26 ms / 0 ms | negligible (canvas app, no DOM churn) |

Because the frame cap is disabled, "% busy" is ~100% by design (throughput
mode). For comparing refactors, use **script time per frame** (`cpu.scriptMs /
frames.frames`) — CPU cost to produce one frame — not the busy percentage.

### Memory (JS heap)

| Metric | Value | Source |
|---|---:|---|
| Used JS heap | ~31 MB | `performance.memory.usedJSHeapSize` (bucketed) |
| Total JS heap | ~49 MB | `performance.memory.totalJSHeapSize` |
| Heap limit | ~4192 MB | `performance.memory.jsHeapSizeLimit` |
| Used JS heap (CDP) | ~21 MB | CDP `JSHeapUsedSize` (cross-check) |

`performance.memory` is bucketed (100 KB granularity) and Chrome-specific; the
CDP `JSHeapUsedSize` is a second, finer reading. Both track the JS heap only —
not GPU/WebGL buffer memory (see candidate metrics below).

## Currently measured

- Load time to first rendered points.
- Rendered/visible point & node counts; LRU cache size.
- Frame timing: avg / min / max / p95 frame time and FPS.
- Main-thread CPU: task / script / layout / recalc-style time and busy %.
- JS heap: used / total / limit (`performance.memory` + CDP cross-check).

## Candidate additional metrics (not yet implemented)

Ordered roughly by value for tracking Potree refactors:

- **Script time per frame trend** — already derivable; could be asserted with a
  soft regression gate once a stable machine baseline is agreed.
- **GPU frame time** — via `EXT_disjoint_timer_query_webgl2` timestamp queries,
  or CDP tracing GPU track. The only true GPU-cost signal (frame timing above is
  wall-clock, CPU-bound here).
- **GPU / WebGL memory** — CDP `Memory.getDOMCounters` / process memory, or
  tracking VRAM of point buffers. JS-heap numbers miss the largest allocations
  (vertex buffers on the GPU).
- **Long tasks** — `PerformanceObserver({ type: 'longtask' })` count & total
  during load and steady state; surfaces main-thread stalls / jank.
- **Draw calls / GL call count** — instrument `PotreeRenderer` `gl.drawArrays`
  count per frame; direct proxy for octree-traversal/batching efficiency.
- **Time-to-budget / streaming curve** — time and frames until `numVisiblePoints`
  reaches steady state (measures loader + worker-decode throughput).
- **Network** — bytes transferred, request count, and per-node load latency for
  the octree data (Playwright `page.on('response')` sizes / CDP Network).
- **Precise heap over time** — launch with `--enable-precise-memory-info` or use
  `performance.measureUserAgentSpecificMemory()` and sample across load →
  steady → idle to catch leaks/detached retention.
- **Interaction latency** — frames/ms from a zoom/rotate gesture until the view
  settles (extends the interaction specs with timing).
- **Full CPU profile / flamegraph** — CDP `Profiler` or `Tracing` for a one-off
  deep dive when a regression is found (too heavy for every run).

## Tier 0 baseline (pre-optimization) — `render.renderNodes` at fixed viewpoints

Produced by `tests/e2e/specs/render-perf.spec.ts`, which enables
`Potree.measureTimings` and samples the `render.renderNodes`
`performance.measure` (the octree draw loop in `src/PotreeRenderer.js`) for
120 animation frames at each of three deterministic camera placements
(`PotreeViewerPage.setViewpoint`, driven off `viewer.scene.getBoundingBox()` +
`View.setView(position, target, 0)`):

- **overview** — camera at `1.2x` the bounding-box diagonal from its center.
- **interior** — camera at `0.4x` the diagonal.
- **closeup** — camera at `0.05x` the diagonal (inside the bounding box —
  intended as a heavy-overdraw case; see caveat below).

Recorded on the same machine/browser as the table above (Chromium via
Playwright, headed, vsync/frame-cap disabled). Raw output:
`test-results/perf/render-perf.json` (gitignored).

| Viewpoint | Visible nodes | Visible points | `render.renderNodes` avg (ms) | p95 (ms) |
|---|---:|---:|---:|---:|
| overview | 31 | 72,346 | 0.033 | 0.100 |
| interior | 52 | 272,450 | 1.188 | 2.300 |
| closeup | 95 | 169,236 | 0.968 | 2.200 |

Notes:
- `count` was 120/120 samples at every viewpoint (no dropped samples from the
  viewer's periodic `performance.clearMeasures()` — see caveat below).
- Node/point counts fluctuate a few % run to run (same streaming variance as
  the load metrics above); `render.renderNodes` timing is the stable signal.
- **Closeup caveat**: placing the camera *inside* the bounding box (`0.05x`
  diagonal from center, looking at center) produces the most visible nodes
  (95, the highest LOD selection) but fewer visible points and lower avg
  render time than `interior` — near-plane clipping through the geometry
  reduces what's actually drawn, so this preset is not yet the guaranteed
  worst-case overdraw scenario the name implies. A future tuning pass should
  place `closeup` just outside the surface (e.g. offset from a point on the
  bounding sphere rather than scaled through the center) if a true
  worst-case fill-rate stress point is needed.
- **Renderer fix required to use this harness**: `Potree.measureTimings`
  enables `Viewer.resolveTimings()` (`src/viewer/viewer.js`), which every
  ~1s of elapsed render time called `Potree.resolveQueries(...)` — a
  GL-timer-query resolver that was never carried over in the r124→r185
  WebGL2 migration and doesn't exist. Since `resolveTimings()` runs inside
  the `setAnimationLoop` callback with no surrounding try/catch, the
  resulting `TypeError` silently killed the render loop (no further
  `requestAnimationFrame`/`setAnimationLoop` callbacks) after ~1s with
  `measureTimings` on — breaking the very feature this perf harness
  depends on. Fixed with a minimal guard (`typeof Potree.resolveQueries ===
  "function"`) so the diagnostic table just omits the GL-timer-query rows
  when unavailable, matching the existing "orphaned API from the WebGL2
  migration" pattern elsewhere in this codebase.

## Tier 0 result (after T0.1–T0.3; T0.4 skipped)

Measured at HEAD `f18ed69a` (T0.1 bake VAO, T0.2 hoist uniforms, T0.3
no-alloc scratch buffers; T0.4 UBO matrix batching skipped — see below).
Same harness, machine, and browser config as the pre-optimization baseline
above (`render-perf.spec.ts`, `Potree.measureTimings`, 120 frames per
viewpoint). Run 3 times back-to-back to average out run-to-run noise;
`render.renderNodes` avg/p95 below are the **median** of the 3 runs.

| Viewpoint | Nodes | Points | `render.renderNodes` avg before→after (ms) | p95 after (ms) |
|---|---:|---:|---:|---:|
| overview | 40 | 72,346 | 0.033 → 0.018 (median; −47%) | 0.100 |
| interior | 52–60 | 272,450 | 1.188 → 1.270 (median; +7%) | 3.600 |
| closeup | 95 | 169,236 | 0.968 → 0.788 (median; −19%) | 2.100 |

3-run raw data (avg ms):

| Viewpoint | Run 1 | Run 2 | Run 3 | Median | Mean |
|---|---:|---:|---:|---:|---:|
| overview | 0.014 | 0.020 | 0.018 | 0.018 | 0.017 |
| interior | 1.308 | 1.270 | 1.133 | 1.270 | 1.237 |
| closeup | 0.799 | 0.788 | 0.766 | 0.788 | 0.784 |

Interpretation:

- The clearest, most stable win is **closeup (~95 nodes): ~0.97 → ~0.79 ms
  avg (~19%)**, driven mainly by T0.1 (bake VAO) — the win scales with node
  count, consistent with the incremental Task 2/Task 4 measurements logged
  in the progress doc.
- overview/interior deltas are small and within run-to-run noise (overview
  even swings ±40% run to run around a sub-0.02ms mean; interior shows a
  nominal *increase* in one aggregate view) because lion is tiny (35–95
  nodes, already sub-ms / ~680 FPS at 3s window) — Tier 0 targets CPU/draw-
  call cost that only dominates on large (thousands-of-nodes) scenes. Do
  not read the interior "+7%" as a regression; it is noise at this scale
  (compare to the single-run swings already documented in the Task 1/2/4
  progress-log entries, e.g. interior ranging 0.921–1.308ms across prior
  runs with no code change between them).
- Point counts are byte-identical to the pre-optimization baseline at every
  viewpoint (72,346 / 272,450 / 169,236) → render output is unchanged (no
  visual regression). Node counts fluctuate a few percent run to run
  (documented streaming variance, not a code effect) but closeup is stable
  at 95 across all 3 runs, same as the pre-optimization baseline.
- **T0.4 (UBO matrix batching) was SKIPPED**: it is the only shader-touching
  Tier 0 item (highest regression risk, since it affects all rendering
  paths), its benefit is unmeasurable on lion (a scene this small is
  dominated by per-frame constant overhead, not per-node matrix-upload
  cost), and the project roadmap frames UBO batching as a GPU-driven /
  WebGPU-track stepping stone rather than a WebGL2-tier win. Revisitable
  under that track, or with a large-scene (thousands-of-nodes) fixture that
  can actually exercise the cost T0.4 targets.

## Heavy-scene perf (vol_total)

Produced by `tests/e2e/specs/vol-total-perf.spec.ts`, the same
`render.renderNodes`-at-fixed-viewpoints harness as the lion Tier 0 tables
above, targeting `examples/viewer.html` (`pointclouds/vol_total`) instead of
lion. vol_total is a geo-referenced (Swiss-coordinate) octree loaded through
the same 1.x binary decoder as lion but is a substantially larger local
dataset, giving a heavier, more realistic signal for perf/Morton work than
lion alone. Same machine/browser config as above (headed Chromium, vsync/
frame-cap disabled). Raw output: `test-results/perf/vol-total-perf.json`
(gitignored).

| Viewpoint | Visible nodes | Visible points | `render.renderNodes` avg (ms) | p95 (ms) |
|---|---:|---:|---:|---:|
| overview | 38 | 444,333 | 0.018 | 0.100 |
| interior | 42 | 498,868 | 0.115 | 1.100 |
| closeup | 24 | 317,835 | 0.375 | 1.800 |

(Single-run measurement; `count` was 120/120 samples at every viewpoint. Node/
point counts fluctuate a few % run to run — same streaming variance as lion.)

### vol_total vs. lion (same harness, same machine)

| Viewpoint | lion points | vol_total points | lion nodes | vol_total nodes |
|---|---:|---:|---:|---:|
| overview | 72,346 | 444,333 (**6.1x**) | 31 | 38 |
| interior | 272,450 | 498,868 (**1.8x**) | 51 | 42 |
| closeup | 169,236 | 317,835 (**1.9x**) | 95 | 24 |

vol_total renders **1.8x–6.1x more points** than lion at every fixed
viewpoint, confirming it is a genuinely heavier scene — it exercises the
draw/traversal path with materially more geometry per frame, despite a
comparable or lower node count (vol_total's octree nodes carry more points on
average than lion's). This makes it a better regression signal than lion
alone for point-throughput-sensitive changes (e.g. the Morton-order work),
even though `render.renderNodes` (CPU-side traversal cost) stays sub-millisecond
here too — lion and vol_total are both far below the scale (thousands of
nodes) where Tier 0's CPU-side wins are expected to show up; see the T0.4
skip rationale above.

## Tier 1.1 (Morton) result + GATE 1 verdict

Produced by the same `render-perf.spec.ts` harness (`render.renderNodes`
`performance.measure`, 120 frames/viewpoint, 3 runs averaged) after wiring the
Morton/Z-order point reorder (`src/modules/loader/2.0/mortonReorder.js`) into
the decode path — see Task 6/7/7b in the progress log for implementation
detail.

- **Morton (Tier 1.1b) on lion, 1.x decode path (`BinaryDecoder`):** closeup
  (95 nodes, the highest-node-count/most-overdraw-sensitive viewpoint)
  `render.renderNodes` avg **~0.788 → ~0.741 ms (mean of 3 runs, ≈6%
  improvement)**. Individual runs ranged 0.705–0.774 ms, i.e. the pre-Morton
  GATE 0 median (0.788) falls inside that spread — this delta is **at the
  edge of run-to-run noise**, not a clean signal. overview and interior are
  indistinguishable from their pre-Morton GATE 0 numbers. Visible point/node
  counts are unchanged from GATE 0 at every viewpoint → render output is
  byte-identical (Morton only reorders point storage, it doesn't change what
  is drawn).
- **2.0 format + brotli decoders (Task 7b):** the Morton reorder was mirrored
  into `src/modules/loader/2.0/DecoderWorker.js` and `DecoderWorker_brotli.js`
  (inspection-verified: same `attributeBuffers` layout, node-relative
  positions, reorder applied consistently across attributes). **No local 2.0
  dataset exists** to load through this path, so it is **unmeasured by
  design** — correctness rests on inspection + the shared unit-tested
  `mortonReorder.js` helper (8/8 Vitest), not on e2e evidence.
- **Heavy scene (vol_total) context:** vol_total renders ~6x lion's points at
  overview (444k vs 72k) but still only spans **~24–42 visible nodes** across
  viewpoints — the same order of magnitude as lion (24–95 nodes). Both local
  datasets are far below the thousands-of-nodes / heavy-overdraw regime where
  Tier 0 (×1.5–3 CPU, roadmap §9) and Morton (~×5 `GL_POINTS`, research F4)
  are verified to pay off; vol_total was not re-run with Morton specifically
  because the 1.x reorder already applies uniformly to any 1.x-decoded
  dataset (lion and vol_total share the same `BinaryDecoder` code path) and
  the lion result above is the representative signal.
- **Honest interpretation:** on the datasets available locally (all lion-
  scale: ≤~500k points, ≤~95 visible nodes per viewpoint), neither the CPU/
  draw-call term (Tier 0) nor the `GL_POINTS` fill/cache-locality term
  (Morton) is the rendering bottleneck — lion and vol_total both render in
  sub-millisecond `render.renderNodes` time regardless of these
  optimizations. Measured deltas are therefore modest; the clearest, most
  reproducible win across the whole effort remains Tier 0's **bake-VAO
  closeup result (~19%, GATE 0)**. The large gains verified in the research
  ([07] F1/F4: ~×5 Morton, ~×10 compute rasterizer) require big/dense
  datasets (thousands of nodes, genuine overdraw) that are not present in
  this repo. All changes across Tier 0 + Tier 1.1 are **correctness-safe**
  (render output identical at every measured viewpoint, full e2e suite
  green) and **disk-format-free** (reorder happens client-side at decode
  time, no PotreeConverter/format changes).
- **GATE 1 verdict:** The low-risk WebGL2 path (Tier 0 micro-optimizations +
  Tier 1.1 Morton reorder) is implemented, tested, and shipped with no
  regressions. The remaining order-of-magnitude headroom identified by the
  research — a compute `atomicMin` rasterizer (~×10 average, ×10–100 on
  overdraw; [07] F1–F4) — is **fundamentally WebGPU-only**: it needs compute
  shaders and 64-bit atomics, neither of which WebGL2 exposes ([08] §6/§11).
  So further gains are **not** more WebGL2 micro-optimization — they require
  the WebGPU rewrite, which is **gated** (see
  `docs/potree-core/09-webgpu-gated-plan.md`, authored but not committed —
  `docs/` is gitignored). **Recommendation:** to actually *measure* the
  Tier 0/Morton wins beyond "correctness-safe, modest on lion-scale data",
  obtain or synthesize a large/dense test dataset (thousands of nodes); to
  *exceed* Tier 0/Morton's headroom, pursue the gated WebGPU track — but only
  after that track's own open questions (64-bit atomics in browser WebGPU,
  measured WebGPU-vs-native gap) are resolved.
