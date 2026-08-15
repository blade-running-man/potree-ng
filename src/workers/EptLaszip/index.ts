// ept-laszip-decoder-worker.js
//
// `Copc` is a global supplied by libs/copc/index.js, which the ESM build
// (scripts/build-esm-workers.mjs) prepends to the bundled output. It is NOT
// imported — an ES import would break the classic-worker (no-module) output. It
// is declared ambiently so this stays type-checked while emitting no runtime
// import/export. Vite inlines the `decodeEptLaszipView` import and leaves this
// `Copc` reference as a bare global access.
import { decodeEptLaszipView } from "./decodeEptLaszipView";

declare const Copc: any;

// importScripts('/libs/copc/index.js');

// Web Worker globals: a classic worker exposes `onmessage`/`postMessage` on the
// global scope. We reach them through `globalThis` because the DOM lib types the
// global `postMessage` as the `Window` variant (2nd arg = targetOrigin string),
// which would reject the `(message, transferables)` worker signature.
const worker = globalThis as unknown as {
	onmessage: (event: MessageEvent) => void;
	postMessage: (message: any, transfer?: ArrayBuffer[]) => void;
};

async function readUsingDataView(event: MessageEvent) {
	performance.mark("laslaz-start");

	// TODO: Handle extra-bytes.
	const { isFullFile, compressed, header, eb, pointCount, nodemin } = event.data;
	const { pointDataRecordFormat, pointDataRecordLength } = header;

	// Note that for the chunk version, we use the point count passed in the
	// event rather than the point count from the header, since the header has
	// the point count for the entire file, not just our slice.
	const u = new Uint8Array(compressed);
	const buffer = isFullFile
		? await Copc.Las.PointData.decompressFile(u)
		: await Copc.Las.PointData.decompressChunk(
			u,
			{ pointDataRecordFormat, pointDataRecordLength, pointCount },
		);

	const view = Copc.Las.View.create(buffer, header, eb);

	const data = decodeEptLaszipView(view, { pointCount, nodemin });

	performance.mark("laslaz-end");

	//{ // print timings
	//	  performance.measure("laslaz", "laslaz-start", "laslaz-end");
	//	  let measure = performance.getEntriesByType("measure")[0];
	//	  let dpp = 1000 * measure.duration / numPoints;
	//	  let debugMessage = `${measure.duration.toFixed(3)} ms, ${numPoints} points, ${dpp.toFixed(3)} µs / point`;
	//	  console.log(debugMessage);
	//}
	performance.clearMarks();
	performance.clearMeasures();

	// Transfer list mirrors the old `Object.values(buffers)` order exactly.
	const transferables = [
		data.position,
		data.color,
		data.intensity,
		data.classification,
		data.returnNumber,
		data.numberOfReturns,
		data.pointSourceId,
		data.gpsTime,
		data.indices,
	];

	worker.postMessage(data, transferables);
}

worker.onmessage = readUsingDataView;
