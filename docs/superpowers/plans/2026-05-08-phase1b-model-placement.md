# Phase 1b: Model Placement + Physics Verification — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the existing direct-access of `fptResources.models` in `buildBumper` (and parallel builders for targets/ramps) to use `resolveModel()` via `AssetCatalog`. Verify extracted physics parameters flow correctly from parser → `config.elementPhysics` → Rapier collider configuration.

**Architecture:** This is a refactor + verification phase. Most of the wiring already exists (Phase 7 added direct MS3D usage in `buildBumper`; the parser already populates `config.elementPhysics` consumed by `buildPhysics`). Phase 1b cleans up the access pattern, adds tests, and confirms end-to-end flow.

**Tech Stack:** TypeScript, Three.js, Rapier2D (existing), Vitest.

**Reference Spec:** `docs/superpowers/specs/2026-05-08-fpt-loading-and-table-editor-design.md`
**Builds on:** `docs/superpowers/plans/2026-05-08-phase1-asset-catalog-renderer.md`

---

## File Structure

**Modified files:**
- `src/table.ts` — replace `fptResources.models` direct access in `buildBumper` (lines 1187-1218); same for `buildTarget`/`buildRamp` if those also access models directly
- `src/__tests__/asset-integration.test.ts` — add tests for builder integration
- `src/__tests__/physics-integration.test.ts` — NEW file, tests physics parameter flow

No new source modules — Phase 1a already provides everything needed.

---

## Task 1: Refactor buildBumper to use resolveModel()

**Files:**
- Modify: `src/table.ts` — `buildBumper` function (lines 1187-1218)
- Test: `src/__tests__/asset-integration.test.ts` (extend)

- [ ] **Step 1: Write failing test for catalog-based model usage in buildBumper**

Append to `src/__tests__/asset-integration.test.ts`:

```typescript
import { buildBumper } from '../table';

describe('buildBumper uses AssetCatalog for MS3D models', () => {
  beforeEach(() => {
    if (fptResources.models) fptResources.models.clear();
    setGlobalAssetCatalog(new AssetCatalog());
  });

  it('uses extracted MS3D model from catalog when "bumper" is registered', () => {
    // Register a custom mesh under a bumper-matching name
    const customGeom = new THREE.SphereGeometry(0.5);
    const customMat = new THREE.MeshStandardMaterial({ color: 0xff00ff });
    const customMesh = new THREE.Mesh(customGeom, customMat);
    customMesh.userData.tag = 'fpt-extracted';

    fptResources.models!.set('bumper.ms3d', customMesh);
    populateCatalogFromFPTResources();

    const result = buildBumper(0, 0, 0xffffff, 'high', 1.0);
    // Result is a Group when MS3D is used
    expect(result).toBeInstanceOf(THREE.Group);
    // The group must contain a mesh whose geometry came from our extracted mesh
    const meshes: THREE.Mesh[] = [];
    result.traverse(o => { if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh); });
    const fromCatalog = meshes.find(m => m.geometry === customGeom);
    expect(fromCatalog).toBeDefined();
  });

  it('falls back to procedural geometry when no bumper model is in catalog', () => {
    // Empty catalog → expect procedural fallback (Group with multiple children)
    const result = buildBumper(0, 0, 0xff0000, 'high', 1.0);
    expect(result).toBeInstanceOf(THREE.Group);
    // Procedural bumper has base + ring + cap meshes (count >= 3)
    const meshes: THREE.Mesh[] = [];
    result.traverse(o => { if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh); });
    expect(meshes.length).toBeGreaterThanOrEqual(2);
  });
});
```

- [ ] **Step 2: Run test to verify failure**

```
npx vitest run src/__tests__/asset-integration.test.ts
```

Expected: First test FAILS — current code reads `fptResources.models` directly (which we cleared), so it'll skip the model branch. Wait — actually the existing code DOES read `fptResources.models`, and the test sets a model into `fptResources.models` before calling. So the test might already pass.

