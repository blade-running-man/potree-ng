import { describe, it, expect } from "vitest";
import * as THREE from "three";

import { ClipVolume } from "../ClipVolume";

describe("ClipVolume", () => {
	it("constructs box + frames + arrows without WebGL", () => {
		const cv = new ClipVolume({});
		expect(cv).toBeInstanceOf(THREE.Object3D);
		expect(cv.name).toMatch(/^clip_volume_\d+$/);
		// box + frame + planeFrame + arrowX + arrowY + arrowZ
		expect(cv.children).toHaveLength(6);
		expect(cv.box).toBeInstanceOf(THREE.Mesh);
		expect(cv.frame).toBeInstanceOf(THREE.LineSegments);
	});

	it("computes the local axes (identity for no rotation)", () => {
		const cv = new ClipVolume({});
		expect(cv.localX.toArray().map((n) => Math.round(n))).toEqual([1, 0, 0]);
		expect(cv.localY.toArray().map((n) => Math.round(n))).toEqual([0, 1, 0]);
		expect(cv.localZ.toArray().map((n) => Math.round(n))).toEqual([0, 0, 1]);
	});

	it("applies scale to box, frame and planeFrame", () => {
		const cv = new ClipVolume({});
		cv.setScaleX(2);
		cv.setScaleY(3);
		expect(cv.box.scale.x).toBe(2);
		expect(cv.frame.scale.x).toBe(2);
		expect(cv.planeFrame.scale.x).toBe(2);
		expect(cv.box.scale.y).toBe(3);
	});
});
