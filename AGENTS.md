# AGENTS.md — Futurepinball Web

Shared instructions for all AI coding agents working in this repo. Both `CLAUDE.md` and `AGENTS.md` point here.

---

## 0. Before your first commit in a session

```bash
git config user.email   # must be: harald.weiss@wolfinisoftware.de
git config user.name    # must be: Harald Weiss
git fetch origin        # never work on stale main — past incident wiped a merged PR
```

If `user.email` is unset, empty, or fake — **stop, fix it, then proceed**.

---

## 1. What this project is

- **Browser-based pinball simulator** that loads Future Pinball `.fpt` tables
- TypeScript + Vite + three.js (renderer) + Rapier2D (physics) + CodeMirror (in-app VBScript editor)
- Optional **Electron shell** for multi-screen cabinet mode (`electron-main.cjs`, `electron-preload.cjs`)
- 33 test files (vitest), 698 tests as of 2026-05-31 — **must stay green**
- Default branch: `main`, remote: `github.com:haraldweiss/Futurepinballweb`

---

## 2. Agent routing

### opencode (Throughput — DeepSeek V4 Flash)
- TypeScript strict-mode passes (catch blocks, type narrowing, `as any` removal)
- Dead-code removal, debug-log gating behind `import.meta.env.DEV`
- Granular feature commits (3–8 per topic)
- Bulk lint cleanup
- Module extractions and barrel-pattern refactoring (`src/app/`, `src/table/`, `src/fpt/`)

### Claude Code (Care — Opus 4.7)
- Anything touching the physics worker bridge or Rapier2D integration
- `force-push` (a ruleset blocks it for non-bypass users — flag the human first)
- Electron security / preload-context changes
- Changes to the `runSandboxed` script-sandbox (VBScript → JS transpilation)
- Cabinet-PR-style large merges with conflicts

---

## 3. Hard rules

### 3.1 TypeScript discipline
- `tsconfig.json` has `strict: true`. **Do not flip it back to `strict: false`** to bypass errors. Fix the type instead.
- `npx tsc --noEmit` **must pass** before commit. Record in commit body: `Verified: tsc clean, NN/NN tests`.
- Prefer `src/window-api.ts` typed surface over `(window as any).X = ...`. Debug-only breadcrumbs may use `as any` but gate behind `import.meta.env.DEV`.
- `as any` introductions need justification in the commit body.

### 3.2 Tests
- `npm test` must stay green. If you intentionally skip a test, comment why and add a TODO.
- Don't disable a test to make CI green. Fix the underlying issue or mark `it.skip` with a written reason.

### 3.3 Physics / script sandbox
- `src/script-engine.ts` runs untrusted VBScript via `runSandboxed`. Never widen the sandbox to access `window`, `document`, network APIs, or filesystem.
- `physics` from `./game` is the Rapier2D state. Don't reach into it from UI code — go through helpers.

### 3.4 Force-push
- `main` is protected by a "prevent unauthorized deletion" ruleset (deletion + non_fast_forward). Bypass is allowed for the repo owner, but **always confirm with the human** before force-push — a careless force-push in this repo already cost a merged PR once.

### 3.5 Electron build
- Don't bump `electron-updater` without testing on macOS arm64 build. Past releases broke auto-update.
- `electron-preload.cjs` is the only IPC bridge — don't expose new `ipcRenderer` channels without considering the cabinet-mode multi-window security model.

### 3.6 Extracted modules (barrel pattern)
- When splitting a module into sub-modules, keep the original file as a barrel that re-exports everything from `./subdir/`. This preserves all existing import paths (e.g. `'./table'` still works after splitting `table.ts` into `table/configs.ts` + `table/scoring.ts`).
- New `src/app/` modules must be gated by `import.meta.env.DEV` for debug-only code.

---

## 4. Verification standards (write in commit body)

