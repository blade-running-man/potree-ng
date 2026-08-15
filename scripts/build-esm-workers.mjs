// Build the 3 ESM decoder workers as separate self-contained bundles.
// Classic-worker-safe: each output has no import/export and no shared chunks.
import { build } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

const entries = [
  { out: 'build/potree/workers',     name: 'BinaryDecoderWorker',    file: 'src/workers/BinaryDecoder/index.ts' },
  { out: 'build/potree/workers',     name: 'LASDecoderWorker',       file: 'src/workers/LASDecoder/index.ts' },
  { out: 'build/potree/workers',     name: 'EptLaszipDecoderWorker', file: 'src/workers/EptLaszip/index.ts' },
  { out: 'build/potree/workers/2.0', name: 'DecoderWorker',          file: 'src/modules/loader/2.0/DecoderWorker.js' },
  { out: 'build/potree/workers/2.0', name: 'DecoderWorker_brotli',   file: 'src/modules/loader/2.0/DecoderWorker_brotli.js' },
];

for (const e of entries) {
  await build({
    configFile: false,
    logLevel: 'warn',
    build: {
      outDir: e.out,
      emptyOutDir: false,
      minify: false,
      sourcemap: false,
      lib: {
        entry: path.resolve(root, e.file),
        formats: ['es'],
        fileName: () => `${e.name}.js`,
      },
    },
  });
}

// EptLaszip references the `Copc` global at runtime (declared ambiently in
// src/workers/EptLaszip/index.ts, never imported), so Vite leaves it as a bare
// external reference. The classic worker still needs that global present, so
// prepend the copc bundle to the emitted script (it is import/export-free, like
// the concat pipeline used to do).
const eptLaszipOut = path.resolve(root, 'build/potree/workers/EptLaszipDecoderWorker.js');
const copcSource = fs.readFileSync(path.resolve(root, 'libs/copc/index.js'), 'utf8');
const builtSource = fs.readFileSync(eptLaszipOut, 'utf8');
fs.writeFileSync(eptLaszipOut, copcSource + '\n' + builtSource);
