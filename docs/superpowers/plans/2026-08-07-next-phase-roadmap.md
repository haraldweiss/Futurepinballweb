# Next-Phase Roadmap — Futurepinball Web (2026-08-07)

**Context:** `animate()` was extracted from `src/main.ts` into `src/app/animation-loop.ts`
(commit `212485b1`, main.ts 2271→1940 lines). This doc captures what is needed for the
next improvement phase, correcting the status of the three candidates previously listed
(two were already partially/fully done).

**Verification bar (per AGENTS.md §4):** `tsc clean`, `917/917 tests`, `vite build ✓`,
manual Pharaoh boot smoke. The unit tests do **not** cover main.ts runtime orchestration,
so any main.ts-touching change also needs a browser smoke test.

---

## Status correction — previously-listed candidates

| Candidate | Actual status | What is still needed |
|---|---|---|
| VBScript Phase 7 — `setMaterial`/`setElasticity`/`setFriction` | ✅ **WIRED** (`cb.* → bridge.postMessage`, commit `a3ab7467`/`5437204d`) | End-to-end test proving a scripted material change moves the Rapier collider |
| `GetElement`-by-name registry | 🟡 **PARTIAL** (bumper/target/flipper/light name patterns, commit `011a3d02`) | Extend to gates/kickers/spinners/triggers; unify into one registry |
| `applyQualityPreset()` extraction | ✅ **DONE** (2026-08-07, commit `7509f9c6`) → `src/app/quality-preset-applier.ts` | main.ts 1940→1844; decomposition complete |

---

## Candidate A — Extract `applyQualityPreset()` from main.ts  ⭐ highest value  ✅ **DONE 2026-08-07**

**Why:** It is the **last extractable logic block** in main.ts. After it, only the
~900-line setup/init/consts section remains, which is entry-point orchestration and
**not extractable** (per AGENTS.md §3.6 + handoff "Setup (~900 Z, nicht extrahierbar").

**Location / size:** `src/main.ts:1184` — ~100 lines.

**Captured refs it touches (must become deps):**
- `profiler` (`getCurrentPresetName`, `getQualityPreset`)
- `lastAppliedQualityPreset` — **mutable module-level var** → pass as getter/setter or lift into the factory closure
- `renderer` (`shadowMap.enabled`)
- `bloomPass` (`enabled`, `strength`, `radius`, `threshold`)
- `mainSpot` (`castShadow`, `shadow.mapSize`, `shadow.blurSamples`)
- `ambLight` / `fillLight` / `rimLight` (intensity)
- `ballOuterMaterial` (emissive)
- (possibly more — read the full body 1184→~1286 before extracting)

**Approach (factory-DI, mirrors `animation-loop.ts`):**
1. `src/app/quality-preset-applier.ts` → `createQualityPresetApplier(deps)` returning the function.
2. Define `QualityPresetApplierDeps` interface (one field per captured ref above).
3. `lastAppliedQualityPreset` is mutable → keep it as a `let` **inside the factory closure** (don't inject; the factory owns it), or pass `{ get, set }`.
4. main.ts builds the deps object at the same point `applyQualityPreset` is currently referenced and stores the result.
5. Replace all call sites with the factory result: `animate()` loop (`deps.applyQualityPreset`), `quality-system.ts` (`deps.applyQualityPreset`), `post-processing.ts`, `bam-init.ts` (`deps.applyQualityPreset`).
   - These four consumers currently receive `applyQualityPreset` as a bare function arg — swapping to the factory result is a drop-in change.

**Pitfalls:**
- `bloomPass` / `mainSpot` / lights may be `undefined` during early init → guard inside the applier (the function already early-returns on no-change, so a missing pass is safe but must not throw).
- `profiler.getCurrentPresetName()` is a **method**, not a module fn — inject `profiler` object, not a getter.

**Verification:** tsc, 917 tests, build, browser smoke (toggle a preset in dev, confirm bloom/shadow change).

---

## Candidate B — Quality Preset System: validation

**Why:** The graphics pipeline was heavily reworked (2026-06-17/06-20). The presets
*declare* toggles but there is no automated proof they actually engage.

**What is needed:**
1. Inventory every `QUALITY_PRESETS` entry (`src/profiler/quality-presets.ts`) and map each flag to the pass/light it drives:
   - `bloomEnabled` / `bloomStrength` / `bloomRadius` → `bloomPass`
   - `shadowsEnabled` → `mainSpot.castShadow` + `renderer.shadowMap.enabled`
   - `volumetricEnabled` → `VolumetricLighting` (gated 2026-06-20)
   - `aaMode` (FXAA→SMAA, 2026-06-17) → `smaaPass`
   - `anisotropy` → `THREE.Texture.DEFAULT_ANISOTROPY`
   - `colorGrading` (saturation/contrast/temp) → inline pass after `OutputPass`
2. Add a **vitest integration test** that applies each preset and asserts the resulting
   pass/light state (e.g. `preset.low → bloomPass.enabled === false`, `preset.ultra → mainSpot.castShadow === true`).
3. Fix any preset whose declared flag is a no-op (prior incidents: `bloomPass.setEnabled` /
   `mainSpot.setProperty` were non-existent methods → optional-chain no-ops, fixed 2026-06-17).

**Pitfalls:** `UnrealBloomPass` has no `setEnabled()` — toggle the inherited `Pass.enabled`.
`THREE.SpotLight` has no `setProperty()` — set `castShadow` directly.

**Verification:** new vitest file `src/__tests__/quality-preset.test.ts`, tsc, 917+ tests.

---

## Candidate C — Element registry extension for `GetElement`-by-name

**Why:** `GetElement(name)` (script-engine.ts:462) only resolves bumper/target meshes by
`mesh.userData.name` + index fallback; flipper/light patterns were added later (`011a3d02`)
but gates/kickers/spinners/triggers (Phase 6, commit `db398125`) are **not** resolvable.

**What is needed:**
1. Build a **unified name→descriptor registry** at table-load time in `src/table/builder.ts`
   (or `src/game/state.ts`) covering: bumpers, targets, ramps, flippers, lights, gates,
   kickers, spinners, triggers. Each entry: `{ type, index, name, mesh, x, y }`.
2. Expose the registry to the script engine (via `game/callbacks` or a module getter) and
   rewrite `GetElement` to consult it instead of hand-rolled loops.
3. Add a `GetElementCount(type)` / `GetElementName(obj)` pass over the registry so the
   existing API surface stays consistent.

**Pitfalls:** Registry must be rebuilt on every `loadDemoTable`/`parseFPTFile` (table swap).
Don't leak meshes across tables.

**Verification:** extend `src/__tests__/vbscript-phase6.test.ts` with `GetElement('Gate1')`
/ `GetElement('Kicker1')` assertions; tsc, 917+ tests.

---

## Remaining main.ts (NOT extractable — document and stop)

- **Setup / init / consts (~900 lines):** entry-point orchestration (scene/camera/renderer
  construction, async IIFE that boots physics + loads the demo table). Keep in main.ts.
- After Candidate A lands, main.ts is effectively "done" for decomposition — only the
  boot orchestration remains, which is correct to live at the entry point.

---

## Recommended order

1. ~~**Candidate A** (`applyQualityPreset`) — DONE 2026-08-07 (commit `7509f9c6`).~~ main.ts decomposition finished.
2. **Candidate B** (preset validation) — protects the graphics rework from regressions.
3. **Candidate C** (element registry) — completes the VBScript API element surface.

Each is independently shippable and keeps `917/917` green.
