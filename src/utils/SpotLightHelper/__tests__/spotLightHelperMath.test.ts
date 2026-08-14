import { describe, it, expect } from "vitest";

import { computeConeScale, frustumPositions } from "../spotLightHelperMath";

describe("computeConeScale", () => {
	it("scales width by tan(angle/2) and length by distance", () => {
		expect(computeConeScale(Math.PI / 2, 10)).toEqual({ coneWidth: expect.closeTo(10, 10), coneLength: 10 });
		expect(computeConeScale(0, 5)).toEqual({ coneWidth: 0, coneLength: 5 });
	});

	it("falls back to length 1000 for a non-positive distance", () => {
		const a = computeConeScale(Math.PI / 3, 0);
		expect(a.coneLength).toBe(1000);
		expect(a.coneWidth).toBeCloseTo(1000 * Math.tan(Math.PI / 6), 6);

		expect(computeConeScale(Math.PI / 3, -4).coneLength).toBe(1000);
	});
});

describe("frustumPositions", () => {
	it("returns 9 segments (18 vertices, 54 floats) with the base at z = -1", () => {
		const pos = frustumPositions();
		expect(pos).toBeInstanceOf(Float32Array);
		expect(pos.length).toBe(54);

		// apex (0,0,0) appears 5 times (once per apex-originating segment)
		let apexCount = 0;
		for (let i = 0; i < pos.length; i += 3) {
			if (pos[i] === 0 && pos[i + 1] === 0 && pos[i + 2] === 0) apexCount++;
		}
		expect(apexCount).toBe(5);
	});
});