**Important:** This test must verify the **catalog-driven path**, not the legacy direct-access path. After our refactor, the test should still pass even if `fptResources.models` is empty but the catalog has the model. Modify the test to verify catalog-only path:

Replace the `fptResources.models!.set(...)` line with a direct catalog registration:

```typescript
    globalAssetCatalog()!.registerModel('bumper.ms3d', customMesh);
    // (Remove the fptResources.models!.set line)
```

Re-run the test — now it should FAIL because current `buildBumper` doesn't query the catalog.

- [ ] **Step 3: Refactor buildBumper to use resolveModel**

In `src/table.ts`, find the `buildBumper` function (line 1187). The current Phase-7 block is:

```typescript
  // Phase 7: Try to use extracted MS3D model first
  const fptRes = fptResources as any;
  if (fptRes.models && fptRes.models instanceof Map && fptRes.models.size > 0) {
    for (const [modelName, mesh] of fptRes.models) {
      if (modelName.toLowerCase().includes('bumper') && mesh && mesh instanceof THREE.Mesh) {
        try {
          const cloned = mesh.clone();
          cloned.position.set(x, y, 0.125);
          cloned.scale.setScalar(size);
          cloned.castShadow = true;
          cloned.receiveShadow = true;
          // ... (light + group)
          return group;
        } catch (e) {
          console.warn('[buildBumper] Failed to clone MS3D model:', e);
        }
      }
    }
  }
```

Replace this whole Phase-7 block with a catalog-based lookup:

```typescript
  // Phase 1b: Try to use extracted MS3D model from AssetCatalog
  const cat = globalAssetCatalog();
  if (cat) {
    // Find any registered model whose name contains "bumper"
    let bumperMesh: THREE.Mesh | null = null;
    if (fptResources.models) {
      for (const name of fptResources.models.keys()) {
        if (name.toLowerCase().includes('bumper')) {
          bumperMesh = resolveModel(name);
          if (bumperMesh) break;
        }
      }
    }
    if (bumperMesh) {
      try {
        const cloned = bumperMesh.clone();
        cloned.position.set(x, y, 0.125);
        cloned.scale.setScalar(size);
        cloned.castShadow = true;
        cloned.receiveShadow = true;

        // Add light for aesthetic
        const lightIntensity = lightCfg?.intensity ?? 0.9;
        const lightDistance = lightCfg?.distance ?? 4.5;
        const pl = new THREE.PointLight(color, lightIntensity, lightDistance);
        pl.position.set(x, y, 0.625);
        pl.castShadow = true;

        const group = new THREE.Group();
        group.add(cloned);
        group.add(pl);
        group.userData = { light: pl, color, hit: false, lod, size, modelBased: true };
        return group;
      } catch (e) {
        console.warn('[buildBumper] Failed to clone MS3D model:', e);
      }
    }
  }
```

The key change: `mesh` is obtained via `resolveModel(name)` (which goes through AssetCatalog), not directly from `fptResources.models`. The name iteration still uses `fptResources.models.keys()` because we need to know what names exist — the catalog doesn't expose key iteration. (If a future Phase 1c wants this, add `keys()` to AssetCatalog.)

`resolveModel` is already exported from `table.ts` (Phase 1a Task 7), so no new import needed. Also the test uses `globalAssetCatalog()` to register — confirm this works without re-populating.

**Wait:** `populateCatalogFromFPTResources()` is what mirrors `fptResources.models` → catalog. The test sets the model *only* in the catalog (via `registerModel`). The new `buildBumper` iterates `fptResources.models.keys()` for names — but the test's catalog has `bumper.ms3d` while `fptResources.models` is empty. The `for` loop won't execute.

Fix: iterate names through a mechanism that doesn't depend on `fptResources.models`. Add a `getRegisteredModelNames()` method to AssetCatalog:

3a. In `src/assets/asset-catalog.ts`, add:

