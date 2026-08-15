import { describe, it, expect } from "vitest";

import { decodeEptLaszipView, type EptView } from "../decodeEptLaszipView";

type Dims = Record<string, number[]>;

// Build a synthetic Copc-like view: `getter(name)` yields the per-index value
// from `values[name]`, and only the dimensions in `present` are advertised (this
// gates the optional GpsTime and Red/Green/Blue branches, exactly as the real
// Copc view does).
function makeView(values: Dims, present: string[]): EptView {
	return {
		dimensions: Object.fromEntries(present.map((k) => [k, true])),
		getter(name: string) {
			const arr = values[name] ?? [];
			return (i: number) => arr[i];
		},
	};
}

// A 3-point view carrying GpsTime + 16-bit RGB (all values chosen so the /256
// scale-down lands on clean integers).
const FULL_VALUES: Dims = {
	X: [10, 20, 30],
	Y: [1, 2, 3],
	Z: [0, 5, 10],
	Intensity: [100, 200, 300],
	Classification: [2, 2, 6],
	ReturnNumber: [1, 1, 2],
	NumberOfReturns: [1, 2, 2],
	PointSourceId: [7, 7, 7],
	GpsTime: [1000.5, 1001.5, 1002.5],
	Red: [512, 65280, 256],
	Green: [256, 0, 512],
	Blue: [1024, 768, 65280],
};
const NODEMIN = [5, 0, -5];

function decodeFull() {
	const view = makeView(FULL_VALUES, ["GpsTime", "Red"]);
	return decodeEptLaszipView(view, { pointCount: 3, nodemin: NODEMIN });
}

describe("decodeEptLaszipView — color buffer (R7)", () => {
	it("allocates an RGBA color buffer of exactly pointCount*4 bytes", () => {
		const result = decodeFull();
		expect(result.color.byteLength).toBe(3 * 4);
	});

	it("writes alpha = 255 for EVERY point (opaque), even with 16-bit color", () => {
		const result = decodeFull();
		const color = new Uint8Array(result.color);
		for (let i = 0; i < 3; i++) {
			expect(color[4 * i + 3]).toBe(255);
		}
	});

	it("normalizes 16-bit RGB down to 8-bit (max channel > 255 => /256)", () => {
		const result = decodeFull();
		const color = Array.from(new Uint8Array(result.color));
		// p0: 512/256,256/256,1024/256 ; p1: 65280/256,0,768/256 ; p2: 256/256,512/256,65280/256
		expect(color).toEqual([
			2, 1, 4, 255,
			255, 0, 3, 255,
			1, 2, 255, 255,
		]);
	});

	it("passes 8-bit RGB through unchanged (max channel <= 255)", () => {
		const view = makeView(
			{
				X: [0, 0], Y: [0, 0], Z: [0, 0],
				Intensity: [0, 0], Classification: [0, 0],
				ReturnNumber: [0, 0], NumberOfReturns: [0, 0], PointSourceId: [0, 0],
				Red: [10, 20], Green: [30, 40], Blue: [50, 60],
			},
			["Red"],
		);
		const result = decodeEptLaszipView(view, { pointCount: 2, nodemin: [0, 0, 0] });
		expect(Array.from(new Uint8Array(result.color))).toEqual([
			10, 30, 50, 255,
			20, 40, 60, 255,
		]);
	});

	it("emits opaque black (0,0,0,255) when the view carries no Red dimension", () => {
		const view = makeView(
			{
				X: [0, 0], Y: [0, 0], Z: [0, 0],
				Intensity: [0, 0], Classification: [0, 0],
				ReturnNumber: [0, 0], NumberOfReturns: [0, 0], PointSourceId: [0, 0],
			},
			[], // no Red, no GpsTime
		);
		const result = decodeEptLaszipView(view, { pointCount: 2, nodemin: [0, 0, 0] });
		expect(result.color.byteLength).toBe(2 * 4);
		expect(Array.from(new Uint8Array(result.color))).toEqual([
			0, 0, 0, 255,
			0, 0, 0, 255,
		]);
	});
});

describe("decodeEptLaszipView — position relative to nodemin", () => {
	it("stores each coordinate minus the node minimum", () => {
		const result = decodeFull();
		const position = Array.from(new Float32Array(result.position));
		expect(position).toEqual([
			5, 1, 5, // (10-5, 1-0, 0-(-5))
			15, 2, 10, // (20-5, 2-0, 5-(-5))
			25, 3, 15, // (30-5, 3-0, 10-(-5))
		]);
	});

	it("computes mean and tightBoundingBox from the nodemin-relative coords", () => {
		const result = decodeFull();
		expect(result.mean[0]).toBeCloseTo(15, 6);
		expect(result.mean[1]).toBeCloseTo(2, 6);
		expect(result.mean[2]).toBeCloseTo(10, 6);
		expect(result.tightBoundingBox.min).toEqual([5, 1, 5]);
		expect(result.tightBoundingBox.max).toEqual([25, 3, 15]);
	});

	it("writes sequential indices", () => {
		const result = decodeFull();
		expect(Array.from(new Uint32Array(result.indices))).toEqual([0, 1, 2]);
	});
});

describe("decodeEptLaszipView — gpsTime normalization", () => {
	it("stores gpsTime as a Float32 offset from the minimum, with gpsMeta", () => {
		const result = decodeFull();
		const gps = Array.from(new Float32Array(result.gpsTime));
		// 1000.5 -> 0, 1001.5 -> 1, 1002.5 -> 2
		expect(gps).toEqual([0, 1, 2]);
		expect(result.gpsMeta.offset).toBe(1000.5);
		expect(result.gpsMeta.range).toBeCloseTo(2, 6);
		expect(result.ranges["gps-time"]).toEqual([1000.5, 1002.5]);
	});
});

describe("decodeEptLaszipView — attribute buffers + ranges", () => {
	it("decodes intensity / classification / returns / source id with ranges", () => {
		const result = decodeFull();
		expect(Array.from(new Float32Array(result.intensity))).toEqual([100, 200, 300]);
		expect(Array.from(new Uint8Array(result.classification))).toEqual([2, 2, 6]);
		expect(Array.from(new Uint8Array(result.returnNumber))).toEqual([1, 1, 2]);
		expect(Array.from(new Uint8Array(result.numberOfReturns))).toEqual([1, 2, 2]);
		expect(Array.from(new Uint16Array(result.pointSourceId))).toEqual([7, 7, 7]);

		expect(result.ranges.intensity).toEqual([100, 300]);
		expect(result.ranges.classification).toEqual([2, 6]);
		expect(result.ranges["return number"]).toEqual([1, 2]);
		expect(result.ranges["number of returns"]).toEqual([1, 2]);
		expect(result.ranges["source id"]).toEqual([7, 7]);
	});

	it("exposes exactly the expected ranges keys", () => {
		const result = decodeFull();
		expect(Object.keys(result.ranges).sort()).toEqual([
			"classification",
			"gps-time",
			"intensity",
			"number of returns",
			"return number",
			"source id",
		]);
	});

	it("sizes every attribute buffer to its element width * pointCount", () => {
		const result = decodeFull();
		expect(result.position.byteLength).toBe(3 * 3 * 4);
		expect(result.intensity.byteLength).toBe(3 * 4);
		expect(result.classification.byteLength).toBe(3);
		expect(result.returnNumber.byteLength).toBe(3);
		expect(result.numberOfReturns.byteLength).toBe(3);
		expect(result.pointSourceId.byteLength).toBe(3 * 2);
		expect(result.gpsTime.byteLength).toBe(3 * 4);
		expect(result.indices.byteLength).toBe(3 * 4);
	});
});
