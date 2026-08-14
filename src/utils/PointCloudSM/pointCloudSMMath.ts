/** Pure helpers for {@link PointCloudSM}. */

export interface ShadowLightLike {
	angle: number;
	distance: number;
	shadow: { mapSize: { width: number; height: number } };
}

export interface ShadowCameraParams {
	fov: number;
	aspect: number;
	near: number;
	far: number;
}

/**
 * Derive the shadow camera's perspective parameters from a spotlight-like
 * light: fov from the cone angle, aspect from the shadow map size, and a far
 * plane from the light distance (falling back to 10000 for an unbounded light).
 */
export function lightToCameraParams(light: ShadowLightLike): ShadowCameraParams {
	return {
		fov: (180 * light.angle) / Math.PI,
		aspect: light.shadow.mapSize.width / light.shadow.mapSize.height,
		near: 0.1,
		far: light.distance === 0 ? 10000 : light.distance,
	};
}