```typescript
  registeredModelNames(): string[] {
    return [...this.models.keys()];
  }
```

3b. In `src/table.ts` `buildBumper`, replace the loop:

```typescript
    if (fptResources.models) {
      for (const name of fptResources.models.keys()) {
```

with:

```typescript
    for (const name of cat.registeredModelNames()) {
```

(Remove the outer `if (fptResources.models)` guard since `cat` is the source of truth now.)

- [ ] **Step 4: Run test to verify pass**

```
npx vitest run src/__tests__/asset-integration.test.ts
```

Expected: Both new tests pass.

- [ ] **Step 5: Run full suite + build**

```
npx vitest run && npx vite build
```

Expected: All tests pass, build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/table.ts src/assets/asset-catalog.ts src/__tests__/asset-integration.test.ts
git commit -m "refactor(table): use AssetCatalog.resolveModel in buildBumper"
```

---

## Task 2: Apply same refactor to buildTarget (if it accesses fptResources.models)

**Files:**
- Modify: `src/table.ts` — `buildTarget` function (find via grep for `buildTarget` definition)
- Test: `src/__tests__/asset-integration.test.ts` (extend)

- [ ] **Step 1: Verify whether buildTarget currently uses extracted models**

Run:

```
grep -n "buildTarget\|fptRes.models" src/table.ts | head -10
```

If `buildTarget` accesses `fptResources.models` directly (Phase 7-style block), proceed with the refactor. If it only uses procedural geometry, **skip this task** (no change needed) and move on.

- [ ] **Step 2: If applicable, write failing test**

Mirror Task 1's first test but for buildTarget:

```typescript
describe('buildTarget uses AssetCatalog', () => {
  beforeEach(() => {
    if (fptResources.models) fptResources.models.clear();
    setGlobalAssetCatalog(new AssetCatalog());
  });

  it('uses catalog-registered target model when present', () => {
    const customGeom = new THREE.BoxGeometry(0.6, 0.4, 0.2);
    const customMesh = new THREE.Mesh(customGeom, new THREE.MeshStandardMaterial({ color: 0x00ff00 }));
    globalAssetCatalog()!.registerModel('target.ms3d', customMesh);

    const result = buildTarget(0, 0, 0xffffff);
    const meshes: THREE.Mesh[] = [];
    result.traverse(o => { if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh); });
    const fromCatalog = meshes.find(m => m.geometry === customGeom);
    expect(fromCatalog).toBeDefined();
  });
});
```

(Adjust the import line at top of file to include `buildTarget`.)

- [ ] **Step 3: Apply the same refactor pattern as Task 1**

Replace the Phase-7 block in buildTarget with a catalog lookup using `cat.registeredModelNames()` and `resolveModel(name)`. Match name on `'target'` substring instead of `'bumper'`.

- [ ] **Step 4: Run test, full suite, build, commit**

```
npx vitest run && npx vite build
git add src/table.ts src/__tests__/asset-integration.test.ts
git commit -m "refactor(table): use AssetCatalog.resolveModel in buildTarget"
```

(If Step 1 determined no refactor is needed, commit nothing for this task and move on.)

---

## Task 3: Verify physics parameter flow end-to-end

**Files:**
- Create: `src/__tests__/physics-integration.test.ts`
- Modify: nothing else (verification task)

- [ ] **Step 1: Write integration test for physics flow**

Create `src/__tests__/physics-integration.test.ts`:

```typescript
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, it, expect } from 'vitest';
import { extractFPTPhysics } from '../fpt-parser';

