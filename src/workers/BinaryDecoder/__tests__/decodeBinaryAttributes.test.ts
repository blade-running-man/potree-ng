import { describe, it, expect } from "vitest";

import { decodeBinaryAttributes } from "../decodeBinaryAttributes";
import { PointAttribute, PointAttributes, PointAttributeTypes } from "../../../loader/PointAttributes";

describe("decodeBinaryAttributes — POSITION_CARTESIAN (characterization)", () => {
	it("decodes version>1.3 uint32*scale positions with mean + tightBoundingBox", () => {
		// POSITION_CARTESIAN is 3 x float => byteSize 12. Two points.
		const pa = new PointAttributes(["POSITION_CARTESIAN"]);
		const scale = 0.001;

		const buffer = new ArrayBuffer(2 * pa.byteSize);
		const view = new DataView(buffer);
		// point 0 -> (1.0, 2.0, 3.0) after * scale
		view.setUint32(0, 1000, true);
		view.setUint32(4, 2000, true);
		view.setUint32(8, 3000, true);
		// point 1 -> (5.0, 4.0, 6.0)
		view.setUint32(12, 5000, true);
		view.setUint32(16, 4000, true);
		view.setUint32(20, 6000, true);

		const result = decodeBinaryAttributes({
			buffer,
			pointAttributes: pa,
			version: "1.4",
			offset: [0, 0, 0],
			scale,
		});

		const positions = new Float32Array(result.attributeBuffers["POSITION_CARTESIAN"].buffer);
		expect(Array.from(positions)).toEqual([1, 2, 3, 5, 4, 6]);

		expect(result.mean[0]).toBeCloseTo(3, 6);
		expect(result.mean[1]).toBeCloseTo(3, 6);
		expect(result.mean[2]).toBeCloseTo(4.5, 6);

		expect(result.tightBoundingBox.min).toEqual([1, 2, 3]);
		expect(result.tightBoundingBox.max).toEqual([5, 4, 6]);

		// INDICES are always appended, one uint32 per point.
		const indices = new Uint32Array(result.attributeBuffers["INDICES"].buffer);
		expect(Array.from(indices)).toEqual([0, 1]);
	});

	it("uses the version<=1.3 float+nodeOffset position path", () => {
		const pa = new PointAttributes(["POSITION_CARTESIAN"]);

		const buffer = new ArrayBuffer(1 * pa.byteSize);
		const view = new DataView(buffer);
		// raw floats; node offset is added on top (no scale for <=1.3)
		view.setFloat32(0, 1.5, true);
		view.setFloat32(4, 2.5, true);
		view.setFloat32(8, 3.5, true);

		const result = decodeBinaryAttributes({
			buffer,
			pointAttributes: pa,
			version: "1.3",
			offset: [10, 20, 30],
			scale: 0.001, // ignored on the <=1.3 path
		});

		const positions = new Float32Array(result.attributeBuffers["POSITION_CARTESIAN"].buffer);
		expect(positions[0]).toBeCloseTo(11.5, 5);
		expect(positions[1]).toBeCloseTo(22.5, 5);
		expect(positions[2]).toBeCloseTo(33.5, 5);
	});
});

