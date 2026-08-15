import fs from 'node:fs';
import path from 'node:path';

const workers = {
  // LAZ worker is built from the vendored plasio sources, NOT from src/workers.
  // (src/workers/LASLAZWorker.js / LazLoaderWorker.js were dead stubs — removed.)
  LASLAZWorker: ['libs/plasio/workers/laz-perf.js', 'libs/plasio/workers/laz-loader-worker.js'],
  LASDecoderWorker: ['src/workers/LASDecoderWorker.js'],
  EptLaszipDecoderWorker: ['libs/copc/index.js', 'src/workers/EptLaszipDecoderWorker.js'],
  EptBinaryDecoderWorker: ['libs/ept/ParseBuffer.js', 'src/workers/EptBinaryDecoderWorker.js'],
  EptZstandardDecoderWorker: [
    'src/workers/EptZstandardDecoder_preamble.js',
    'libs/zstd-codec/bundle.js',
    'libs/ept/ParseBuffer.js',
    'src/workers/EptZstandardDecoderWorker.js',
  ],
};
const outDir = 'build/potree/workers';
fs.mkdirSync(outDir, { recursive: true });
for (const [name, files] of Object.entries(workers)) {
  const merged = files.map(f => fs.readFileSync(f, 'utf8')).join('\n');
  fs.writeFileSync(path.join(outDir, `${name}.js`), merged);
}
// wasm next to the workers
fs.copyFileSync('libs/copc/laz-perf.wasm', path.join(outDir, 'laz-perf.wasm'));
