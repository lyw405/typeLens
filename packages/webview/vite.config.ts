import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    lib: {
      entry: resolve(__dirname, 'src/index.tsx'),
      name: 'TypeLensWebview',
      formats: ['iife'],
      fileName: () => 'webview.js',
    },
    rollupOptions: {
      output: {
        entryFileNames: 'webview.js',
        assetFileNames: 'webview.[ext]',
      },
    },
    minify: 'esbuild',
    sourcemap: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
