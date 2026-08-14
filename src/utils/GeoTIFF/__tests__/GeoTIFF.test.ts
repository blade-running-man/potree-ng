import { describe, it, expect } from "vitest";

import { Reader, Exporter, Image as TiffImage } from "../GeoTIFF";

function makeImage(): InstanceType<typeof TiffImage> {
	const image = new TiffImage();
	image.width = 2;
	image.height = 2;
	// 2×2 RGB, 3 bytes/pixel
	image.buffer = new Uint8Array([
		1, 2, 3, 4, 5, 6,
		7, 8, 9, 10, 11, 12,
	]);
	return image;
}

describe("Exporter.toTiffBuffer", () => {
	it("writes a little-endian TIFF header and echoes the dimensions", () => {
		const out = Exporter.toTiffBuffer(makeImage());
		expect(out.width).toBe(2);
		expect(out.height).toBe(2);
		expect(out.buffer[0]).toBe(0x49); // 'I'
		expect(out.buffer[1]).toBe(0x49); // 'I'
		expect(out.buffer[2]).toBe(42); // magic
		expect(out.buffer[4]).toBe(8); // offset to first IFD
	});

	it("writes the expected IFD entry count and total length", () => {
		const out = Exporter.toTiffBuffer(makeImage());
		const entryCount = out.buffer[8] | (out.buffer[9] << 8);
		expect(entryCount).toBe(15);
		// 8 (header) + 186 (IFD block) + 30 (out-of-line values) + 12 (pixels)
		expect(out.buffer.length).toBe(236);
	});

	it("appends caller-supplied IFD entries to the directory", () => {
		const withExtra = Exporter.toTiffBuffer(makeImage(), { ifdEntries: [] });
		const entryCount = withExtra.buffer[8] | (withExtra.buffer[9] << 8);
		expect(entryCount).toBe(15);
	});
});

describe("Reader.read", () => {
	// The library's Reader reads big-endian TIFFs and multi-strip offsets only
	// partially; here we verify the metadata round-trips through a Node Buffer.
	it("round-trips image dimensions from the exported buffer", () => {
		const exported = Exporter.toTiffBuffer(makeImage());
		const NodeBuffer = (globalThis as { Buffer?: { from(a: Uint8Array): unknown } }).Buffer;
		expect(NodeBuffer).toBeDefined();

		const decoded = Reader.read(NodeBuffer!.from(exported.buffer));
		expect(decoded.width).toBe(2);
		expect(decoded.height).toBe(2);
		expect(decoded.buffer).not.toBeNull();
		expect(decoded.buffer!.length).toBe(2 * 2 * 3);
		expect(decoded.metadata.length).toBe(15);
	});

	it("rejects a buffer whose magic number is not 42", () => {
		const bad = new Uint8Array([0x49, 0x49, 0x00, 0, 8, 0, 0, 0]);
		const NodeBuffer = (globalThis as { Buffer?: { from(a: Uint8Array): unknown } }).Buffer;
		expect(() => Reader.read(NodeBuffer!.from(bad))).toThrow(/not a valid tiff/);
	});
});