describe("decodeBinaryAttributes — R9: 64-bit getters", () => {
	it("decodes a uint64 attribute via getBigUint64 without throwing", () => {
		// A generic numeric attribute named so it hits the packing branch.
		const attr = new PointAttribute("classification64", PointAttributeTypes.DATA_TYPE_UINT64, 1);
		const pa = new PointAttributes();
		pa.add(attr);

		const buffer = new ArrayBuffer(2 * pa.byteSize);
		const view = new DataView(buffer);
		view.setBigUint64(0, 42n, true);
		view.setBigUint64(8, 100n, true);

		let result: ReturnType<typeof decodeBinaryAttributes>;
		expect(() => {
			result = decodeBinaryAttributes({
				buffer,
				pointAttributes: pa,
				version: "1.4",
				offset: [0, 0, 0],
				scale: 1,
			});
		}).not.toThrow();

		const decoded = result!.attributeBuffers["classification64"];
		// preciseBuffer holds the un-packed original values (Float64Array for uint64).
		expect(decoded.preciseBuffer[0]).toBe(42);
		expect(decoded.preciseBuffer[1]).toBe(100);

		// size>4 packs into f32 via derived offset/scale: (v - min) / (max - min).
		expect(decoded.offset).toBe(42);
		const f32 = new Float32Array(decoded.buffer);
		expect(f32[0]).toBeCloseTo(0, 6);
		expect(f32[1]).toBeCloseTo(1, 6);
		expect(attr.range).toEqual([42, 100]);
	});

	it("reads the FULL 64 bits: a value > 2^32 survives (getUint32 would truncate)", () => {
		// Both values exceed 2^32. A 32-bit little-endian read would keep only the
		// low dword: 0x1_0000_002A -> 42 and 0x2_0000_0000 -> 0, diverging from the
		// true 64-bit magnitudes. This is the mutation guard for getBigUint64.
		const LOW = 0x1_0000_002An; // 4294967338
		const HIGH = 0x2_0000_0000n; // 8589934592
		const attr = new PointAttribute("big64", PointAttributeTypes.DATA_TYPE_UINT64, 1);
		const pa = new PointAttributes();
		pa.add(attr);

		const buffer = new ArrayBuffer(2 * pa.byteSize);
		const view = new DataView(buffer);
		view.setBigUint64(0, LOW, true);
		view.setBigUint64(8, HIGH, true);

		const result = decodeBinaryAttributes({
			buffer,
			pointAttributes: pa,
			version: "1.4",
			offset: [0, 0, 0],
			scale: 1,
		});

		const decoded = result.attributeBuffers["big64"];
		// preciseBuffer keeps the un-packed 64-bit magnitudes (exact in f64).
		expect(decoded.preciseBuffer[0]).toBe(4294967338);
		expect(decoded.preciseBuffer[1]).toBe(8589934592);
		// offset = min, and the derived f32 packing spans [0, 1].
		expect(decoded.offset).toBe(4294967338);
		expect(attr.range).toEqual([4294967338, 8589934592]);
		const f32 = new Float32Array(decoded.buffer);
		expect(f32[0]).toBeCloseTo(0, 6);
		expect(f32[1]).toBeCloseTo(1, 6);
	});

	it("decodes an int64 attribute via getBigInt64 (negative values)", () => {
		const attr = new PointAttribute("signed64", PointAttributeTypes.DATA_TYPE_INT64, 1);
		const pa = new PointAttributes();
		pa.add(attr);

		const buffer = new ArrayBuffer(2 * pa.byteSize);
		const view = new DataView(buffer);
		view.setBigInt64(0, -5n, true);
		view.setBigInt64(8, 5n, true);

		const result = decodeBinaryAttributes({
			buffer,
			pointAttributes: pa,
			version: "1.4",
			offset: [0, 0, 0],
			scale: 1,
		});

		const decoded = result.attributeBuffers["signed64"];
		expect(decoded.preciseBuffer[0]).toBe(-5);
		expect(decoded.preciseBuffer[1]).toBe(5);
		expect(decoded.offset).toBe(-5);
		expect(attr.range).toEqual([-5, 5]);
	});
});

