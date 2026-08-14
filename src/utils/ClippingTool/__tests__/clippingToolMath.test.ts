import { describe, it, expect } from "vitest";

import { shouldFinishPolygon } from "../clippingToolMath";

describe("shouldFinishPolygon", () => {
	it("is true only once the marker count exceeds the max", () => {
		expect(shouldFinishPolygon(9, 8)).toBe(true);
		expect(shouldFinishPolygon(8, 8)).toBe(false);
		expect(shouldFinishPolygon(5, 8)).toBe(false);
	});
});
