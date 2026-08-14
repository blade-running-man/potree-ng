/**
 * Pure screen-space helpers for {@link PolygonClipVolume}.
 */

export interface Vec2 {
	x: number;
	y: number;
}

/**
 * Convert pixel coordinates (origin top-left, y-down) into WebGL normalised
 * device coordinates in the range [-1, 1] (origin centre, y-up).
 *
 * - centre of the viewport → `{ x: 0, y: 0 }`
 * - top-left → `{ x: -1, y: 1 }`
 * - bottom-right → `{ x: 1, y: -1 }`
 */
export function screenToNDC(x: number, y: number, width: number, height: number): Vec2 {
	return {
		x: (2 * x) / width - 1,
		y: (-2 * y) / height + 1,
	};
}