describe("decodeBinaryAttributes — R10: tidy", () => {
	it("decodes rgba as opaque (alpha = 255)", () => {
		const attr = new PointAttribute("rgba", PointAttributeTypes.DATA_TYPE_UINT8, 4);
		const pa = new PointAttributes();
		pa.add(attr);

		const buffer = new ArrayBuffer(1 * pa.byteSize);
		const view = new DataView(buffer);
		view.setUint8(0, 10);
		view.setUint8(1, 20);
		view.setUint8(2, 30);
		view.setUint8(3, 123); // source alpha is ignored; output must be opaque

		const result = decodeBinaryAttributes({
			buffer,
			pointAttributes: pa,
			version: "1.4",
			offset: [0, 0, 0],
			scale: 1,
		});

		const colors = new Uint8Array(result.attributeBuffers["rgba"].buffer);
		expect(Array.from(colors)).toEqual([10, 20, 30, 255]);
	});

	it("packs a size>4 double attribute into f32 with correct offset/scale", () => {
		// Locks the min/max single-pass collapse: numeric output must not change.
		const attr = new PointAttribute("gps", PointAttributeTypes.DATA_TYPE_DOUBLE, 1);
		const pa = new PointAttributes();
		pa.add(attr);

		const buffer = new ArrayBuffer(3 * pa.byteSize);
		const view = new DataView(buffer);
		view.setFloat64(0, 100, true);
		view.setFloat64(8, 200, true);
		view.setFloat64(16, 300, true);

		const result = decodeBinaryAttributes({
			buffer,
			pointAttributes: pa,
			version: "1.4",
			offset: [0, 0, 0],
			scale: 1,
		});

		const decoded = result.attributeBuffers["gps"];
		expect(decoded.offset).toBe(100); // min
		expect(decoded.scale).toBeCloseTo(1 / 200, 12); // 1 / (max - min)
		expect(attr.range).toEqual([100, 300]);

		const f32 = new Float32Array(decoded.buffer);
		expect(f32[0]).toBeCloseTo(0, 6);
		expect(f32[1]).toBeCloseTo(0.5, 6);
		expect(f32[2]).toBeCloseTo(1, 6);

		// preciseBuffer keeps the raw doubles.
		expect(Array.from(decoded.preciseBuffer as Float64Array)).toEqual([100, 200, 300]);
	});

	it("packs a size<=4 attribute deriving range from the packing pass", () => {
		// size<=4 has no pre-pass; min/max come from the packing loop only.
		const attr = new PointAttribute("intensity", PointAttributeTypes.DATA_TYPE_UINT16, 1);
		const pa = new PointAttributes();
		pa.add(attr);

		const buffer = new ArrayBuffer(3 * pa.byteSize);
		const view = new DataView(buffer);
		view.setUint16(0, 10, true);
		view.setUint16(2, 30, true);
		view.setUint16(4, 20, true);

		const result = decodeBinaryAttributes({
			buffer,
			pointAttributes: pa,
			version: "1.4",
			offset: [0, 0, 0],
			scale: 1,
		});

		const decoded = result.attributeBuffers["intensity"];
		// size<=4 keeps offset/scale at their identity defaults.
		expect(decoded.offset).toBe(0);
		expect(decoded.scale).toBe(1);
		expect(attr.range).toEqual([10, 30]);
		const f32 = new Float32Array(decoded.buffer);
		expect(Array.from(f32)).toEqual([10, 30, 20]);
	});
});

