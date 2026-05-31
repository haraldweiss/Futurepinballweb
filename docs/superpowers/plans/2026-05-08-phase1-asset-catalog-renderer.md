# Phase 1: AssetCatalog + Renderer Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect already-extracted FPT assets (textures, MS3D models) to the Three.js renderer via a new `AssetCatalog` layer, so real FPT tables show actual graphics instead of generic placeholders.

**Architecture:** New `src/assets/` module exposes `AssetCatalog` — a typed lookup layer over `fptResources` with placeholder fallbacks and IndexedDB persistence. The renderer (`src/table.ts`) queries the catalog instead of `fptResources` directly. Existing parser (`src/fpt-parser.ts`) populates the catalog after extraction.

**Tech Stack:** TypeScript, Three.js (existing), Vitest (existing), IndexedDB (browser native), `fake-indexeddb` (new dev dep, for tests).

**Reference Spec:** `docs/superpowers/specs/2026-05-08-fpt-loading-and-table-editor-design.md`

---

## File Structure

**New files:**
- `src/assets/asset-catalog.ts` — main `AssetCatalog` class (in-memory + cache facade)
- `src/assets/asset-cache.ts` — IndexedDB persistence layer
- `src/assets/placeholders.ts` — fallback texture/mesh/audio
- `src/assets/asset-types.ts` — type definitions (`AssetKind`, `CatalogStats`, etc.)
- `src/__tests__/asset-catalog.test.ts` — unit tests for catalog
- `src/__tests__/asset-cache.test.ts` — unit tests for IndexedDB layer
- `src/__tests__/asset-integration.test.ts` — integration test (parser → catalog → renderer)

**Modified files:**
- `src/types.ts` — extend `FPTResources` with optional `catalog?: AssetCatalog`
- `src/game.ts` — add exported `globalAssetCatalog` reference + setter
- `src/fpt-parser.ts` — populate `globalAssetCatalog` after `parseCFBResources` succeeds
- `src/table.ts` — read playfield texture from catalog instead of `fptResources.playfield`
- `package.json` — add `fake-indexeddb` dev dependency

---

## Task 1: Asset type definitions and placeholders

**Files:**
- Create: `src/assets/asset-types.ts`
- Create: `src/assets/placeholders.ts`
- Test: `src/__tests__/asset-catalog.test.ts` (placeholder tests only this task)

- [x] **Step 1: Write failing test for placeholder texture**

Create `src/__tests__/asset-catalog.test.ts`:

```typescript
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { createPlaceholderTexture, createPlaceholderMesh, createPlaceholderAudio } from '../assets/placeholders';

describe('Placeholders', () => {
  it('creates a 1x1 grey placeholder texture', () => {
    const tex = createPlaceholderTexture();
    expect(tex).toBeInstanceOf(THREE.Texture);
    expect(tex.image.width).toBe(1);
    expect(tex.image.height).toBe(1);
  });

  it('creates a 1x1x1 grey placeholder mesh', () => {
    const mesh = createPlaceholderMesh();
    expect(mesh).toBeInstanceOf(THREE.Mesh);
    expect(mesh.geometry.type).toBe('BoxGeometry');
  });

  it('creates a silent placeholder audio buffer (sample rate 44100, 1 sample)', () => {
    const buf = createPlaceholderAudio();
    // SilentBuffer is a typed shape — just an object with channels
    expect(buf.numberOfChannels).toBe(1);
    expect(buf.sampleRate).toBe(44100);
    expect(buf.length).toBe(1);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

```
npx vitest run src/__tests__/asset-catalog.test.ts
```

Expected: FAIL — `Cannot find module '../assets/placeholders'`

- [x] **Step 3: Implement asset-types.ts**

Create `src/assets/asset-types.ts`:

```typescript
// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss

import * as THREE from 'three';

export type AssetKind = 'texture' | 'model' | 'sound';

export interface CatalogStats {
  textureCount: number;
  modelCount: number;
  soundCount: number;
  estimatedBytes: number;
  memoryBudgetBytes: number;
  usingOnDemand: boolean;
}

export interface SilentBuffer {
  numberOfChannels: number;
  sampleRate: number;
  length: number;
  duration: number;
  getChannelData(channel: number): Float32Array;
}

export type AnyAsset = THREE.Texture | THREE.Mesh | AudioBuffer | SilentBuffer;
```

- [x] **Step 4: Implement placeholders.ts**

Create `src/assets/placeholders.ts`:

```typescript
// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss

import * as THREE from 'three';
import type { SilentBuffer } from './asset-types';

let cachedTexture: THREE.Texture | null = null;
let cachedMesh: THREE.Mesh | null = null;
let cachedAudio: SilentBuffer | null = null;

export function createPlaceholderTexture(): THREE.Texture {
  if (cachedTexture) return cachedTexture;
  const data = new Uint8Array([128, 128, 128, 255]);
  const tex = new THREE.DataTexture(data, 1, 1, THREE.RGBAFormat);
  tex.needsUpdate = true;
  cachedTexture = tex;
  return tex;
}

