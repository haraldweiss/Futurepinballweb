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

### 3.8 browser-use (KI-Browser-Automation)

- `docs/guides/BROWSER_USE.md` enthält Setup + Free-Modell-Tabelle
- `~/.local/bin/browser-use-run` ist der globale Launcher (aus jedem Projekt nutzbar)
- `scripts/validate-opencode-models.py` testet Free-Modelle auf Capabilities und vergleicht mit `EXPECTED`
- **Bei Modell-Änderungen** (neue Free-Modelle, geänderte Capabilities): Validator laufen lassen,
  `EXPECTED` in `scripts/validate-opencode-models.py` aktualisieren, `docs/guides/BROWSER_USE.md` anpassen
- Free-Modelle ohne structured output (`json_schema`) sind für browser-use unbrauchbar

### 3.7 Cabinet deploy (Windows-Cabinet `vpin4kp`)
- **SSH-Alias**: `cabinet` (= `vpx@192.168.178.44`, Ed25519-Key, passwortlos). User ist **non-admin**.
- **Build-Pflicht**: auf Mac **`electron-builder --win dir --x64`** (kein wine vorhanden → NSIS-Installer nicht baubar). Liefert `release/win-unpacked/`.
- **Push**: `taskkill` → `scp` ZIP nach `%TEMP%` → `Expand-Archive` → `robocopy /MIR` nach `C:\Users\vpx\AppData\Local\Programs\Future Pinball Web\`.
- **Robocopy-Exit-Codes 0–7 sind alle Erfolg** (2 = "Extra files purged"); bei `set -e` muss man `$LASTEXITCODE < 8` abfangen.
- **Default-Shell auf Cabinet ist `cmd.exe`** — Semikolon-Verkettung geht nicht, PowerShell explizit invoken oder per stdin pipen (`ssh cabinet 'powershell -NoProfile -Command -' <<EOF ... EOF`) statt Inline-Quote-Hell.
- **App muss vor Replace beendet sein** sonst File-Lock auf `Future Pinball Web.exe`.
- **Verknüpfungen**: müssen separat per WScript.Shell-Shortcut erstellt werden (kein NSIS = keine Shortcuts automatisch). Desktop liegt auf OneDrive (`C:\Users\vpx\OneDrive\Desktop\`).
- Niemals Passwort im Chat/Commit, nur Key-Auth.

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
| browser-use | `docs/guides/BROWSER_USE.md` — KI-Browser-Automation mit OpenCode-Free-Modellen; `browser-use-run` nach §3.8 global nutzbar |
| Cabinet deploy | `ssh cabinet` → `vpx@192.168.178.44` (vpin4kp.fritz.box), Install-Pfad `C:\Users\vpx\AppData\Local\Programs\Future Pinball Web` — siehe §3.7 |

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

### 2026-05-31 — Cabinet-Deploy 0.21.0 + SSH-Setup (`vpin4kp`)
- Erstmaliger Push von Future Pinball Web 0.21.0 auf das Windows-Cabinet
- Build via `npx electron-builder --win dir --x64` (kein wine → kein NSIS-Installer); danach ZIP + SCP + robocopy /MIR
- SSH-Setup: `cabinet`-Alias in `~/.ssh/config` (vpx@192.168.178.44), passwortlos via Ed25519-Key
- Fallstricke aufgedeckt (siehe §3.7): `ssh-copy-id` legt Key auf Windows OpenSSH falsch in `administrators_authorized_keys` ab; `vpx` ist non-admin → musste `~/.ssh/authorized_keys` manuell anlegen
- Verknüpfungen (Desktop OneDrive + Startmenü) per WScript.Shell-Shortcut erstellt
- Verified: EXE 222.973.952 bytes auf Cabinet, app.asar 19 MB, passwortloser Login bestätigt

### 2026-05-31 — FP v1.x Legacy-Format (Phasen A+B+C)
- `src/fpt/legacy-container.ts` — `extractEmbeddedPayload()`, `parseHeader()`, `scanForPayloadStart()`
- `src/fpt/media.ts` — Integration für Image/Sound-Extraktion aus Legacy-TLV-Containern
- `src/fpt-parser.ts:96` — `table` aus Texture-Regex entfernt
- `src/fpt/table-elements.ts` — `parseTableElement()`, `extractTableCoordsFromCFB()` für Geometrie
- 7 Commits (b11e258e..d33d6622), 34 neue Tests
- Smoke 10_ALIEN: 6 Texturen, 26 Sounds, 368 Koordinaten (vorher: 0)
- Verified: tsc clean, 732/732 tests

### 2026-05-31 — Release 0.22.0
- Version bump 0.21.0 → 0.22.0
- Changelog updated with FP v1.x legacy format support + plan-doc housekeeping
- 11 commits since 0.21.0
- Verified: build succeeds, 732/732 tests, tsc clean, manual smoke on 10_ALIEN

### 2026-05-31 — Cabinet-Deploy 0.22.0
- Build via `npx electron-builder --win dir --x64` (141 MB ZIP)
- Per PowerShell deploy via robocopy /MIR an gleichen Pfad
- EXE: 222.973.952 Bytes, app.asar: 19.162.483 Bytes
- taskkill fehlgeschlagen (Access Denied — App läuft nicht oder non-admin), robocopy dennoch erfolgreich

### 2026-05-31 — FPT-Writer Roundtrip + Security Tests in vitest
- 3 neue Roundtrip-Tests für Legacy-Format (TLV-Header, Table Elements bleiben erhalten)
- `src/__tests__/html-escape.test.ts` — 15 vitest-Tests für escapeHtml/sanitizeFileName/isSafeText
- `src/__tests__/system-integration.test.ts` — 7 vitest-Tests für ResourceManager/LibraryCache
- Debug-Logs gegatet: physics-worker.ts (8), touch-controls-manager.ts (2), integrated-editor.ts (2)
- Plan-Docs aktualisiert: 229 Checkboxen in 9 superpowers-Plänen

### 2026-05-31 — Bugfix + CI + Cleanup
- **Bugfix**: `scoring.ts` countdown-Bonus war immer aktiv (false `|| 5`)
- **CI**: Test-Step vor Release-Build in `.github/workflows/build-release.yml` eingefügt
- 10 obsolete research-Skripte archiviert, 3 Shell-Scripts von `scripts/research/` nach `scripts/` verschoben
- Deprecation-Notices auf 3 standalone Test-Runnern
- `npm run test:suite` und `npm run test:integration` Scripts in package.json

**Gesamt heute**: 22 Commits, 757 Tests, 36 Testdateien, tsc clean, 0 lint errors

### 2026-06-01 — Barrel extractions + Console cleanup + Type cleanup
- **17 Barrel extractions**: table.ts, fpt-parser.ts, integrated-editor.ts, file-browser.ts, visual-polish.ts, dmd.ts, bam-engine.ts, audio-enhanced.ts, video-editor.ts, score-display.ts, profiler.ts, video-manager.ts, backglass.ts → 17 barrels + 44 sub-modules
- **Console cleanup**: 150+ `console.log` → `devLog` replacements across 30 files; audit warnings gated behind DEV; physics worker spam (60/sec) removed; framebuffer GL errors fixed with HalfFloat fallback; fpw-config.json parse error fixed
- **Type cleanup**: 5 debug breadcrumbs gated behind `import.meta.env.DEV`; `PerformanceMemory` interface added; `as any` casts reduced by 8 across 6 files
- `src/utils/dev-log.ts` created as shared gated logging utility; 45+ files now import from it
- `src/window-api.ts` typed surface for INIT_* flags (pre-session)
- Net code: −10.500 lines (pre-session) + cleaner structure
- Verified: tsc clean, 757/757 tests

### 2026-06-01 (continued) — More extractions + Features + Bundle opt
- **5 more barrel extractions**: editor.ts, physics-worker.ts, cabinet-system.ts, touch-controls-manager.ts, coin-system.ts → 5 barrels + 26 sub-modules
- **Physics worker auto-init**: Worker thread spawned during startup (after initPhysics), eliminating per-table-load latency; 2 new dev flags
- **Auto-load demo table**: App now loads Pharaoh's Gold on startup instead of the loader screen
- **Bundle optimization**: main.js 712→286 KB (−60%); editor/audio/video/graphics/file-browser split into 6 separate chunks loaded on demand
- **Dead code removal**: 124 unused imports/types/parameters removed across 28 files
- **CI fixes**: actions/checkout v4→v6, setup-node v4→v6, upload-artifact v4→v7; fixed Vite build (type-only import)
- **Type cleanup**: volumetric-lighting.ts — removed 8 redundant `(this as any)` casts
- **19 commits total** this session
- Verified: tsc clean, 757/757 tests

### 2026-06-11 — Code review + sandbox hardening (Claude/Care) → opencode handoff
**Branch**: `claude/musing-bouman-e8c53b` (deckungsgleich mit main beim Start). 2 Commits gepusht-fähig (noch nicht gepusht):
- `229efeac` ⚠ Security: Constructor-chain-Escape in der VBScript-Sandbox geschlossen
  - `with(__sandbox__)` + Allowlist-Proxy schützt nur bare-identifier-Auflösung. Ein transpiliertes Skript konnte über `(function(){}).constructor` den echten `Function`-Konstruktor erreichen (Property-Access, den der Proxy nicht trappt) und im globalen Realm Code ausführen → Denylist (fetch/window/eval) komplett umgangen.
  - Reproduziert: Payload ohne ein einziges verbotenes Literal las das echte `process` via `['constructor']('return ...')()`.
  - Fix: `constructor`/`prototype`/`__proto__`/`Reflect`/`Proxy` zur statischen Denylist in `src/utils/script-sandbox.ts`; Docstring ehrlich gemacht (Proxy ist best-effort defense-in-depth, **keine** harte Isolation — echte Isolation bräuchte Worker/iframe-Realm). 5 neue Tests in `src/__tests__/script-sandbox.test.ts`, inkl. Runtime-Test der den Escape vor dem Fix beweist.
- `a101b910` Type cleanup: 29 `(window as any)`-Casts in `event-handlers-init.ts` entfernt (alle Handler sind bereits auf `Window` in `window-api.ts` typisiert). Net `as any` (non-test): **188 → 159**.
- Verified: tsc clean, **762/762 tests** (war 757; +5 Sandbox).

**Review-Befunde, offen → opencode/Throughput (§2):**
- **#2 main.ts zerlegen** — `src/main.ts` ist 4668 Zeilen / ~198 KB, 69 Top-Level-Funktionen **plus** seitenwirksamer Top-Level-Code (THREE.js-Scene-Setup ab ~L467). main.ts ist Entry-Point, **kein** reiner Barrel → Helfer in `src/app/*` extrahieren und zurück-importieren (Barrel-Pattern §3.6 gilt nur für reine Module).
  - **Sicher extrahierbar (pure, kein Capture von scene/camera/physics/state/profiler):** `saveRotation`/`loadSavedRotation` + `ROTATION_KEY` (L179–189, reines localStorage), `calculateFlipperPowerCurve` (L444, reine Mathe), `getOptimizedTableView` (L142, nur window + responsive-helpers).
  - **NICHT mechanisch extrahieren (Closure über Modul-State):** alles was `scene`/`camera`/`physics`/`state`/`profiler` captured — braucht DI, kein Throughput-Job.
  - **NICHT anfassen (bleibt Claude/Care, §3.3):** `applyPhysicsGravityForRotation` (L198) + alles über `getPhysicsWorker()` / Physics-Bridge.
  - ⚠ **Risiko**: die 762 Unit-Tests decken main.ts-Runtime-Orchestrierung **nicht** ab. Nach jeder Extraktion `npx vite build` + manueller Browser-Smoke-Test (Pharaoh lädt, Flipper, Score). tsc + Tests allein reichen hier nicht.
- **#4 console.log gaten** — 139 ungated `console.log` (non-test), davon **47 in main.ts**. Hinter `devLog`/`import.meta.env.DEV` (§3.6). Rest v.a. in Runtime-Test-Harnessen (`test-security.ts` 24, `test-suite.ts` 19, `integration-testing.ts` 16) — dort ggf. bewusste CLI-Ausgabe, zuerst main.ts.

**Rails für opencode (§3) gelten unverändert**: tsc muss clean bleiben, 762/762 Tests grün, `Verified:`-Zeile im Commit-Body, granulare Commits (3–8/Topic), Sandbox nie weiten, kein force-push ohne Mensch.

### 2026-06-11 — opencode/Throughput: console gating + main.ts extractions + dead code + as any + game barrel

**Basis**: `main` nach fast-forward merge von `claude/musing-bouman-e8c53b` (3 Commits von Claude).

**5 Commits von opencode (gepusht):**
- `5f30b1dd` — Gate 37 ungated console.log calls behind `import.meta.env.DEV` (19 Dateien)
- `c7eda0f0` — Extract 3 pure helpers from main.ts (`saveRotation`, `calculateFlipperPowerCurve`, `getOptimizedTableView`) → `src/app/rotation-utils.ts`, `flipper-utils.ts`, `view-utils.ts`
- `459689bd` — Remove 11 dead functions + 55 unused imports from main.ts
- `bdcebaef` — Reduce as any by 41 (147→106): performance-report-generator + integration-testing + audio + sync-transport
- `3015e8ac` — Split game.ts into 5 sub-module barrel: `game/state.ts`, `game/resources.ts`, `game/refs.ts`, `game/elements.ts`, `game/callbacks.ts`

**4 weitere Commits in zweiter Session:**
- `daaa2218` — Extract 9 DOM UI helpers: `showNotification` → notification.ts, loading overlay → loader-ui.ts, `switchTab`/`closeLoader`/`toggleFullscreen`/`toggleViewPanel` → ui-utils.ts
- `028c7081` — Remove 31 unused barrel re-exports from table/visual-polish/score-display/profiler/cabinet-system/coin-system
- `77fe0395` — Add `getIntegratedEditor`/`webkitAudioContext`/`playSound`/`__DMD_MODULE__` to Window interface; reduce as any to 95
- `be4be189` — Remove 12 dead local variables (main.ts, view-utils, profiler, gpu-diagnostics, script-engine)

**Nettobilanz**:
- `src/app/` gewachsen: `rotation-utils.ts`, `flipper-utils.ts`, `view-utils.ts`, `log-utils.ts`, `screen-utils.ts`, `notification.ts`, `loader-ui.ts`, `ui-utils.ts` (8 neue Module)
- `src/game/` neu: 5 Sub-Module (state, resources, refs, elements, callbacks)
- main.ts: 4668 → ~4270 Zeilen (−400)
- as any (non-test, non-DEV): 188 → **95**
- Unused imports in main.ts: 55 entfernt
- Unused barrel re-exports: 31 entfernt
- Dead functions: 11 entfernt
- Tests: 762/762 grün (unverändert)
- 9 Commits gesamt diese Session

**Offene Punkte für Folgesession:**
- as any noch 95 (v.a. fpt-parser.ts CFB 10, graphics passes 10, script-engine 6, file-browser/core 5)
- Dead local variables in graphics passes (dof-pass, film-effects-pass, motion-blur-pass, ssr-pass, etc.) — ~80 noch offen
- game.ts barrel tested — manueller Smoke-Test empfohlen (Pharaoh Gold laden, Flipper, Score)

### 2026-06-11 — browser-use global setup + Free-Modell-Validator
- Globales browser-use venv in `~/.local/share/browser-use/venv/` (0.13.1)
- Launcher `~/.local/bin/browser-use-run` — aus jedem Projekt nutzbar
- `scripts/validate-opencode-models.py` testet alle Free-Modelle (text/structured_output/vision)
  und vergleicht mit `EXPECTED`; Exit-Code 1 bei Abweichungen
- `docs/guides/BROWSER_USE.md` aktualisiert mit globaler Einrichtung + Free-Modell-Tabelle
- `AGENTS.md`: §3.8 für browser-use-Regeln + Quick-Reference-Eintrag + Handoff
- 6 Free-Modelle getestet, nur 2 browser-use-tauglich (nemotron-3-ultra-free, mimo-v2.5-free)
- Commits: `9f3111c1` (validator + global) + `142df6a0` (initial BROWSER_USE.md)
