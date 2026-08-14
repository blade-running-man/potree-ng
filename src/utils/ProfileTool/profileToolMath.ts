/** Pure helpers for {@link ProfileTool}. */

/**
 * Scale factor that keeps a unit-radius object a constant `targetPx` pixels on
 * screen, given its projected radius. (Diverges to Infinity as the projected
 * radius approaches 0.)
 */
export function screenConstantScale(projectedRadius: number, targetPx: number): number {
	return targetPx / projectedRadius;
}
