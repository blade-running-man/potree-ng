import * as THREE from "three";

/**
 * Pure geometry/volume helpers for {@link Volume} and its subclasses.
 * These depend only on three.js math types (Vector3/Box3/Sphere) and can be
 * unit-tested without a WebGL context.
 */

/** Metric volume of an axis-aligned box scaled by `scale`: |sx·sy·sz|. */
export function boxVolume(scale: THREE.Vector3): number {
	return Math.abs(scale.x * scale.y * scale.z);
}

/**
 * Metric volume of an ellipsoid with semi-axes `scale`: (4/3)·π·|sx·sy·sz|.
 * See https://en.wikipedia.org/wiki/Ellipsoid#Volume
 */
export function ellipsoidVolume(scale: THREE.Vector3): number {
	return (4 / 3) * Math.PI * Math.abs(scale.x * scale.y * scale.z);
}

/** Bounding sphere of a box: centre at the box centre, radius = half diagonal. */
export function boundingSphereFromBox(box: THREE.Box3): THREE.Sphere {
	return box.getBoundingSphere(new THREE.Sphere());
}

/**
 * The 24 vertices (12 edges × 2 endpoints) of the wireframe of a unit cube
 * spanning [-0.5, 0.5]³, in the order used by {@link BoxVolume}.
 */
export function unitBoxEdgeVertices(): THREE.Vector3[] {
	const V = THREE.Vector3;
	return [
		// bottom
		new V(-0.5, -0.5, 0.5), new V(0.5, -0.5, 0.5),
		new V(0.5, -0.5, 0.5), new V(0.5, -0.5, -0.5),
		new V(0.5, -0.5, -0.5), new V(-0.5, -0.5, -0.5),
		new V(-0.5, -0.5, -0.5), new V(-0.5, -0.5, 0.5),
		// top
		new V(-0.5, 0.5, 0.5), new V(0.5, 0.5, 0.5),
		new V(0.5, 0.5, 0.5), new V(0.5, 0.5, -0.5),
		new V(0.5, 0.5, -0.5), new V(-0.5, 0.5, -0.5),
		new V(-0.5, 0.5, -0.5), new V(-0.5, 0.5, 0.5),
		// sides
		new V(-0.5, -0.5, 0.5), new V(-0.5, 0.5, 0.5),
		new V(0.5, -0.5, 0.5), new V(0.5, 0.5, 0.5),
		new V(0.5, -0.5, -0.5), new V(0.5, 0.5, -0.5),
		new V(-0.5, -0.5, -0.5), new V(-0.5, 0.5, -0.5),
	];
}

export interface SphereFrameOptions {
	uSegments?: number;
	vSegments?: number;
	steps?: number;
	radius?: number;
}

/**
 * Line-segment vertices for the wireframe of a sphere of the given `radius`:
 * `uSegments` meridians plus `vSegments + 2` parallels, each sampled at
 * `steps` points. Vertices come in consecutive pairs (one line segment each).
 */
export function sphereFrameVertices(options: SphereFrameOptions = {}): THREE.Vector3[] {
	const { uSegments = 8, vSegments = 5, steps = 64, radius = 1 } = options;

	const points: THREE.Vector3[] = [];

	// meridians
	for (let uSegment = 0; uSegment < uSegments; uSegment++) {
		const alpha = (uSegment / uSegments) * Math.PI * 2;
		const dirx = Math.cos(alpha);
		const diry = Math.sin(alpha);

		for (let i = 0; i <= steps; i++) {
			const v = (i / steps) * Math.PI * 2;
			const vNext = v + (2 * Math.PI) / steps;

			const height = Math.sin(v);
			const xyAmount = Math.cos(v);
			const heightNext = Math.sin(vNext);
			const xyAmountNext = Math.cos(vNext);

			points.push(new THREE.Vector3(dirx * xyAmount * radius, diry * xyAmount * radius, height * radius));
			points.push(new THREE.Vector3(dirx * xyAmountNext * radius, diry * xyAmountNext * radius, heightNext * radius));
		}
	}

	// rings at the poles (simpler to implement than true parallels)
	for (let vSegment = 0; vSegment <= vSegments + 1; vSegment++) {
		let uh = vSegment / (vSegments + 1);
		uh = (1 - uh) * (-Math.PI / 2) + uh * (Math.PI / 2);
		const height = Math.sin(uh);

		for (let i = 0; i <= steps; i++) {
			const u = (i / steps) * Math.PI * 2;
			const uNext = u + (2 * Math.PI) / steps;

			const dirx = Math.cos(u);
			const diry = Math.sin(u);
			const dirxNext = Math.cos(uNext);
			const diryNext = Math.sin(uNext);

			const xyAmount = Math.sqrt(1 - height * height);

			points.push(new THREE.Vector3(dirx * xyAmount * radius, diry * xyAmount * radius, height * radius));
			points.push(new THREE.Vector3(dirxNext * xyAmount * radius, diryNext * xyAmount * radius, height * radius));
		}
	}

	return points;
}
