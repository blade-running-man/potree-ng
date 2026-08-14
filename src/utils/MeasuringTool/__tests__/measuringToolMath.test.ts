import { describe, it, expect } from "vitest";
import * as THREE from "three";

import { normalizeAzimuthDegrees, labelScale, ndcToPixel } from "../measuringToolMath";

describe("normalizeAzimuthDegrees", () => {
	it("converts radians to degrees and wraps negatives into [0,360)", () => {
		expect(normalizeAzimuthDegrees(0)).toBe(0);
		expect(normalizeAzimuthDegrees(Math.PI)).toBeCloseTo(180, 10);
		expect(normalizeAzimuthDegrees(-Math.PI / 2)).toBeCloseTo(270, 10);
	});

	it("leaves a full turn at 360", () => {
		expect(normalizeAzimuthDegrees(2 * Math.PI)).toBeCloseTo(360, 10);
	});
});

describe("labelScale", () => {
	it("is targetPx / projectedRadius", () => {
		expect(labelScale(1, 70)).toBe(70);
		expect(labelScale(3, 15)).toBe(5);
		expect(labelScale(0, 15)).toBe(Infinity);
	});
});

describe("ndcToPixel", () => {
	it("maps NDC to pixels (no y-flip), zeroing z", () => {
		expect(ndcToPixel(new THREE.Vector3(-1, -1, 5), 800, 600).toArray()).toEqual([0, 0, 0]);
		expect(ndcToPixel(new THREE.Vector3(1, 1, 0), 800, 600).toArray()).toEqual([800, 600, 0]);
		expect(ndcToPixel(new THREE.Vector3(0, 0, 0), 800, 600).toArray()).toEqual([400, 300, 0]);
	});
});
