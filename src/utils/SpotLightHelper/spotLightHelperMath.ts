/** Pure geometry helpers for {@link SpotLightHelper}. */

export interface ConeScale {
	coneWidth: number;
	coneLength: number;
}

/**
 * Scale of the cone frustum from the spotlight's cone `angle` and `distance`.
 * `coneLength` falls back to 1000 for an unbounded light (distance ≤ 0).
 *
 * Note: preserves the original `tan(angle * 0.5)` factor (three's own
 * SpotLightHelper uses `tan(angle)`; changing it would alter the drawn width).
 */
export function computeConeScale(angle: number, distance: number): ConeScale {
	const coneLength = distance > 0 ? distance : 1000;
	const coneWidth = coneLength * Math.tan(angle * 0.5);
	return { coneWidth, coneLength };
}

/**
 * The fixed wireframe of the spotlight cone: an apex-to-base square pyramid,
 * 9 line segments = 18 vertices = 54 floats, on the unit cone (base at z = -1).
 */
export function frustumPositions(): Float32Array {
	return new Float32Array([
		+0, +0, +0, +0, +0, -1,

		+0, +0, +0, -1, -1, -1,
		+0, +0, +0, +1, -1, -1,
		+0, +0, +0, +1, +1, -1,
		+0, +0, +0, -1, +1, -1,

		-1, -1, -1, +1, -1, -1,
		+1, -1, -1, +1, +1, -1,
		+1, +1, -1, -1, +1, -1,
		-1, +1, -1, -1, -1, -1,
	]);
}