export function createPlaceholderMesh(): THREE.Mesh {
  if (cachedMesh) return cachedMesh;
  const geom = new THREE.BoxGeometry(1, 1, 1);
  const mat = new THREE.MeshStandardMaterial({ color: 0x808080 });
  cachedMesh = new THREE.Mesh(geom, mat);
  return cachedMesh;
}

export function createPlaceholderAudio(): SilentBuffer {
  if (cachedAudio) return cachedAudio;
  const channel = new Float32Array(1);
  cachedAudio = {
    numberOfChannels: 1,
    sampleRate: 44100,
    length: 1,
    duration: 1 / 44100,
    getChannelData: () => channel,
  };
  return cachedAudio;
}

// Test-only reset
export function _resetPlaceholderCache(): void {
  cachedTexture = null;
  cachedMesh = null;
  cachedAudio = null;
}
```

- [x] **Step 5: Run test to verify it passes**

```
npx vitest run src/__tests__/asset-catalog.test.ts
```

Expected: PASS — all 3 tests green.

- [x] **Step 6: Commit**

```bash
git add src/assets/asset-types.ts src/assets/placeholders.ts src/__tests__/asset-catalog.test.ts
git commit -m "feat(assets): add asset types and placeholder fallbacks"
```

---

## Task 2: AssetCatalog class — in-memory layer

**Files:**
- Create: `src/assets/asset-catalog.ts`
- Test: `src/__tests__/asset-catalog.test.ts` (extend)

- [x] **Step 1: Write failing tests for AssetCatalog basic API**

Append to `src/__tests__/asset-catalog.test.ts`:

```typescript
import * as THREE from 'three';
import { AssetCatalog } from '../assets/asset-catalog';

describe('AssetCatalog (in-memory)', () => {
  it('returns a placeholder texture when asset is missing', () => {
    const cat = new AssetCatalog();
    const tex = cat.getTexture('does-not-exist');
    expect(tex).toBeInstanceOf(THREE.Texture);
    expect(cat.isPlaceholder(tex)).toBe(true);
  });

  it('returns a registered texture by name', () => {
    const cat = new AssetCatalog();
    const real = new THREE.DataTexture(new Uint8Array([255,0,0,255]), 1, 1, THREE.RGBAFormat);
    cat.registerTexture('playfield', real);
    expect(cat.getTexture('playfield')).toBe(real);
    expect(cat.isPlaceholder(real)).toBe(false);
  });

  it('returns a registered mesh by name', () => {
    const cat = new AssetCatalog();
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1));
    cat.registerModel('bumper', mesh);
    expect(cat.getModel('bumper')).toBe(mesh);
  });

  it('returns a placeholder model when asset is missing', () => {
    const cat = new AssetCatalog();
    const m = cat.getModel('missing');
    expect(m).toBeInstanceOf(THREE.Mesh);
    expect(cat.isPlaceholder(m)).toBe(true);
  });

  it('returns stats reflecting registered assets', () => {
    const cat = new AssetCatalog();
    cat.registerTexture('a', new THREE.DataTexture(new Uint8Array([0,0,0,255]), 1, 1, THREE.RGBAFormat));
    cat.registerTexture('b', new THREE.DataTexture(new Uint8Array([0,0,0,255]), 1, 1, THREE.RGBAFormat));
    cat.registerModel('m', new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1)));
    const stats = cat.stats();
    expect(stats.textureCount).toBe(2);
    expect(stats.modelCount).toBe(1);
    expect(stats.soundCount).toBe(0);
  });

  it('clear() empties the catalog', () => {
    const cat = new AssetCatalog();
    cat.registerTexture('a', new THREE.DataTexture(new Uint8Array([0,0,0,255]), 1, 1, THREE.RGBAFormat));
    cat.clear();
    expect(cat.stats().textureCount).toBe(0);
  });
});
```

- [x] **Step 2: Run test to verify failure**

```
npx vitest run src/__tests__/asset-catalog.test.ts
```

Expected: FAIL — module not found.

- [x] **Step 3: Implement AssetCatalog (in-memory only, no cache yet)**

Create `src/assets/asset-catalog.ts`:

```typescript
// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss

import * as THREE from 'three';
import type { CatalogStats, SilentBuffer } from './asset-types';
import { createPlaceholderTexture, createPlaceholderMesh, createPlaceholderAudio } from './placeholders';

export interface AssetCatalogOptions {
  memoryBudgetBytes?: number;
}

const DEFAULT_BUDGET = 200 * 1024 * 1024; // 200 MB

export class AssetCatalog {
  private textures = new Map<string, THREE.Texture>();
  private models   = new Map<string, THREE.Mesh>();
  private sounds   = new Map<string, AudioBuffer | SilentBuffer>();
  private estimatedBytes = 0;
  private readonly memoryBudgetBytes: number;
  private usingOnDemand = false;
  private placeholders = new WeakSet<object>();

  constructor(options: AssetCatalogOptions = {}) {
    this.memoryBudgetBytes = options.memoryBudgetBytes ?? DEFAULT_BUDGET;
  }

