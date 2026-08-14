/**
 * Pure byte/number helpers for the TIFF {@link Reader}/{@link Exporter}.
 *
 * These are free of any Node `Buffer` or three.js dependency so they can be
 * unit-tested with plain typed arrays.
 */

export type BufferLike = ArrayBuffer | ArrayBufferView;

/**
 * Concatenate a list of buffers/typed-array views into a single `Uint8Array`,
 * preserving each source's raw bytes (byte-wise, respecting element widths and
 * view offsets — unlike an element-wise `new Uint8Array(view)` copy).
 */
export function concatBuffers(buffers: BufferLike[]): Uint8Array {
	const toU8 = (b: BufferLike): Uint8Array =>
		b instanceof ArrayBuffer
			? new Uint8Array(b)
			: new Uint8Array(b.buffer, b.byteOffset, b.byteLength);

	const parts = buffers.map(toU8);
	const totalLength = parts.reduce((sum, p) => sum + p.byteLength, 0);
	const merged = new Uint8Array(totalLength);

	let offset = 0;
	for (const p of parts) {
		merged.set(p, offset);
		offset += p.byteLength;
	}

	return merged;
}

/**
 * Read the 2-byte TIFF byte-order marker: `"II"` → little-endian, `"MM"` →
 * big-endian. Throws on any other marker.
 */
export function detectEndianness(bytes: ArrayLike<number>): "LE" | "BE" {
	const tag = String.fromCharCode(bytes[0], bytes[1]);
	if (tag === "II") return "LE";
	if (tag === "MM") return "BE";
	throw new Error(`invalid TIFF endianness marker: "${tag}"`);
}

/** Number of strips needed to cover `height` rows at `rowsPerStrip` each. */
export function computeNumStrips(height: number, rowsPerStrip: number): number {
	return Math.ceil(height / rowsPerStrip);
}

/**
 * Byte offset at which the first out-of-line IFD value is written, given the
 * number of IFD entries. Layout: `firstIFDOffset` + 2 (entry count) +
 * `ifdCount * 12` (entries) + 4 (next-IFD pointer).
 */
export function computeFirstValueOffset(ifdCount: number, firstIFDOffset = 8): number {
	return firstIFDOffset + 2 + ifdCount * 12 + 4;
}
