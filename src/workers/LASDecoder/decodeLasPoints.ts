export interface LasDecodeInput {
	buffer: ArrayBuffer;
	numPoints: number;
	pointSize: number;
	pointFormatID: number;
	scale: number[];
	offset: number[];
	mins: number[];
}

export interface LasDecodeResult {
	mean: number[];
	position: ArrayBuffer;
	color: ArrayBuffer;
	intensity: ArrayBuffer;
	classification: ArrayBuffer;
	returnNumber: ArrayBuffer;
	numberOfReturns: ArrayBuffer;
	pointSourceID: ArrayBuffer;
	tightBoundingBox: { min: number[]; max: number[] };
	indices: ArrayBuffer;
	ranges: Record<string, [number, number]>;
}

export interface LasLayout {
	/**
	 * How the return-info byte @14 packs returnNumber / numberOfReturns:
	 *   "3+3" — legacy formats 0-5: returnNumber = bits 0-2, numberOfReturns = bits 3-5.
	 *   "4+4" — LAS 1.4 formats 6-10: returnNumber = bits 0-3, numberOfReturns = bits 4-7.
	 */
	returnBits: "3+3" | "4+4";
	/** byte offset of the classification field within the point record */
	classification: number;
	/** byte offset of the point source id (uint16) within the point record */
	pointSourceId: number;
	/** byte offset of the first RGB channel (uint16), or undefined when the format has no color */
	color?: number;
}

/**
 * Per-format LAS point-record layout descriptor. Offsets follow the ASPRS LAS
 * spec: legacy point formats 0-5 vs. the LAS 1.4 formats 6-10.
 */
export function lasLayoutFor(format: number): LasLayout {
	if (format <= 5) {
		return {
			returnBits: "3+3",
			classification: 15,
			pointSourceId: 18,
			color: format === 2 ? 20 : format === 3 ? 28 : undefined,
		};
	}
	return {
		returnBits: "4+4",
		classification: 16,
		pointSourceId: 20,
		color: (format === 7 || format === 8) ? 30 : undefined,
	};
}

/**
 * Pure decode of a raw (already-decompressed) LAS point-record buffer into
 * per-attribute `ArrayBuffer`s, computing the point `mean` and
 * `tightBoundingBox`.
 *
 * Extracted from the old `LASDecoderWorker` `readUsingDataView` body so it can
 * be unit-tested without a Worker context. Returns the decoded buffers instead
 * of `postMessage`-ing them.
 */
