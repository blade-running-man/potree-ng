// Pure per-point assembly for the EptLaszip decoder, extracted verbatim from the
// old `EptLaszipDecoderWorker` body so it can be unit-tested without a Worker (or
// the `Copc` global). Everything here happens AFTER decompression: it consumes a
// view-like object (whatever `Copc.Las.View.create` returns) and produces the
// per-attribute `ArrayBuffer`s plus mean / bounding box / gps + color ranges.
//
// The thin worker wrapper (index.ts) owns decompression and `postMessage`; it
// injects the real Copc view here, and tests inject a synthetic one.

/**
 * Minimal shape of the Copc LAS view this decoder consumes.
 *  - `dimensions` gates optional attributes (`GpsTime`, `Red`/`Green`/`Blue`).
 *  - `getter(name)` returns a per-index accessor for a named dimension.
 */
export interface EptView {
	dimensions: Record<string, unknown>;
	getter(name: string): (i: number) => number;
}

export interface EptDecodeParams {
	pointCount: number;
	nodemin: number[];
}

export interface EptDecodeResult {
	position: ArrayBuffer;
	color: ArrayBuffer;
	intensity: ArrayBuffer;
	classification: ArrayBuffer;
	returnNumber: ArrayBuffer;
	numberOfReturns: ArrayBuffer;
	pointSourceId: ArrayBuffer;
	gpsTime: ArrayBuffer;
	indices: ArrayBuffer;
	mean: number[];
	tightBoundingBox: { min: number[]; max: number[] };
	gpsMeta: { offset: number; range: number };
	ranges: Record<string, [number, number]>;
}

