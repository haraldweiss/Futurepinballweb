# Phase 3a: Asset Browser Tab — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a fifth tab "Assets" to the integrated editor modal showing all extracted FPT assets (textures, models, sounds) with previews. Foundation for Phase 3b (property modal) and Phase 3d (save back).

**Architecture:** New module `src/editor/asset-browser.ts` exporting an `AssetBrowser` class (parallel to `BackglassEditor`, `DMDEditor`, `VideoEditor`). The class queries `globalAssetCatalog()` and renders three sections via safe DOM construction: Texture Grid, Model List, Sound List.

**Tech Stack:** TypeScript, plain DOM (createElement/textContent — no innerHTML), Three.js for thumbnails, Vitest.

**Reference Spec:** `docs/superpowers/specs/2026-05-08-fpt-loading-and-table-editor-design.md` (section "Phase 3.1 Asset Browser")
**Builds on:** Phase 1a (`AssetCatalog` with `registeredModelNames()`, `registeredSoundNames()`)

---

## File Structure

**New files:**
- `src/editor/asset-browser.ts` — `AssetBrowser` class (~250 LOC, DOM-builder pattern)
- `src/editor/asset-thumbnail.ts` — utility to render texture thumbnails (~80 LOC)
- `src/__tests__/asset-browser.test.ts` — unit tests for catalog → DOM rendering (~150 LOC)

**Modified files:**
- `src/assets/asset-catalog.ts` — add `registeredTextureNames()` (parallel to existing model/sound versions)
- `src/integrated-editor.ts` — add 'assets' to tab type, add tab button, add tab container, instantiate `AssetBrowser` on switch (use existing DOM-build pattern from BackglassEditor)

No changes to renderer code or asset pipeline.

---

## Task 1: Add registeredTextureNames + AssetThumbnail utilities

**Files:**
- Modify: `src/assets/asset-catalog.ts`
- Create: `src/editor/asset-thumbnail.ts`
- Test: `src/__tests__/asset-browser.test.ts` (new)

- [ ] **Step 1: Add registeredTextureNames() to AssetCatalog**

In `src/assets/asset-catalog.ts`, near `registeredModelNames()` and `registeredSoundNames()`, add:

```typescript
  registeredTextureNames(): string[] {
    return [...this.textures.keys()];
  }
```

- [ ] **Step 2: Write failing tests for thumbnail utilities**

Create `src/__tests__/asset-browser.test.ts`:

```typescript
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';

vi.mock('../script-engine', () => ({ runFPScript: vi.fn(), resolveSoundForPlayback: vi.fn() }));
vi.mock('../audio-system', () => ({ getAudioCtx: vi.fn(), playFPTMusic: vi.fn() }));
vi.mock('cfb', () => ({}));

import { textureToDataURL, formatDuration, formatBytes } from '../editor/asset-thumbnail';

describe('AssetThumbnail utilities', () => {
  it('textureToDataURL produces a data URL for a real Three.js texture', () => {
    const data = new Uint8Array([255, 0, 0, 255]);
    const tex = new THREE.DataTexture(data, 1, 1, THREE.RGBAFormat);
    const url = textureToDataURL(tex);
    expect(url).toMatch(/^data:image/);
  });

  it('textureToDataURL returns a placeholder URL for null', () => {
    const url = textureToDataURL(null);
    expect(url).toMatch(/^data:image/);
  });

  it('formatDuration formats seconds correctly', () => {
    expect(formatDuration(0.5)).toBe('0.5s');
    expect(formatDuration(12)).toBe('12.0s');
    expect(formatDuration(125.4)).toBe('2:05');
    expect(formatDuration(3725)).toBe('62:05');
  });

  it('formatBytes formats byte counts in human units', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2.0 KB');
    expect(formatBytes(1500000)).toBe('1.4 MB');
  });
});
```

- [ ] **Step 3: Run test to verify failure**

```
npx vitest run src/__tests__/asset-browser.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 4: Implement asset-thumbnail.ts**

Create `src/editor/asset-thumbnail.ts`:

```typescript
// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss

import * as THREE from 'three';

const PLACEHOLDER_DATA_URL =
  'data:image/svg+xml;base64,' +
  btoa('<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><rect width="16" height="16" fill="#888"/></svg>');

