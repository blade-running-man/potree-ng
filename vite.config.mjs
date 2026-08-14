import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

// Potree ships as a UMD library plus a folder of runtime assets loaded at
// runtime via `Potree.scriptPath`. Vite builds potree.js in library mode and
// vite-plugin-static-copy reproduces the asset layout gulp used to create.
// `lib.entry` is relative to the project root (the dir npm runs vite from), so
// no __dirname/import.meta juggling is needed in this ESM config.
export default defineConfig({
  plugins: [
    viteStaticCopy({
      targets: [
        { src: 'libs/geopackage/*', dest: 'lazylibs/geopackage' },
        { src: 'libs/sql.js/*',     dest: 'lazylibs/sql.js' },
        { src: 'src/viewer/potree.css',   dest: '.' },
        { src: 'src/viewer/sidebar.html', dest: '.' },
        { src: 'src/viewer/profile.html', dest: '.' },
        { src: 'resources/*', dest: 'resources' },
        { src: 'LICENSE', dest: '.' },
      ],
    }),
  ],
  build: {
    outDir: 'build/potree',
    emptyOutDir: false,          // workers/resources/lazylibs live alongside — do not wipe
    sourcemap: true,
    minify: false,               // current potree.js is unminified — keep it that way
    lib: {
      entry: 'src/Potree.js',
      name: 'Potree',            // global window.Potree
      formats: ['umd'],
      fileName: () => 'potree.js',
    },
    rollupOptions: {
      output: { assetFileNames: 'potree.[ext]' },
    },
  },
});