export function decodeLasPoints(input: LasDecodeInput): LasDecodeResult {
	performance.mark("laslaz-start");

	const buffer = input.buffer;
	const numPoints = input.numPoints;
	const sourcePointSize = input.pointSize;
	const pointFormatID = input.pointFormatID;
	const scale = input.scale;
	const offset = input.offset;
	const mins = input.mins;

	const sourceView = new DataView(buffer);

	const tightBoundingBox = {
		min: [Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE],
		max: [-Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE]
	};

	const mean = [0, 0, 0];

	const pBuff = new ArrayBuffer(numPoints * 3 * 4);
	const cBuff = new ArrayBuffer(numPoints * 4);
	const iBuff = new ArrayBuffer(numPoints * 4);
	const clBuff = new ArrayBuffer(numPoints);
	const rnBuff = new ArrayBuffer(numPoints);
	const nrBuff = new ArrayBuffer(numPoints);
	const psBuff = new ArrayBuffer(numPoints * 2);

	const positions = new Float32Array(pBuff);
	const colors = new Uint8Array(cBuff);
	const intensities = new Float32Array(iBuff);
	const classifications = new Uint8Array(clBuff);
	const returnNumbers = new Uint8Array(rnBuff);
	const numberOfReturns = new Uint8Array(nrBuff);
	const pointSourceIDs = new Uint16Array(psBuff);

	const rangeIntensity: [number, number] = [Infinity, -Infinity];
	const rangeClassification: [number, number] = [Infinity, -Infinity];
	const rangeReturnNumber: [number, number] = [Infinity, -Infinity];
	const rangeNumberOfReturns: [number, number] = [Infinity, -Infinity];
	const rangeSourceID: [number, number] = [Infinity, -Infinity];

	const layout = lasLayoutFor(pointFormatID);

	for (let i = 0; i < numPoints; i++) {
		const base = i * sourcePointSize;

		// POSITION
		const ux = sourceView.getInt32(base + 0, true);
		const uy = sourceView.getInt32(base + 4, true);
		const uz = sourceView.getInt32(base + 8, true);

		const x = ux * scale[0] + offset[0] - mins[0];
		const y = uy * scale[1] + offset[1] - mins[1];
		const z = uz * scale[2] + offset[2] - mins[2];

		positions[3 * i + 0] = x;
		positions[3 * i + 1] = y;
		positions[3 * i + 2] = z;

		mean[0] += x / numPoints;
		mean[1] += y / numPoints;
		mean[2] += z / numPoints;

		tightBoundingBox.min[0] = Math.min(tightBoundingBox.min[0], x);
		tightBoundingBox.min[1] = Math.min(tightBoundingBox.min[1], y);
		tightBoundingBox.min[2] = Math.min(tightBoundingBox.min[2], z);

		tightBoundingBox.max[0] = Math.max(tightBoundingBox.max[0], x);
		tightBoundingBox.max[1] = Math.max(tightBoundingBox.max[1], y);
		tightBoundingBox.max[2] = Math.max(tightBoundingBox.max[2], z);

		// INTENSITY (always @12)
		const intensity = sourceView.getUint16(base + 12, true);
		intensities[i] = intensity;
		rangeIntensity[0] = Math.min(rangeIntensity[0], intensity);
		rangeIntensity[1] = Math.max(rangeIntensity[1], intensity);

		// RETURN NUMBER / NUMBER OF RETURNS, packed into the return-info byte @14.
		// Legacy formats 0-5 pack 3+3 bits; LAS 1.4 formats 6-10 pack 4+4 bits.
		const returnByte = sourceView.getUint8(base + 14);
		let returnNumber: number;
		let numberOfReturn: number;
		if (layout.returnBits === "4+4") {
			returnNumber = returnByte & 0b1111;
			numberOfReturn = (returnByte >> 4) & 0b1111;
		} else {
			returnNumber = returnByte & 0b0111;
			numberOfReturn = (returnByte >> 3) & 0b0111;
		}
		returnNumbers[i] = returnNumber;
		numberOfReturns[i] = numberOfReturn;
		rangeReturnNumber[0] = Math.min(rangeReturnNumber[0], returnNumber);
		rangeReturnNumber[1] = Math.max(rangeReturnNumber[1], returnNumber);
		rangeNumberOfReturns[0] = Math.min(rangeNumberOfReturns[0], numberOfReturn);
		rangeNumberOfReturns[1] = Math.max(rangeNumberOfReturns[1], numberOfReturn);

		// CLASSIFICATION
		const classification = sourceView.getUint8(base + layout.classification);
		classifications[i] = classification;
		rangeClassification[0] = Math.min(rangeClassification[0], classification);
		rangeClassification[1] = Math.max(rangeClassification[1], classification);

		// POINT SOURCE ID
		const pointSourceID = sourceView.getUint16(base + layout.pointSourceId, true);
		pointSourceIDs[i] = pointSourceID;
		rangeSourceID[0] = Math.min(rangeSourceID[0], pointSourceID);
		rangeSourceID[1] = Math.max(rangeSourceID[1], pointSourceID);

		// COLOR, if the format carries it
		if (layout.color !== undefined) {
			const r = sourceView.getUint16(base + layout.color + 0, true) / 256;
			const g = sourceView.getUint16(base + layout.color + 2, true) / 256;
			const b = sourceView.getUint16(base + layout.color + 4, true) / 256;

			colors[4 * i + 0] = r;
			colors[4 * i + 1] = g;
			colors[4 * i + 2] = b;
			colors[4 * i + 3] = 255;
		}
	}

	const indices = new ArrayBuffer(numPoints * 4);
	const iIndices = new Uint32Array(indices);
	for (let i = 0; i < numPoints; i++) {
		iIndices[i] = i;
	}

	performance.mark("laslaz-end");
	performance.clearMarks();
	performance.clearMeasures();

	const ranges: Record<string, [number, number]> = {
		"intensity": rangeIntensity,
		"classification": rangeClassification,
		"return number": rangeReturnNumber,
		"number of returns": rangeNumberOfReturns,
		"source id": rangeSourceID,
	};

	return {
		mean: mean,
		position: pBuff,
		color: cBuff,
		intensity: iBuff,
		classification: clBuff,
		returnNumber: rnBuff,
		numberOfReturns: nrBuff,
		pointSourceID: psBuff,
		tightBoundingBox: tightBoundingBox,
		indices: indices,
		ranges: ranges,
	};
}
