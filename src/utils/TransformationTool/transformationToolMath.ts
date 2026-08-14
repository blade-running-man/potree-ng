import * as THREE from "three";

/** Pure gizmo math for {@link TransformationTool}. THREE math types only. */

export type Alignment = [number, number, number];

/**
 * Signed angle (radians) from `from` to `to` about `center`, with the sign
 * taken from the rotation direction relative to `normal`. Returns NaN if the
 * vectors are degenerate (caller should guard).
 */
export function signedAngleAround(
	center: THREE.Vector3,
	from: THREE.Vector3,
	to: THREE.Vector3,
	normal: THREE.Vector3,
): number {
	const v1 = from.clone().sub(center).normalize();
	const v2 = to.clone().sub(center).normalize();

	const angle = Math.acos(v1.dot(v2));
	const sign = Math.sign(v1.cross(v2).dot(normal)); // v1.cross mutates v1, but angle is already computed
	return angle * sign;
}

export interface ScaleDelta {
	diffScale: THREE.Vector3;
	diffPosition: THREE.Vector3;
}

/**
 * Scale and position deltas for dragging a scale handle from `pivot` to
 * `iOnLine` (both world-space points on the handle axis), given the handle
 * `alignment` and the object's world matrix.
 */
export function computeScaleDelta(
	iOnLine: THREE.Vector3,
	pivot: THREE.Vector3,
	alignment: Alignment,
	objectMatrixWorld: THREE.Matrix4,
): ScaleDelta {
	const direction = alignment.reduce((a, v) => a + v, 0);

	const toObjectSpace = objectMatrixWorld.clone().invert();
	const iOnLineOS = iOnLine.clone().applyMatrix4(toObjectSpace);
	const pivotOS = pivot.clone().applyMatrix4(toObjectSpace);
	const diffOS = new THREE.Vector3().subVectors(iOnLineOS, pivotOS);
	const dragDirectionOS = diffOS.clone().normalize();
	if (iOnLine.distanceTo(pivot) === 0) {
		dragDirectionOS.set(0, 0, 0);
	}
	const dragDirection = dragDirectionOS.dot(new THREE.Vector3(...alignment));

	const diff = new THREE.Vector3().subVectors(iOnLine, pivot);
	const diffScale = new THREE.Vector3(...alignment).multiplyScalar(diff.length() * direction * dragDirection);
	const diffPosition = diff.clone().multiplyScalar(0.5);

	return { diffScale, diffPosition };
}

export interface HandleEuler {
	x: number;
	y: number;
	z: number;
}

/**
 * Euler component (radians) for the three rotation-ring handles, chosen by the
 * octant of the camera position in object space. Returns null on an axis
 * boundary (camObjectPos.x or .y === 0), where the original leaves the handles
 * unchanged.
 */
export function rotationHandleEulerZ(camObjectPos: THREE.Vector3): HandleEuler | null {
	const H = Math.PI / 2;
	const { x, y, z } = camObjectPos;
	const above = z > 0;

	if (above) {
		if (x > 0 && y > 0) return { x: 1 * H, y: 3 * H, z: 0 * H };
		if (x < 0 && y > 0) return { x: 1 * H, y: 2 * H, z: 1 * H };
		if (x < 0 && y < 0) return { x: 2 * H, y: 2 * H, z: 2 * H };
		if (x > 0 && y < 0) return { x: 2 * H, y: 3 * H, z: 3 * H };
	} else {
		if (x > 0 && y > 0) return { x: 0 * H, y: 0 * H, z: 0 * H };
		if (x < 0 && y > 0) return { x: 0 * H, y: 1 * H, z: 1 * H };
		if (x < 0 && y < 0) return { x: 3 * H, y: 1 * H, z: 2 * H };
		if (x > 0 && y < 0) return { x: 3 * H, y: 0 * H, z: 3 * H };
	}

	return null;
}

/** Local position of a focus handle for the given axis alignment. */
export function focusHandlePosition(alignment: Alignment): THREE.Vector3 {
	const off = 0.8;
	const p = new THREE.Vector3();

	if (alignment[0] === 1) {
		p.set(1, off, -off);
	} else if (alignment[0] === -1) {
		p.set(-1, -off, -off);
	} else if (alignment[1] === 1) {
		p.set(-off, 1, -off);
	} else if (alignment[1] === -1) {
		p.set(off, -1, -off);
	} else if (alignment[2] === 1) {
		p.set(off, off, 1);
	} else if (alignment[2] === -1) {
		p.set(-off, off, -1);
	}

	return p.multiplyScalar(0.5);
}

/**
 * World-space camera position for focusing along a handle: the alignment axis
 * scaled to twice the object's max scale over the handle length, in world space.
 */
export function focusCameraPosition(
	selectionScale: THREE.Vector3,
	alignment: Alignment,
	selectionMatrixWorld: THREE.Matrix4,
): THREE.Vector3 {
	const maxScale = Math.max(...selectionScale.toArray());
	const handleLength = Math.abs(selectionScale.dot(new THREE.Vector3(...alignment)));
	const pos = new THREE.Vector3(...alignment).multiplyScalar(2 * maxScale / handleLength);
	return pos.applyMatrix4(selectionMatrixWorld);
}

/**
 * Node scale that keeps a handle a constant ~7px on screen, corrected for the
 * parent's world scale and the node's own rotation (per-axis absolute value).
 */
export function handleConstantScale(
	projectedRadius: number,
	parentWorldScale: THREE.Vector3,
	nodeRotation: THREE.Euler,
): THREE.Vector3 {
	const s = 7 / projectedRadius;
	const scale = new THREE.Vector3(s, s, s).divide(parentWorldScale);

	const rot = new THREE.Matrix4().makeRotationFromEuler(nodeRotation);
	const rotInv = rot.clone().invert();

	scale.applyMatrix4(rotInv);
	scale.x = Math.abs(scale.x);
	scale.y = Math.abs(scale.y);
	scale.z = Math.abs(scale.z);

	return scale;
}