/**
 * Convert a Three.js texture to a data URL for display in <img> tags.
 * Returns a grey SVG placeholder for null inputs or extraction failures.
 */
export function textureToDataURL(tex: THREE.Texture | null): string {
  if (!tex) return PLACEHOLDER_DATA_URL;
  const img: any = tex.image;
  if (!img) return PLACEHOLDER_DATA_URL;

  const canvas = document.createElement('canvas');
  const w = img.width  ?? 1;
  const h = img.height ?? 1;
  canvas.width  = Math.min(w, 256);
  canvas.height = Math.min(h, 256);
  const ctx = canvas.getContext('2d');
  if (!ctx) return PLACEHOLDER_DATA_URL;

  try {
    if (img instanceof HTMLImageElement || img instanceof HTMLCanvasElement) {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    } else if (img.data) {
      const imgData = ctx.createImageData(w, h);
      imgData.data.set(img.data);
      ctx.putImageData(imgData, 0, 0);
    }
    return canvas.toDataURL('image/png');
  } catch {
    return PLACEHOLDER_DATA_URL;
  }
}

/**
 * Format a duration in seconds for display:
 * - <60s: "12.0s"
 * - >=60s: "MM:SS"
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format a byte count in human units.
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
```

- [ ] **Step 5: Run tests to verify pass**

```
npx vitest run src/__tests__/asset-browser.test.ts
```

Expected: 4 tests pass.

- [ ] **Step 6: Commit**

```bash
mkdir -p src/editor
git add src/assets/asset-catalog.ts src/editor/asset-thumbnail.ts src/__tests__/asset-browser.test.ts
git commit -m "feat(assets): add registeredTextureNames and thumbnail utilities"
```

---

## Task 2: AssetBrowser class — DOM-safe rendering

**Files:**
- Create: `src/editor/asset-browser.ts`
- Test: `src/__tests__/asset-browser.test.ts` (extend)

**Important architectural note:** Use `document.createElement` + `textContent` + `appendChild` exclusively. Do NOT use `innerHTML` or template strings injected into the DOM. Asset names come from FPT files which are user-supplied content and could contain malicious markup.

- [ ] **Step 1: Write failing tests for catalog → DOM rendering**

Append to `src/__tests__/asset-browser.test.ts`:

```typescript
import { AssetCatalog } from '../assets/asset-catalog';
import { setGlobalAssetCatalog } from '../game';
import { AssetBrowser } from '../editor/asset-browser';

describe('AssetBrowser', () => {
  beforeEach(() => {
    setGlobalAssetCatalog(new AssetCatalog());
  });

  it('renders empty state when catalog has no assets', () => {
    const container = document.createElement('div');
    const browser = new AssetBrowser();
    browser.attachTo(container);
    browser.refresh();
    expect(container.querySelector('.asset-browser-empty')).not.toBeNull();
  });

  it('lists registered textures with their names', () => {
    const cat = new AssetCatalog();
    setGlobalAssetCatalog(cat);
    cat.registerTexture('playfield', new THREE.DataTexture(new Uint8Array([0,0,0,255]), 1, 1, THREE.RGBAFormat));
    cat.registerTexture('bumper.png', new THREE.DataTexture(new Uint8Array([0,0,0,255]), 1, 1, THREE.RGBAFormat));

    const container = document.createElement('div');
    const browser = new AssetBrowser();
    browser.attachTo(container);
    browser.refresh();

    const items = container.querySelectorAll('.asset-item-texture');
    expect(items.length).toBe(2);
    const names = [...items].map(el => el.querySelector('.asset-name')?.textContent);
    expect(names).toContain('playfield');
    expect(names).toContain('bumper.png');
  });

  it('lists registered models with their names', () => {
    const cat = new AssetCatalog();
    setGlobalAssetCatalog(cat);
    cat.registerModel('bumper.ms3d', new THREE.Mesh(new THREE.BoxGeometry(1,1,1)));

    const container = document.createElement('div');
    const browser = new AssetBrowser();
    browser.attachTo(container);
    browser.refresh();

    const items = container.querySelectorAll('.asset-item-model');
    expect(items.length).toBe(1);
    expect(items[0].querySelector('.asset-name')?.textContent).toBe('bumper.ms3d');
  });

  it('lists registered sounds with their names and durations', () => {
    const cat = new AssetCatalog();
    setGlobalAssetCatalog(cat);
    const buf = {
      numberOfChannels: 1, sampleRate: 44100, length: 44100, duration: 1.0,
      getChannelData: () => new Float32Array(1),
      copyFromChannel: () => {}, copyToChannel: () => {},
    } as unknown as AudioBuffer;
    cat.registerSound('hit.wav', buf);

    const container = document.createElement('div');
    const browser = new AssetBrowser();
    browser.attachTo(container);
    browser.refresh();

    const items = container.querySelectorAll('.asset-item-sound');
    expect(items.length).toBe(1);
    expect(items[0].querySelector('.asset-name')?.textContent).toBe('hit.wav');
    expect(items[0].querySelector('.asset-duration')?.textContent).toBe('1.0s');
  });

  it('shows section counts in headers', () => {
    const cat = new AssetCatalog();
    setGlobalAssetCatalog(cat);
    cat.registerTexture('a', new THREE.DataTexture(new Uint8Array([0,0,0,255]), 1, 1, THREE.RGBAFormat));
    cat.registerTexture('b', new THREE.DataTexture(new Uint8Array([0,0,0,255]), 1, 1, THREE.RGBAFormat));
    cat.registerModel('m', new THREE.Mesh(new THREE.BoxGeometry(1,1,1)));

    const container = document.createElement('div');
    const browser = new AssetBrowser();
    browser.attachTo(container);
    browser.refresh();

    expect(container.querySelector('.asset-section-textures .asset-section-count')?.textContent).toBe('2');
    expect(container.querySelector('.asset-section-models   .asset-section-count')?.textContent).toBe('1');
    expect(container.querySelector('.asset-section-sounds   .asset-section-count')?.textContent).toBe('0');
  });

  it('does not interpret asset names as HTML (XSS safety)', () => {
    const cat = new AssetCatalog();
    setGlobalAssetCatalog(cat);
    cat.registerTexture('<script>alert(1)</script>', new THREE.DataTexture(new Uint8Array([0,0,0,255]), 1, 1, THREE.RGBAFormat));

    const container = document.createElement('div');
    const browser = new AssetBrowser();
    browser.attachTo(container);
    browser.refresh();

    // Confirm no script element was created
    expect(container.querySelectorAll('script').length).toBe(0);
    // The name should appear as text
    const nameEl = container.querySelector('.asset-name');
    expect(nameEl?.textContent).toBe('<script>alert(1)</script>');
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

```
npx vitest run src/__tests__/asset-browser.test.ts
```

Expected: FAIL — `AssetBrowser` not exported.

- [ ] **Step 3: Implement AssetBrowser using safe DOM construction**

Create `src/editor/asset-browser.ts`:

```typescript
// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss

import { globalAssetCatalog } from '../game';
import { textureToDataURL, formatDuration } from './asset-thumbnail';

/**
 * AssetBrowser renders three sections (textures, models, sounds) listing the
 * contents of the global AssetCatalog. Used as a tab in the integrated editor.
 *
 * Safety: All DOM construction uses createElement + textContent. No innerHTML.
 * Asset names from FPT files are treated as untrusted user content.
 */
