import { describe, it, expect } from "vitest";

import { decodeLasPoints, lasLayoutFor } from "../decodeLasPoints";

const SCALE = [0.01, 0.01, 0.01];
const OFFSET = [0, 0, 0];
const MINS = [0, 0, 0];

// Every test point shares the same X/Y/Z so we only ever assert on the
// format-specific attribute offsets. 1000/2000/3000 * 0.01 => 10/20/30.
function makePoint(pointSize: number): { buffer: ArrayBuffer; view: DataView } {
	const buffer = new ArrayBuffer(pointSize);
	const view = new DataView(buffer);
	view.setInt32(0, 1000, true);
	view.setInt32(4, 2000, true);
	view.setInt32(8, 3000, true);
	view.setUint16(12, 500, true); // intensity, always @12
	return { buffer, view };
}

function decodeOne(buffer: ArrayBuffer, pointSize: number, pointFormatID: number) {
	const result = decodeLasPoints({
		buffer,
		numPoints: 1,
		pointSize,
		pointFormatID,
		scale: SCALE,
		offset: OFFSET,
		mins: MINS,
	});
	return {
		position: new Float32Array(result.position),
		color: Array.from(new Uint8Array(result.color)),
		intensity: new Float32Array(result.intensity),
		classification: new Uint8Array(result.classification),
		returnNumber: new Uint8Array(result.returnNumber),
		numberOfReturns: new Uint8Array(result.numberOfReturns),
		pointSourceID: new Uint16Array(result.pointSourceID),
		ranges: result.ranges,
	};
}

describe("lasLayoutFor", () => {
	it("legacy formats 0-5 use 3+3 return bits, classification @15, psid @18", () => {
		for (const f of [0, 1, 2, 3, 4, 5]) {
			const layout = lasLayoutFor(f);
			expect(layout.returnBits).toBe("3+3");
			expect(layout.classification).toBe(15);
			expect(layout.pointSourceId).toBe(18);
		}
	});

	it("LAS 1.4 formats 6-10 use 4+4 return bits, classification @16, psid @20", () => {
		for (const f of [6, 7, 8, 9, 10]) {
			const layout = lasLayoutFor(f);
			expect(layout.returnBits).toBe("4+4");
			expect(layout.classification).toBe(16);
			expect(layout.pointSourceId).toBe(20);
		}
	});

	it("maps color offsets: only 2→20, 3→28, 7→30, 8→30; others none", () => {
		expect(lasLayoutFor(0).color).toBeUndefined();
		expect(lasLayoutFor(1).color).toBeUndefined();
		expect(lasLayoutFor(2).color).toBe(20);
		expect(lasLayoutFor(3).color).toBe(28);
		expect(lasLayoutFor(4).color).toBeUndefined();
		expect(lasLayoutFor(5).color).toBeUndefined();
		expect(lasLayoutFor(6).color).toBeUndefined();
		expect(lasLayoutFor(7).color).toBe(30);
		expect(lasLayoutFor(8).color).toBe(30);
	});
});

describe("decodeLasPoints — legacy formats 0-5 (3+3 return bits)", () => {
	it("format 0 (20 bytes): decodes with NO color and does not crash", () => {
		const pointSize = 20;
		const { buffer, view } = makePoint(pointSize);
		view.setUint8(14, 1 | (2 << 3)); // returnNumber=1, numberOfReturns=2
		view.setUint8(15, 3); // classification
		view.setUint16(18, 7, true); // point source id

		const d = decodeOne(buffer, pointSize, 0);

		expect(Array.from(d.position)).toEqual([10, 20, 30]);
		// color buffer is fully zeroed, alpha included (no color for format 0)
		expect(d.color).toEqual([0, 0, 0, 0]);
		expect(d.classification[0]).toBe(3);
		expect(d.pointSourceID[0]).toBe(7);
		expect(d.returnNumber[0]).toBe(1);
		expect(d.numberOfReturns[0]).toBe(2);
	});

	it("format 1 (28 bytes, +GPS): NO color, classification @15, psid @18", () => {
		const pointSize = 28;
		const { buffer, view } = makePoint(pointSize);
		view.setUint8(14, 2 | (4 << 3)); // returnNumber=2, numberOfReturns=4
		view.setUint8(15, 6);
		view.setUint16(18, 11, true);
		view.setFloat64(20, 123456.789, true); // GPS time (ignored)

		const d = decodeOne(buffer, pointSize, 1);

		expect(d.color).toEqual([0, 0, 0, 0]);
		expect(d.classification[0]).toBe(6);
		expect(d.pointSourceID[0]).toBe(11);
		expect(d.returnNumber[0]).toBe(2);
		expect(d.numberOfReturns[0]).toBe(4);
	});

	it("format 2 (26 bytes): RGB @20, classification @15, psid @18", () => {
		const pointSize = 26;
		const { buffer, view } = makePoint(pointSize);
		view.setUint8(14, 2 | (3 << 3));
		view.setUint8(15, 5);
		view.setUint16(18, 42, true);
		view.setUint16(20, 100 * 256, true); // R
		view.setUint16(22, 150 * 256, true); // G
		view.setUint16(24, 200 * 256, true); // B

		const d = decodeOne(buffer, pointSize, 2);

		expect(d.color).toEqual([100, 150, 200, 255]);
		expect(d.classification[0]).toBe(5);
		expect(d.pointSourceID[0]).toBe(42);
		expect(d.returnNumber[0]).toBe(2);
		expect(d.numberOfReturns[0]).toBe(3);
		expect(d.intensity[0]).toBe(500);
	});

	it("format 3 (34 bytes, +GPS): RGB @28, classification @15, psid @18", () => {
		const pointSize = 34;
		const { buffer, view } = makePoint(pointSize);
		view.setUint8(14, 3 | (5 << 3)); // returnNumber=3, numberOfReturns=5
		view.setUint8(15, 9);
		view.setUint16(18, 13, true);
		view.setFloat64(20, 987654.321, true); // GPS time (ignored)
		view.setUint16(28, 110 * 256, true); // R
		view.setUint16(30, 120 * 256, true); // G
		view.setUint16(32, 130 * 256, true); // B

		const d = decodeOne(buffer, pointSize, 3);

		expect(d.color).toEqual([110, 120, 130, 255]);
		expect(d.classification[0]).toBe(9);
		expect(d.pointSourceID[0]).toBe(13);
		expect(d.returnNumber[0]).toBe(3);
		expect(d.numberOfReturns[0]).toBe(5);
	});
});

