# Conventions

## Naming
| Element | Convention | Example |
|---------|-----------|---------|
| TS/JS | camelCase | `loadTable()`, `renderFrame()` |
| Classes | PascalCase | `FptParser`, `ScriptEngine`, `DmdRenderer` |
| Files | kebab-case | `fpt-parser.ts`, `script-engine.ts` |
| Tests | `.test.ts` | `fpt-parser.test.ts` |

## Style
- TypeScript strict mode enabled
- ES modules ("type": "module" in package.json)
- No UI framework — vanilla DOM manipulation
- Vite for build, Vitest for tests
- Electron main process in CJS (required by Electron)
- Extensive use of worker threads (physics, script engine)

## Patterns
- FPT parser → table model → Three.js scene graph
- Event-driven architecture for game state
- WSAD/arrow keys + mouse for input
- Multi-screen window manager for cabinet mode
- VBScript sandboxed in Web Workers
- Post-processing pipeline (bloom, SSAO, SSR, DoF, motion blur)