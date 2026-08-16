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
