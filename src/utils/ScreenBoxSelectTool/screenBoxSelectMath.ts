import * as THREE from "three";

/** Pure screen/frustum helpers for {@link ScreenBoxSelectTool}. */

/** Midpoint of two screen points. */
export function screenCentroid(a: THREE.Vector2, b: THREE.Vector2): THREE.Vector2 {
	return new THREE.Vector2().addVectors(a, b).multiplyScalar(0.5);
}

/**
 * World-space size of a drag rectangle: the pixel delta normalised by the
 * viewport size and scaled by the (orthographic) frustum size.
 */
export function screenDeltaToWorldSize(
	start: THREE.Vector2,
	end: THREE.Vector2,
	size: THREE.Vector2,
	frustum: THREE.Vector2,
): THREE.Vector2 {
	return new THREE.Vector2().subVectors(end, start).divide(size).multiply(frustum);
}

export interface ScreenRect {
	left: number;
	top: number;
	width: number;
	height: number;
}

/** Axis-aligned rectangle (top-left + size) spanning two screen points. */
export function rectFromPoints(a: THREE.Vector2, b: THREE.Vector2): ScreenRect {
	const box = new THREE.Box2();
	box.expandByPoint(a);
	box.expandByPoint(b);
	return {
		left: box.min.x,
		top: box.min.y,
		width: box.max.x - box.min.x,
		height: box.max.y - box.min.y,
	};
}

export interface OrthoFrustum {
	left: number;
	right: number;
	top: number;
	bottom: number;
	near: number;
	far: number;
}

/** Orthographic frustum bounds centred on a box of the given scale. */
export function buildVolumeFrustum(scale: THREE.Vector3): OrthoFrustum {
	return {
		left: -scale.x / 2,
		right: +scale.x / 2,
		top: +scale.y / 2,
		bottom: -scale.y / 2,
		near: -scale.z / 2,
		far: +scale.z / 2,
	};
}

/** Ray from the far end of `ray` (advanced by `depth`) pointing back along it. */
export function inverseRay(ray: THREE.Ray, depth: number): THREE.Ray {
	return new THREE.Ray(
		ray.origin.clone().add(ray.direction.clone().multiplyScalar(depth)),
		ray.direction.clone().multiplyScalar(-1),
	);
}

export interface BoxDepth {
	centroid: THREE.Vector3;
	distance: number;
}

/**
 * Resolve a box's depth along `viewLine`: project the near/far hit points onto
 * the line, take the extremes (nearest of the near set, farthest of the far
 * set) and return their midpoint and separation. Null if either set is empty.
 */
export function resolveBoxDepth(
	nearPoints: THREE.Vector3[],
	farPoints: THREE.Vector3[],
	viewLine: THREE.Line3,
	origin: THREE.Vector3,
): BoxDepth | null {
	if (nearPoints.length === 0 || farPoints.length === 0) {
		return null;
	}

	const closestOnLine = nearPoints.map((p) => viewLine.closestPointToPoint(p, false, new THREE.Vector3()));
	const closest = closestOnLine.sort((a, b) => origin.distanceTo(a) - origin.distanceTo(b))[0];

	const farthestOnLine = farPoints.map((p) => viewLine.closestPointToPoint(p, false, new THREE.Vector3()));
	const farthest = farthestOnLine.sort((a, b) => origin.distanceTo(b) - origin.distanceTo(a))[0];

	const distance = closest.distanceTo(farthest);
	const centroid = new THREE.Vector3().addVectors(closest, farthest).multiplyScalar(0.5);

	return { centroid, distance };
}
