import { Enum } from "../../Enum";

import {
	concatBuffers,
	computeNumStrips,
	computeFirstValueOffset,
	detectEndianness,
} from "./geotiffMath";

/**
 * Minimal TIFF/GeoTIFF reader + writer.
 *
 * Notes / known limitations (pre-existing behaviour, preserved here):
 * - `Reader.read` only supports little-endian ("II") files and expects a Node
 *   `Buffer` (it uses `readUInt8` / `readUInt16LE` / `readUInt32LE`).
 * - The `Exporter` declares `SAMPLES_PER_PIXEL = 4` but writes 3 bytes/pixel
 *   (RGB) strip data; the pixel bytes round-trip through this library's own
 *   `Reader`, but the sample-count metadata is inconsistent with the spec.
 */

// `Enum` uses an index signature, so members and `fromValue` resolve to `any`.
const Type = new Enum({
	BYTE: { value: 1, bytes: 1 },
	ASCII: { value: 2, bytes: 1 },
	SHORT: { value: 3, bytes: 2 },
	LONG: { value: 4, bytes: 4 },
	RATIONAL: { value: 5, bytes: 8 },
	SBYTE: { value: 6, bytes: 1 },
	UNDEFINED: { value: 7, bytes: 1 },
	SSHORT: { value: 8, bytes: 2 },
	SLONG: { value: 9, bytes: 4 },
	SRATIONAL: { value: 10, bytes: 8 },
	FLOAT: { value: 11, bytes: 4 },
	DOUBLE: { value: 12, bytes: 8 },
});

const Tag = new Enum({
	IMAGE_WIDTH: 256,
	IMAGE_HEIGHT: 257,
	BITS_PER_SAMPLE: 258,
	COMPRESSION: 259,
	PHOTOMETRIC_INTERPRETATION: 262,
	STRIP_OFFSETS: 273,
	ORIENTATION: 274,
	SAMPLES_PER_PIXEL: 277,
	ROWS_PER_STRIP: 278,
	STRIP_BYTE_COUNTS: 279,
	X_RESOLUTION: 282,
	Y_RESOLUTION: 283,
	PLANAR_CONFIGURATION: 284,
	RESOLUTION_UNIT: 296,
	SOFTWARE: 305,
	COLOR_MAP: 320,
	SAMPLE_FORMAT: 339,
	MODEL_PIXEL_SCALE: 33550,         // [GeoTIFF] TYPE: double   N: 3
	MODEL_TIEPOINT: 33922,            // [GeoTIFF] TYPE: double   N: 6 * NUM_TIEPOINTS
	GEO_KEY_DIRECTORY: 34735,         // [GeoTIFF] TYPE: short    N: >= 4
	GEO_DOUBLE_PARAMS: 34736,         // [GeoTIFF] TYPE: short    N: variable
	GEO_ASCII_PARAMS: 34737,          // [GeoTIFF] TYPE: ascii    N: variable
});

const typeMapping = new Map<any, any>([
	[Type.BYTE, Uint8Array],
	[Type.ASCII, Uint8Array],
	[Type.SHORT, Uint16Array],
	[Type.LONG, Uint32Array],
	[Type.RATIONAL, Uint32Array],
	[Type.SBYTE, Int8Array],
	[Type.UNDEFINED, Uint8Array],
	[Type.SSHORT, Int16Array],
	[Type.SLONG, Int32Array],
	[Type.SRATIONAL, Int32Array],
	[Type.FLOAT, Float32Array],
	[Type.DOUBLE, Float64Array],
]);

class IFDEntry {

	tag: any;
	type: any;
	count: number;
	offset: number | null;
	value: any;

	constructor (tag: any, type: any, count: number, offset: number | null, value: any) {
		this.tag = tag;
		this.type = type;
		this.count = count;
		this.offset = offset;
		this.value = value;
	}

}

class Image {

	width = 0;
	height = 0;
	buffer: Uint8Array | null = null;
	metadata: any[] = [];

}

class Reader {

