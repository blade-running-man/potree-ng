/**
 * Raw GLSL sources for Potree's materials, imported as strings via Vite's
 * `?raw` suffix and exposed as a single {@link Shaders} lookup keyed by
 * `<name>.<stage>`.
 *
 * All shaders target GLSL ES 3.00 (WebGL2). Two compile paths consume them and
 * handle the `#version` directive differently:
 *
 * - **Raw-GL renderer** — `pointcloud.vs` / `pointcloud.fs` are compiled by
 *   Potree's own `PotreeRenderer.Shader`, which bypasses three. They must
 *   declare `#version 300 es` as their first source line.
 * - **three.js WebGLRenderer** — the EDL and normalization shaders are compiled
 *   through three via `RawShaderMaterial` with `glslVersion = GLSL3`; three
 *   prepends `#version 300 es`, so those sources must NOT declare it themselves.
 */
import pointcloud_vs from './pointcloud.vs?raw';
import pointcloud_fs from './pointcloud.fs?raw';
import edl_vs from './edl.vs?raw';
import edl_fs from './edl.fs?raw';
import normalize_vs from './normalize.vs?raw';
import normalize_fs from './normalize.fs?raw';
import normalize_and_edl_fs from './normalize_and_edl.fs?raw';

/** Keys of the {@link Shaders} lookup: `<name>.vs` (vertex) / `<name>.fs` (fragment). */
export type ShaderName =
	| 'pointcloud.vs'
	| 'pointcloud.fs'
	| 'edl.vs'
	| 'edl.fs'
	| 'normalize.vs'
	| 'normalize.fs'
	| 'normalize_and_edl.fs';

export const Shaders: Readonly<Record<ShaderName, string>> = {
	/**
	 * Point cloud **vertex** shader (octree points). Computes per-point screen
	 * size (fixed / attenuated / adaptive), resolves point color from the active
	 * attribute (RGBA, elevation gradient, intensity, classification, return
	 * number, GPS time, source id, extra scalar fields, …), applies clipping
	 * (boxes / spheres / polygons), and modulates color by shadow-map visibility.
	 * Compiled by the raw-GL renderer; declares `#version 300 es` in-source.
	 */
	'pointcloud.vs': pointcloud_vs,
	/**
	 * Point cloud **fragment** shader. Rasterizes the point sprite by shape
	 * (square / circle / paraboloid), outputs color + opacity, packs EDL
	 * log-depth into alpha when EDL is enabled, applies weighted-splat blending,
	 * and writes paraboloid depth. Compiled by the raw-GL renderer.
	 */
	'pointcloud.fs': pointcloud_fs,
	/**
	 * Eye-Dome Lighting **vertex** shader — full-screen pass that forwards UVs to
	 * the EDL fragment shader. (Adapted from CloudCompare's qEDL.)
	 */
	'edl.vs': edl_vs,
	/**
	 * Eye-Dome Lighting **fragment** shader. Screen-space post-process that
	 * darkens pixels whose neighbours are closer to the camera, strengthening the
	 * point cloud's depth perception, and writes hyperbolic depth to the depth
	 * buffer. (Adapted from CloudCompare's qEDL.)
	 */
	'edl.fs': edl_fs,
	/**
	 * Normalization **vertex** shader — full-screen pass forwarding UVs to the
	 * normalization fragment shaders.
	 */
	'normalize.vs': normalize_vs,
	/**
	 * Weighted-splat normalization **fragment** shader. Divides the additively
	 * accumulated color buffer by its accumulated weight and restores depth, so
	 * overlapping point splats blend correctly.
	 */
	'normalize.fs': normalize_fs,
	/**
	 * Combined normalization + Eye-Dome Lighting **fragment** shader — performs
	 * the weighted-splat normalization and the EDL shading in a single pass.
	 */
	'normalize_and_edl.fs': normalize_and_edl_fs,
};
