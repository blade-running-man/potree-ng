import { describe, it, expect } from "vitest";
import * as THREE from "three";

import {
	segmentsFromPoints,
	segmentHorizontalLength,
	segmentCenter,
	segmentBoxMatrix,
	profileBounds,
	boxZCenter,
} from "../profileMath";

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

describe("segmentsFromPoints", () => {
	it("returns no segments for fewer than two points", () => {
		expect(segmentsFromPoints([])).toEqual([]);
		expect(segmentsFromPoints([v(0, 0, 0)])).toEqual([]);
	});

	it("pairs adjacent points (n → n-1 segments)", () => {
		const segs = segmentsFromPoints([v(0, 0, 0), v(1, 0, 0), v(1, 1, 0)]);
		expect(segs).toHaveLength(2);
		expect(segs[0].start.toArray()).toEqual([0, 0, 0]);
		expect(segs[0].end.toArray()).toEqual([1, 0, 0]);
		expect(segs[1].end.toArray()).toEqual([1, 1, 0]);
	});

	it("clones endpoints (mutating the result leaves inputs intact)", () => {
		const input = [v(0, 0, 0), v(1, 0, 0)];
		const segs = segmentsFromPoints(input);
		segs[0].start.set(9, 9, 9);
		expect(input[0].toArray()).toEqual([0, 0, 0]);
	});
});

describe("segmentHorizontalLength", () => {
	it("measures XY distance and ignores Z", () => {
		expect(segmentHorizontalLength(v(0, 0, 0), v(3, 4, 0))).toBeCloseTo(5, 10);
		expect(segmentHorizontalLength(v(0, 0, 0), v(0, 0, 99))).toBeCloseTo(0, 10);
		expect(segmentHorizontalLength(v(1, 1, 5), v(4, 5, -10))).toBeCloseTo(5, 10);
	});
});

describe("segmentCenter", () => {
	it("returns the midpoint", () => {
		expect(segmentCenter(v(0, 0, 0), v(2, 4, 6)).toArray()).toEqual([1, 2, 3]);
		expect(segmentCenter(v(-1, 0, 0), v(1, 0, 0)).toArray()).toEqual([0, 0, 0]);
	});
});

describe("segmentBoxMatrix", () => {
	it("centres and scales the oriented box", () => {
		const m = segmentBoxMatrix(v(0, 0, 0), v(4, 0, 0), 2, 100);
		const pos = new THREE.Vector3();
		const quat = new THREE.Quaternion();
		const scl = new THREE.Vector3();
		m.decompose(pos, quat, scl);

		expect(pos.x).toBeCloseTo(2, 6);
		expect(pos.y).toBeCloseTo(0, 6);
		expect(pos.z).toBeCloseTo(0, 6);
		// scale = (horizontalLength, height, width)
		expect(scl.x).toBeCloseTo(4, 6);
		expect(scl.y).toBeCloseTo(100, 6);
		expect(scl.z).toBeCloseTo(2, 6);
	});
});

describe("profileBounds", () => {
	it("returns zeros for no points", () => {
		const b = profileBounds([]);
		expect(b.min.toArray()).toEqual([0, 0, 0]);
		expect(b.max.toArray()).toEqual([0, 0, 0]);
		expect(b.centroid.toArray()).toEqual([0, 0, 0]);
	});

	it("computes component-wise min/max and centroid", () => {
		const b = profileBounds([v(0, 0, 0), v(2, 2, 2), v(1, 1, 10)]);
		expect(b.min.toArray()).toEqual([0, 0, 0]);
		expect(b.max.toArray()).toEqual([2, 2, 10]);
		expect(b.centroid.toArray()).toEqual([1, 1, 4]);
	});
});

describe("boxZCenter", () => {
	it("returns the midpoint of the Z range", () => {
		expect(boxZCenter(0, 10)).toBe(5);
		expect(boxZCenter(-4, 4)).toBe(0);
		expect(boxZCenter(5, 5)).toBe(5);
	});
});
