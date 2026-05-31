# Tech Stack

## Languages
- **TypeScript** — primary (strict mode, ES2022)
- **JavaScript** — Electron main/preload (.cjs), utility scripts (.mjs)
- **HTML/CSS** — index.html (~1700 lines inline CSS)
- **Bash** — start/stop scripts

## Frameworks/Libraries
- **Three.js** (0.162) — 3D WebGL rendering
- **Rapier2D** (0.12) — 2D physics (WASM)
- **CodeMirror** — VBScript source editor
- **Electron** (41) — desktop shell
- **CFB** (1.2) — Compound File Binary parser

## Build
- **Vite** (7) — bundler
- **Vitest** (4) — test runner
- **TypeScript** (5.4) — compiler
- **electron-builder** (26) — desktop packaging

## Config
- tsconfig.json — strict, ES2022, bundler resolution
- vite.config.ts — dual entry points, manual chunk splitting
- vitest.config.ts — happy-dom, v8 coverage