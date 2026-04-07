import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/sunbird-pdf-player.ts'),
      name: 'SunbirdPdfPlayer',
      fileName: 'sunbird-pdf-player',
      formats: ['es', 'umd'],
    },
    rollupOptions: {
      output: {
        // Inline dynamic imports so pdfjs-dist (loaded via dynamic import to bypass
        // Rollup's static analysis of its webpack-bundled ESM) stays in the single
        // output file rather than being split into a separate chunk.
        inlineDynamicImports: true,
        assetFileNames: 'assets/[name][extname]',
      },
    },
    // Do NOT inline assets as base64 — keeps output file size reasonable
    assetsInlineLimit: 0,
  },
  // Dev server CSS processing
  css: {
    postcss: './postcss.config.js',
  },
  assetsInclude: ['**/*.mjs'],
  optimizeDeps: {
    exclude: ['pdfjs-dist'],
    include: ['@project-sunbird/telemetry-sdk'],
  },
  worker: {
    format: 'es',
  },
});