export class AssetBrowser {
  private container: HTMLElement | null = null;

  attachTo(parent: HTMLElement): void {
    this.container = document.createElement('div');
    this.container.className = 'asset-browser';
    parent.appendChild(this.container);
  }

  refresh(): void {
    if (!this.container) return;
    // Clear safely
    while (this.container.firstChild) {
      this.container.removeChild(this.container.firstChild);
    }

    const cat = globalAssetCatalog();
    if (!cat) {
      this.container.appendChild(this.makeEmptyState('No catalog loaded.'));
      return;
    }

    const textureNames = cat.registeredTextureNames();
    const modelNames   = cat.registeredModelNames();
    const soundNames   = cat.registeredSoundNames();

    if (textureNames.length === 0 && modelNames.length === 0 && soundNames.length === 0) {
      this.container.appendChild(
        this.makeEmptyState('No assets extracted yet. Load a table to see assets here.')
      );
      return;
    }

    this.container.appendChild(this.makeTextureSection(cat, textureNames));
    this.container.appendChild(this.makeModelSection(modelNames));
    this.container.appendChild(this.makeSoundSection(cat, soundNames));
  }

  private makeEmptyState(message: string): HTMLElement {
    const div = document.createElement('div');
    div.className = 'asset-browser-empty';
    div.textContent = message;
    return div;
  }

