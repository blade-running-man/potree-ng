import { decodeLasPoints } from "./decodeLasPoints";

// Web Worker globals: a classic worker exposes `onmessage`/`postMessage` on the
// global scope. We reach them through `globalThis` because the DOM lib types
// the global `postMessage` as the `Window` variant (2nd arg = targetOrigin
// string), which would reject the `(message, transferables)` worker signature.
const worker = globalThis as unknown as {
	onmessage: (event: MessageEvent) => void;
	postMessage: (message: any, transfer?: ArrayBuffer[]) => void;
};

worker.onmessage = function (event: MessageEvent) {
	const message = decodeLasPoints({
		buffer: event.data.buffer,
		numPoints: event.data.numPoints,
		pointSize: event.data.pointSize,
		pointFormatID: event.data.pointFormatID,
		scale: event.data.scale,
		offset: event.data.offset,
		mins: event.data.mins,
	});

	const transferables = [
		message.position,
		message.color,
		message.intensity,
		message.classification,
		message.returnNumber,
		message.numberOfReturns,
		message.pointSourceID,
		message.indices,
	];

	worker.postMessage(message, transferables);
};
