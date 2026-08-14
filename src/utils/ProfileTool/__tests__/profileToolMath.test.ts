import { describe, it, expect } from "vitest";

import { screenConstantScale } from "../profileToolMath";

describe("screenConstantScale", () => {
	it("is targetPx / projectedRadius", () => {
		expect(screenConstantScale(30, 15)).toBe(0.5);
		expect(screenConstantScale(5, 10)).toBe(2);
	});

	it("diverges as the projected radius approaches 0", () => {
		expect(screenConstantScale(0, 15)).toBe(Infinity);
	});
});