  private makeSectionHeader(title: string, count: number): HTMLElement {
    const header = document.createElement('header');
    header.className = 'asset-section-header';
    const h3 = document.createElement('h3');
    h3.textContent = title;
    const span = document.createElement('span');
    span.className = 'asset-section-count';
    span.textContent = String(count);
    header.appendChild(h3);
    header.appendChild(span);
    return header;
  }

  private makeTextureSection(cat: ReturnType<typeof globalAssetCatalog> & {}, names: string[]): HTMLElement {
    const section = document.createElement('section');
    section.className = 'asset-section asset-section-textures';
    section.appendChild(this.makeSectionHeader('Textures', names.length));

    const grid = document.createElement('div');
    grid.className = 'asset-grid';
    for (const name of names) {
      const item = document.createElement('div');
      item.className = 'asset-item asset-item-texture';
      item.dataset.name = name;

      const img = document.createElement('img');
      img.className = 'asset-thumbnail';
      img.src = textureToDataURL(cat.getTexture(name));
      img.alt = name;

      const nameEl = document.createElement('div');
      nameEl.className = 'asset-name';
      nameEl.textContent = name;

      item.appendChild(img);
      item.appendChild(nameEl);
      grid.appendChild(item);
    }
    section.appendChild(grid);
    return section;
  }

  private makeModelSection(names: string[]): HTMLElement {
    const section = document.createElement('section');
    section.className = 'asset-section asset-section-models';
    section.appendChild(this.makeSectionHeader('Models', names.length));

    const list = document.createElement('div');
    list.className = 'asset-list';
    for (const name of names) {
      const item = document.createElement('div');
      item.className = 'asset-item asset-item-model';
      item.dataset.name = name;

      const icon = document.createElement('div');
      icon.className = 'asset-icon';
      icon.textContent = '🔷';

      const nameEl = document.createElement('div');
      nameEl.className = 'asset-name';
      nameEl.textContent = name;

      item.appendChild(icon);
      item.appendChild(nameEl);
      list.appendChild(item);
    }
    section.appendChild(list);
    return section;
  }

  private makeSoundSection(cat: ReturnType<typeof globalAssetCatalog> & {}, names: string[]): HTMLElement {
    const section = document.createElement('section');
    section.className = 'asset-section asset-section-sounds';
    section.appendChild(this.makeSectionHeader('Sounds', names.length));

    const list = document.createElement('div');
    list.className = 'asset-list';
    for (const name of names) {
      const item = document.createElement('div');
      item.className = 'asset-item asset-item-sound';
      item.dataset.name = name;

      const icon = document.createElement('div');
      icon.className = 'asset-icon';
      icon.textContent = '🔊';

      const nameEl = document.createElement('div');
      nameEl.className = 'asset-name';
      nameEl.textContent = name;

      const buf = cat.getSound(name) as { duration?: number };
      const durEl = document.createElement('div');
      durEl.className = 'asset-duration';
      durEl.textContent = (buf && typeof buf.duration === 'number') ? formatDuration(buf.duration) : '—';

      item.appendChild(icon);
      item.appendChild(nameEl);
      item.appendChild(durEl);
      list.appendChild(item);
    }
    section.appendChild(list);
    return section;
  }

  destroy(): void {
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
  }
}
```

- [ ] **Step 4: Run tests + build**

```
npx vitest run && npx vite build
```

Expected: 642 tests pass, build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/editor/asset-browser.ts src/__tests__/asset-browser.test.ts
git commit -m "feat(editor): add AssetBrowser with safe DOM construction"
```

---

## Task 3: Wire AssetBrowser into integrated-editor.ts

**Files:**
- Modify: `src/integrated-editor.ts`

- [ ] **Step 1: Add import and field**

In `src/integrated-editor.ts`:

1a. Add import (with the other editor imports around lines 17-21):

```typescript
import { AssetBrowser } from './editor/asset-browser';
```

1b. Find `currentTab` declaration (around line 46) and extend the type union:

```typescript
private currentTab: 'playfield' | 'backglass' | 'dmd' | 'video' | 'assets' = 'playfield';
```

1c. Add a private field for the browser instance (near `videoEditor` around line 52):

```typescript
private assetBrowser: AssetBrowser | null = null;
```

