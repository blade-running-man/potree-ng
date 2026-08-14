import * as THREE from "three";

/**
 * Pure measurement math for {@link Measure}: distances, areas, angles, the
 * circumscribed circle of three points, height extent and unit conversions.
 * All functions operate on plain `THREE.Vector3` positions and are unit-testable
 * without a scene.
 */

/** Shoelace area of a polygon projected onto the XY plane (Z is ignored). */
export function polygonArea2D(points: THREE.Vector3[]): number {
	let area = 0;
	let j = points.length - 1;

	for (let i = 0; i < points.length; i++) {
		const p1 = points[i];
		const p2 = points[j];
		area += (p2.x + p1.x) * (p1.y - p2.y);
		j = i;
	}

	return Math.abs(area / 2);
}

/** Sum of consecutive distances along a polyline, plus the closing edge when `closed`. */
export function totalDistance(points: THREE.Vector3[], closed: boolean): number {
	if (points.length === 0) {
		return 0;
	}

	let distance = 0;
	for (let i = 1; i < points.length; i++) {
		distance += points[i - 1].distanceTo(points[i]);
	}

	if (closed && points.length > 1) {
		distance += points[points.length - 1].distanceTo(points[0]);
	}

	return distance;
}

/** Angle (radians) at `corner` between the rays to `a` and `b`; 0 if either ray is degenerate. */
export function angleBetween(corner: THREE.Vector3, a: THREE.Vector3, b: THREE.Vector3): number {
	const v1 = new THREE.Vector3().subVectors(a, corner);
	const v2 = new THREE.Vector3().subVectors(b, corner);

	// avoid the error printed by three.js if the denominator is 0
	const denominator = Math.sqrt(v1.lengthSq() * v2.lengthSq());
	if (denominator === 0) {
		return 0;
	}
	return v1.angleTo(v2);
}

/** Interior angle at vertex `index` of a closed polygon (wrap-around); 0 if fewer than 3 points. */
export function polygonAngleAt(points: THREE.Vector3[], index: number): number {
	if (points.length < 3 || index >= points.length) {
		return 0;
	}

	const previous = (index === 0) ? points[points.length - 1] : points[index - 1];
	const point = points[index];
	const next = points[(index + 1) % points.length];

	return angleBetween(point, previous, next);
}

/** Intersection (closest-approach midpoint) of line P0P1 with line P2P3. */
export function lineToLineIntersection(
	P0: THREE.Vector3,
	P1: THREE.Vector3,
	P2: THREE.Vector3,
	P3: THREE.Vector3,
): THREE.Vector3 {
	const P = [P0, P1, P2, P3];

	const d = (m: number, n: number, o: number, p: number): number =>
		(P[m].x - P[n].x) * (P[o].x - P[p].x)
		+ (P[m].y - P[n].y) * (P[o].y - P[p].y)
		+ (P[m].z - P[n].z) * (P[o].z - P[p].z);

	const mua = (d(0, 2, 3, 2) * d(3, 2, 1, 0) - d(0, 2, 1, 0) * d(3, 2, 3, 2))
		/ (d(1, 0, 1, 0) * d(3, 2, 3, 2) - d(3, 2, 1, 0) * d(3, 2, 1, 0));

	const mub = (d(0, 2, 3, 2) + mua * d(3, 2, 1, 0)) / d(3, 2, 3, 2);

	const P01 = P1.clone().sub(P0);
	const P23 = P3.clone().sub(P2);

	const Pa = P0.clone().add(P01.multiplyScalar(mua));
	const Pb = P2.clone().add(P23.multiplyScalar(mub));

	return Pa.clone().add(Pb).multiplyScalar(0.5);
}

/** Centre of the circle through three points A, B, C. */
export function computeCircleCenter(A: THREE.Vector3, B: THREE.Vector3, C: THREE.Vector3): THREE.Vector3 {
	const AB = B.clone().sub(A);
	const AC = C.clone().sub(A);

	const N = AC.clone().cross(AB).normalize();

	const abDir = AB.clone().cross(N).normalize();
	const acDir = AC.clone().cross(N).normalize();

	const abOrigin = A.clone().add(B).multiplyScalar(0.5);
	const acOrigin = A.clone().add(C).multiplyScalar(0.5);

	const P0 = abOrigin;
	const P1 = abOrigin.clone().add(abDir);
	const P2 = acOrigin;
	const P3 = acOrigin.clone().add(acDir);

	return lineToLineIntersection(P0, P1, P2, P3);
}

/** Radius of the circle through three points A, B, C. */
export function circleRadius(A: THREE.Vector3, B: THREE.Vector3, C: THREE.Vector3): number {
	return computeCircleCenter(A, B, C).distanceTo(A);
}

export interface HeightExtent {
	min: number;
	max: number;
	height: number;
}

/** Minimum, maximum and span of the Z coordinates of the points. */
export function heightExtent(points: THREE.Vector3[]): HeightExtent {
	if (points.length === 0) {
		return { min: 0, max: 0, height: 0 };
	}

	let min = points[0].z;
	let max = points[0].z;
	for (const p of points) {
		min = Math.min(min, p.z);
		max = Math.max(max, p.z);
	}

	return { min, max, height: max - min };
}

/** Arithmetic mean of the points. */
export function centroid(points: THREE.Vector3[]): THREE.Vector3 {
	const c = new THREE.Vector3();
	if (points.length === 0) {
		return c;
	}
	for (const p of points) {
		c.add(p);
	}
	return c.divideScalar(points.length);
}

/** Convert a length from one units-per-metre scale to another. */
export function convertLength(value: number, fromUnitsPerMeter: number, toUnitsPerMeter: number): number {
	return (value / fromUnitsPerMeter) * toUnitsPerMeter;
}

/** Convert an area from one units-per-metre scale to another (squared factor). */
export function convertArea(value: number, fromUnitsPerMeter: number, toUnitsPerMeter: number): number {
	return (value / (fromUnitsPerMeter ** 2)) * (toUnitsPerMeter ** 2);
}