  registerTexture(name: string, tex: THREE.Texture, sizeBytes = 0): void {
    this.textures.set(name, tex);
    this.estimatedBytes += sizeBytes;
    this.checkBudget();
  }

  registerModel(name: string, mesh: THREE.Mesh, sizeBytes = 0): void {
    this.models.set(name, mesh);
    this.estimatedBytes += sizeBytes;
    this.checkBudget();
  }

  registerSound(name: string, buf: AudioBuffer | SilentBuffer, sizeBytes = 0): void {
    this.sounds.set(name, buf);
    this.estimatedBytes += sizeBytes;
    this.checkBudget();
  }

  getTexture(name: string): THREE.Texture {
    const tex = this.textures.get(name);
    if (tex) return tex;
    const placeholder = createPlaceholderTexture();
    this.placeholders.add(placeholder);
    return placeholder;
  }

  getModel(name: string): THREE.Mesh {
    const mesh = this.models.get(name);
    if (mesh) return mesh;
    const placeholder = createPlaceholderMesh();
    this.placeholders.add(placeholder);
    return placeholder;
  }

  getSound(name: string): AudioBuffer | SilentBuffer {
    const snd = this.sounds.get(name);
    if (snd) return snd;
    const placeholder = createPlaceholderAudio();
    this.placeholders.add(placeholder);
    return placeholder;
  }

  hasTexture(name: string): boolean { return this.textures.has(name); }
  hasModel(name: string):   boolean { return this.models.has(name); }
  hasSound(name: string):   boolean { return this.sounds.has(name); }

  isPlaceholder(asset: object): boolean {
    return this.placeholders.has(asset);
  }

  stats(): CatalogStats {
    return {
      textureCount: this.textures.size,
      modelCount:   this.models.size,
      soundCount:   this.sounds.size,
      estimatedBytes: this.estimatedBytes,
      memoryBudgetBytes: this.memoryBudgetBytes,
      usingOnDemand: this.usingOnDemand,
    };
  }

  clear(): void {
    this.textures.clear();
    this.models.clear();
    this.sounds.clear();
    this.estimatedBytes = 0;
    this.usingOnDemand = false;
  }

  private checkBudget(): void {
    if (this.estimatedBytes > this.memoryBudgetBytes) {
      this.usingOnDemand = true;
    }
  }
}
```

- [x] **Step 4: Run test to verify pass**

```
npx vitest run src/__tests__/asset-catalog.test.ts
```

Expected: PASS — all tests (placeholders + catalog basic API).

- [x] **Step 5: Commit**

```bash
git add src/assets/asset-catalog.ts src/__tests__/asset-catalog.test.ts
git commit -m "feat(assets): add AssetCatalog in-memory class with placeholder fallbacks"
```

---

## Task 3: IndexedDB persistence layer

**Files:**
- Create: `src/assets/asset-cache.ts`
- Create: `src/__tests__/asset-cache.test.ts`
- Modify: `package.json` (add `fake-indexeddb` dev dep)

- [x] **Step 1: Add fake-indexeddb dev dependency**

```bash
npm install --save-dev fake-indexeddb
```

- [x] **Step 2: Write failing tests**

Create `src/__tests__/asset-cache.test.ts`:

```typescript
// SPDX-License-Identifier: AGPL-3.0-or-later
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { AssetCache } from '../assets/asset-cache';

describe('AssetCache (IndexedDB)', () => {
  let cache: AssetCache;
  beforeEach(async () => {
    cache = new AssetCache('test-db');
    await cache.open();
    await cache.clear();
  });

  it('stores and retrieves a binary blob by key', async () => {
    const data = new Uint8Array([1, 2, 3, 4]);
    await cache.put('table-abc:bumper.png', data);
    const out = await cache.get('table-abc:bumper.png');
    expect(out).toBeInstanceOf(Uint8Array);
    expect(Array.from(out!)).toEqual([1, 2, 3, 4]);
  });

  it('returns null for missing keys', async () => {
    expect(await cache.get('missing-key')).toBeNull();
  });

  it('hasKey returns true after put, false after delete', async () => {
    await cache.put('k', new Uint8Array([0]));
    expect(await cache.hasKey('k')).toBe(true);
    await cache.delete('k');
    expect(await cache.hasKey('k')).toBe(false);
  });

  it('clear empties the cache', async () => {
    await cache.put('a', new Uint8Array([1]));
    await cache.put('b', new Uint8Array([2]));
    await cache.clear();
    expect(await cache.hasKey('a')).toBe(false);
    expect(await cache.hasKey('b')).toBe(false);
  });
});
```

- [x] **Step 3: Run test to verify failure**

```
npx vitest run src/__tests__/asset-cache.test.ts
```

Expected: FAIL — module not found.

- [x] **Step 4: Implement AssetCache**

Create `src/assets/asset-cache.ts`:

```typescript
// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss

const STORE_NAME = 'assets';

export class AssetCache {
  private db: IDBDatabase | null = null;
  constructor(private readonly dbName = 'fpt-asset-cache') {}

