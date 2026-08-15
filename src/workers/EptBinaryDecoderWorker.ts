// importScripts('/libs/ept/ParseBuffer.js');
//
// `parseEpt` is a global supplied by libs/ept/ParseBuffer.js, which the concat
// build (scripts/build-workers.mjs) prepends to this file. It is NOT imported —
// doing so would break the classic-worker (no-module) output — so it is declared
// ambiently. We assign the classic-worker `onmessage` via `globalThis` (rather
// than a top-level binding) to keep the emitted code import/export-free and to
// avoid a global-script name clash with the sibling concat workers.
declare function parseEpt(event: any): void;

(globalThis as unknown as { onmessage: (event: any) => void }).onmessage = function (event: any) {
	parseEpt(event);
};
