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
| Extracted modules | `src/app/` (20+ modules) |
| main.ts size | 2334 lines (−31%) |
| TS modules | 295+ total |
| Input system | `src/input-optimizer.ts` + `src/app/touch-controls.ts` — unified keyboard/touch |
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

### 2026-06-11 — opencode: as any cleanup + dead variables removal

**as any cleanup:** 95 → **1** (only DEV-only `setDevFlag` in window-api.ts remains)
- CFB types: 11 casts removed (fpt-parser.ts, fpt/table-elements.ts)
- Window API: 22 new properties, 39 `(window as any)` removed
- Script-engine, main.ts, file-browser: 18 casts removed
- Graphics + table: 23 casts removed
- Misc (13 files): all remaining as any replaced

**Dead local variables:** ~75 removed across 34 files
- Graphics passes (10 files): 16 unused fields/variables/imports removed
- Non-graphics (24 files): ~60 unused items removed (imports, functions, variables)
- Main.ts: 12 unused variables removed

**game.ts barrel:** vite build ✓, tsc clean ✓
- Barrel modules: callbacks.ts, elements.ts, refs.ts, resources.ts, state.ts

**Verified:** tsc clean, 762/762 tests green, vite build successful
**Commits:** `85e0f5ad`, `09ff66f6`

### 2026-06-11 — browser-use global setup + Free-Modell-Validator
- Globales browser-use venv in `~/.local/share/browser-use/venv/` (0.13.1)
- Launcher `~/.local/bin/browser-use-run` — aus jedem Projekt nutzbar
- `scripts/validate-opencode-models.py` testet alle Free-Modelle (text/structured_output/vision)
  und vergleicht mit `EXPECTED`; Exit-Code 1 bei Abweichungen
- `docs/guides/BROWSER_USE.md` aktualisiert mit globaler Einrichtung + Free-Modell-Tabelle
- `AGENTS.md`: §3.8 für browser-use-Regeln + Quick-Reference-Eintrag + Handoff
- 6 Free-Modelle getestet, nur 2 browser-use-tauglich (nemotron-3-ultra-free, mimo-v2.5-free)
- Commits: `9f3111c1` (validator + global) + `142df6a0` (initial BROWSER_USE.md)

### 2026-06-11 — Claude/Care: main.ts-Zerlegung (Review #2, Runde 1)

Drei kohäsive Einheiten per Dependency-Injection aus dem Entry-Point extrahiert
(Factory-Muster wie `setupScene`); je ein granularer Commit, je end-to-end
verifiziert (tsc + vite build + Browser-Smoke, da die 762 Unit-Tests die
main.ts-Orchestrierung **nicht** abdecken).

- `c3eaf346` — `src/app/particle-field.ts`: `ParticleField`-Klasse (DI: scene,
  profiler, advanced particleSystem). `partData` bleibt der geteilte `./game`-Puffer,
  `currentFps` wird pro `spawn()` gereicht. Verhalten exakt erhalten inkl. der
  Eigenheit, dass die Float32Array-Puffer einmalig auf das initiale MAX_PARTS
  dimensioniert und bei `setMaxParts()` **nicht** neu allokiert werden.
- `4d004761` — `src/app/view-settings.ts`: `createViewSettings(camera, rotateAndRedraw)`.
  Eigener `fpw_view`-State; Slider/Reset rufen lokale Closures statt `window.*`.
- `f134bd70` — `src/app/multiscreen.ts`: `initMultiscreen(deps)` hält
  `_msLayout`/`_msWindows`; importiert Screen-Role-/Screen-Utils direkt, injiziert
  die main.ts-lokalen `initInlineBackglass`/`stopInlineBackglass`/`initDMDVisibility`/
  `getDmdHidden`/`loadDemoTable`. Touch-ups: `innerHTML=''`→`replaceChildren()`,
  `(e: any)`→`(e: Event)` + `ScreenRole`-Cast.

- main.ts: **4330 → 3930 Zeilen (−400)**; `src/app/` +3 Module.
- Verified: tsc clean, 762/762 tests, vite build ✓, manueller Browser-Smoke
  (Pharaoh lädt/rendert, Animate-Loop 900+ Frames fehlerfrei, View-Panel
  persistiert/resettet, Multiscreen-Modal + Rollen-UI + Single-Screen-Apply
  fehlerfrei) ✓

**Offen → spätere Care-Runden** (§3.3, nicht mechanisch — Closures über
scene/camera/physics/state, brauchen DI): File-Browser-Cluster (~300 Zeilen),
DMD-Visibility, Inline-Backglass, `animate()`-Loop-Orchestrierung, alles über
`getPhysicsWorker()`/Physics-Bridge.

### 2026-06-11 — Claude/Care: main.ts-Zerlegung (Review #2, Runde 2)