  async open(): Promise<void> {
    if (this.db) return;
    this.db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(this.dbName, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  private requireDb(): IDBDatabase {
    if (!this.db) throw new Error('AssetCache not opened');
    return this.db;
  }

  async put(key: string, data: Uint8Array): Promise<void> {
    const db = this.requireDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(data, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async get(key: string): Promise<Uint8Array | null> {
    const db = this.requireDb();
    return new Promise<Uint8Array | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(key);
      req.onsuccess = () => resolve((req.result as Uint8Array) ?? null);
      req.onerror = () => reject(req.error);
    });
  }

  async hasKey(key: string): Promise<boolean> {
    const db = this.requireDb();
    return new Promise<boolean>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).count(key);
      req.onsuccess = () => resolve(req.result > 0);
      req.onerror = () => reject(req.error);
    });
  }

  async delete(key: string): Promise<void> {
    const db = this.requireDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async clear(): Promise<void> {
    const db = this.requireDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}
```

- [x] **Step 5: Run test to verify pass**

```
npx vitest run src/__tests__/asset-cache.test.ts
```

Expected: PASS — all 4 tests green.

- [x] **Step 6: Commit**

```bash
git add src/assets/asset-cache.ts src/__tests__/asset-cache.test.ts package.json package-lock.json
git commit -m "feat(assets): add IndexedDB cache layer with fake-indexeddb tests"
```

---

## Task 4: Wire global catalog instance into game state

**Files:**
- Modify: `src/types.ts` (no functional change in this task, just import path)
- Modify: `src/game.ts` (add globalAssetCatalog export)

- [x] **Step 1: Write failing test for global catalog access**

Append to `src/__tests__/asset-catalog.test.ts`:

```typescript
import { globalAssetCatalog, setGlobalAssetCatalog } from '../game';

describe('globalAssetCatalog', () => {
  it('is null by default', () => {
    setGlobalAssetCatalog(null);
    expect(globalAssetCatalog()).toBeNull();
  });

  it('can be set and retrieved', () => {
    const cat = new AssetCatalog();
    setGlobalAssetCatalog(cat);
    expect(globalAssetCatalog()).toBe(cat);
    setGlobalAssetCatalog(null);
  });
});
```

- [x] **Step 2: Run test to verify failure**

```
npx vitest run src/__tests__/asset-catalog.test.ts
```

Expected: FAIL — `globalAssetCatalog`/`setGlobalAssetCatalog` not exported from `../game`.

- [x] **Step 3: Modify src/game.ts to add catalog reference**

Find the section starting `export let physics:` (around line 107) and add after the existing `let` exports (after line 113):

```typescript
import { AssetCatalog } from './assets/asset-catalog';

let _globalAssetCatalog: AssetCatalog | null = null;
export function globalAssetCatalog(): AssetCatalog | null { return _globalAssetCatalog; }
export function setGlobalAssetCatalog(c: AssetCatalog | null): void { _globalAssetCatalog = c; }
```

(Place the `import` near the top with other imports; place the function exports near the other setters around line 129.)

- [x] **Step 4: Run test to verify pass**

```
npx vitest run src/__tests__/asset-catalog.test.ts
```

Expected: PASS — all tests including the two new ones.

- [x] **Step 5: Verify no existing tests broke**

```
npx vitest run
```

Expected: ALL existing 563+ tests still pass.

- [x] **Step 6: Commit**

```bash
git add src/game.ts src/__tests__/asset-catalog.test.ts
git commit -m "feat(assets): expose globalAssetCatalog accessor on game module"
```

---

## Task 5: FPT parser populates AssetCatalog

**Files:**
- Modify: `src/fpt-parser.ts` (in `parseCFBResources`, after assets are added to `fptResources`)
- Test: `src/__tests__/asset-integration.test.ts`

- [x] **Step 1: Write failing integration test**

Create `src/__tests__/asset-integration.test.ts`:

```typescript
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { AssetCatalog } from '../assets/asset-catalog';
import { setGlobalAssetCatalog, globalAssetCatalog, fptResources } from '../game';
import { populateCatalogFromFPTResources } from '../fpt-parser';

describe('FPT parser → AssetCatalog integration', () => {
  beforeEach(() => {
    // Reset state between tests
    Object.keys(fptResources.textures).forEach(k => delete fptResources.textures[k]);
    fptResources.playfield = null;
    if (fptResources.models) fptResources.models.clear();
    setGlobalAssetCatalog(new AssetCatalog());
  });

  it('copies textures from fptResources into globalAssetCatalog', () => {
    const tex = new THREE.DataTexture(new Uint8Array([0,0,255,255]), 1, 1, THREE.RGBAFormat);
    fptResources.textures['blue.png'] = tex;
    populateCatalogFromFPTResources();
    expect(globalAssetCatalog()!.getTexture('blue.png')).toBe(tex);
  });

  it('copies playfield texture under the name "playfield"', () => {
    const tex = new THREE.DataTexture(new Uint8Array([0,255,0,255]), 1, 1, THREE.RGBAFormat);
    fptResources.playfield = tex;
    populateCatalogFromFPTResources();
    expect(globalAssetCatalog()!.getTexture('playfield')).toBe(tex);
  });

  it('copies models from fptResources.models into globalAssetCatalog', () => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1,1,1));
    fptResources.models!.set('bumper.ms3d', mesh);
    populateCatalogFromFPTResources();
    expect(globalAssetCatalog()!.getModel('bumper.ms3d')).toBe(mesh);
  });

  it('returns placeholder for unknown texture name', () => {
    populateCatalogFromFPTResources();
    const tex = globalAssetCatalog()!.getTexture('nope');
    expect(globalAssetCatalog()!.isPlaceholder(tex)).toBe(true);
  });
});
```

- [x] **Step 2: Run test to verify failure**

```
npx vitest run src/__tests__/asset-integration.test.ts
```

Expected: FAIL — `populateCatalogFromFPTResources` not exported.

- [x] **Step 3: Add populate function to fpt-parser.ts**

In `src/fpt-parser.ts`, add near the top (with other imports — currently line 8-10):

```typescript
import { globalAssetCatalog, setGlobalAssetCatalog } from './game';
import { AssetCatalog } from './assets/asset-catalog';
```

Then add a new exported function (place near line 468 where `mapFPTSounds` is exported):

```typescript
/**
 * Mirror current fptResources content into globalAssetCatalog.
 * Lazily creates a catalog if one does not yet exist.
 * Idempotent — safe to call multiple times.
 */