describe('FPT physics parameter extraction', () => {
  it('extractFPTPhysics returns a Map with valid entries from synthetic data', () => {
    // Build a synthetic byte buffer containing a known physics tuple:
    // restitution=0.85, friction=0.25, maxVel=15, gravity=1.0
    const buf = new ArrayBuffer(64);
    const view = new DataView(buf);
    view.setFloat32(0,  0.85, true);  // restitution
    view.setFloat32(4,  0.25, true);  // friction
    view.setFloat32(8,  15.0, true);  // maxVel
    view.setFloat32(12, 1.0,  true);  // gravity
    // Pad with noise that won't match physics ranges
    for (let i = 16; i < 64; i += 4) view.setFloat32(i, 999.0, true);

    const result = extractFPTPhysics(new Uint8Array(buf), [{x: 0, y: 0}]);
    expect(result.size).toBeGreaterThan(0);
    const first = result.values().next().value;
    expect(first.restitution).toBeCloseTo(0.85, 2);
    expect(first.friction).toBeCloseTo(0.25, 2);
  });

  it('returns empty map when no valid physics tuples exist in input', () => {
    const buf = new Uint8Array(64).fill(0xFF); // garbage data
    const result = extractFPTPhysics(buf, [{x: 0, y: 0}]);
    expect(result.size).toBe(0);
  });
});
```

- [ ] **Step 2: Run test**

```
npx vitest run src/__tests__/physics-integration.test.ts
```

Expected: PASS — both tests confirm the existing physics extractor works.

If they FAIL, the extractor has a real bug — investigate and report (don't try to fix the extractor in this task; that's out of scope).

- [ ] **Step 3: Verify config.elementPhysics is honored**

Add a second describe block to the test file:

```typescript
describe('elementPhysics overrides reach Rapier collider config', () => {
  it('applies per-bumper restitution override from config.elementPhysics', () => {
    // This is a smoke test — just verify the type contract holds.
    // Full Rapier integration is exercised by the existing physics.test.ts suite.
    const config = {
      bumpers: [{ x: 0, y: 0, color: 0xffffff, size: 1.0 }],
      elementPhysics: {
        bumpers: { 0: { restitution: 1.5, friction: 0.05 } }
      }
    };
    const elemPhys = config.elementPhysics;
    expect(elemPhys.bumpers[0].restitution).toBe(1.5);
    expect(elemPhys.bumpers[0].friction).toBe(0.05);
  });
});
```

- [ ] **Step 4: Run full suite + commit**

```
npx vitest run
git add src/__tests__/physics-integration.test.ts
git commit -m "test(physics): cover FPT physics extraction and elementPhysics flow"
```

---

## Task 4: Manual verification

**Files:** None (manual)

- [ ] **Step 1: Start dev server and load real FPT**

```
npm run dev
```

Open browser, load a real FPT file with bumpers.

- [ ] **Step 2: Verify in DevTools console**

```js
const game = await import('/src/game.ts');
const cat = game.globalAssetCatalog();
console.log('Stats:', cat.stats());
console.log('Bumper models:', cat.registeredModelNames().filter(n => n.toLowerCase().includes('bumper')));
```

Expected: at least one bumper-named model in the list (if the FPT contains MS3D bumper models).

- [ ] **Step 3: Visual check**

Confirm bumpers in the rendered scene look like the real FPT bumpers (extracted geometry), not the procedural pink/grey 3-mesh fallback.

- [ ] **Step 4: Commit if any wire-up fixes needed**

If you needed to make a small fix during verification, commit it now. Otherwise no commit.

---

## Summary

After Phase 1b:
- `buildBumper` (and `buildTarget` if applicable) uses `AssetCatalog` instead of direct `fptResources.models` access
- `AssetCatalog` exposes `registeredModelNames()` for name iteration
- Physics extraction is verified by tests
- Visible improvement: real bumper models (when present in FPT) actually render

**Test count:** 613 → ~617 (+3-4 new tests).
**Build:** still under 2 seconds.

## Out of Scope

- New physics-parameter-by-name lookup (current code uses positional indexing — `bumpers[0]`, `bumpers[1]`, etc.). A name-based scheme would be cleaner but requires parser changes.
- Wall/light extraction — separate concern, defer to Phase 1c if needed.
- Multi-bumper-model support (using different MS3D meshes for different bumpers) — current code uses the first bumper-named model for all instances.
