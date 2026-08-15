import { describe, it, expect } from "vitest";

import { decodeLasPoints } from "../decodeLasPoints";

describe("decodeLasPoints — format 2 (characterization)", () => {
	it("decodes position, RGB color @20, classification @15 and point source id @18", () => {
		// Format-2 point record is 26 bytes:
		//   X/Y/Z int32 @0/4/8, intensity uint16 @12, return byte @14,
		//   classification uint8 @15, point source id uint16 @18,
		//   RGB uint16 @20/22/24.
		const pointSize = 26;
		const buffer = new ArrayBuffer(pointSize);
		const view = new DataView(buffer);

		view.setInt32(0, 1000, true); // x
		view.setInt32(4, 2000, true); // y
		view.setInt32(8, 3000, true); // z
		view.setUint16(12, 500, true); // intensity
		view.setUint8(14, 2 | (3 << 3)); // returnNumber=2, numberOfReturns=3
		view.setUint8(15, 5); // classification
		view.setUint16(18, 42, true); // point source id
		view.setUint16(20, 100 * 256, true); // R -> 100
		view.setUint16(22, 150 * 256, true); // G -> 150
		view.setUint16(24, 200 * 256, true); // B -> 200

		const result = decodeLasPoints({
			buffer,
			numPoints: 1,
			pointSize,
			pointFormatID: 2,
			scale: [0.01, 0.01, 0.01],
			offset: [0, 0, 0],
			mins: [0, 0, 0],
		});

		const positions = new Float32Array(result.position);
		expect(positions[0]).toBeCloseTo(10, 5);
		expect(positions[1]).toBeCloseTo(20, 5);
		expect(positions[2]).toBeCloseTo(30, 5);

		const colors = new Uint8Array(result.color);
		expect(Array.from(colors)).toEqual([100, 150, 200, 255]);

		const classifications = new Uint8Array(result.classification);
		expect(classifications[0]).toBe(5);

		const pointSourceIDs = new Uint16Array(result.pointSourceID);
		expect(pointSourceIDs[0]).toBe(42);

		const intensities = new Float32Array(result.intensity);
		expect(intensities[0]).toBe(500);

		const returnNumbers = new Uint8Array(result.returnNumber);
		const numberOfReturns = new Uint8Array(result.numberOfReturns);
		expect(returnNumbers[0]).toBe(2);
		expect(numberOfReturns[0]).toBe(3);

		const indices = new Uint32Array(result.indices);
		expect(indices[0]).toBe(0);
	});
});