export function populateCatalogFromFPTResources(): void {
  let cat = globalAssetCatalog();
  if (!cat) {
    cat = new AssetCatalog();
    setGlobalAssetCatalog(cat);
  }

  // Textures
  for (const [name, tex] of Object.entries(fptResources.textures)) {
    cat.registerTexture(name, tex);
  }
  if (fptResources.playfield) {
    cat.registerTexture('playfield', fptResources.playfield);
  }

  // Models
  if (fptResources.models) {
    for (const [name, mesh] of fptResources.models.entries()) {
      if (mesh) cat.registerModel(name, mesh);
    }
  }

  // Sounds — only AudioBuffer entries, skip Blob URL strings
  for (const [name, snd] of Object.entries(fptResources.sounds)) {
    if (typeof snd !== 'string') {
      cat.registerSound(name, snd);
    }
  }
}
```

- [x] **Step 4: Call populate at end of parseFPTFile success path**

In `src/fpt-parser.ts`, find the section in `parseFPTFile` after the CFB resources are parsed and before `buildTableFn` is called (around line 1094-1130). Locate the line:

```typescript
      if (textureCount > 0 || soundCount > 0) {
```

Inside that block, after the `mapFPTSounds(...)` call (around line 1096), add:

```typescript
        // Mirror extracted resources into AssetCatalog for renderer use
        populateCatalogFromFPTResources();
```

- [x] **Step 5: Run test to verify pass**

```
npx vitest run src/__tests__/asset-integration.test.ts
```

Expected: PASS — all 4 integration tests green.

- [x] **Step 6: Run full test suite**

```
npx vitest run
```

Expected: ALL existing tests still pass + 4 new integration tests.

- [x] **Step 7: Commit**

```bash
git add src/fpt-parser.ts src/__tests__/asset-integration.test.ts
git commit -m "feat(assets): populate AssetCatalog from fptResources after FPT parse"
```

---

## Task 6: Renderer uses AssetCatalog for playfield texture

**Files:**
- Modify: `src/table.ts` around lines 1572-1589 (playfield texture logic)
- Test: `src/__tests__/asset-integration.test.ts` (extend with renderer assertion)

- [x] **Step 1: Write failing test for catalog-driven texture lookup**

Append to `src/__tests__/asset-integration.test.ts`:

```typescript
import { resolvePlayfieldTexture } from '../table';

describe('Renderer texture resolution via catalog', () => {
  beforeEach(() => {
    Object.keys(fptResources.textures).forEach(k => delete fptResources.textures[k]);
    fptResources.playfield = null;
    setGlobalAssetCatalog(new AssetCatalog());
  });

  it('resolvePlayfieldTexture returns catalog texture when registered', () => {
    const tex = new THREE.DataTexture(new Uint8Array([255,255,255,255]), 1, 1, THREE.RGBAFormat);
    fptResources.playfield = tex;
    populateCatalogFromFPTResources();
    expect(resolvePlayfieldTexture()).toBe(tex);
  });

  it('resolvePlayfieldTexture returns null when no playfield is registered', () => {
    populateCatalogFromFPTResources();
    expect(resolvePlayfieldTexture()).toBeNull();
  });
});
```

- [x] **Step 2: Run test to verify failure**

```
npx vitest run src/__tests__/asset-integration.test.ts
```

Expected: FAIL — `resolvePlayfieldTexture` not exported from `../table`.

- [x] **Step 3: Add resolvePlayfieldTexture export to table.ts**

In `src/table.ts`, add this near the top of the file (after imports, before any other exports — around line 30):

```typescript
import { globalAssetCatalog } from './game';

/**
 * Resolve the active playfield texture.
 * Prefers AssetCatalog (new path); returns null if not present.
 * Returning null signals "use solid color fallback".
 */
export function resolvePlayfieldTexture(): THREE.Texture | null {
  const cat = globalAssetCatalog();
  if (cat && cat.hasTexture('playfield')) {
    const tex = cat.getTexture('playfield');
    if (!cat.isPlaceholder(tex)) return tex;
  }
  return null;
}
```

- [x] **Step 4: Replace direct fptResources.playfield reads in buildTable**

In `src/table.ts`, around line 1572, change:

```typescript
  const tableGeom = geomPool?.getBox(6, 12, 0.25) ?? new THREE.BoxGeometry(6, 12, 0.25);
  const hasFPTTex = !!fptResources.playfield;

  const tableMat  = new THREE.MeshStandardMaterial({
    color:     hasFPTTex ? 0xffffff : config.tableColor,
    map:       hasFPTTex ? fptResources.playfield : null,
    roughness: hasFPTTex ? 0.4 : 0.65,
    metalness: hasFPTTex ? 0.15 : 0.12,
    emissive:  new THREE.Color(config.tableColor).multiplyScalar(hasFPTTex ? 0.08 : 0.14),
    side:      THREE.FrontSide,
  });

  // UV-Mapping optimieren für Playfield
  if (hasFPTTex && fptResources.playfield) {
    fptResources.playfield.repeat.set(1.0, 1.0);
    fptResources.playfield.offset.set(0, 0);
    fptResources.playfield.wrapS = THREE.ClampToEdgeWrapping;
    fptResources.playfield.wrapT = THREE.ClampToEdgeWrapping;
  }
```

To:

```typescript
  const tableGeom = geomPool?.getBox(6, 12, 0.25) ?? new THREE.BoxGeometry(6, 12, 0.25);
  const playfieldTex = resolvePlayfieldTexture();
  const hasFPTTex = playfieldTex !== null;

  const tableMat  = new THREE.MeshStandardMaterial({
    color:     hasFPTTex ? 0xffffff : config.tableColor,
    map:       playfieldTex,
    roughness: hasFPTTex ? 0.4 : 0.65,
    metalness: hasFPTTex ? 0.15 : 0.12,
    emissive:  new THREE.Color(config.tableColor).multiplyScalar(hasFPTTex ? 0.08 : 0.14),
    side:      THREE.FrontSide,
  });

  // UV-Mapping optimieren für Playfield
  if (playfieldTex) {
    playfieldTex.repeat.set(1.0, 1.0);
    playfieldTex.offset.set(0, 0);
    playfieldTex.wrapS = THREE.ClampToEdgeWrapping;
    playfieldTex.wrapT = THREE.ClampToEdgeWrapping;
  }
```

- [x] **Step 5: Run test to verify pass**

```
npx vitest run src/__tests__/asset-integration.test.ts
```

Expected: PASS — including the new resolver tests.

- [x] **Step 6: Run full test suite**

```
npx vitest run
```

Expected: ALL tests still pass.

- [x] **Step 7: Run a build to verify no type errors**

```
npx vite build
```

Expected: Build succeeds in under 2 seconds, zero errors.

- [x] **Step 8: Commit**

```bash
git add src/table.ts src/__tests__/asset-integration.test.ts
git commit -m "refactor(table): resolve playfield texture via AssetCatalog"
```

---

## Task 7: Renderer uses AssetCatalog for MS3D models

**Files:**
- Modify: `src/table.ts` (model lookup helper) — lines around 1162 and 1249 (`fptRes` usage)
- Test: `src/__tests__/asset-integration.test.ts`

- [x] **Step 1: Write failing test for model resolution**

Append to `src/__tests__/asset-integration.test.ts`:

```typescript
import { resolveModel } from '../table';

describe('Renderer model resolution via catalog', () => {
  beforeEach(() => {
    if (fptResources.models) fptResources.models.clear();
    setGlobalAssetCatalog(new AssetCatalog());
  });

  it('resolveModel returns registered mesh when present in catalog', () => {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.5));
    fptResources.models!.set('bumper.ms3d', mesh);
    populateCatalogFromFPTResources();
    const resolved = resolveModel('bumper.ms3d');
    expect(resolved).toBe(mesh);
  });

  it('resolveModel returns null when model is not in catalog', () => {
    populateCatalogFromFPTResources();
    expect(resolveModel('nonexistent.ms3d')).toBeNull();
  });

  it('resolveModel returns null when catalog returns placeholder', () => {
    populateCatalogFromFPTResources();
    // missing model returns placeholder; resolver treats as "no model available"
    expect(resolveModel('also-missing')).toBeNull();
  });
});
```

- [x] **Step 2: Run test to verify failure**

```
npx vitest run src/__tests__/asset-integration.test.ts
```

Expected: FAIL — `resolveModel` not exported.

- [x] **Step 3: Add resolveModel export to table.ts**

In `src/table.ts`, near `resolvePlayfieldTexture` from Task 6, add:

```typescript
/**
 * Resolve a 3D model by name from the AssetCatalog.
 * Returns the registered mesh or null if not present (placeholder rejected).
 * Caller decides fallback behavior (e.g., procedural geometry).
 */
