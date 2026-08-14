import * as THREE from "three";

/** Pure geometry/transform helpers for {@link ClipVolume}. */

/** 24 line-segment endpoints (12 edges) of a unit cube centred at the origin. */
export function boxFrameVertices(): THREE.Vector3[] {
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

/** 8 endpoints of the mid-plane outline + diagonals, all at z = 0. */
export function planeFrameVertices(): THREE.Vector3[] {
	const V = THREE.Vector3;
	return [
		new V(-0.5, -0.5, 0.0), new V(-0.5, 0.5, 0.0),
		new V(0.5, 0.5, 0.0), new V(0.5, -0.5, 0.0),
		new V(-0.5, 0.5, 0.0), new V(0.5, 0.5, 0.0),
		new V(-0.5, -0.5, 0.0), new V(0.5, -0.5, 0.0),
	];
}

export interface LocalAxes {
	x: THREE.Vector3;
	y: THREE.Vector3;
	z: THREE.Vector3;
}

/** Local basis vectors obtained by rotating the unit axes by a quaternion. */
export function localAxesFromQuaternion(q: THREE.Quaternion): LocalAxes {
	return {
		x: new THREE.Vector3(1, 0, 0).applyQuaternion(q).normalize(),
		y: new THREE.Vector3(0, 1, 0).applyQuaternion(q).normalize(),
		z: new THREE.Vector3(0, 0, 1).applyQuaternion(q).normalize(),
	};
}

/** Rotation amount in radians: `dir · offsetDegrees · π / 180`. */
export function rotationRadians(dir: number, offsetDegrees: number): number {
	return dir * offsetDegrees * Math.PI / 180;
}

/**
 * Transform a world-space axis into the object's local frame using the inverse
 * of its world matrix (as a direction, so translation is ignored), normalised.
 */
export function worldAxisToLocal(worldAxis: THREE.Vector3, matrixWorld: THREE.Matrix4): THREE.Vector3 {
	const invM = matrixWorld.clone().invert();
	const v = new THREE.Vector4(worldAxis.x, worldAxis.y, worldAxis.z, 0).applyMatrix4(invM);
	return new THREE.Vector3(v.x, v.y, v.z).normalize();
}

/**
 * Position delta for a clip-volume offset along an axis. In the local frame the
 * delta follows the corresponding local basis vector; in the global frame it
 * follows the world axis.
 */
export function offsetVector(
	cs: string,
	axis: string,
	dir: number,
	clipOffset: number,
	local: LocalAxes,
): THREE.Vector3 {
	const amount = dir * clipOffset;

	if (cs === "local") {
		const axisVec = axis === "x" ? local.x : axis === "y" ? local.y : local.z;
		return axisVec.clone().multiplyScalar(amount);
	}

	const v = new THREE.Vector3();
	if (axis === "x") {
		v.x = amount;
	} else if (axis === "y") {
		v.y = amount;
	} else if (axis === "z") {
		v.z = amount;
	}
	return v;
}