- [ ] **Step 2: Update switchTab signature and add asset branch**

Find `switchTab` method (around line 128). Update parameter type:

```typescript
switchTab(tabId: 'playfield' | 'backglass' | 'dmd' | 'video' | 'assets'): void {
```

Inside the function body, after the existing video editor branch (around line 170-178), add:

```typescript
    if (tabId === 'assets') {
      if (!this.assetBrowser) {
        this.assetBrowser = new AssetBrowser();
        const container = this.modal.querySelector('.assets-editor-container');
        if (container) {
          this.assetBrowser.attachTo(container as HTMLElement);
        }
      }
      this.assetBrowser.refresh();
    }
```

- [ ] **Step 3: Add tab button and content container in the modal HTML**

The integrated-editor.ts uses an internal HTML template (search for `data-tab="video"` or `<!-- TAB`). The existing pattern uses `innerHTML` setters at modal creation time — keep that pattern (it's pre-existing) but only for static template strings.

Find the line containing `data-tab="video"` (a tab button). Add a new button next to it:

```html
<button class="tab-btn" data-tab="assets">📦 Assets</button>
```

Find the line `<!-- TAB 4: Video Manager -->` or `id="tab-video"`. After the closing `</div>` of that tab, add:

```html
<!-- TAB 5: Asset Browser -->
<div id="tab-assets" class="editor-tab hidden">
  <div class="assets-editor-container"></div>
</div>
```

These additions are static template content (no user data), so the existing `innerHTML` template string is acceptable.

- [ ] **Step 4: Add CSS**

Add a `<style>` block in the modal HTML template (same template string in integrated-editor.ts) or to the existing editor stylesheet. Insert these rules:

```css
.asset-browser { padding: 16px; max-height: 600px; overflow-y: auto; }
.asset-section { margin-bottom: 24px; }
.asset-section-header { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1px solid #333; padding-bottom: 4px; }
.asset-section-header h3 { margin: 0; font-size: 14px; color: #ccc; }
.asset-section-count { font-size: 12px; color: #888; }
.asset-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap: 8px; margin-top: 8px; }
.asset-item { background: #222; border: 1px solid #333; border-radius: 4px; padding: 4px; cursor: pointer; transition: background 0.1s; }
.asset-item:hover { background: #2a2a2a; }
.asset-thumbnail { width: 100%; aspect-ratio: 1; object-fit: contain; image-rendering: pixelated; }
.asset-name { font-size: 11px; color: #aaa; word-break: break-all; padding-top: 4px; }
.asset-list .asset-item { display: flex; align-items: center; gap: 8px; padding: 6px; }
.asset-icon { font-size: 18px; }
.asset-duration { color: #888; font-size: 11px; margin-left: auto; }
.asset-browser-empty { padding: 32px; text-align: center; color: #888; }
```

- [ ] **Step 5: Run tests + build**

```
npx vitest run && npx vite build
```

Expected: 642 tests pass, build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/integrated-editor.ts
git commit -m "feat(editor): add Assets tab to integrated editor modal"
```

---

## Task 4: Manual verification

**Files:** None (manual)

- [ ] **Step 1: Start dev server**

```
npm run dev
```

- [ ] **Step 2: Load real FPT, open editor, switch to Assets tab**

In the browser:
1. Load a real FPT file
2. Open the integrated editor
3. Click the new "📦 Assets" tab

Expected:
- Three sections (Textures, Models, Sounds) with counts
- Texture thumbnails visible
- Model and sound names listed

- [ ] **Step 3: Verify catalog ↔ UI consistency**

```js
const game = await import('/src/game.ts');
console.log(game.globalAssetCatalog().stats());
```

Confirm counts match.

- [ ] **Step 4: Commit any wire-up fixes**

If needed, otherwise no commit.

---

## Summary

After Phase 3a:
- New "Assets" tab in integrated editor
- Texture grid with thumbnails (DOM-safe rendering)
- Model + sound lists with names + durations
- XSS-safe (asset names treated as untrusted text)

**Test count:** 636 → ~642 (+6 new tests)
**Build:** still under 2 seconds

## Out of Scope (Deferred to 3b/3c/3d)

- "Replace asset" action — Phase 3b
- Sound playback button — Phase 3b polish
- Model 3D preview thumbnail — defer
- Filter/search — defer
- Drag-and-drop upload — Phase 3b