export function resolveModel(name: string): THREE.Mesh | null {
  const cat = globalAssetCatalog();
  if (!cat || !cat.hasModel(name)) return null;
  const mesh = cat.getModel(name);
  return cat.isPlaceholder(mesh) ? null : mesh;
}
```

- [x] **Step 4: Run test to verify pass**

```
npx vitest run src/__tests__/asset-integration.test.ts
```

Expected: PASS.

- [x] **Step 5: Run full test suite + build**

```
npx vitest run && npx vite build
```

Expected: ALL tests pass, build succeeds.

- [x] **Step 6: Commit**

```bash
git add src/table.ts src/__tests__/asset-integration.test.ts
git commit -m "feat(table): add resolveModel helper for catalog-based MS3D lookup"
```

---

## Task 8: Memory budget on-demand fallback

**Files:**
- Modify: `src/assets/asset-catalog.ts`
- Test: `src/__tests__/asset-catalog.test.ts`

- [x] **Step 1: Write failing test for memory budget**

Append to `src/__tests__/asset-catalog.test.ts`:

```typescript
describe('AssetCatalog memory budget', () => {
  it('flips usingOnDemand to true when budget exceeded', () => {
    const cat = new AssetCatalog({ memoryBudgetBytes: 100 });
    expect(cat.stats().usingOnDemand).toBe(false);
    cat.registerTexture(
      'big',
      new THREE.DataTexture(new Uint8Array([0,0,0,255]), 1, 1, THREE.RGBAFormat),
      150 // 150 > 100 → over budget
    );
    expect(cat.stats().usingOnDemand).toBe(true);
  });

  it('stays usingOnDemand=false when within budget', () => {
    const cat = new AssetCatalog({ memoryBudgetBytes: 1000 });
    cat.registerTexture(
      'small',
      new THREE.DataTexture(new Uint8Array([0,0,0,255]), 1, 1, THREE.RGBAFormat),
      50
    );
    expect(cat.stats().usingOnDemand).toBe(false);
  });

  it('stats.estimatedBytes reflects sum of registered sizes', () => {
    const cat = new AssetCatalog({ memoryBudgetBytes: 1000 });
    cat.registerTexture('a', new THREE.DataTexture(new Uint8Array([0,0,0,255]), 1, 1, THREE.RGBAFormat), 30);
    cat.registerModel('b', new THREE.Mesh(new THREE.BoxGeometry(1,1,1)), 70);
    expect(cat.stats().estimatedBytes).toBe(100);
  });
});
```

- [x] **Step 2: Run test to verify pass**

The implementation in Task 2 already supports this. Run:

```
npx vitest run src/__tests__/asset-catalog.test.ts
```

Expected: PASS — tests confirm the budget behavior already works.

(If the tests fail because `checkBudget()` was implemented incorrectly in Task 2, fix the logic to set `usingOnDemand = true` when `estimatedBytes > memoryBudgetBytes`.)

- [x] **Step 3: Commit**

```bash
git add src/__tests__/asset-catalog.test.ts
git commit -m "test(assets): cover memory budget and on-demand mode behavior"
```

---

## Task 9: IndexedDB persistence integration

**Files:**
- Modify: `src/assets/asset-catalog.ts` (add cache integration)
- Test: `src/__tests__/asset-catalog.test.ts`

- [x] **Step 1: Write failing test for cache persistence**

Append to `src/__tests__/asset-catalog.test.ts`:

```typescript
import 'fake-indexeddb/auto';
import { AssetCache } from '../assets/asset-cache';

