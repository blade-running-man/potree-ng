import { defineConfig } from 'vite';
import path from 'path';

// vite-plugin-static-copy is ESM-only; vite.config.js is loaded via CJS require()
// in this project (no "type": "module" in package.json), so it must be pulled in
// via a dynamic import() inside an async config function rather than a static import.
export default defineConfig(async () => {
  const { viteStaticCopy } = await import('vite-plugin-static-copy');

  return {
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
        entry: path.resolve(__dirname, 'src/Potree.js'),
        name: 'Potree',            // global window.Potree
        formats: ['umd'],
        fileName: () => 'potree.js',
      },
      rollupOptions: {
        output: { assetFileNames: 'potree.[ext]' },
      },
    },
  };
});
