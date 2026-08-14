import { describe, it, expect } from "vitest";
import * as THREE from "three";

import {
	boxVolume,
	ellipsoidVolume,
	boundingSphereFromBox,
	unitBoxEdgeVertices,
	sphereFrameVertices,
} from "../volumeMath";

describe("boxVolume", () => {
	it("multiplies the scale components", () => {
		expect(boxVolume(new THREE.Vector3(1, 1, 1))).toBe(1);
		expect(boxVolume(new THREE.Vector3(2, 3, 4))).toBe(24);
		expect(boxVolume(new THREE.Vector3(0, 5, 5))).toBe(0);
	});

	it("takes the absolute value", () => {
		expect(boxVolume(new THREE.Vector3(-2, 3, 4))).toBe(24);
	});
});

describe("ellipsoidVolume", () => {
	it("is (4/3)·π·|sx·sy·sz|", () => {
		expect(ellipsoidVolume(new THREE.Vector3(1, 1, 1))).toBeCloseTo((4 / 3) * Math.PI, 10);
		expect(ellipsoidVolume(new THREE.Vector3(2, 2, 2))).toBeCloseTo((4 / 3) * Math.PI * 8, 10);
		expect(ellipsoidVolume(new THREE.Vector3(1, 2, 3))).toBeCloseTo(8 * Math.PI, 10);
	});

	it("takes the absolute value (fixes the negative-scale bug)", () => {
		expect(ellipsoidVolume(new THREE.Vector3(-1, 1, 1))).toBeCloseTo((4 / 3) * Math.PI, 10);
	});
});

describe("boundingSphereFromBox", () => {
	it("centres on the box centre with the half-diagonal radius", () => {
		const box = new THREE.Box3(
			new THREE.Vector3(-0.5, -0.5, -0.5),
			new THREE.Vector3(0.5, 0.5, 0.5),
		);
		const sphere = boundingSphereFromBox(box);
		expect(sphere.center.x).toBeCloseTo(0, 10);
		expect(sphere.center.y).toBeCloseTo(0, 10);
		expect(sphere.center.z).toBeCloseTo(0, 10);
		expect(sphere.radius).toBeCloseTo(Math.sqrt(0.75), 10);
	});

	it("handles an offset box", () => {
		const box = new THREE.Box3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(2, 0, 0));
		const sphere = boundingSphereFromBox(box);
		expect(sphere.center.x).toBeCloseTo(1, 10);
		expect(sphere.radius).toBeCloseTo(1, 10);
	});
});

describe("unitBoxEdgeVertices", () => {
	it("returns 24 vertices with all components ±0.5", () => {
		const verts = unitBoxEdgeVertices();
		expect(verts).toHaveLength(24);
		for (const v of verts) {
			expect(Math.abs(v.x)).toBe(0.5);
			expect(Math.abs(v.y)).toBe(0.5);
			expect(Math.abs(v.z)).toBe(0.5);
		}
	});

	it("forms 12 unique undirected edges connecting adjacent corners", () => {
		const verts = unitBoxEdgeVertices();
		const edges = new Set<string>();
		for (let i = 0; i < verts.length; i += 2) {
			const a = verts[i];
			const b = verts[i + 1];
			// adjacent cube corners differ in exactly one axis
			const diffs = [a.x !== b.x, a.y !== b.y, a.z !== b.z].filter(Boolean).length;
			expect(diffs).toBe(1);
			const key = [a.toArray().join(","), b.toArray().join(",")].sort().join("|");
			edges.add(key);
		}
		expect(edges.size).toBe(12);
	});
});

describe("sphereFrameVertices", () => {
	it("has a deterministic vertex count for the defaults", () => {
		const verts = sphereFrameVertices();
		// meridians: uSegments·(steps+1)·2 = 8·65·2 = 1040
		// parallels: (vSegments+2)·(steps+1)·2 = 7·65·2 = 910
		expect(verts).toHaveLength(1950);
	});

	it("places every vertex on the unit sphere by default", () => {
		for (const v of sphereFrameVertices()) {
			expect(v.length()).toBeCloseTo(1, 6);
		}
	});

	it("scales by radius", () => {
		for (const v of sphereFrameVertices({ radius: 2 })) {
			expect(v.length()).toBeCloseTo(2, 6);
		}
	});

	it("honours custom segment counts", () => {
		const verts = sphereFrameVertices({ uSegments: 4, vSegments: 3, steps: 10 });
		// 4·11·2 + 5·11·2 = 88 + 110 = 198
		expect(verts).toHaveLength(198);
	});
});