	// `data` is a Node Buffer (readUInt8/readUInt16LE/readUInt32LE, re-sliceable).
	static read (data: any): Image {

		// Validate the byte-order marker (little-endian only is supported below).
		detectEndianness(Array.from(data.slice(0, 2)));

		const tiffCheckTag = data.readUInt8(2);

		if (tiffCheckTag !== 42) {
			throw new Error("not a valid tiff file");
		}

		const offsetToFirstIFD = data.readUInt32LE(4);

		const ifds: IFDEntry[] = [];
		let currentIFDOffset = offsetToFirstIFD;
		let i = 0;
		while (i < 100) {

			const numEntries = data.readUInt16LE(currentIFDOffset);
			const nextIFDOffset = data.readUInt32LE(currentIFDOffset + 2 + numEntries * 12);

			const entryBuffer = data.slice(currentIFDOffset + 2, currentIFDOffset + 2 + 12 * numEntries);

			for (let j = 0; j < numEntries; j++) {
				const tag = Tag.fromValue(entryBuffer.readUInt16LE(j * 12));
				const type = Type.fromValue(entryBuffer.readUInt16LE(j * 12 + 2));
				const count = entryBuffer.readUInt32LE(j * 12 + 4);
				const offsetOrValue = entryBuffer.readUInt32LE(j * 12 + 8);
				const valueBytes = type.bytes * count;

				let value;
				if (valueBytes <= 4) {
					value = offsetOrValue;
				} else {
					const valueBuffer = new Uint8Array(valueBytes);
					valueBuffer.set(data.slice(offsetOrValue, offsetOrValue + valueBytes));

					const ArrayType: any = typeMapping.get(type);

					value = new ArrayType(valueBuffer.buffer);

					if (type === Type.ASCII) {
						value = String.fromCharCode(...value);
					}
				}

				ifds.push(new IFDEntry(tag, type, count, offsetOrValue, value));
			}

			if (nextIFDOffset === 0) {
				break;
			}

			currentIFDOffset = nextIFDOffset;
			i++;
		}

		const ifdForTag = (tag: any): any => {
			for (const entry of ifds) {
				if (entry.tag === tag) {
					return entry;
				}
			}

			return null;
		};

		const width = ifdForTag(Tag.IMAGE_WIDTH).value;
		const height = ifdForTag(Tag.IMAGE_HEIGHT).value;
		const rowsPerStrip = ifdForTag(Tag.ROWS_PER_STRIP).value;
		const ifdStripOffsets = ifdForTag(Tag.STRIP_OFFSETS);
		const ifdStripByteCounts = ifdForTag(Tag.STRIP_BYTE_COUNTS);

		const numStrips = computeNumStrips(height, rowsPerStrip);

		const readShortOrLong = (ifd: any): number[] => {
			const values: number[] = [];
			for (let k = 0; k < ifd.count; k++) {
				const offset = ifd.offset + k * ifd.type.bytes;

				if (ifd.type === Type.SHORT) {
					values.push(data.readUInt16LE(offset));
				} else if (ifd.type === Type.LONG) {
					values.push(data.readUInt32LE(offset));
				}
			}
			return values;
		};

		const stripByteCounts = readShortOrLong(ifdStripByteCounts);
		const stripOffsets = readShortOrLong(ifdStripOffsets);

		const imageBuffer = new Uint8Array(width * height * 3);

		let linesProcessed = 0;
		for (let s = 0; s < numStrips; s++) {
			const stripOffset = stripOffsets[s];
			const stripBytes = stripByteCounts[s];
			const stripData = data.slice(stripOffset, stripOffset + stripBytes);
			const lineBytes = width * 3;
			for (let y = 0; y < rowsPerStrip; y++) {
				const line = stripData.slice(y * lineBytes, y * lineBytes + lineBytes);
				imageBuffer.set(line, linesProcessed * lineBytes);

				if (line.length === lineBytes) {
					linesProcessed++;
				} else {
					break;
				}
			}
		}

		const image = new Image();
		image.width = width;
		image.height = height;
		image.buffer = imageBuffer;
		image.metadata = ifds;

		return image;
	}

}

class Exporter {

