import { Version } from "../../Version";
import { PointAttribute, PointAttributeTypes } from "../../loader/PointAttributes";

const typedArrayMapping: Record<string, any> = {
	"int8":   Int8Array,
	"int16":  Int16Array,
	"int32":  Int32Array,
	"int64":  Float64Array,
	"uint8":  Uint8Array,
	"uint16": Uint16Array,
	"uint32": Uint32Array,
	"uint64": Float64Array,
	"float":  Float32Array,
	"double": Float64Array,
};

export interface DecodeBinaryInput {
	buffer: ArrayBuffer;
	pointAttributes: any; // loose Potree schema shape; targeted any is OK per the utils convention
	version: string;
	offset: number[]; // node offset
	scale: number;
}

export interface DecodeBinaryResult {
	attributeBuffers: Record<string, any>;
	mean: number[];
	tightBoundingBox: { min: number[]; max: number[] };
}

/**
 * Pure decode of a Potree 1.x binary point buffer into per-attribute
 * `ArrayBuffer`s, computing the point `mean` and `tightBoundingBox`.
 *
 * Extracted verbatim from the old `BinaryDecoderWorker` `onmessage` body so it
 * can be unit-tested without a Worker context. Returns the decoded buffers
 * instead of `postMessage`-ing them.
 */
