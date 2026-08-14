import { describe, it, expect } from "vitest";
import * as THREE from "three";

import {
	boxFrameVertices,
	planeFrameVertices,
	localAxesFromQuaternion,
	rotationRadians,
	worldAxisToLocal,
	offsetVector,
} from "../clipVolumeMath";

describe("boxFrameVertices", () => {
	it("returns 24 vertices with ±0.5 components forming 12 unique edges", () => {
		const verts = boxFrameVertices();
		expect(verts).toHaveLength(24);
		for (const v of verts) {
			expect(Math.abs(v.x)).toBe(0.5);
			expect(Math.abs(v.y)).toBe(0.5);
			expect(Math.abs(v.z)).toBe(0.5);
		}
		const edges = new Set<string>();
		for (let i = 0; i < verts.length; i += 2) {
			edges.add([verts[i].toArray().join(","), verts[i + 1].toArray().join(",")].sort().join("|"));
		}
		expect(edges.size).toBe(12);
	});
});

describe("planeFrameVertices", () => {
	it("returns 8 vertices all at z = 0", () => {
		const verts = planeFrameVertices();
		expect(verts).toHaveLength(8);
		for (const v of verts) {
			expect(v.z).toBe(0);
			expect(Math.abs(v.x)).toBe(0.5);
			expect(Math.abs(v.y)).toBe(0.5);
		}
	});
});

describe("localAxesFromQuaternion", () => {
	it("returns the unit axes for the identity quaternion", () => {
		const axes = localAxesFromQuaternion(new THREE.Quaternion());
		expect(axes.x.toArray().map((n) => Math.round(n))).toEqual([1, 0, 0]);
		expect(axes.y.toArray().map((n) => Math.round(n))).toEqual([0, 1, 0]);
		expect(axes.z.toArray().map((n) => Math.round(n))).toEqual([0, 0, 1]);
	});

	it("rotates the axes by a 90° Z quaternion", () => {
		const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2);
		const axes = localAxesFromQuaternion(q);
		expect(axes.x.x).toBeCloseTo(0, 6);
		expect(axes.x.y).toBeCloseTo(1, 6);
		expect(axes.y.x).toBeCloseTo(-1, 6);
		expect(axes.y.y).toBeCloseTo(0, 6);
	});
});

describe("rotationRadians", () => {
	it("converts degrees × dir to radians", () => {
		expect(rotationRadians(1, 90)).toBeCloseTo(Math.PI / 2, 10);
		expect(rotationRadians(-2, 45)).toBeCloseTo(-Math.PI / 2, 10);
		expect(rotationRadians(0, 90)).toBe(0);
	});
});

describe("worldAxisToLocal", () => {
	it("returns the axis unchanged for the identity matrix", () => {
		const local = worldAxisToLocal(new THREE.Vector3(0, 1, 0), new THREE.Matrix4());
		expect(local.toArray().map((n) => Math.round(n))).toEqual([0, 1, 0]);
	});

	it("applies the inverse world rotation", () => {
		const m = new THREE.Matrix4().makeRotationZ(Math.PI / 2);
		const local = worldAxisToLocal(new THREE.Vector3(1, 0, 0), m);
		expect(local.x).toBeCloseTo(0, 6);
		expect(local.y).toBeCloseTo(-1, 6);
		expect(local.z).toBeCloseTo(0, 6);
	});
});

describe("offsetVector", () => {
	const local = { x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 0, 1), z: new THREE.Vector3(0, 1, 0) };

	it("follows the world axis in the global frame", () => {
		expect(offsetVector("global", "x", 1, 0.5, local).toArray()).toEqual([0.5, 0, 0]);
	});

	it("follows the local basis in the local frame", () => {
		expect(offsetVector("local", "y", -1, 2, local).toArray().map((n) => n + 0)).toEqual([0, 0, -2]);
	});
});
