/** Pure helpers for {@link VolumeTool}. */

/** Insertion scale from the picked point's camera-space Z (magnitude / divisor). */
export function insertionScaleFromViewZ(viewZ: number, divisor = 5): number {
	return Math.abs(viewZ / divisor);
}

/** Scale factor that keeps a label a constant `targetPx` pixels given its projected radius. */
export function labelScale(projectedRadius: number, targetPx = 70): number {
	return targetPx / projectedRadius;
}

/** Convert a volume from one units-per-metre scale to another (cubed factor). */
export function convertVolumeToDisplay(value: number, fromUnitsPerMeter: number, toUnitsPerMeter: number): number {
	return (value / fromUnitsPerMeter ** 3) * toUnitsPerMeter ** 3;
}
