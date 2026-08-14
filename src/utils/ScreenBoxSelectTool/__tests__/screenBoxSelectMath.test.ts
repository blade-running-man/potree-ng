import { describe, it, expect } from "vitest";
import * as THREE from "three";

import {
	screenCentroid,
	screenDeltaToWorldSize,
	rectFromPoints,
	buildVolumeFrustum,
	inverseRay,
	resolveBoxDepth,
} from "../screenBoxSelectMath";

const v2 = (x: number, y: number) => new THREE.Vector2(x, y);
const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

describe("screenCentroid", () => {
	it("is the midpoint", () => {
		expect(screenCentroid(v2(0, 0), v2(10, 20)).toArray()).toEqual([5, 10]);
		expect(screenCentroid(v2(-2, 6), v2(2, -6)).toArray()).toEqual([0, 0]);
	});
});

describe("screenDeltaToWorldSize", () => {
	it("normalises the pixel delta and scales by the frustum", () => {
		expect(screenDeltaToWorldSize(v2(0, 0), v2(400, 300), v2(800, 600), v2(100, 60)).toArray()).toEqual([50, 30]);
		expect(screenDeltaToWorldSize(v2(0, 0), v2(800, 600), v2(800, 600), v2(100, 60)).toArray()).toEqual([100, 60]);
		expect(screenDeltaToWorldSize(v2(400, 300), v2(0, 0), v2(800, 600), v2(100, 60)).toArray()).toEqual([-50, -30]);
	});
});

describe("rectFromPoints", () => {
	it("returns the top-left + size, order-independent", () => {
		expect(rectFromPoints(v2(10, 10), v2(30, 50))).toEqual({ left: 10, top: 10, width: 20, height: 40 });
		expect(rectFromPoints(v2(30, 50), v2(10, 10))).toEqual({ left: 10, top: 10, width: 20, height: 40 });
		expect(rectFromPoints(v2(5, 5), v2(5, 5))).toEqual({ left: 5, top: 5, width: 0, height: 0 });
	});
});

describe("buildVolumeFrustum", () => {
	it("centres the ortho frustum on the box scale", () => {
		expect(buildVolumeFrustum(v3(20, 10, 100))).toEqual({ left: -10, right: 10, top: 5, bottom: -5, near: -50, far: 50 });
		expect(buildVolumeFrustum(v3(2, 2, 2))).toEqual({ left: -1, right: 1, top: 1, bottom: -1, near: -1, far: 1 });
	});
});

describe("inverseRay", () => {
	it("starts at the far end and points back", () => {
		const r = inverseRay(new THREE.Ray(v3(0, 0, 0), v3(0, 0, 1)), 100);
		expect(r.origin.toArray()).toEqual([0, 0, 100]);
		// normalise -0 → 0 before comparing
		expect(r.direction.toArray().map((n) => n + 0)).toEqual([0, 0, -1]);
	});
});

describe("resolveBoxDepth", () => {
	it("returns the midpoint and separation of the extreme projections", () => {
		const viewLine = new THREE.Line3(v3(0, 0, 0), v3(0, 0, 1));
		const depth = resolveBoxDepth([v3(0, 0, 1)], [v3(0, 0, 9)], viewLine, v3(0, 0, 0));
		expect(depth).not.toBeNull();
		expect(depth!.distance).toBeCloseTo(8, 10);
		expect(depth!.centroid.toArray()).toEqual([0, 0, 5]);
	});

	it("is null when either set is empty", () => {
		const viewLine = new THREE.Line3(v3(0, 0, 0), v3(0, 0, 1));
		expect(resolveBoxDepth([], [v3(0, 0, 9)], viewLine, v3(0, 0, 0))).toBeNull();
		expect(resolveBoxDepth([v3(0, 0, 1)], [], viewLine, v3(0, 0, 0))).toBeNull();
	});
});
