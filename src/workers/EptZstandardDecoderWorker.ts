// window = { };
// document = { };
// importScripts('/libs/zstd-codec/bundle.js', '/libs/ept/ParseBuffer.js');
//
// `window.ZstdCodec` (from the zstd-codec bundle, seeded onto the `window`
// global created by EptZstandardDecoder_preamble) and `parseEpt` (from
// libs/ept/ParseBuffer.js) are globals the concat build prepends before this
// file. `parseEpt` is declared ambiently; `window` is the DOM global (cast to
// reach the vendored `ZstdCodec`). The classic-worker `onmessage` is assigned via
// `globalThis` so the emitted code stays import/export-free and avoids a
// global-script name clash with the sibling concat workers.
declare function parseEpt(event: any): void;

(globalThis as unknown as { onmessage: (event: any) => void }).onmessage = async function (
	event: any,
) {
	const zstd = await new Promise<any>((resolve) => (window as any).ZstdCodec.run(resolve));

	const streaming = new zstd.Streaming();
	const arr = new Uint8Array(event.data.buffer);
	const decompressed = streaming.decompress(arr);

	event.data.buffer = decompressed.buffer;
	parseEpt(event);
};
