import { describe, it, expect } from "vitest";
import { makeColorNormalizer } from "../eptLaszipMath";

describe("makeColorNormalizer", () => {
	describe("8-bit color (max channel <= 255): pass-through", () => {
		it("returns the input unchanged for a mid-range value", () => {
			expect(makeColorNormalizer(200)(200)).toBe(200);
		});

		it("passes through 0 and the 255 boundary untouched", () => {
			const norm = makeColorNormalizer(255);
			expect(norm(0)).toBe(0);
			expect(norm(255)).toBe(255);
			expect(norm(128)).toBe(128);
		});
	});

	describe("16-bit color (max channel > 255): scale down to 8-bit", () => {
		it("maps full-scale 16-bit white (65535) to 255", () => {
			expect(makeColorNormalizer(65535)(65535)).toBe(255);
		});

		it("maps 16-bit value 256 to 1 (truncating division by 256)", () => {
			expect(makeColorNormalizer(65535)(256)).toBe(1);
		});

		it("truncates rather than rounds: a 300-max channel of 299 becomes 1", () => {
			expect(makeColorNormalizer(300)(299)).toBe(1);
		});

		it("truncates values below 256 to 0 once the scale-down path is active", () => {
			const norm = makeColorNormalizer(65535);
			expect(norm(255)).toBe(0);
			expect(norm(0)).toBe(0);
		});

		it("scales the low end of a mixed-magnitude channel", () => {
			// max just over the 255 boundary still activates scale-down
			const norm = makeColorNormalizer(256);
			expect(norm(256)).toBe(1);
			expect(norm(511)).toBe(1);
			expect(norm(512)).toBe(2);
		});
	});

	describe("boundary at 255 vs 256", () => {
		it("255 max is pass-through, 256 max is scale-down", () => {
			expect(makeColorNormalizer(255)(255)).toBe(255);
			expect(makeColorNormalizer(256)(255)).toBe(0);
		});
	});
});

// Behaviors of EptLaszipDecoderWorker not yet covered by extracted, testable
// units. These require the concat worker to be refactored so its per-point
// decode/normalize passes can be exercised in isolation.
describe("EptLaszipDecoderWorker (uncovered)", () => {
	it.todo("gpsTime is normalized to a Float32 offset from the min");
	it.todo("16-bit->8-bit color path preserves RGB ordering end-to-end");
	it.todo("color alpha channel is written opaque (255) for every point");
	it.todo("extra-bytes dimensions are decoded");
	it.todo("position is stored relative to nodemin");
});
