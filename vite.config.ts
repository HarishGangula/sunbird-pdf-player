import { defineConfig } from 'vite';
import { resolve } from 'path';
import { copyFileSync } from 'fs';

// Custom plugin that copies pdfjs-dist ESM files to dist/ after the build.
// This lets the component load them via a relative URL (./pdf.mjs) at runtime,
// bypassing Rollup's static analysis of pdfjs-dist's webpack-generated ESM bundle
// (which would otherwise turn GlobalWorkerOptions / getDocument into void 0).
function copyPdfjsPlugin() {
  return {
    name: 'copy-pdfjs',
    writeBundle(options: { dir?: string }) {
      const outDir = options.dir ?? 'dist';
      copyFileSync(
        resolve(__dirname, 'node_modules/pdfjs-dist/build/pdf.mjs'),
        resolve(__dirname, outDir, 'pdf.mjs'),
      );
      copyFileSync(
        resolve(__dirname, 'node_modules/pdfjs-dist/build/pdf.worker.mjs'),
        resolve(__dirname, outDir, 'pdf.worker.mjs'),
      );
    },
  };
}

export default defineConfig({
  plugins: [copyPdfjsPlugin()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/sunbird-pdf-player.ts'),
      name: 'SunbirdPdfPlayer',
      fileName: 'sunbird-pdf-player',
      formats: ['es', 'umd'],
    },
    rollupOptions: {
      // pdfjs-dist is NOT bundled by Rollup — it's served as a sibling file
      // (dist/pdf.mjs) loaded via relative URL at runtime. Marking it external
      // prevents Rollup from touching it and avoids the MISSING_EXPORT problem.
      external: ['pdfjs-dist'],
      output: {
        assetFileNames: 'assets/[name][extname]',
      },
    },
    assetsInlineLimit: 0,
  },
  css: {
    postcss: './postcss.config.js',
  },
  optimizeDeps: {
    // Include pdfjs-dist so Vite's esbuild pre-bundles it for the dev server.
    // esbuild correctly handles pdfjs-dist's webpack-generated ESM exports,
    // unlike Rollup which turns them into (void 0) via MISSING_EXPORT analysis.
    include: ['pdfjs-dist', '@project-sunbird/telemetry-sdk'],
  },
});
