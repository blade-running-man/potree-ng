// Establish the browser-like globals the vendored zstd-codec bundle expects
// BEFORE it is concatenated after this preamble. Assigning through globalThis
// creates real `window`/`document` globals in the classic worker scope (the
// bundle later stashes `ZstdCodec` on `window`). Kept import/export-free so the
// concat pipeline can prepend it verbatim.
(globalThis as any).window = {};
(globalThis as any).document = {};