	static toTiffBuffer (image: Image, params: { ifdEntries?: IFDEntry[] } = {}) {

		const offsetToFirstIFD = 8;

		const headerBuffer = new Uint8Array([0x49, 0x49, 42, 0, offsetToFirstIFD, 0, 0, 0]);

		const [width, height] = [image.width, image.height];

		const ifds: IFDEntry[] = [
			new IFDEntry(Tag.IMAGE_WIDTH,                Type.SHORT,    1,   null, width),
			new IFDEntry(Tag.IMAGE_HEIGHT,               Type.SHORT,    1,   null, height),
			new IFDEntry(Tag.BITS_PER_SAMPLE,            Type.SHORT,    4,   null, new Uint16Array([8, 8, 8, 8])),
			new IFDEntry(Tag.COMPRESSION,                Type.SHORT,    1,   null, 1),
			new IFDEntry(Tag.PHOTOMETRIC_INTERPRETATION, Type.SHORT,    1,   null, 2),
			new IFDEntry(Tag.ORIENTATION,                Type.SHORT,    1,   null, 1),
			new IFDEntry(Tag.SAMPLES_PER_PIXEL,          Type.SHORT,    1,   null, 4),
			new IFDEntry(Tag.ROWS_PER_STRIP,             Type.LONG,     1,   null, height),
			new IFDEntry(Tag.STRIP_BYTE_COUNTS,          Type.LONG,     1,   null, width * height * 3),
			new IFDEntry(Tag.PLANAR_CONFIGURATION,       Type.SHORT,    1,   null, 1),
			new IFDEntry(Tag.RESOLUTION_UNIT,            Type.SHORT,    1,   null, 1),
			new IFDEntry(Tag.SOFTWARE,                   Type.ASCII,    6,   null, "......"),
			new IFDEntry(Tag.STRIP_OFFSETS,              Type.LONG,     1,   null, null),
			new IFDEntry(Tag.X_RESOLUTION,               Type.RATIONAL, 1,   null, new Uint32Array([1, 1])),
			new IFDEntry(Tag.Y_RESOLUTION,               Type.RATIONAL, 1,   null, new Uint32Array([1, 1])),
		];

		if (params.ifdEntries) {
			ifds.push(...params.ifdEntries);
		}

		let valueOffset = computeFirstValueOffset(ifds.length, offsetToFirstIFD);

		// create 12 byte buffer for each ifd and variable length buffers for ifd values
		const ifdEntryBuffers = new Map<any, ArrayBuffer>();
		const ifdValueBuffers = new Map<any, Uint8Array>();
		for (const ifd of ifds) {
			const entryBuffer = new ArrayBuffer(12);
			const entryView = new DataView(entryBuffer);

			entryView.setUint16(0, ifd.tag.value, true);
			entryView.setUint16(2, ifd.type.value, true);
			entryView.setUint32(4, ifd.count, true);

			if (ifd.count === 1 && ifd.type.bytes <= 4) {
				entryView.setUint32(8, ifd.value, true);
			} else {
				entryView.setUint32(8, valueOffset, true);

				const valueBuffer = new Uint8Array(ifd.count * ifd.type.bytes);
				if (ifd.type === Type.ASCII) {
					valueBuffer.set(new Uint8Array((ifd.value as string).split("").map((c) => c.charCodeAt(0))));
				} else {
					valueBuffer.set(new Uint8Array(ifd.value.buffer));
				}
				ifdValueBuffers.set(ifd.tag, valueBuffer);

				valueOffset = valueOffset + valueBuffer.byteLength;
			}

			ifdEntryBuffers.set(ifd.tag, entryBuffer);
		}

		const imageBufferOffset = valueOffset;

		new DataView(ifdEntryBuffers.get(Tag.STRIP_OFFSETS)!).setUint32(8, imageBufferOffset, true);

		const ifdBuffer = concatBuffers([
			new Uint16Array([ifds.length]),
			...ifdEntryBuffers.values(),
			new Uint32Array([0]),
		]);
		const ifdValueBuffer = concatBuffers([...ifdValueBuffers.values()]);

		const tiffBuffer = concatBuffers([
			headerBuffer,
			ifdBuffer,
			ifdValueBuffer,
			image.buffer ?? new Uint8Array(0),
		]);

		return { width: width, height: height, buffer: tiffBuffer };
	}

}

export { Tag, Type, IFDEntry, Image, Reader, Exporter };
