import { describe, it, expect } from "vitest";

import { insertionScaleFromViewZ, labelScale, convertVolumeToDisplay } from "../volumeToolMath";

describe("insertionScaleFromViewZ", () => {
	it("is the magnitude of viewZ over the divisor", () => {
		expect(insertionScaleFromViewZ(-10)).toBe(2);
		expect(insertionScaleFromViewZ(0)).toBe(0);
		expect(insertionScaleFromViewZ(-5, 5)).toBe(1);
		expect(insertionScaleFromViewZ(-10, 2)).toBe(5);
	});
});

describe("labelScale", () => {
	it("is targetPx / projectedRadius", () => {
		expect(labelScale(70)).toBe(1);
		expect(labelScale(35)).toBe(2);
		expect(labelScale(0)).toBe(Infinity);
	});
});

describe("convertVolumeToDisplay", () => {
	it("scales by the cubed units ratio", () => {
		expect(convertVolumeToDisplay(1, 1, 1)).toBe(1);
		expect(convertVolumeToDisplay(1, 1, 100)).toBe(1_000_000); // m³ → cm³
		expect(convertVolumeToDisplay(8, 2, 2)).toBe(8);
	});
});
