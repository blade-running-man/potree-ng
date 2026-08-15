import { decodeBinaryAttributes } from "./decodeBinaryAttributes";

// Web Worker globals: a classic worker exposes `onmessage`/`postMessage` on the
// global scope. We reach them through `globalThis` because the DOM lib types
// the global `postMessage` as the `Window` variant (2nd arg = targetOrigin
// string), which would reject the `(message, transferables)` worker signature.
const worker = globalThis as unknown as {
	onmessage: (event: MessageEvent) => void;
	postMessage: (message: any, transfer?: ArrayBuffer[]) => void;
};

worker.onmessage = function (event: MessageEvent) {
	const result = decodeBinaryAttributes({
		buffer: event.data.buffer,
		pointAttributes: event.data.pointAttributes,
		version: event.data.version,
		offset: event.data.offset,
		scale: event.data.scale,
	});

	const message = {
		buffer: event.data.buffer, // returned so the main thread can read byteLength (not detached by the decoder)
		mean: result.mean,
		attributeBuffers: result.attributeBuffers,
		tightBoundingBox: result.tightBoundingBox,
	};

	const transferables: ArrayBuffer[] = [];
	for (const property in message.attributeBuffers) {
		transferables.push(message.attributeBuffers[property].buffer);
	}
	transferables.push(message.buffer);

	worker.postMessage(message, transferables);
};