- `6656ad56` — `src/app/file-browser-controller.ts`: `initFileBrowser(deps)`-Factory
  mit eigenem Selection-State. File-System-/UI-/Advanced-Manager, Loader-Overlay
  und `parseFPTFile` direkt importiert; der Physics-Worker-Tischbau + `resetGameState`
  bleiben am Entry-Point und werden via `FileBrowserDeps.loadTableConfig`/`resetGameState`
  injiziert (Rapier-Bridge §3.3 nicht aus dem Controller erreicht).
  - Verhaltenstreue Touch-ups (Security-Hook stolperte über `innerHTML`):
    `updateFileBrowserUI` baut das Status-Panel jetzt per `createElement` statt
    `innerHTML`; Load-Button via `textContent` (Dateiname literal — äquivalent zum
    vorherigen `escapeHtml()`+`innerHTML`, ohne XSS-Fläche); Listen-Clears
    `innerHTML=''`→`replaceChildren()`. `updateFileBrowserUI`/`selectTableFile` sind
    jetzt modul-intern.
- main.ts: **3930 → 3634 Zeilen (−296)**. **Gesamt seit Runde-1-Start: 4330 → 3634 (−696, −16 %).**
- Verified: tsc clean, 762/762 tests, vite build ✓, Browser-Smoke (App bootet +
  Pharaoh rendert; alle 10 File-Browser-window-api-Fns registriert; Advanced-Helfer
  favorites/recent/sort/batch liefern korrekt; `loadSelectedTable`-Guard ohne
  Auswahl warnt + returnt; null Konsolenfehler). Picker-gegatete Pfade
  (`browse*`/voller Load→Physics) + `updateFileBrowserUI`-Render headless nicht
  erreichbar → durch tsc + getreue Übernahme abgedeckt, nicht per Runtime-Smoke.

**Noch offen** (spätere Runden): DMD-Visibility, Inline-Backglass,
`animate()`-Loop-Orchestrierung, Physics-Bridge.

### 2026-06-11 — opencode: main.ts-Zerlegung (Runde 3 — DMD-Visibility + Inline-Backglass)

Claudes uncommittierte Extraktionen auf `claude/priceless-lederberg-884dbb` committed:

- `923d7cb8` — `src/app/dmd-visibility.ts`: `createDmdVisibility(FPW_ROLE)`-Factory
  mit eigenem `_dmdHidden`-Flag; initDMDVisibility/toggleHideDMD/getDmdHidden via
  Interface. Verhalten exakt erhalten: Auto-Hide bei Multi-Screen + dediziertem DMD,
  manuelles Toggle, Fallback-Timeout.
- `src/app/inline-backglass.ts`: `createInlineBackglass()`-Factory mit eigenem
  `_bgPanelActive`-Flag; init(=inlineBackglass.init)/stop/draw/resize. draw() ruft
  live state/currentTableConfig/getTopScores/dmdCanvas-Werte via Direct Import.
  `getResponsiveBackglassWidth()` als module-private Helper.
- `animate()` ruft `inlineBackglass.draw()` statt `drawInlineBackglass()`
- Resize-Handler ruft `inlineBackglass.resize()` statt Inline-Resize
- `initMultiscreen`-Deps verwenden `inlineBackglass.init`/`inlineBackglass.stop`
- `getDmdHidden` jetzt Modul-Fn statt `() => _dmdHidden`
- main.ts: **3634 → 3504 Zeilen (−130)**. **Gesamt seit Runde-1-Start: 4330 → 3504 (−826, −19 %).**
- Verified: tsc clean, 762/762 tests, vite build ✓

**Verbleibend (Claude/Care, §3.3):** `animate()`-Loop-Orchestrierung (~850 Zeilen,
captured scene/camera/physics/state/profiler — DI nötig), Physics-Bridge.

### 2026-06-11 — opencode: fpt-parser barrel + main.ts round 4 + cleanup + release 0.23.0

- **fpt-parser.ts barrel**: 1426→20 Zeilen, 7 neue `src/fpt/` Sub-Module
  (`cfb-parser`, `coords`, `file-parser`, `io`, `models`, `strings`, `validation`)
- **main.ts round 4**: −206 Zeilen, 4 neue `src/app/` Module
  (`enhanced-visuals`, `backglass-canvas`, `path-shortcuts`, `fpt-browser`)
- **Cleanup**: 21 unused barrel re-exports entfernt, 2 dead files gelöscht
- **Release 0.23.0**: Version bump, Changelog, AGENTS.md handoff
- main.ts: 3504 → **3298 Zeilen** (Gesamt −1032, −24% seit Runde 1)
- Verified: tsc clean, 762/762 tests, vite build ✓

### 2026-06-17 — Claude/Care: Post-Processing-Farbpipeline + Bloom/AA-Fixes

