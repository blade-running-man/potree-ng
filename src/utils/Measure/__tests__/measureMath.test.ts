import { describe, it, expect } from "vitest";
import * as THREE from "three";

import {
	polygonArea2D,
	totalDistance,
	angleBetween,
	polygonAngleAt,
	computeCircleCenter,
	circleRadius,
	heightExtent,
	centroid,
	convertLength,
	convertArea,
} from "../measureMath";

const v = (x: number, y: number, z = 0) => new THREE.Vector3(x, y, z);

describe("polygonArea2D", () => {
	it("computes the shoelace area", () => {
		expect(polygonArea2D([v(0, 0), v(1, 0), v(1, 1), v(0, 1)])).toBeCloseTo(1, 10);
		expect(polygonArea2D([v(0, 0), v(4, 0), v(0, 3)])).toBeCloseTo(6, 10);
	});

	it("ignores Z and degenerate inputs", () => {
		expect(polygonArea2D([v(0, 0), v(1, 1)])).toBeCloseTo(0, 10);
		expect(polygonArea2D([v(0, 0, 9), v(4, 0, 0), v(0, 3, 5)])).toBeCloseTo(6, 10);
	});
});

describe("totalDistance", () => {
	it("sums consecutive distances", () => {
		expect(totalDistance([v(0, 0, 0), v(3, 0, 0), v(3, 4, 0)], false)).toBeCloseTo(7, 10);
	});

	it("adds the closing edge when closed", () => {
		expect(totalDistance([v(0, 0, 0), v(3, 0, 0), v(3, 4, 0)], true)).toBeCloseTo(12, 10);
	});

	it("is zero for zero or one point", () => {
		expect(totalDistance([], true)).toBe(0);
		expect(totalDistance([v(1, 2, 3)], true)).toBe(0);
	});
});

describe("angleBetween", () => {
	it("measures the angle at the corner", () => {
		expect(angleBetween(v(0, 0, 0), v(1, 0, 0), v(0, 1, 0))).toBeCloseTo(Math.PI / 2, 10);
		expect(angleBetween(v(0, 0, 0), v(1, 0, 0), v(-1, 0, 0))).toBeCloseTo(Math.PI, 10);
		expect(angleBetween(v(0, 0, 0), v(1, 0, 0), v(1, 0, 0))).toBeCloseTo(0, 10);
	});

	it("guards against zero-length rays", () => {
		expect(angleBetween(v(0, 0, 0), v(0, 0, 0), v(0, 1, 0))).toBe(0);
	});
});

describe("polygonAngleAt", () => {
	it("returns the wrap-around interior angle", () => {
		expect(polygonAngleAt([v(0, 0), v(1, 0), v(1, 1)], 1)).toBeCloseTo(Math.PI / 2, 10);
	});

	it("returns 0 for fewer than 3 points or out-of-range index", () => {
		expect(polygonAngleAt([v(0, 0), v(1, 0)], 0)).toBe(0);
		expect(polygonAngleAt([v(0, 0), v(1, 0), v(1, 1)], 5)).toBe(0);
	});
});

describe("computeCircleCenter / circleRadius", () => {
	it("finds the circumcircle of three points on the unit circle", () => {
		const center = computeCircleCenter(v(1, 0, 0), v(0, 1, 0), v(-1, 0, 0));
		expect(center.x).toBeCloseTo(0, 6);
		expect(center.y).toBeCloseTo(0, 6);
		expect(center.z).toBeCloseTo(0, 6);
		expect(circleRadius(v(1, 0, 0), v(0, 1, 0), v(-1, 0, 0))).toBeCloseTo(1, 6);
	});

	it("finds an offset circumcircle", () => {
		const center = computeCircleCenter(v(0, 0, 0), v(2, 0, 0), v(0, 2, 0));
		expect(center.x).toBeCloseTo(1, 6);
		expect(center.y).toBeCloseTo(1, 6);
		expect(circleRadius(v(0, 0, 0), v(2, 0, 0), v(0, 2, 0))).toBeCloseTo(Math.SQRT2, 6);
	});
});

describe("heightExtent", () => {
	it("computes min/max/height of Z", () => {
		expect(heightExtent([v(0, 0, 1), v(0, 0, 5), v(0, 0, 3)])).toEqual({ min: 1, max: 5, height: 4 });
		expect(heightExtent([v(0, 0, 2)])).toEqual({ min: 2, max: 2, height: 0 });
		expect(heightExtent([])).toEqual({ min: 0, max: 0, height: 0 });
	});
});

describe("centroid", () => {
	it("averages the points", () => {
		expect(centroid([v(0, 0, 0), v(2, 0, 0), v(1, 3, 0)]).toArray()).toEqual([1, 1, 0]);
	});

	it("returns the origin for no points", () => {
		expect(centroid([]).toArray()).toEqual([0, 0, 0]);
	});
});

describe("unit conversions", () => {
	it("converts length by the units-per-metre ratio", () => {
		expect(convertLength(1000, 1, 3.28084)).toBeCloseTo(3280.84, 2);
	});

	it("converts area by the squared ratio", () => {
		expect(convertArea(1, 1, 3.28084)).toBeCloseTo(10.7639, 3);
	});
});
