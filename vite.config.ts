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
        // Rolldown (Vite 8) erfordert Function statt Object für manualChunks
        manualChunks(id: string) {
          if (id.includes('/node_modules/three/')) return 'vendor-three';
          if (id.includes('/node_modules/@dimforge/rapier3d/')) return 'vendor-rapier';
          if (id.includes('/node_modules/cfb/')) return 'vendor-cfb';
          if (id.includes('/src/script-engine')) return 'module-script';
          if (id.includes('/src/fpt-parser')) return 'module-fpt';
          if (id.includes('/src/integrated-editor')) return 'module-editor';
          if (id.includes('/src/file-browser')) return 'module-file-browser';
          if (id.includes('video-manager') || id.includes('video-editor') || id.includes('video-binding')) return 'module-video';
          if (id.includes('audio-enhanced') || id.includes('audio-system') || id.includes('sound-manager') || id.includes('music-manager')) return 'module-audio';
          if (id.includes('graphics-pipeline') || id.includes('playfield-visual-enhancement')) return 'module-graphics';
          return null;
        },
      },
    }
  },
  server: { port: 5173, host: 'localhost' },
  optimizeDeps: {
    include: ['three', '@dimforge/rapier3d/rapier.js', 'cfb'],
    exclude: ['@dimforge/rapier3d/rapier_wasm3d_bg.wasm']
  }
});