export function decodeEptLaszipView(view: EptView, params: EptDecodeParams): EptDecodeResult {
	const { pointCount, nodemin } = params;

	const buffers = {
		position: new ArrayBuffer(pointCount * 3 * 4),
		color: new ArrayBuffer(pointCount * 4),
		intensity: new ArrayBuffer(pointCount * 4),
		classification: new ArrayBuffer(pointCount),
		returnNumber: new ArrayBuffer(pointCount),
		numberOfReturns: new ArrayBuffer(pointCount),
		pointSourceId: new ArrayBuffer(pointCount * 2),
		gpsTime: new ArrayBuffer(pointCount * 4),
		indices: new ArrayBuffer(pointCount * 4),
	};
	const tempBuffers = {
		gpsTime64: new ArrayBuffer(pointCount * 8),
		color16: new ArrayBuffer(pointCount * 3 * 2), // Does not include alpha.
	};

	const views = {
		position: new Float32Array(buffers.position),
		color16: new Uint16Array(tempBuffers.color16),
		color8: new Uint8Array(buffers.color),
		intensity: new Float32Array(buffers.intensity),
		classification: new Uint8Array(buffers.classification),
		returnNumber: new Uint8Array(buffers.returnNumber),
		numberOfReturns: new Uint8Array(buffers.numberOfReturns),
		pointSourceId: new Uint16Array(buffers.pointSourceId),
		gpsTime64: new Float64Array(tempBuffers.gpsTime64),
		gpsTime32: new Float32Array(buffers.gpsTime),
		indices: new Uint32Array(buffers.indices),
	};

	const mean = [0, 0, 0];

	const get: any = {
		x: view.getter("X"),
		y: view.getter("Y"),
		z: view.getter("Z"),
		intensity: view.getter("Intensity"),
		classification: view.getter("Classification"),
		returnNumber: view.getter("ReturnNumber"),
		numberOfReturns: view.getter("NumberOfReturns"),
		pointSourceId: view.getter("PointSourceId"),
		// Ternaries (rather than `cond && {…}`) so the spread always sees an
		// object type — `dimensions` values are `unknown`. Behavior is identical:
		// a falsy dimension contributes an empty spread, i.e. no getter.
		...(view.dimensions.GpsTime ? { gpsTime: view.getter("GpsTime") } : {}),
		...(view.dimensions.Red
			? {
				red: view.getter("Red"),
				green: view.getter("Green"),
				blue: view.getter("Blue"),
			}
			: {}),
	};

	const ranges = [
		"x",
		"y",
		"z",
		"intensity",
		"classification",
		"returnNumber",
		"numberOfReturns",
		"pointSourceId",
		"gpsTime",
		"color",
	].reduce<Record<string, [number, number]>>(
		(map, name) => ({ ...map, [name]: [Infinity, -Infinity] }),
		{},
	);

	function update(range: [number, number], value: number) {
		range[0] = Math.min(range[0], value);
		range[1] = Math.max(range[1], value);
	}

	for (let i = 0; i < pointCount; i++) {
		views.indices[i] = i;

		const x = get.x(i) - nodemin[0];
		const y = get.y(i) - nodemin[1];
		const z = get.z(i) - nodemin[2];

		views.position[3 * i + 0] = x;
		views.position[3 * i + 1] = y;
		views.position[3 * i + 2] = z;

		mean[0] += x / pointCount;
		mean[1] += y / pointCount;
		mean[2] += z / pointCount;

		update(ranges.x, x);
		update(ranges.y, y);
		update(ranges.z, z);

		views.intensity[i] = get.intensity(i);
		update(ranges.intensity, views.intensity[i]);

		views.returnNumber[i] = get.returnNumber(i);
		update(ranges.returnNumber, views.returnNumber[i]);

		views.numberOfReturns[i] = get.numberOfReturns(i);
		update(ranges.numberOfReturns, views.numberOfReturns[i]);

		views.classification[i] = get.classification(i);
		update(ranges.classification, views.classification[i]);

		views.pointSourceId[i] = get.pointSourceId(i);
		update(ranges.pointSourceId, views.pointSourceId[i]);

		if (get.gpsTime) {
			views.gpsTime64[i] = get.gpsTime(i);
			update(ranges.gpsTime, views.gpsTime64[i]);
		}

		if (get.red) {
			let r = get.red(i);
			let g = get.green(i);
			let b = get.blue(i);

			// We only really care about the max here to decide if we will need
			// to normalize the colors downward to 8-bit values.
			update(ranges.color, Math.max(r, g, b));

			views.color16[3 * i + 0] = r;
			views.color16[3 * i + 1] = g;
			views.color16[3 * i + 2] = b;
		}
	}

	// Do some normalizations:
	// 	- if colors are 16-bit, normalize them down to 8-bit
	// 	- normalize the GPS times to 32-bit offset values.
	const normalizeColor = ranges.color[1] > 255 ? (c: number) => c / 256 : (c: number) => c;
	ranges.color[0] = normalizeColor(ranges.color[0]);
	ranges.color[1] = normalizeColor(ranges.color[1]);
	for (let i = 0; i < pointCount; i++) {
		views.color8[4 * i + 0] = normalizeColor(views.color16[3 * i + 0]);
		views.color8[4 * i + 1] = normalizeColor(views.color16[3 * i + 1]);
		views.color8[4 * i + 2] = normalizeColor(views.color16[3 * i + 2]);
		views.color8[4 * i + 3] = 255;
		views.gpsTime32[i] = views.gpsTime64[i] - ranges.gpsTime[0];
	}

	return {
		...buffers,
		mean,
		tightBoundingBox: {
			min: [ranges.x[0], ranges.y[0], ranges.z[0]],
			max: [ranges.x[1], ranges.y[1], ranges.z[1]],
		},
		gpsMeta: {
			offset: ranges.gpsTime[0],
			range: ranges.gpsTime[1] - ranges.gpsTime[0],
		},
		ranges: {
			intensity: ranges.intensity,
			classification: ranges.classification,
			"return number": ranges.returnNumber,
			"number of returns": ranges.numberOfReturns,
			"source id": ranges.pointSourceId,
			"gps-time": ranges.gpsTime,
		},
	};
}