describe("decodeLasPoints — LAS 1.4 formats 6-10 (4+4 return bits)", () => {
	it("format 6 (30 bytes): NO color, classification @16, psid @20, 4+4 returns", () => {
		const pointSize = 30;
		const { buffer, view } = makePoint(pointSize);
		// returnNumber=9 (needs 4 bits), numberOfReturns=10
		view.setUint8(14, 9 | (10 << 4));
		view.setUint8(16, 12); // classification @16
		view.setUint16(20, 21, true); // psid @20
		view.setFloat64(22, 42.0, true); // GPS time (ignored)

		const d = decodeOne(buffer, pointSize, 6);

		expect(d.color).toEqual([0, 0, 0, 0]);
		expect(d.classification[0]).toBe(12);
		expect(d.pointSourceID[0]).toBe(21);
		expect(d.returnNumber[0]).toBe(9);
		expect(d.numberOfReturns[0]).toBe(10);
	});

	it("format 7 (36 bytes): RGB @30, classification @16, psid @20, 4+4 returns", () => {
		const pointSize = 36;
		const { buffer, view } = makePoint(pointSize);
		// returnNumber=9, numberOfReturns=11 — 3+3 unpacking would misread these
		view.setUint8(14, 9 | (11 << 4));
		view.setUint8(16, 14); // classification @16
		view.setUint16(20, 33, true); // psid @20
		view.setFloat64(22, 42.0, true); // GPS time (ignored)
		view.setUint16(30, 140 * 256, true); // R @30
		view.setUint16(32, 150 * 256, true); // G
		view.setUint16(34, 160 * 256, true); // B

		const d = decodeOne(buffer, pointSize, 7);

		expect(d.color).toEqual([140, 150, 160, 255]);
		expect(d.classification[0]).toBe(14);
		expect(d.pointSourceID[0]).toBe(33);
		expect(d.returnNumber[0]).toBe(9);
		expect(d.numberOfReturns[0]).toBe(11);
	});

	it("format 8 (38 bytes, +NIR): RGB @30, classification @16, psid @20", () => {
		const pointSize = 38;
		const { buffer, view } = makePoint(pointSize);
		// numberOfReturns=15 exercises the top 4-bit nibble
		view.setUint8(14, 1 | (15 << 4));
		view.setUint8(16, 2); // classification @16
		view.setUint16(20, 44, true); // psid @20
		view.setFloat64(22, 42.0, true); // GPS time (ignored)
		view.setUint16(30, 200 * 256, true); // R @30
		view.setUint16(32, 210 * 256, true); // G
		view.setUint16(34, 220 * 256, true); // B
		view.setUint16(36, 250 * 256, true); // NIR (ignored)

		const d = decodeOne(buffer, pointSize, 8);

		expect(d.color).toEqual([200, 210, 220, 255]);
		expect(d.classification[0]).toBe(2);
		expect(d.pointSourceID[0]).toBe(44);
		expect(d.returnNumber[0]).toBe(1);
		expect(d.numberOfReturns[0]).toBe(15);
	});

	// Genuinely uncovered layouts/attributes — no assertions written yet.
	it.todo("format 5 (RGB @28 + GPS + waveform) color");
	it.todo("format 8 NIR (near-infrared) channel decode");
	it.todo("formats 9/10 waveform-packet layout");
	it.todo("extra-bytes / variable-length point records (pointSize > base layout)");
	it.todo("GPS-time attribute for formats 1/3/6-10");
});