export function decodeBinaryAttributes(input: DecodeBinaryInput): DecodeBinaryResult {
	const buffer = input.buffer;
	const pointAttributes = input.pointAttributes;
	const numPoints = buffer.byteLength / pointAttributes.byteSize;
	const view = new DataView(buffer);
	const version = new Version(input.version);
	const nodeOffset = input.offset;
	const scale = input.scale;

	const tightBoxMin = [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY];
	const tightBoxMax = [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY];
	const mean = [0, 0, 0];

	const attributeBuffers: Record<string, any> = {};
	let inOffset = 0;
	for (const pointAttribute of pointAttributes.attributes) {

		if (pointAttribute.name === "POSITION_CARTESIAN") {
			const buff = new ArrayBuffer(numPoints * 4 * 3);
			const positions = new Float32Array(buff);

			for (let j = 0; j < numPoints; j++) {
				let x, y, z;

				if (version.newerThan('1.3')) {
					x = (view.getUint32(inOffset + j * pointAttributes.byteSize + 0, true) * scale);
					y = (view.getUint32(inOffset + j * pointAttributes.byteSize + 4, true) * scale);
					z = (view.getUint32(inOffset + j * pointAttributes.byteSize + 8, true) * scale);
				} else {
					x = view.getFloat32(j * pointAttributes.byteSize + 0, true) + nodeOffset[0];
					y = view.getFloat32(j * pointAttributes.byteSize + 4, true) + nodeOffset[1];
					z = view.getFloat32(j * pointAttributes.byteSize + 8, true) + nodeOffset[2];
				}

				positions[3 * j + 0] = x;
				positions[3 * j + 1] = y;
				positions[3 * j + 2] = z;

				mean[0] += x / numPoints;
				mean[1] += y / numPoints;
				mean[2] += z / numPoints;

				tightBoxMin[0] = Math.min(tightBoxMin[0], x);
				tightBoxMin[1] = Math.min(tightBoxMin[1], y);
				tightBoxMin[2] = Math.min(tightBoxMin[2], z);

				tightBoxMax[0] = Math.max(tightBoxMax[0], x);
				tightBoxMax[1] = Math.max(tightBoxMax[1], y);
				tightBoxMax[2] = Math.max(tightBoxMax[2], z);
			}

			attributeBuffers[pointAttribute.name] = { buffer: buff, attribute: pointAttribute };
		} else if (pointAttribute.name === "rgba") {
			const buff = new ArrayBuffer(numPoints * 4);
			const colors = new Uint8Array(buff);

			for (let j = 0; j < numPoints; j++) {
				colors[4 * j + 0] = view.getUint8(inOffset + j * pointAttributes.byteSize + 0);
				colors[4 * j + 1] = view.getUint8(inOffset + j * pointAttributes.byteSize + 1);
				colors[4 * j + 2] = view.getUint8(inOffset + j * pointAttributes.byteSize + 2);
			}

			attributeBuffers[pointAttribute.name] = { buffer: buff, attribute: pointAttribute };
		} else if (pointAttribute.name === "NORMAL_SPHEREMAPPED") {
			const buff = new ArrayBuffer(numPoints * 4 * 3);
			const normals = new Float32Array(buff);

			for (let j = 0; j < numPoints; j++) {
				const bx = view.getUint8(inOffset + j * pointAttributes.byteSize + 0);
				const by = view.getUint8(inOffset + j * pointAttributes.byteSize + 1);

				const ex = bx / 255;
				const ey = by / 255;

				let nx = ex * 2 - 1;
				let ny = ey * 2 - 1;
				let nz = 1;
				const nw = -1;

				const l = (nx * (-nx)) + (ny * (-ny)) + (nz * (-nw));
				nz = l;
				nx = nx * Math.sqrt(l);
				ny = ny * Math.sqrt(l);

				nx = nx * 2;
				ny = ny * 2;
				nz = nz * 2 - 1;

				normals[3 * j + 0] = nx;
				normals[3 * j + 1] = ny;
				normals[3 * j + 2] = nz;
			}

			attributeBuffers[pointAttribute.name] = { buffer: buff, attribute: pointAttribute };
		} else if (pointAttribute.name === "NORMAL_OCT16") {
			const buff = new ArrayBuffer(numPoints * 4 * 3);
			const normals = new Float32Array(buff);

			for (let j = 0; j < numPoints; j++) {
				const bx = view.getUint8(inOffset + j * pointAttributes.byteSize + 0);
				const by = view.getUint8(inOffset + j * pointAttributes.byteSize + 1);

				const u = (bx / 255) * 2 - 1;
				const v = (by / 255) * 2 - 1;

				const z0 = 1 - Math.abs(u) - Math.abs(v);

				let x = 0;
				let y = 0;
				let z = z0;
				if (z0 >= 0) {
					x = u;
					y = v;
				} else {
					x = -(v / Math.sign(v) - 1) / Math.sign(u);
					y = -(u / Math.sign(u) - 1) / Math.sign(v);
				}

				const length = Math.sqrt(x * x + y * y + z * z);
				x = x / length;
				y = y / length;
				z = z / length;

				normals[3 * j + 0] = x;
				normals[3 * j + 1] = y;
				normals[3 * j + 2] = z;
			}

			attributeBuffers[pointAttribute.name] = { buffer: buff, attribute: pointAttribute };
		} else if (pointAttribute.name === "NORMAL") {
			const buff = new ArrayBuffer(numPoints * 4 * 3);
			const normals = new Float32Array(buff);

			for (let j = 0; j < numPoints; j++) {
				const x = view.getFloat32(inOffset + j * pointAttributes.byteSize + 0, true);
				const y = view.getFloat32(inOffset + j * pointAttributes.byteSize + 4, true);
				const z = view.getFloat32(inOffset + j * pointAttributes.byteSize + 8, true);

				normals[3 * j + 0] = x;
				normals[3 * j + 1] = y;
				normals[3 * j + 2] = z;
			}

			attributeBuffers[pointAttribute.name] = { buffer: buff, attribute: pointAttribute };
		} else {
			const buff = new ArrayBuffer(numPoints * 4);
			const f32 = new Float32Array(buff);

			const TypedArray = typedArrayMapping[pointAttribute.type.name];
			const preciseBuffer = new TypedArray(numPoints);

			let [min, max] = [Infinity, -Infinity];
			let [offset, scale] = [0, 1];

			const getterMap: Record<string, any> = {
				"int8":   view.getInt8,
				"int16":  view.getInt16,
				"int32":  view.getInt32,
				"int64":  view.getBigInt64,
				"uint8":  view.getUint8,
				"uint16": view.getUint16,
				"uint32": view.getUint32,
				"uint64": view.getBigUint64,
				"float":  view.getFloat32,
				"double": view.getFloat64,
			};
			const typeName = pointAttribute.type.name;
			const rawGetter = getterMap[typeName].bind(view);
			// getBigInt64/getBigUint64 return BigInt; coerce to Number so the
			// min/max and packing arithmetic below stays in the Number domain.
			const is64 = typeName === "int64" || typeName === "uint64";
			const getter = is64 ? (o: number, le: boolean) => Number(rawGetter(o, le)) : rawGetter;

			// compute offset and scale to pack larger types into 32 bit floats
			if (pointAttribute.type.size > 4) {
				for (let j = 0; j < numPoints; j++) {
					const value = getter(inOffset + j * pointAttributes.byteSize, true);

					if (!Number.isNaN(value)) {
						min = Math.min(min, value);
						max = Math.max(max, value);
					}
				}

				if (pointAttribute.initialRange != null) {
					offset = pointAttribute.initialRange[0];
					scale = 1 / (pointAttribute.initialRange[1] - pointAttribute.initialRange[0]);
				} else {
					offset = min;
					scale = 1 / (max - min);
				}
			}

			for (let j = 0; j < numPoints; j++) {
				const value = getter(inOffset + j * pointAttributes.byteSize, true);

				if (!Number.isNaN(value)) {
					min = Math.min(min, value);
					max = Math.max(max, value);
				}

				f32[j] = (value - offset) * scale;
				preciseBuffer[j] = value;
			}

			pointAttribute.range = [min, max];

			attributeBuffers[pointAttribute.name] = {
				buffer: buff,
				preciseBuffer: preciseBuffer,
				attribute: pointAttribute,
				offset: offset,
				scale: scale,
			};
		}

		inOffset += pointAttribute.byteSize;
	}

	{ // add indices
		const buff = new ArrayBuffer(numPoints * 4);
		const indices = new Uint32Array(buff);

		for (let i = 0; i < numPoints; i++) {
			indices[i] = i;
		}

		attributeBuffers["INDICES"] = { buffer: buff, attribute: PointAttribute.INDICES };
	}

	{ // handle attribute vectors
		const vectors = pointAttributes.vectors;

		for (const vector of vectors) {

			const { name, attributes } = vector;
			const numVectorElements = attributes.length;
			const vecBuffer = new ArrayBuffer(numVectorElements * numPoints * 4);
			const f32 = new Float32Array(vecBuffer);

			let iElement = 0;
			for (const sourceName of attributes) {
				const sourceBuffer = attributeBuffers[sourceName];
				const { offset, scale } = sourceBuffer;
				const sourceView = new DataView(sourceBuffer.buffer);

				const getter = sourceView.getFloat32.bind(sourceView);

				for (let j = 0; j < numPoints; j++) {
					const value = getter(j * 4, true);

					f32[j * numVectorElements + iElement] = (value / scale) + offset;
				}

				iElement++;
			}

			const vecAttribute = new PointAttribute(name, PointAttributeTypes.DATA_TYPE_FLOAT, 3);

			attributeBuffers[name] = {
				buffer: vecBuffer,
				attribute: vecAttribute,
			};

		}

	}

	return {
		attributeBuffers,
		mean,
		tightBoundingBox: { min: tightBoxMin, max: tightBoxMax },
	};
}