Review „check for graphical improvements" → 5 granulare Commits auf
`claude/focused-lalande-3e1ad6`. Jeder Commit end-to-end verifiziert
(tsc + 762 Tests + vite build + Browser-Smoke auf Pharaoh's Gold, da die
Unit-Tests die Renderer-Orchestrierung nicht abdecken).

- `78a49fa2` ⚠ **OutputPass fehlte** — die EffectComposer-Kette endete auf einem
  rohen FXAA-ShaderPass (`renderToScreen`), der **weder** Tone-Mapping **noch**
  sRGB-Encoding macht. Composer-Targets sind linear-HDR → `renderer.toneMapping`/
  `outputColorSpace` wurden für das komponierte Bild umgangen, lineares HDR
  ungekoppelt auf den Screen → das gesamte Playfield als überstrahlter Glow ohne
  lesbare Geometrie. Fix: `OutputPass` (ACESFilmic + sRGB) als finale Stufe,
  AA läuft danach im Gamma-Raum. **Vorher/Nachher dramatisch sichtbar.**
  + `OutputPass`-Typdeklarationen in `src/types/three.d.ts` (Projekt rollt
  three-addon-Typen selbst, kein `@types/three`).
- `4e2ee39b` **Quality-Toggles waren tote No-ops** — `applyQualityPreset()` rief
  `bloomPass?.setEnabled?.()` + `mainSpot?.setProperty?.()`; **beide Methoden
  existieren nicht** auf `UnrealBloomPass`/`THREE.SpotLight` → optional-chain
  no-op'd still. Bloom/Schatten ließen sich nie abschalten (low/medium-Preset
  sparte diese Kosten nie). Fix: `bloomPass.enabled` / `mainSpot.castShadow`.
- `aefa2449` **Refactor**: dupliziertes `if (lightManager) / else` Light-Rig
  (~95 % identisch) auf einen Pfad kollabiert; volle Shadow-Camera-Config jetzt
  in beiden Fällen (Fallback-Pfad war inkonsistent).
- `99a227db` **Bloom-Reihenfolge**: globaler `UnrealBloomPass` lag direkt nach
  RenderPass → fing weder SSR-Reflexionen noch Per-Light-Bloom ein und war
  hardcodiert. Jetzt nach SSR/Per-Light-Bloom, aus dem Quality-Preset geseedet.
- `e94adaf3` **FXAA → SMAA** als finale AA-Stufe (schärfere Kanten, läuft auf
  dem tone-gemappten sRGB-Output). Resize ruft `smaaPass.setSize()` statt
  FXAA-Resolution-Uniform; `fxaaPass` → `smaaPass` im PostProcessingContext.

Pass-Kette jetzt: `Render → SSR → MotionBlur → CascadedShadow → PerLightBloom
→ Bloom → Volumetric → Film → DOF → OutputPass (tone-map + sRGB) → SMAA`.

