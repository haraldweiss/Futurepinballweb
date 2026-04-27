import { defineConfig, type Plugin } from 'vite';
import { resolve } from 'path';
import { copyFileSync, existsSync, readFileSync } from 'fs';

/**
 * Expose `<projectRoot>/.fpw-config.json` to the runtime as a static asset.
 *
 * The installer (`installer.js`) writes the file at the project root, but the
 * Vite root is `src/`, so the dev server and the production build can't reach
 * it by default. This plugin:
 *   - copies the file to `dist/.fpw-config.json` during `npm run build`
 *     (and again before `npm run preview` reads it),
 *   - serves it on `/.fpw-config.json` from the dev server.
 *
 * The runtime fetches it via `new URL('./.fpw-config.json', location.href)`
 * (see `src/utils/fpw-config.ts`), which works in dev, preview, and Electron.
 */
function fpwConfigAsset(): Plugin {
  const projectRoot = __dirname;
  const sourceFile  = resolve(projectRoot, '.fpw-config.json');

  return {
    name: 'fpw-config-asset',

    // Production build: drop the file next to the generated index.html.
    // We hook `closeBundle` (not `buildStart`) so the `dist/` directory has
    // already been created by the time we write into it.
    closeBundle() {
      if (!existsSync(sourceFile)) return;
      const dest = resolve(projectRoot, 'dist', '.fpw-config.json');
      try {
        copyFileSync(sourceFile, dest);
      } catch (err) {
        this.warn(`Could not copy .fpw-config.json into dist: ${(err as Error).message}`);
      }
    },

    // Dev server: serve the file from the project root on demand.
    configureServer(server) {
      server.middlewares.use('/.fpw-config.json', (_req, res, next) => {
        if (!existsSync(sourceFile)) { next(); return; }
        try {
          const body = readFileSync(sourceFile);
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.setHeader('Cache-Control', 'no-cache');
          res.end(body);
        } catch (err) {
          next(err as Error);
        }
      });
    },
  };
}

export default defineConfig({
  root: 'src',
  plugins: [fpwConfigAsset()],
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
