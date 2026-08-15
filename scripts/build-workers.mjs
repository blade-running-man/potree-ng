import fs from 'node:fs';
import path from 'node:path';
// Vite 8 ships rolldown (oxc), not esbuild. `transform` from rolldown's
// experimental entry is oxc's TS transform: it strips types WITHOUT bundling or
// resolving imports, which is exactly what the concat pipeline needs — the
// worker `.ts` sources rely on globals from the libs prepended before them and
// MUST stay import/export-free.
import { transform } from 'rolldown/experimental';

const workers = {
  // LAZ worker is built from the vendored plasio sources, NOT from src/workers.
  // (src/workers/LASLAZWorker.js / LazLoaderWorker.js were dead stubs — removed.)
  LASLAZWorker: ['libs/plasio/workers/laz-perf.js', 'libs/plasio/workers/laz-loader-worker.js'],
  EptLaszipDecoderWorker: ['libs/copc/index.js', 'src/workers/EptLaszipDecoderWorker.ts'],
  EptBinaryDecoderWorker: ['libs/ept/ParseBuffer.js', 'src/workers/EptBinaryDecoderWorker.ts'],
  EptZstandardDecoderWorker: [
    'src/workers/EptZstandardDecoder_preamble.ts',
    'libs/zstd-codec/bundle.js',
    'libs/ept/ParseBuffer.js',
    'src/workers/EptZstandardDecoderWorker.ts',
  ],
};

// Read a source file for concatenation. `.ts` files are transpiled through oxc
// (types stripped, no bundling) so the emitted text is plain script with no
// import/export; `.js` libs are passed through verbatim.
async function readSource(file) {
  const src = fs.readFileSync(file, 'utf8');
  if (file.endsWith('.ts')) {
    const { code } = await transform(file, src, { lang: 'ts' });
    return code;
  }
  return src;
}

const outDir = 'build/potree/workers';
fs.mkdirSync(outDir, { recursive: true });
for (const [name, files] of Object.entries(workers)) {
  const parts = await Promise.all(files.map(readSource));
  const merged = parts.join('\n');
  fs.writeFileSync(path.join(outDir, `${name}.js`), merged);
}
// wasm next to the workers
fs.copyFileSync('libs/copc/laz-perf.wasm', path.join(outDir, 'laz-perf.wasm'));
