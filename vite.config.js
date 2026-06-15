import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.js'),
      name: 'DrawflowPlus',
      // Produces both UMD (for <script> tag / CDN) and ESM (for bundlers)
      formats: ['umd', 'es'],
      fileName: (format) =>
        format === 'es' ? 'drawflow-plus.esm.js' : 'drawflow-plus.umd.js',
    },
    rollupOptions: {
      // Drawflow is a peer dep — don't bundle it
      external: ['drawflow'],
      output: {
        globals: {
          drawflow: 'Drawflow',
        },
        // Expose named exports at the top level of the UMD bundle so consumers
        // can use DrawflowPlus.ViewportManager etc. without .default indirection.
        exports: 'named',
      },
    },
    // Keep a readable UMD file alongside the minified one
    sourcemap: true,
    minify: 'esbuild',
  },
  resolve: {
    alias: {
      '@extensions': resolve(__dirname, 'src/extensions'),
      '@utils': resolve(__dirname, 'src/utils'),
    },
  },
});
