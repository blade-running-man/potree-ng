/** Pure helpers for {@link ClippingTool}. */

/** Whether the polygon should auto-finish, i.e. the marker count exceeds the max. */
export function shouldFinishPolygon(markerCount: number, maxVertices: number): boolean {
	return markerCount > maxVertices;
}