describe('AssetCatalog persistence (IndexedDB)', () => {
  it('persistTexture stores raw bytes under tableId+name key', async () => {
    const cache = new AssetCache('catalog-persist-test');
    await cache.open();
    await cache.clear();

    const cat = new AssetCatalog();
    cat.bindCache(cache, 'table-xyz');
    const bytes = new Uint8Array([1, 2, 3, 4]);
    await cat.persistTextureBytes('thumb.png', bytes);

    const stored = await cache.get('table-xyz:tex:thumb.png');
    expect(stored).not.toBeNull();
    expect(Array.from(stored!)).toEqual([1, 2, 3, 4]);
  });

  it('hasPersistedTexture returns true after persist', async () => {
    const cache = new AssetCache('catalog-persist-test-2');
    await cache.open();
    await cache.clear();
    const cat = new AssetCatalog();
    cat.bindCache(cache, 'table-q');
    await cat.persistTextureBytes('a.png', new Uint8Array([5]));
    expect(await cat.hasPersistedTexture('a.png')).toBe(true);
    expect(await cat.hasPersistedTexture('b.png')).toBe(false);
  });
});
```

- [x] **Step 2: Run test to verify failure**

```
npx vitest run src/__tests__/asset-catalog.test.ts
```

Expected: FAIL — `bindCache`, `persistTextureBytes`, `hasPersistedTexture` not defined.

- [x] **Step 3: Extend AssetCatalog with cache binding**

In `src/assets/asset-catalog.ts`, add:

```typescript
import type { AssetCache } from './asset-cache';
```

Inside the `AssetCatalog` class, add fields and methods:

```typescript
  private cache: AssetCache | null = null;
  private tableId: string = '';

  bindCache(cache: AssetCache, tableId: string): void {
    this.cache = cache;
    this.tableId = tableId;
  }

  private cacheKey(kind: 'tex' | 'mdl' | 'snd', name: string): string {
    return `${this.tableId}:${kind}:${name}`;
  }

  async persistTextureBytes(name: string, bytes: Uint8Array): Promise<void> {
    if (!this.cache) return;
    await this.cache.put(this.cacheKey('tex', name), bytes);
  }

  async hasPersistedTexture(name: string): Promise<boolean> {
    if (!this.cache) return false;
    return this.cache.hasKey(this.cacheKey('tex', name));
  }

  async loadPersistedTextureBytes(name: string): Promise<Uint8Array | null> {
    if (!this.cache) return null;
    return this.cache.get(this.cacheKey('tex', name));
  }
