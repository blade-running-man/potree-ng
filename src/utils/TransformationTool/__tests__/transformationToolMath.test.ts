import { describe, it, expect } from "vitest";
import * as THREE from "three";

import {
	signedAngleAround,
	computeScaleDelta,
	rotationHandleEulerZ,
	focusHandlePosition,
	focusCameraPosition,
	handleConstantScale,
} from "../transformationToolMath";

const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const H = Math.PI / 2;

describe("signedAngleAround", () => {
	it("signs the angle by the rotation direction relative to the normal", () => {
		expect(signedAngleAround(v3(0, 0, 0), v3(1, 0, 0), v3(0, 1, 0), v3(0, 0, 1))).toBeCloseTo(H, 10);
		expect(signedAngleAround(v3(0, 0, 0), v3(1, 0, 0), v3(0, 1, 0), v3(0, 0, -1))).toBeCloseTo(-H, 10);
	});

	it("is 0 for coincident vectors and the 180° edge case", () => {
		expect(signedAngleAround(v3(0, 0, 0), v3(1, 0, 0), v3(1, 0, 0), v3(0, 0, 1))).toBe(0);
		// antiparallel: cross is 0 → sign 0 → angle 0 (documents the edge)
		expect(signedAngleAround(v3(0, 0, 0), v3(1, 0, 0), v3(-1, 0, 0), v3(0, 0, 1))).toBe(0);
	});
});

describe("computeScaleDelta", () => {
	const I4 = new THREE.Matrix4();

	it("grows outward along the aligned axis", () => {
		const { diffScale, diffPosition } = computeScaleDelta(v3(2, 0, 0), v3(1, 0, 0), [1, 0, 0], I4);
		expect(diffScale.toArray().map((n) => n + 0)).toEqual([1, 0, 0]);
		expect(diffPosition.toArray().map((n) => n + 0)).toEqual([0.5, 0, 0]);
	});

	it("is zero when the point coincides with the pivot", () => {
		const { diffScale, diffPosition } = computeScaleDelta(v3(1, 0, 0), v3(1, 0, 0), [1, 0, 0], I4);
		expect(diffScale.length()).toBe(0);
		expect(diffPosition.length()).toBe(0);
	});
});

describe("rotationHandleEulerZ", () => {
	it("selects the octant table entry", () => {
		expect(rotationHandleEulerZ(v3(1, 1, 1))).toEqual({ x: 1 * H, y: 3 * H, z: 0 * H });
		expect(rotationHandleEulerZ(v3(1, 1, -1))).toEqual({ x: 0, y: 0, z: 0 });
		expect(rotationHandleEulerZ(v3(-1, -1, 1))).toEqual({ x: 2 * H, y: 2 * H, z: 2 * H });
	});

	it("returns null on an axis boundary", () => {
		expect(rotationHandleEulerZ(v3(0, 1, 1))).toBeNull();
		expect(rotationHandleEulerZ(v3(1, 0, 1))).toBeNull();
	});
});

describe("focusHandlePosition", () => {
	it("maps each axis to its fixed offset (× 0.5)", () => {
		expect(focusHandlePosition([1, 0, 0]).toArray()).toEqual([0.5, 0.4, -0.4]);
		expect(focusHandlePosition([0, 0, 1]).toArray()).toEqual([0.4, 0.4, 0.5]);
		expect(focusHandlePosition([0, 0, -1]).toArray()).toEqual([-0.4, 0.4, -0.5]);
	});
});

describe("focusCameraPosition", () => {
	it("places the camera at 2× max scale along the handle axis (world space)", () => {
		const I4 = new THREE.Matrix4();
		expect(focusCameraPosition(v3(1, 1, 1), [1, 0, 0], I4).toArray().map((n) => n + 0)).toEqual([2, 0, 0]);
		expect(focusCameraPosition(v3(2, 1, 1), [1, 0, 0], I4).toArray().map((n) => n + 0)).toEqual([2, 0, 0]);
	});
});

describe("handleConstantScale", () => {
	it("is 7/pr divided by parent scale (identity rotation)", () => {
		const ws = v3(1, 1, 1);
		const rot = new THREE.Euler();
		expect(handleConstantScale(7, ws, rot).toArray()).toEqual([1, 1, 1]);
		const half = handleConstantScale(14, ws, rot);
		expect(half.x).toBeCloseTo(0.5, 10);
		expect(half.y).toBeCloseTo(0.5, 10);
		expect(half.z).toBeCloseTo(0.5, 10);
	});
});
