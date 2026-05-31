# Core

## Project Overview
- Future Pinball Web — browser-based 3D pinball simulator
- Loads and plays Future Pinball .fpt table files
- TypeScript + Three.js + Rapier2D physics
- ~78K lines TypeScript source
- Electron desktop app + PWA

## Source Map
- src/main.ts — main game orchestrator (~5300 lines)
- src/fpt-parser.ts — FPT binary file parser
- src/script-engine.ts — VBScript sandboxed engine
- src/table.ts — table model/state
- src/graphics/ — rendering pipeline (23 files: SSAO, SSR, bloom, shadows, etc.)
- src/mechanics/ — animation/video bindings
- src/parser/ — enhanced FPT parsing
- src/animation/ — animation engine
- src/editor/ — integrated table editor
- src/__tests__/ — Vitest tests (33 files, 691 tests)
- electron-main.cjs — Electron main process
- electron-preload.cjs — Electron IPC bridge

## Key Conventions
- `mem:tech_stack` — languages, frameworks, versions
- `mem:suggested_commands` — dev/test/build commands
- `mem:conventions` — code style and naming
- `mem:task_completion` — verification commands