```

- [x] **Step 4: Run test to verify pass**

```
npx vitest run src/__tests__/asset-catalog.test.ts
```

Expected: PASS — both persistence tests green.

- [x] **Step 5: Run full test suite + build**

```
npx vitest run && npx vite build
```

Expected: ALL tests pass, build succeeds.

- [x] **Step 6: Commit**

```bash
git add src/assets/asset-catalog.ts src/__tests__/asset-catalog.test.ts
git commit -m "feat(assets): bind AssetCache for cross-session texture persistence"
```

---

## Task 10: Manual verification with a real FPT file

**Files:**
- None (manual test only)
- Document: append to `TEST_ARCHITECTURE.md` (if it exists; otherwise skip doc step)

- [x] **Step 1: Start dev server**

```
npm run dev
```

Expected: Vite dev server starts on http://localhost:5173 (or similar).

- [x] **Step 2: Open browser, load a real FPT file**

In the browser:
1. Open the dev server URL.
2. Use the existing file loader UI (look for "Load FPT" or "Datei laden" button).
3. Select a real `.fpt` file from your collection.

- [x] **Step 3: Verify graphics appear**

Expected on screen:
- Playfield shows the actual extracted texture (not a solid green/grey color)
- Console shows log lines like `✓ FPT-Playfield-Texture wird verwendet` and any `[AssetCatalog]` entries (if added)

If the playfield still shows a solid color, open the browser console and check:
- `globalAssetCatalog().stats()` — should show `textureCount > 0`
- `globalAssetCatalog().hasTexture('playfield')` — should be `true`

- [x] **Step 4: Verify in console**

Open the browser DevTools console and run:

```js
const cat = (await import('/src/game.ts')).globalAssetCatalog();
console.log(cat.stats());
console.log('Has playfield:', cat.hasTexture('playfield'));
```

Expected output:
```
{ textureCount: <N>, modelCount: <M>, soundCount: <S>, ... }
Has playfield: true
```

- [x] **Step 5: Commit only if any code change was needed**

If you needed to make small fixes to get the manual test to pass (e.g., a missed call site or a typo), commit them now:

```bash
git add -p   # review and stage changes interactively
git commit -m "fix(assets): wire-up tweaks discovered during manual FPT load"
```

If no fix was needed, skip this step.

---

## Out of Scope (Deferred to Phase 1b)

This plan delivers the **AssetCatalog infrastructure + playfield texture rendering**. The following items from the spec are intentionally deferred to a follow-up plan (`2026-05-08-phase1b-model-placement.md`):

- **Wiring `resolveModel()` into the bumper/flipper/target builders** — replacing procedural geometry with extracted MS3D meshes. This requires deeper changes to existing `buildTable()` logic in `src/table.ts` and is best done after Phase 1a's catalog foundation is verified.
- **Applying extracted physics parameters** — the parser produces a `Map<string, {restitution, friction, ...}>` (see `extractFPTPhysics` in `fpt-parser.ts:687`). Wiring these into Rapier collider configs is a separate concern from asset lookup.

After Phase 1a (this plan), the playfield surface shows real textures. After Phase 1b, individual elements (bumpers, etc.) use real models with real physics.

This split keeps each plan small and verifiable. The visible deliverable for this plan is "real playfield texture appears"; deeper visual fidelity comes from Phase 1b.

## Summary

After completing all tasks:
- New `src/assets/` module with catalog, cache, placeholders (700–900 LOC)
- Renderer in `src/table.ts` uses catalog for playfield texture and models
- 15+ new tests across 3 test files
- Real FPT files now show actual graphics
- Foundation ready for Phase 2 (audio integration) and Phase 3 (editor)

**Verification:**
- `npx vitest run` — all 580+ tests green
- `npx vite build` — under 2s, zero errors
- Manual: load real FPT in browser, see real graphics

**Next plan:** `2026-05-08-phase2-audio-verification.md` (to be written after Phase 1 ships)
