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
