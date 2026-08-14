import * as THREE from "three";

/** Pure helpers for {@link MeasuringTool}. */

/** Radians → degrees in [0, 360). */
export function normalizeAzimuthDegrees(radians: number): number {
	let degrees = THREE.MathUtils.radToDeg(radians);
	if (degrees < 0) {
		degrees = 360 + degrees;
	}
	return degrees;
}

/** Scale factor that keeps an object a constant `targetPx` pixels given its projected radius. */
export function labelScale(projectedRadius: number, targetPx: number): number {
	return targetPx / projectedRadius;
}

/**
 * Convert normalised device coordinates ([-1, 1]) to pixel coordinates (no
 * y-flip), zeroing z. Matches the tool's `toPixelCoordinates` helper.
 */
export function ndcToPixel(ndc: THREE.Vector3, width: number, height: number): THREE.Vector3 {
	const r = ndc.clone().addScalar(1).divideScalar(2);
	r.x = r.x * width;
	r.y = r.y * height;
	r.z = 0;
	return r;
}
