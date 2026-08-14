import { describe, it, expect } from "vitest";

import {
	concatBuffers,
	detectEndianness,
	computeNumStrips,
	computeFirstValueOffset,
} from "../geotiffMath";

describe("concatBuffers", () => {
	it("concatenates Uint8Arrays", () => {
		const out = concatBuffers([new Uint8Array([1, 2]), new Uint8Array([3])]);
		expect(Array.from(out)).toEqual([1, 2, 3]);
	});

	it("preserves element widths (little-endian bytes) of wider views", () => {
		const out = concatBuffers([new Uint16Array([5])]);
		expect(Array.from(out)).toEqual([5, 0]);
	});

	it("handles a raw ArrayBuffer", () => {
		const buf = new ArrayBuffer(3);
		new Uint8Array(buf).set([7, 8, 9]);
		expect(Array.from(concatBuffers([buf]))).toEqual([7, 8, 9]);
	});

	it("respects a view's byteOffset", () => {
		const backing = new Uint8Array([0, 0, 42, 43]);
		const view = new Uint8Array(backing.buffer, 2, 2);
		expect(Array.from(concatBuffers([view]))).toEqual([42, 43]);
	});

	it("returns an empty array for no buffers", () => {
		expect(concatBuffers([])).toHaveLength(0);
	});
});

describe("detectEndianness", () => {
	it("maps II to little-endian", () => {
		expect(detectEndianness([0x49, 0x49])).toBe("LE");
	});

	it("maps MM to big-endian", () => {
		expect(detectEndianness([0x4d, 0x4d])).toBe("BE");
	});

	it("throws on an unknown marker", () => {
		expect(() => detectEndianness([0x00, 0x01])).toThrow(/invalid TIFF endianness/);
	});
});

describe("computeNumStrips", () => {
	it("rounds up", () => {
		expect(computeNumStrips(100, 10)).toBe(10);
		expect(computeNumStrips(105, 10)).toBe(11);
		expect(computeNumStrips(10, 100)).toBe(1);
	});

	it("is zero for zero height", () => {
		expect(computeNumStrips(0, 10)).toBe(0);
	});
});

describe("computeFirstValueOffset", () => {
	it("accounts for the entry count, entries and next-IFD pointer", () => {
		expect(computeFirstValueOffset(15)).toBe(194);
		expect(computeFirstValueOffset(1)).toBe(26);
		expect(computeFirstValueOffset(0)).toBe(14);
	});

	it("honours a custom first-IFD offset", () => {
		expect(computeFirstValueOffset(0, 100)).toBe(106);
	});
});
