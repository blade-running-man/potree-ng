import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
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
});