describe("decodeBinaryAttributes — Morton reorder integration (regression)", () => {
	// Locks the in-decoder Morton/Z-order reorder: every per-point attribute
	// (position, rgba, generic scalar packed + preciseBuffer) must be permuted by
	// the SAME permutation, keeping cross-attribute alignment, while mean and
	// tightBoundingBox stay order-independent. A future stride / itemSize /
	// per-attribute misalignment would break this.
	it("permutes position + rgba + intensity together into Morton order without cross-attribute drift", () => {
		// POSITION_CARTESIAN (12) + rgba (4) + intensity uint16 (2) => byteSize 18.
		const pa = new PointAttributes(["POSITION_CARTESIAN"]);
		pa.add(new PointAttribute("rgba", PointAttributeTypes.DATA_TYPE_UINT8, 4));
		pa.add(new PointAttribute("intensity", PointAttributeTypes.DATA_TYPE_UINT16, 1));
		expect(pa.byteSize).toBe(18);

		const scale = 0.001;

		// Four points at distinct corners of the [0,4]^3 box, in a deliberately
		// scrambled input order so the Morton permutation is NON-identity. Each
		// point carries a correlated signature (rgba + intensity keyed on index)
		// so we can prove every attribute moved together.
		// corner octant weight = x*1 + y*2 + z*4  (from mortonKey bit interleave):
		//   pt0 (4,4,4)=octant7 · pt1 (0,0,0)=octant0 · pt2 (4,0,4)=octant5 · pt3 (0,4,0)=octant2
		// ascending octant => output order [pt1, pt3, pt2, pt0] => perm [1,3,2,0].
		const points = [
			{ pos: [4, 4, 4], rgba: [10, 20, 30], intensity: 100 }, // 0
			{ pos: [0, 0, 0], rgba: [11, 21, 31], intensity: 101 }, // 1
			{ pos: [4, 0, 4], rgba: [12, 22, 32], intensity: 102 }, // 2
			{ pos: [0, 4, 0], rgba: [13, 23, 33], intensity: 103 }, // 3
		];
		const expectedOrder = [1, 3, 2, 0];
		// Guard: the fixture must actually reshuffle, or the test proves nothing.
		expect(expectedOrder).not.toEqual([0, 1, 2, 3]);

		const buffer = new ArrayBuffer(points.length * pa.byteSize);
		const view = new DataView(buffer);
		points.forEach((p, j) => {
			const base = j * pa.byteSize;
			// POSITION_CARTESIAN: version>1.3 reads uint32 * scale.
			view.setUint32(base + 0, Math.round(p.pos[0] / scale), true);
			view.setUint32(base + 4, Math.round(p.pos[1] / scale), true);
			view.setUint32(base + 8, Math.round(p.pos[2] / scale), true);
			// rgba: 3 colour bytes + a source alpha that must be overwritten to 255.
			view.setUint8(base + 12, p.rgba[0]);
			view.setUint8(base + 13, p.rgba[1]);
			view.setUint8(base + 14, p.rgba[2]);
			view.setUint8(base + 15, 7); // bogus source alpha; decoder forces opaque
			// intensity: uint16 LE
			view.setUint16(base + 16, p.intensity, true);
		});

		const result = decodeBinaryAttributes({
			buffer,
			pointAttributes: pa,
			version: "1.4",
			offset: [0, 0, 0],
			scale,
		});

		const positions = new Float32Array(result.attributeBuffers["POSITION_CARTESIAN"].buffer);
		const colors = new Uint8Array(result.attributeBuffers["rgba"].buffer);
		const intensityEntry = result.attributeBuffers["intensity"];
		const intensityF32 = new Float32Array(intensityEntry.buffer);
		const intensityPrecise = intensityEntry.preciseBuffer as Uint16Array;
		const indices = new Uint32Array(result.attributeBuffers["INDICES"].buffer);

		// (1) Output is in the expected Morton order, AND every attribute at each
		//     output slot belongs to the same original point (no cross drift).
		for (let i = 0; i < points.length; i++) {
			const src = points[expectedOrder[i]];

			expect([positions[3 * i + 0], positions[3 * i + 1], positions[3 * i + 2]])
				.toEqual(src.pos);
			expect([colors[4 * i + 0], colors[4 * i + 1], colors[4 * i + 2], colors[4 * i + 3]])
				.toEqual([...src.rgba, 255]);
			expect(intensityF32[i]).toBe(src.intensity);
			expect(intensityPrecise[i]).toBe(src.intensity);
		}

		// (2) INDICES is rebuilt as 0..n in the NEW order (not permuted).
		expect(Array.from(indices)).toEqual([0, 1, 2, 3]);

		// (3) mean and tightBoundingBox are order-independent (unaffected by reorder).
		expect(result.mean[0]).toBeCloseTo(2, 6);
		expect(result.mean[1]).toBeCloseTo(2, 6);
		expect(result.mean[2]).toBeCloseTo(2, 6);
		expect(result.tightBoundingBox.min).toEqual([0, 0, 0]);
		expect(result.tightBoundingBox.max).toEqual([4, 4, 4]);

		// (4) The generic scalar's decode-time range is over all points, unchanged
		//     by the reorder.
		expect(intensityEntry.attribute.range).toEqual([100, 103]);
	});
});

describe("decodeBinaryAttributes — uncovered decode paths", () => {
	// Real behaviors not yet asserted; listed so the gaps are visible in output.
	it.todo("decodes NORMAL_SPHEREMAPPED");
	it.todo("decodes NORMAL_OCT16 to a unit vector");
	it.todo("decodes a plain NORMAL float-triple attribute");
	it.todo("reconstructs attribute vectors from source attributes");
	it.todo("packs a size>4 attribute using initialRange when provided");
});
