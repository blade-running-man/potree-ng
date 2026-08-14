import * as THREE from "three";

/**
 * Pure polyline/segment helpers for {@link Profile}. They operate on
 * `THREE.Vector3` data and can be unit-tested without a scene.
 */

export interface Segment {
	start: THREE.Vector3;
	end: THREE.Vector3;
}

export interface ProfileBounds {
	min: THREE.Vector3;
	max: THREE.Vector3;
	centroid: THREE.Vector3;
}

/** Split a polyline into adjacent-pair segments (n points → n−1 segments), cloning endpoints. */
export function segmentsFromPoints(points: THREE.Vector3[]): Segment[] {
	const segments: Segment[] = [];
	for (let i = 0; i < points.length - 1; i++) {
		segments.push({ start: points[i].clone(), end: points[i + 1].clone() });
	}
	return segments;
}

/** Horizontal (XY-plane) distance between two points; Z is ignored. */
export function segmentHorizontalLength(start: THREE.Vector3, end: THREE.Vector3): number {
	return start.clone().setZ(0).distanceTo(end.clone().setZ(0));
}

/** Midpoint of a segment. */
export function segmentCenter(start: THREE.Vector3, end: THREE.Vector3): THREE.Vector3 {
	return new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
}

/**
 * World matrix of the oriented selection box for a profile segment: scaled to
 * (horizontalLength, height, width), centred on the segment, with its broadside
 * facing the segment normal in the XY plane.
 */
export function segmentBoxMatrix(
	start: THREE.Vector3,
	end: THREE.Vector3,
	width: number,
	height: number,
): THREE.Matrix4 {
	const box = new THREE.Object3D();

	box.scale.set(segmentHorizontalLength(start, end), height, width);
	box.up.set(0, 0, 1);

	const center = segmentCenter(start, end);
	const diff = new THREE.Vector3().subVectors(end, start);
	const target = new THREE.Vector3(diff.y, -diff.x, 0);

	box.position.set(0, 0, 0);
	box.lookAt(target);
	box.position.copy(center);

	box.updateMatrixWorld();
	return box.matrixWorld;
}

/** Component-wise min/max and mean (centroid) of all points. */
export function profileBounds(points: THREE.Vector3[]): ProfileBounds {
	if (points.length === 0) {
		return {
			min: new THREE.Vector3(),
			max: new THREE.Vector3(),
			centroid: new THREE.Vector3(),
		};
	}

	const min = points[0].clone();
	const max = points[0].clone();
	const centroid = new THREE.Vector3();

	for (const point of points) {
		min.min(point);
		max.max(point);
		centroid.add(point);
	}
	centroid.multiplyScalar(1 / points.length);

	return { min, max, centroid };
}

/** Z of the box centre given the profile's min/max Z. */
export function boxZCenter(minZ: number, maxZ: number): number {
	return minZ + (maxZ - minZ) / 2;
}
