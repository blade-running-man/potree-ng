import { describe, it, expect } from "vitest";
import profileSrc from "../profile.js?raw";

// ProfileWindow.addPoints() flags GPU buffer updates via
// `BufferAttribute.addUpdateRange(start, count)`. three consumes update ranges
// in array-element units, so the point-index range is scaled by
// `attribute.itemSize`. These tests pin that the sub-range is registered through
// addUpdateRange (never by mutating a `updateRange` object) and stays
// itemSize-scaled.

describe("ProfileWindow.addPoints buffer-update API", () => {
	it("does not mutate the removed BufferAttribute.updateRange object", () => {
		expect(profileSrc).not.toMatch(/\.updateRange\s*\.\s*(offset|count)/);
	});

	it("registers updates via addUpdateRange() scaled by itemSize", () => {
		expect(profileSrc).toMatch(/\.addUpdateRange\s*\(/);
		// array-element units, not point units
		expect(profileSrc).toMatch(/addUpdateRange\([^)]*itemSize/);
	});
});