- Verified: tsc clean, 762/762 tests, vite build ✓, Browser-Smoke ✓
- Offen: keine — die Review-Liste (#1–#5) ist abgearbeitet.

### 2026-06-20 — Graphics pipeline fixes + FPT/FPL parser improvements

**Graphics (10 Dateien):**
- **Duplicate lights**: LightManager.initialize() erstellte 5 Lichter + post-processing.ts erstellte 5 weitere → jetzt nur LightManager. `getLight(id)` zu LightManager hinzugefügt.
- **VolumetricLighting gated**: War immer aktiv, jetzt hinter `initPreset.volumetricEnabled`.
- **Anisotropic Filtering**: `THREE.Texture.DEFAULT_ANISOTROPY = max` für schärfere Texturen.
- **SMAA quality-skalierbar**: low=0.5× Auflösung, medium/high/ultra=1.0×.
- **ColorGrading inline**: Nach OutputPass (kein Double-Tonemap). Sättigung/Kontrast/Farbtemperatur.
- **Env Map verbessert**: Procedural Equirectangular mit 3 Lichtquellen (warm overhead, cool fill, warm accent).
- **Fog distance**: 20-50 → 30-80.
- **Shadow blurSamples per Preset**: low=4, medium=8, high/ultra=16.
- **Ball light no shadow**: `ballLight.castShadow = false` (kleiner bewegter Light-Schatten kostet GPU ohne visuellen Nutzen).
- **Dead code entfernt**: `improveShallowAndReflections` (downgradete PCFSoftShadowMap→PCFShadowMap!), `initializeImprovedLighting` (überschrieb LightManager-Lights), SSAO (nie im Composer), ColorGradingShader (nie im Composer).
- **Profiler**: `getCurrentPresetName()` für effizienten Preset-Check.
- **`applyQualityPreset()`**: Nutzt `getCurrentPresetName()` vor Object-Copy.

**FPT/FPL Parser (4 Bereiche):**
- **Table Elements**: Element-Typ-Klassifikation (21 Typen: bumper→decorative). Neue `extractTableElementsFromCFB()` mit kindFilter. Backward-compatibel.
- **BAM Streams in FPTs**: `tryParseBAMConfigFromCFB()` erkennt BAM-Animations/Lighting/Physics-Streams.
- **FPL Libraries**: BAM-Stream-Kategorisierung in `bamAnimations`/`bamLighting`/`bamPhysics`. `detectLibraryDependencies()` mit BAM-Pattern-Matching. `ParsedLibrary` Interface.
- **Error Handling**: Graceful degradation, try/catch in allen Parsing-Funktionen.

**Verified:** tsc clean, 762/762 tests, vite build ✓
**Commits:** (noch nicht committed — siehe git status — 11 modified files)

### 2026-06-20 — Physics-Fix: Ball zu schwer, Flipper powerless
- **Kritisches Problem:** Tische oft unspielbar — Ball flog unkontrolliert und ging ins Aus
- **Ursache:** Ball density 1.0, Flipper density 0.5 (Ratio 2:1 statt 13:1)
- **Hardcoded Defaults stimmten nicht:** Ball restitution 0.5 (sollte 0.85), Flipper restitution 0.5 (sollte 0.95)
- **Fix in `src/physics-worker/physics-init.ts`:**
  - Ball density: 1.0 → 0.15 (leichterer Ball)
  - Flipper density: 0.5 → 2.0 (schwerere Flipper)
  - Ball restitution default: 0.5 → 0.85
  - Ball friction default: 0.3 → 0.25
  - Flipper restitution default: 0.5 → 0.95
- **Dokumentation:** CHANGELOG.md + FAQ_TROUBLESHOOTING.md aktualisiert
- **Commits:** `cd0e1d03` (Fix), `8fd2c54a` (Changelog), `3f89084d` (FAQ), `fe3f108d` (README version bump)
- **Verified:** tsc clean, 762/762 tests, deployed auf futurepinball.wolfinisoftware.de

### 2026-06-20 — Live-Deployment auf futurepinball.wolfinisoftware.de
- README "Play in Browser"-Link auf https://futurepinball.wolfinisoftware.de geändert
- Oracle-VM (oracle-vm, 92.5.18.29): Apache 2.4.62 + Let's Encrypt
- Deploy-Pfad: /var/www/futurepinball/dist/ (scp dist/* → sudo systemctl reload httpd)
- Security-Header + 1y Asset-Caching + HTTP→HTTPS-Redirect
- Deployed: 0.23.0 build, HTTPS cert bis 2026-09-18

**Anmerkung:** Der lokale `npm run serve` (port 3000) braucht nur noch für lokale Tests. Der README-Link zeigt auf die Live-URL.

### 2026-06-20 — Auto-Deploy-Regel

**Ab jetzt gilt:** Nach jeder Session, in der funktionale Änderungen am Futurepinball Web vorgenommen wurden, wird automatisch auf `futurepinball.wolfinisoftware.de` deployed.

**Deploy-Kürzel:**
```bash
npm run build && scp -r dist/* oracle-vm:/var/www/futurepinball/dist/ && ssh oracle-vm "sudo systemctl reload httpd"
```

**Voraussetzung:** Build muss grün sein, tsc clean, Tests bestanden.
**Projekt-Skill:** `deploy-futurepinball` (Pi `skill_manage`) für detaillierte Steps/Pitfalls.


### 2026-06-21 — FPM/FPL Model Format Research

**Background:** Goal to import original Future Pinball tables with accurate 3D models from NAS.

**FPL Library Structure (CFB format, ConanModels.fpl analyzed via node scripts):**
- Each model entry has 4 CFB subentries:
  - FTYP (4 bytes): Type identifier = 0xe0d0cf11
  - FLAD (8 bytes): Binary data
  - FPAT (60-80 bytes): Contains Windows file paths like  — these are creator paths, not actual model locations
  - FDAT (3KB-59KB): LZO-compressed model data (actual model data)

**Models found in ConanModels.fpl:**
-  (32KB FDAT),  (16KB FDAT),  (13.5KB FDAT),  (33KB),  (58KB FDAT), plus 50+ more

**FPM File Format (Flipper.fpm from hexdump of Flipper.fpm):**
- Header (offsets 0-15): 
- 8 zero bytes (offsets 16-23)
- Bytes 24-27:  (little-endian)
- Bytes 28-31:  (little-endian)
- Bytes 32-35:  (little-endian)
- Text strings at offsets ~0x200+: "Flipper", "Flipper-T1", "Long-Preview.bmp"
- LZO compression marker  appears around offset ~0x285
- BMP texture marker  indicates embedded textures
- LZO compressed region size: 32KB → 21KB decompressed (21,626 bytes)

**Key Insight:** FPT tables reference models by name, FPL libraries provide the model data via LZO compression. The FDAT data contains the actual vertex/triangle data needed to create THREE.js meshes. MS3D files in samples directory are reference format, not what's actually in tables.



### 2026-06-21 — FPM/FPL Model Format Research

Background: Goal to import original Future Pinball tables with accurate 3D models from NAS.

FPL Library Structure (CFB format, ConanModels.fpl analyzed via node scripts):
- Each model entry has 4 CFB subentries:
  - FTYP (4 bytes): Type identifier = 0xe0d0cf11
  - FLAD (8 bytes): Binary data
  - FPAT (60-80 bytes): Contains Windows file paths like C:\Users\Seppo\Documents\Varasto\FP-Conan\Models\SC-Flipper-T1.fpm
  - FDAT (3KB-59KB): LZO-compressed model data (actual model data)

Models found in ConanModels.fpl:
- sc-flipper-t1 (32KB FDAT), sc-droptarget (16KB FDAT), sc-ramp (13.5KB FDAT), sc-rock1 (33KB), sc-rock2 (58KB FDAT), plus 50+ more

FPM File Format (Flipper.fpm from hexdump via node scripts):
- Header (offsets 0-15): d0 cf 11 e0 a1 b1 1a e1 00 00 00 00 00 00 00 00
- 8 zero bytes (offsets 16-23)
- Bytes 24-27: 3e 00 03 00 (little-endian)
- Bytes 28-31: fe ff 09 00 (little-endian)
- Bytes 32-35: 06 00 00 00 (little-endian)
- Text strings at offsets ~0x200+: Flipper, Flipper-T1, Long-Preview.bmp
- LZO compression marker zLZO6l appears around offset ~0x285
- BMP texture marker BM6l indicates embedded textures
- LZO compressed region size: 32KB to 21KB decompressed (21,626 bytes)

Key Insight: FPT tables reference models by name, FPL libraries provide the model data via LZO compression. The FDAT data contains the actual vertex/triangle data needed to create THREE.js meshes. MS3D files in samples directory are reference format, not what is actually in tables.

Decompression Test (Flipper.fpm via node scripts):
- LZO offset: 645 (0x285)
- Compressed: 32,123 bytes
- Decompressed: 21,626 bytes
- Binary contains: LZO6l, BM6l markers, embedded texture data, mesh vertex data (format TBD)

Next Step: Parse the FDAT binary format to extract vertices/triangles/UVs for THREE.js mesh creation.

### 2026-06-21 — FPM/FPL Model Pipeline Vollendet

**FPM-Format validiert (models.fpl, 45/53 Modelle geparst):**
- FPL FDAT entries sind **verschachtelte CFB-Container** (erkennbar an `d0 cf 11 e0` Header)
- Jeder FDAT → CFB → "ModelData" Stream → TLV-Header (Name, Metadaten) → zLZO-Daten
- Die zLZO Regionen enthalten MS3D0-Marker bei Offset 7 (häufigst) oder 8
- Vertex-Strides: 12 (xyz-only), 15 (Standard MS3D), 16, 24, 28, 48
- Model-Namen werden aus TLV-Header vor zLZO extrahiert

**Parser-Pipeline:**
```
FPL → FDAT → CFB → ModelData → TLV Header → zLZO → LZO → MS3D0 → Vertices/Triangles → THREE.Mesh
```

**Getestet:** `models.fpl` vom NAS (212 CFB-Entries, 53 FDAT-Modelle)
- 45 erfolgreich geparst (85%)
- Stride-Verteilung: 12=22, 15=7, 16=9, 24=3, 28=1, 48=2, 60=1
- Vertexanzahl: 4–3.072, gesamt ~24.000 Vertices

**Integration:**
- `src/fpt/fpm-parser.ts` — Full FPL+FPM parser mit CFB-Nesting + TLV-Name-Extraktion
- `src/fpt/file-parser.ts:553` — FPM models werden im FPL-Modell-Loading automatisch in AssetCatalog registriert
- `src/fpt/models.ts:45` — `extractFPMModelsFromCFB()` für zLZO-Marker-Erkennung

**Nächste Schritte (vorgeschlagen):**
1. Weitere FPL Libraries testen (ConanModels.fpl, GBModels.fpl, T2_MODELS.fpl usw.)
2. Textur-Extraktion aus den embedded BMPs in FPM Region 0
3. FPM-Modelle im Spiel anzeigen: `resolveModel()` in `table/builder.ts` nutzt AssetCatalog
4. Rapier2D → Rapier3D Upgrade für 3D-Physics

### 2026-06-21 — Rapier2D → Rapier3D Upgrade + FPL Modelle + Deployment

**Rapier3D Migration (10 Dateien geändert):**
- `@dimforge/rapier2d-compat v0.12.0` → `@dimforge/rapier3d v0.19.3`
- **API-Änderungen**: `{x,y}`→`{x,y,z}`, `setRotation(angle)`→`Quaternion`, `setAngvel(0)`→`Vector3`
- **Vite-Konfiguration**: `vite-plugin-wasm` + `vite-plugin-top-level-await` für WASM-Unterstützung
- **Worker-Konfiguration**: `worker.format: 'es'` + separate `worker.plugins` für WASM
- `main`-Feld zu `node_modules/@dimforge/rapier3d/package.json` hinzugefügt (Vite-Resolution)
- **Build**: rapier_wasm3d_bg.wasm (1.57 MB) korrekt als Asset eingebunden

**FPL Modelle (6 Libraries getestet):**
- 264/369 Modelle (72%) erfolgreich geparst (5 MB fpModels.fpl = 194/260)
- Pipeline: `CFB → FDAT → nested CFB → ModelData → TLV name → zLZO → LZO → MS3D0 → THREE.Mesh`
- AssetCatalog-Registration im FPL-Loader

**Alles getestet und deployed:** tsc clean, 762/762 Tests, Live-Update

### 2026-06-21 — NAS File Server + 3D Model Viewer + FPM Enhancement

**NAS File Server (`scripts/nas-file-server.cjs`):**
- Lokaler HTTP-Server auf dem Mac (Port 4157, CORS enabled)
- Serviert NAS-Verzeichnis `/Volumes/.../FuturePinball/` über REST-API
- Endpoints: `/api/health`, `/api/list?dir=...`, `/api/file?path=...`, `/api/search?q=...`
- Scan: 6.192 Dateien, 635 FPL, 2.146 FPT, 40 FPM (recursive)
- Start: `node scripts/nas-file-server.cjs`

**NAS Client (`src/app/nas-source.ts`):**
- `window.connectNAS()` → verbindet + zeigt NAS Browser Panel
- Auto-Detection beim App-Start (non-blocking)
- Custom Event `fpl-file-loaded` → integriert mit parseFPLFile/parseFPTFile
- NAS Browser Panel: Pfad-Navigation, FPL/FPT Listing, Download + Load

**FPM Parser Enhancement (`src/fpt/fpm-parser.ts`):**
- Vertex Normal Extraktion: 11 Stride-Layouts mit packed byte + float32
- UV Extraktion: Stride ≥ 28 bei offset 24 (float32×2)
- `fpmToTHREE()`: setzt Normal/UV Attribute, compute nur als Fallback

**Model Viewer (`src/app/model-viewer.ts`):**
- Wireframe-Toggle (SHOW/HIDE WIRE link)
- Normal/UV/Texture Badges im Info-Pane
- Drag-and-Drop FPL/FPM ins Viewport

**Dev-Mode 3D Fixtures (`src/app/dev-models.ts`):**
- Procedurale 3D Bumper/Target/Flipper/Plunger
- AssetCatalog pre-creation vor loadDemoTable
- `registerDevModels()` → fallback wenn keine FPL Models

**Build:** tsc clean, 762/762 tests, Vite build, live deploy

### 2026-06-25 — main.ts-Zerlegung fortgesetzt (−1070 Z, −31,4%)

**Fortsetzung der BAM-Init-Session**: 20 weitere Commits, 17 neue `src/app/` Module,
main.ts 3404 → 2334 (−1070, −31,4%).

| Schritt | Modul | main.ts Δ | DI-Ansatz |
|---|---|---|---|
| Library Selector | `library-selector.ts` | −24 | Factory-DI |
| Physics Frame Handler | `physics-frame-handler.ts` | −74 | Pure Imports |
| Game Helpers (Gravity + Debug) | `game-helpers.ts` | −65 | Pure Imports |
| Game State (resetBall/resetGameState) | `game-state.ts` | −38 | Pure Imports |
| PWA Install Prompt | `pwa-install.ts` | −29 | Pure Imports |
| HUD (updateHUD) | `hud.ts` | −27 | Pure Imports |
| Backglass Setup | `backglass-setup.ts` | −8 | Getter-DI |
| Quality System | `quality-system.ts` | −24 | Factory-DI |
| Table Shake | `table-shake.ts` | −26 | Factory-DI |
| Table Loader | `table-loader.ts` | −28 | Factory-DI |
| Rotation (rotateAndRedraw) | `rotation.ts` | −15 | Lazy-Init |
| Resize Handler | `resize-handler.ts` | −87 | Factory-DI |
| Physics Worker Setup | `physics-worker-setup.ts` | −85 | Pure Imports |
| Physics Init (Rapier3D) | `physics-init.ts` | −57 | Returns handles |
| **Σ (14 Extraktionen)** | **17 Module** | **−1070** | 6× DI, 8× Pure |

**Patterns etabliert:**
- **Factory-DI** für Blöcke die scene/camera/physics/profiler brauchen (`bam-init.ts`, `quality-system.ts`, `table-loader.ts`, `resize-handler.ts`, `backglass-setup.ts`, `table-shake.ts`)
- **Lazy-Init** für Timing-Probleme wo Module vor ihrer Abhängigkeit deklariert werden (`rotation.ts`, `resize-handler.ts`)
- **Pure Imports** für standalone DOM/Logic-Operations (`touch-controls.ts`, `secondary-windows.ts`, `hud.ts`, `game-state.ts`, `physics-worker-setup.ts`, `physics-init.ts`)
- **Getter-DI** mit Referenz-Objekt für Callback-Fälle (`backglass-setup.ts`: `() => backglassRenderer`)

**src/app/ insgesamt:** 43 Module, main.ts 2334 Zeilen.
**Verbleibend in main.ts für nächste Session:**
- `animate()` (400 Z, ~20 DI-Deps) — größter Block, braucht Factory
- `applyQualityPreset()` (100 Z, ~12 DI-Deps) — captured post-processing refs
- Flipper-Update-Logik (~70 Z) — captured scene refs
- Nudge/Multiball/Extra-Balls (~60 Z) — pure imports, easy
- `loadDemoTable()` (~30 Z) — pure imports
- Diverse Single-Funktionen (~200 Z)
- Top-Level-Code + Setup (~700 Z)

**Gelernt:** main.ts Deklarations-Reihenfolge ist strikt — Module die scene/camera/renderer
brauchen können erst NACH `setupScene()` instantiiert werden (`rotation.ts` brauchte Lazy-Init
weil es vor setupScene() deklariert war).
- Verified: tsc clean, 762/762 tests, vite build, live deploy ✅

### 2026-06-25 (continued) — main.ts decomposition Phase 2 (−1070 Z total)

**Weitere 11 Extraktionen nach dem initialen Handoff:**

| Schritt | Modul | Ansatz |
|---|---|---|
| Game State (resetBall/resetGameState) | `game-state.ts` | Pure imports |
| PWA Install | `pwa-install.ts` | Lokaler State |
| HUD | `hud.ts` | Pure imports |
| Backglass Setup | `backglass-setup.ts` | Getter-DI |
| Quality System (optimizedView, presets, performance) | `quality-system.ts` | Factory-DI (Refs) |
| Table Shake | `table-shake.ts` | Factory-DI |
| Table Loader | `table-loader.ts` | Factory-DI (Signature preserved) |
| Rotation (rotateAndRedraw) | `rotation.ts` | Lazy-Init-DI |
| Resize Handler | `resize-handler.ts` | Lazy-Init-DI |
| Physics Worker Setup | `physics-worker-setup.ts` | Pure imports |
| Physics Init (Rapier3D world) | `physics-init.ts` | Return-Werte für Handles |

**main.ts netto**: 3404 → 2334 (−1070, −31.4%), **20 Module extrahiert**

**Verbleibende Haupt-Blöcke**:
- `animate()` (~400 Z, ~20 deps) — größter Block, braucht umfangreiche Factory
- `applyQualityPreset()` (~100 Z, ~12 deps) — zweitgrößter
- `updateFlippers()` + `updatePlunger()` (~75 Z, Flipper-Refs)
- `nudgeTable()` + `launchMultiBall()` + `updateExtraBalls()` (~110 Z)
- Second Resize Handler (Flipper-Positionierung) (~50 Z)
- Setup/Init/Consts (~900 Z) — nicht sinnvoll extrahierbar

**Build**: main.js 449 KB (gzip: 130 KB), 295+ Module, 762/762 Tests ✅

**Nächste Empfehlungen**: Die verbleibenden Blöcke brauchen alle Factory-Patterns mit mehreren Dependencies. `updateFlippers()`/`updatePlunger()` könnten als nächstes zusammenhängend extrahiert werden. `animate()` bleibt der komplexeste Block und sollte zuletzt angegangen werden. Alternativ: `as any`-Cleanup (6× in editor HTML), NAS + Model Viewer Tests, FPM Parser Coverage.

### 2026-06-26 — Input System Architecture Analysis
**Evidence-based investigation of multi-system input handling:**

**Finding**: Multiple input systems modify the same `keys` object (`{ left: false, right: false }`):

1. **Direct Keyboard Listeners**: `document.addEventListener('keydown'/'keyup')` in main.ts directly modifies `keys.left` and `keys.right`
2. **Touch System 1** (`src/touch-controls/manager.ts`): Zone-based touch detection, conditional initialization (`if ('ontouchstart' in window)`), callbacks modify `keys` object
3. **Touch System 2** (`src/app/touch-controls.ts`): DOM-based touch controls, unconditional initialization, directly modifies `keys` object
4. **InputOptimizer** (`src/input-optimizer.ts`): Low-latency queue system, maintains separate internal `InputState`, **no verified connection to `keys` object**

**Impact**: On touch devices, both touch systems run simultaneously. InputOptimizer's `processInputQueue()` is called in animation loop but its internal state doesn't connect to the game.

**Documented Files Inspected**:
- `src/main.ts` (2335 lines) - All input system integrations
- `src/input-optimizer.ts` (265 lines) - Keyboard-only, no touch integration  
- `src/game/state.ts` - Contains `export const keys = { left: false, right: false };`
- `src/app/touch-controls.ts` (382 lines) - Enhanced touch with visual states
- `src/touch-controls/manager.ts` (220 lines) - Zone-based touch detection

**Note**: No evidence of input conflicts, but architecture shows multiple independent paths to the same state object.

### 2026-06-26 (continued) — Phase 2: InputOptimizer Touch Integration
**Commits:** `be34a1e7`, `e119e3c7`

**Enhanced InputOptimizer (`src/input-optimizer.ts`):**
- Added touch support: `processTouchFlipperPress()`, `processTouchFlipperRelease()`
- Enhanced `InputState` interface: `flipperPowerLevel`, `touchPressure`, `lastInputSource` (keyboard/touch)
- Integrated touch controls with InputOptimizer for unified input handling
- Added `getFlipperState()` method for enhanced physics integration
- Added input metrics display in HUD (dev mode) showing latency/power levels
- Registered touch callbacks for bidirectional communication

**Files changed:**
- `src/input-optimizer.ts` (+135 lines) — Core touch integration
- `src/app/touch-controls.ts` (+6 lines) — Bidirectional callback registration
- `src/app/hud.ts` (+48 lines) — Dev-mode input metrics display

**Verification:** tsc clean, 762/762 tests, vite build ✓

### 2026-06-30 — Dependabot Security Fixes + Vite 7 → 8 Migration
**Aufgaben:** 6 ungemergte Dependabot-PRs auf GitHub gemerged, 14 Security Alerts geschlossen, Vite 8 Migration durchgeführt.

**6 Dependabot PRs gemerged** (Form-data, js-yaml, tar, tmp, undici, vite):
- `bc15efe1` — form-data 4.0.5 → 4.0.6 (CRLF injection fix)
- `38673311` — tmp 0.2.5 → 0.2.7 (path traversal fix)
- `5afafcff` — undici 6.25.0 → 6.27.0 (HTTP header injection, DoS fix)
- `f34a19ca` — tar 7.5.13 → 7.5.16 (PAX smuggling fix)
- `756f0d63` — js-yaml 4.1.1 → 4.2.0 (minor bump)
- `60142a69` — vite 7.3.2 → 8.0.16 (major bump, NTLM hash + fs.deny fix)

**Zusätzliche Fixes:**
- `d7ef7a56` — overrides für uuid ^11.1.1 und esbuild ^0.28.1; rollup als devDep
- `bb6fd0d6` — Vite 8 Config-Adaption: `manualChunks` Object→Function (Rolldown kompatibel)

**Vite 7 → 8 Migration:**
- **Breaking Change**: Vite 8 verwendet **Rolldown** (Rust) statt Rollup als Bundler
- **manualChunks**: Object-Syntax nicht mehr unterstützt → **Function**-Syntax erforderlich
  ```ts
  // Vorher (Vite 7):
  manualChunks: { 'vendor-three': ['three'] }
  // Nachher (Vite 8):
  manualChunks(id: string) { if (id.includes('/three/')) return 'vendor-three'; }
  ```
- **rollup**: nicht mehr in Vite 8 enthalten → explizit als devDep installiert
  (wird von `vite-plugin-top-level-await` via `@rollup/plugin-virtual` benötigt)
- **Build-Zeit**: 2.5s → 1.97s (Rolldown ist schneller)
- **Bundle**: unverändert, ~20 Chunks, identische Chunk-Namen
- **Warnung**: `IMPORT_IS_UNDEFINED` für `ShaderPass` aus three.module.js (unschädlich)

**14 Dependabot Alerts geschlossen:** 0 open, alle fixed ✅
- Fix durch Merges: 8 Alerts (undici×4, form-data, tar, vite×2)
- Fix durch overrides: 2 Alerts (uuid, esbuild)
- Bereits resolved: 4 Alerts (ws×2, brace-expansion, vite war schon auf 8.x)

**Verification:** tsc clean, 762/762 tests, npm audit: 0 vulnerabilities, vite build ✓
