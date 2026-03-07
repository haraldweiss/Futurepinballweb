import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: 'src',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    target: 'es2022',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      input: {
        main:   resolve(__dirname, 'src/index.html'),
        editor: resolve(__dirname, 'src/editor.html'),
      },
      output: {
        manualChunks: {
          'vendor-three': ['three'],
          'vendor-rapier': ['@dimforge/rapier2d-compat'],
          'vendor-cfb': ['cfb'],
          'module-script': ['./src/script-engine.ts'],
          'module-fpt': ['./src/fpt-parser.ts'],
        }
      }
    }
  },
  server: { port: 5173, host: 'localhost' },
  optimizeDeps: {
    include: ['three', '@dimforge/rapier2d-compat', 'cfb'],
    exclude: ['@dimforge/rapier2d-compat/rapier2d_wasm_bg.wasm']
  }
});
