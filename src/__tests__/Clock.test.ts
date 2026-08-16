import { describe, it, expect } from "vitest";
import { Clock } from "../Clock";

// Clock backs `viewer.clock`. `getDelta()` returns the seconds elapsed since
// the previous `getDelta()` call and advances on every call — the contract the
// viewer loop and several examples rely on by calling `viewer.clock.getDelta()`
// directly each frame.

describe("Clock", () => {
	it("getDelta returns seconds elapsed since the previous call", () => {
		let now = 1000;
		const clock = new Clock(() => now);

		now = 1016; // +16 ms
		expect(clock.getDelta()).toBeCloseTo(0.016, 6);

		now = 1032; // +16 ms
		expect(clock.getDelta()).toBeCloseTo(0.016, 6);
	});

	it("first getDelta measures from construction time", () => {
		let now = 500;
		const clock = new Clock(() => now);

		now = 700; // +200 ms since construction
		expect(clock.getDelta()).toBeCloseTo(0.2, 6);
	});

	it("returns 0 when no time has passed", () => {
		const clock = new Clock(() => 42);
		expect(clock.getDelta()).toBe(0);
	});
});
