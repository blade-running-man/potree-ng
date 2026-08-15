import fs from 'node:fs';
import path from 'node:path';
// `typescript` is already a direct devDependency (it powers `npm run typecheck`),
// so `transpileModule` is a stable, dependency-free way to strip types for the
// concat pipeline. `module: ESNext` is deliberate — `commonjs` would inject a
// `"use strict"` + `exports`/`__esModule` wrapper, whereas ESNext leaves the
// import/export-free worker sources as plain script text (these `.ts` workers
// rely on globals from the libs prepended before them and MUST stay
// import/export-free).
import ts from 'typescript';

const workers = {
  // LAZ worker is built from the vendored plasio sources, NOT from src/workers.
  // (src/workers/LASLAZWorker.js / LazLoaderWorker.js were dead stubs — removed.)
  LASLAZWorker: ['libs/plasio/workers/laz-perf.js', 'libs/plasio/workers/laz-loader-worker.js'],
  // EptLaszipDecoderWorker moved to the ESM pipeline (scripts/build-esm-workers.mjs);
  // it prepends libs/copc/index.js there. The laz-perf.wasm copy below still runs.
  EptBinaryDecoderWorker: ['libs/ept/ParseBuffer.js', 'src/workers/EptBinaryDecoderWorker.ts'],
  EptZstandardDecoderWorker: [
    'src/workers/EptZstandardDecoder_preamble.ts',
    'libs/zstd-codec/bundle.js',
    'libs/ept/ParseBuffer.js',
    'src/workers/EptZstandardDecoderWorker.ts',
  ],
};

// Read a source file for concatenation. `.ts` files have their types stripped
// via typescript's `transpileModule` (no bundling, no import resolution) so the
// emitted text is plain script with no import/export; `.js` libs pass through
// verbatim.
function readSource(file) {
  const src = fs.readFileSync(file, 'utf8');
  if (!file.endsWith('.ts')) return src;
  return ts.transpileModule(src, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.ESNext,
      isolatedModules: true,
    },
  }).outputText;
}

const outDir = 'build/potree/workers';
fs.mkdirSync(outDir, { recursive: true });
for (const [name, files] of Object.entries(workers)) {
  const merged = files.map(readSource).join('\n');
  fs.writeFileSync(path.join(outDir, `${name}.js`), merged);
}
// wasm next to the workers
fs.copyFileSync('libs/copc/laz-perf.wasm', path.join(outDir, 'laz-perf.wasm'));