```
Verified: tsc clean, 698/698 tests, manual smoke test in dev browser ✓
```
or
```
Verified: tsc clean, tests N/A (touched only docs), NOT manually tested
```

Don't fake verification. State explicitly what you ran and what you skipped.

---

## 5. Commit style

- Granular: 3–8 small commits per topic
- Concrete numbers: "Fix 66 empty catch blocks" not "improve error handling"
- Bug reproducer in body when fixing
- Polish/code-review fixes as **separate** commit after feature lands
- Flag security tradeoffs with `⚠ Security:` prefix

---

## 6. Quick reference

| What | Command / path |
|---|---|
| Dev server | `npm run dev` |
| Build | `npm run build` |
| Tests | `npm test` |
| Type check | `npx tsc --noEmit` |
| Electron dev | `npm run electron-dev` |
| Electron mac build | `npm run electron-mac` |
| Multi-screen test | `npm run start:auto` (auto-detects screen count) |
| Window API | `src/window-api.ts` — register HTML inline handlers here |
| Asset catalog | `src/assets/` — Cabinet-PR added this layer |
| Sample tables | `public/tables/` |
| Extracted modules | `src/app/` (scene-setup, responsive-helpers, post-processing, sync-transport) |
| Table configs | `src/table/configs.ts` — demo table definitions |
| Table scoring | `src/table/scoring.ts` — bumper/target/ramp scoring logic |
| FPT parser modules | `src/fpt/lzo.ts` (decompressor), `src/fpt/media.ts` (image/audio extraction) |
| Docs | `docs/` — all documentation organised in subdirectories |

---

## 7. Handoff zone (free-form, append-only)

### 2026-05-30 — INIT_* flags consolidated
- Created `DebugWindow` interface in `src/window-api.ts` with all 22 typed INIT_* flags
- Added `setDevFlag()` helper that gates behind `import.meta.env.DEV`
- Replaced all `(window as any).INIT_*` in `src/main.ts` with typed `setDevFlag('INIT_*', value)`
- Net `as any` reduction: 22 removed, 0 added
- Verified: tsc clean, 691/691 tests

### 2026-05-30 — Extended debug flags + electronAPI + browser API types
- Added 20 more `SETUP_WORKER_*`, `BUILD_TABLE_*`, `PHYSICS_WORKER_*`, `LOAD_TABLE_*` flags to `DebugWindow`
- Created typed `ElectronAPI` interface from `electron-preload.cjs` surface
- Added browser API declarations (`showDirectoryPicker`, `getScreenDetails`, `screens`)
- Added optional global helpers (`setDMDResolutionOption`, `setDMDGlow`, `updateResponsiveDMDScale`, `getCurrentRotation`)
- Replaced all `(window as any).electronAPI` → `window.electronAPI` across 3 files
- Replaced 12 Window-interface properties from `(window as any).X` → `window.X`
- Gated debug console.log behind `import.meta.env.DEV` (testGravity, forceScore, dumpState, plunger launch)
- Verified: tsc clean, 691/691 tests

### 2026-05-31 — Major project cleanup (−10.500 Zeilen)
- main.ts entkerned: responsive-helpers, scene-setup, post-processing als Module extrahiert
- fpt-parser.ts gesplittet: LZO + Media-Extraktion in src/fpt/
- table.ts gesplittet: configs + scoring in src/table/
- File-Browser: 3→1 Datei konsolidiert
- Sync-Transport vereinheitlicht: 3 Wege (BC+IPC+LS) → 1 deterministischer Transport mit Frame-Pacing
- Dead code: 25 tote Dateien entfernt (kompletter src/parser/ Ordner, tote Graphics/Animation/Utils)
- docs: 121 .md + 9 .txt aus Root nach docs/ umgezogen, Research-Skripte nach scripts/research/
- Tests: 691→698 (+7), 33 files
- Netto: −10.500 Zeilen, 25 Dateien entfernt
- Commit: `f3105969`
- Verified: tsc clean, 698/698 tests
