// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss
import { defineConfig, type Plugin } from 'vite';
import { resolve } from 'path';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';
import { copyFileSync, existsSync } from 'fs';

function fpwConfigAsset(): Plugin {
  const projectRoot = __dirname;
  const sourceFile  = resolve(projectRoot, 'fpw-config.json');

  return {
    name: 'fpw-config-asset',

    closeBundle() {
      if (!existsSync(sourceFile)) return;
      const dest = resolve(projectRoot, 'dist', 'fpw-config.json');
      try { copyFileSync(sourceFile, dest); } catch {}
    },
  };
}

export default defineConfig({
  root: 'src',
  base: './',
  plugins: [
    wasm(),
    topLevelAwait(),
    fpwConfigAsset(),
  ],
  worker: {
    format: 'es',
    plugins: () => [wasm(), topLevelAwait()],
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    target: 'es2022',
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      input: {
        main:   resolve(__dirname, 'src/index.html'),
        editor: resolve(__dirname, 'src/editor.html'),
      },
      output: {
        manualChunks: {
          'vendor-three':       ['three'],
          'vendor-rapier':      ['@dimforge/rapier3d'],
          'vendor-cfb':         ['cfb'],
          'module-script':      ['./src/script-engine.ts'],
          'module-fpt':         ['./src/fpt-parser.ts'],
          'module-editor':      ['./src/integrated-editor.ts'],
          'module-file-browser':['./src/file-browser.ts'],
          'module-video':       ['./src/video-manager.ts', './src/video-editor.ts', './src/mechanics/video-binding.ts'],
          'module-audio':       ['./src/audio-enhanced.ts', './src/audio-system.ts', './src/sound-manager.ts', './src/music-manager.ts'],
          'module-graphics':    ['./src/graphics/graphics-pipeline.ts', './src/graphics/playfield-visual-enhancement.ts'],
        }
      }
    }
  },
  server: { port: 5173, host: 'localhost' },
  optimizeDeps: {
    include: ['three', '@dimforge/rapier3d/rapier.js', 'cfb'],
    exclude: ['@dimforge/rapier3d/rapier_wasm3d_bg.wasm']
  }
});
