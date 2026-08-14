/**
 * Pure geometry helpers for {@link Box3Helper}.
 *
 * These build the wireframe of an axis-aligned box from its min/max corners.
 * They accept a minimal structural vector shape so they can be unit-tested
 * without constructing any three.js objects.
 */

export interface Vec3Like {
	x: number;
	y: number;
	z: number;
}

/**
 * The 8 corners of an axis-aligned box, flattened to 24 floats
 * (8 vertices × xyz) in the corner order used by {@link Box3Helper}:
 *
 * ```
 * v0 = (min.x, min.y, min.z)   v4 = (min.x, max.y, min.z)
 * v1 = (max.x, min.y, min.z)   v5 = (max.x, max.y, min.z)
 * v2 = (max.x, min.y, max.z)   v6 = (max.x, max.y, max.z)
 * v3 = (min.x, min.y, max.z)   v7 = (min.x, max.y, max.z)
 * ```
 */
export function boxEdgePositions(min: Vec3Like, max: Vec3Like): Float32Array {
	return new Float32Array([
		min.x, min.y, min.z,
		max.x, min.y, min.z,
		max.x, min.y, max.z,
		min.x, min.y, max.z,
		min.x, max.y, min.z,
		max.x, max.y, min.z,
		max.x, max.y, max.z,
		min.x, max.y, max.z,
	]);
}

/**
 * The fixed edge index list: 12 edges × 2 endpoints = 24 indices into the
 * 8 vertices produced by {@link boxEdgePositions}.
 */
export function boxEdgeIndices(): Uint16Array {
	return new Uint16Array([
		0, 1, 1, 2, 2, 3, 3, 0,
		4, 5, 5, 6, 6, 7, 7, 4,
		0, 4, 1, 5, 2, 6, 3, 7,
	]);
}
