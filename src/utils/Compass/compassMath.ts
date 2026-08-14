/** Pure helpers for {@link Compass}. */

/**
 * CSS transform that rotates the compass to point to north for a given azimuth
 * (radians, clockwise-from-north as returned by `Utils.computeAzimuth`).
 */
export function azimuthToCssTransform(azimuth: number): string {
	return `rotateZ(${-azimuth}rad)`;
}
